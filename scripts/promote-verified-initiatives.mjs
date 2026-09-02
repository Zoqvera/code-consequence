import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.PROMOTE_APPLY === "1";

const topicSlugByCode = {
  POWER_DEMOCRACY: "power-democracy",
  WORK_ECONOMY: "work-economy",
  RIGHTS_SOCIETY: "rights-society",
  GOVERNANCE_REGULATION: "governance-regulation",
  INFRASTRUCTURE_PLANET: "infrastructure-planet",
  SCIENCE_TECHNOLOGY: "science-technology",
};

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "initiative";
}

function stableSuffix(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function cleanRiskFlags(flags = []) {
  return flags.filter((flag) => flag && flag !== "NONE");
}

const rows = await sql`
  SELECT
    i.id,
    i.canonical_url,
    i.title,
    i.published_at,
    i.relevance_score,
    i.relevance_status,
    i.classification,
    f.publisher,
    f.source_type::text AS source_type,
    f.reliability::text AS reliability
  FROM ingestion_items i
  JOIN source_feeds f ON f.id = i.feed_id
  WHERE i.processing_status = 'CLASSIFIED'
    AND i.relevance_status = 'RELEVANT'
    AND i.classification ? 'editorial_candidate'
    AND i.classification ? 'editorial_verification'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const grouped = new Map();
for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  const verification = row.classification?.editorial_verification;
  if (!candidate?.cluster_id || !verification) continue;
  if (verification.decision !== "VERIFIED_STANDALONE") continue;
  if (verification.verification_level !== "INDEPENDENT_CONFIRMED") continue;
  if (candidate.review_state !== "READY_FOR_REVIEW") continue;
  if (cleanRiskFlags(candidate.risk_flags).length) continue;
  if (!row.classification?.initiative_detected) continue;

  const existing = grouped.get(candidate.cluster_id);
  if (!existing || row.relevance_score > existing.relevance_score) grouped.set(candidate.cluster_id, row);
}

const topicRows = await sql`SELECT id, slug FROM topics`;
const topicIdBySlug = new Map(topicRows.map((row) => [row.slug, row.id]));

const plan = [];
for (const row of grouped.values()) {
  const classification = row.classification || {};
  const candidate = classification.editorial_candidate || {};
  const verification = classification.editorial_verification || {};
  const matchUrl = verification.match_url || row.canonical_url;
  const canonicalTitle = verification.canonical_title || candidate.canonical_title || classification.initiative_name || row.title;
  const baseSlug = slugify(canonicalTitle);
  const existingByOrigin = await sql`
    SELECT id, slug, publication_status::text AS publication_status
    FROM initiatives
    WHERE metadata ->> 'source_match_url' = ${matchUrl}
    LIMIT 1
  `;

  let proposedSlug = existingByOrigin[0]?.slug || baseSlug;
  if (!existingByOrigin.length) {
    const slugRows = await sql`SELECT id FROM initiatives WHERE slug = ${baseSlug} LIMIT 1`;
    if (slugRows.length) proposedSlug = `${baseSlug}-${stableSuffix(matchUrl)}`;
  }

  const topicCodes = candidate.topics || classification.topics || [];
  const topicSlugs = topicCodes.map((code) => topicSlugByCode[code]).filter(Boolean);
  const missingTopicSlugs = topicSlugs.filter((slug) => !topicIdBySlug.has(slug));
  const summaryEn = String(classification.synopsis_en || classification.response_summary || "").trim();
  const problemEn = String(classification.problem_summary || "").trim() || null;
  const goalsEn = String(classification.response_summary || "").trim() || null;
  const operationalStatus = ["ANNOUNCED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"].includes(classification.initiative_status)
    ? classification.initiative_status
    : "ANNOUNCED";

  plan.push({
    clusterId: candidate.cluster_id,
    ingestionItemId: row.id,
    matchUrl,
    canonicalTitle,
    proposedSlug,
    priority: row.relevance_score,
    operationalStatus,
    summaryEn,
    problemEn,
    goalsEn,
    topicSlugs,
    missingTopicSlugs,
    existingInitiative: existingByOrigin[0] || null,
    collectedSource: {
      url: row.canonical_url,
      title: row.title,
      publisher: row.publisher,
      sourceType: row.source_type,
      reliability: row.reliability,
      publishedAt: row.published_at,
    },
    verificationSources: verification.evidence_sources || [],
    verifiedAt: verification.reviewed_at || new Date().toISOString(),
    organizations: candidate.organizations || classification.organizations || [],
    countries: candidate.countries || classification.countries || [],
  });
}

plan.sort((a, b) => b.priority - a.priority || a.canonicalTitle.localeCompare(b.canonicalTitle));

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    eligibleDrafts: plan.length,
    existingDrafts: plan.filter((item) => item.existingInitiative).length,
    missingTopicLinks: [...new Set(plan.flatMap((item) => item.missingTopicSlugs))],
    plan: plan.map(({ summaryEn, problemEn, goalsEn, ...item }) => ({
      ...item,
      hasEnglishSummary: Boolean(summaryEn),
      hasProblemStatement: Boolean(problemEn),
      hasGoals: Boolean(goalsEn),
    })),
  }, null, 2));
  process.exit(0);
}

const promoted = [];
for (const item of plan) {
  if (item.existingInitiative) {
    promoted.push({
      action: "SKIPPED_EXISTING",
      initiativeId: item.existingInitiative.id,
      slug: item.existingInitiative.slug,
      title: item.canonicalTitle,
    });
    continue;
  }

  if (!item.summaryEn) {
    promoted.push({ action: "SKIPPED_MISSING_SUMMARY", slug: item.proposedSlug, title: item.canonicalTitle });
    continue;
  }

  const metadata = {
    provenance_version: 1,
    source_match_url: item.matchUrl,
    source_ingestion_item_id: item.ingestionItemId,
    editorial_cluster_id: item.clusterId,
    editorial_priority: item.priority,
    organizations: item.organizations,
    countries: item.countries,
    verification_sources: item.verificationSources,
    promoted_at: new Date().toISOString(),
  };

  const inserted = await sql`
    INSERT INTO initiatives (
      slug,
      status,
      publication_status,
      last_verified_at,
      metadata
    ) VALUES (
      ${item.proposedSlug},
      ${item.operationalStatus}::initiative_status,
      'DRAFT'::publication_status,
      ${item.verifiedAt}::timestamptz,
      ${JSON.stringify(metadata)}::jsonb
    )
    RETURNING id, slug
  `;
  const initiativeId = inserted[0].id;

  await sql`
    INSERT INTO initiative_translations (
      initiative_id, locale, title, summary, problem_statement, goals
    ) VALUES (
      ${initiativeId}, 'en', ${item.canonicalTitle}, ${item.summaryEn}, ${item.problemEn}, ${item.goalsEn}
    )
    ON CONFLICT (initiative_id, locale) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      problem_statement = EXCLUDED.problem_statement,
      goals = EXCLUDED.goals
  `;

  const sourceRows = await sql`
    INSERT INTO sources (
      url, title, publisher, source_type, reliability, published_at, metadata
    ) VALUES (
      ${item.collectedSource.url},
      ${item.collectedSource.title},
      ${item.collectedSource.publisher},
      ${item.collectedSource.sourceType}::source_type,
      ${item.collectedSource.reliability}::reliability_level,
      ${item.collectedSource.publishedAt}::timestamptz,
      ${JSON.stringify({ ingestion_item_id: item.ingestionItemId, role: "collected_primary_record" })}::jsonb
    )
    ON CONFLICT (url) DO UPDATE SET retrieved_at = now()
    RETURNING id
  `;
  const sourceId = sourceRows[0].id;

  await sql`
    INSERT INTO initiative_sources (initiative_id, source_id)
    VALUES (${initiativeId}, ${sourceId})
    ON CONFLICT DO NOTHING
  `;

  for (const topicSlug of item.topicSlugs) {
    const topicId = topicIdBySlug.get(topicSlug);
    if (!topicId) continue;
    await sql`
      INSERT INTO initiative_topics (initiative_id, topic_id)
      VALUES (${initiativeId}, ${topicId})
      ON CONFLICT DO NOTHING
    `;
  }

  promoted.push({ action: "CREATED_DRAFT", initiativeId, slug: item.proposedSlug, title: item.canonicalTitle });
}

console.log(JSON.stringify({
  mode: "APPLY",
  eligibleDrafts: plan.length,
  createdDrafts: promoted.filter((item) => item.action === "CREATED_DRAFT").length,
  skippedExisting: promoted.filter((item) => item.action === "SKIPPED_EXISTING").length,
  skippedMissingSummary: promoted.filter((item) => item.action === "SKIPPED_MISSING_SUMMARY").length,
  promoted,
}, null, 2));
