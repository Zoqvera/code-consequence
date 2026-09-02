import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.AUTO_PROMOTE_APPLY === "1";
const now = new Date();

const topicSlugByCode = {
  POWER_DEMOCRACY: "power-democracy",
  WORK_ECONOMY: "work-economy",
  RIGHTS_SOCIETY: "rights-society",
  GOVERNANCE_REGULATION: "governance-regulation",
  INFRASTRUCTURE_PLANET: "infrastructure-planet",
  SCIENCE_TECHNOLOGY: "science-technology",
};

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "initiative";
}

function stableSuffix(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function safePublishedAt(value) {
  if (!value) return { value: null, rejectedFutureDate: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { value: null, rejectedFutureDate: String(value) };
  if (date.getTime() > now.getTime()) return { value: null, rejectedFutureDate: date.toISOString() };
  return { value: date.toISOString(), rejectedFutureDate: null };
}

function filled(value) {
  return Boolean(String(value || "").trim());
}

const rows = await sql`
  SELECT
    i.id,
    i.canonical_url,
    i.title,
    i.published_at,
    i.relevance_score,
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
    AND i.classification ? 'editorial_research'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const grouped = new Map();
for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  const verification = row.classification?.editorial_verification;
  const research = row.classification?.editorial_research;
  if (!candidate?.cluster_id || !verification || !research) continue;
  if (verification.decision !== "VERIFIED_STANDALONE") continue;
  if (verification.verification_level !== "INDEPENDENT_CONFIRMED") continue;
  if (research.decision !== "VERIFIED_STANDALONE") continue;
  if (research.human_review_required_for_publication !== true) continue;
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
  const research = classification.editorial_research || {};
  const matchUrl = verification.match_url || row.canonical_url;
  const canonicalTitle = research.title_en || verification.canonical_title || candidate.canonical_title || classification.initiative_name || row.title;
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
  const publishedAt = safePublishedAt(row.published_at);
  const evidenceSources = Array.isArray(verification.evidence_sources) ? verification.evidence_sources : [];
  const primaryEvidence = evidenceSources.filter((source) => source?.source_type === "PRIMARY" && source?.reliability === "A");
  const highReliabilityEvidence = evidenceSources.filter((source) => ["A", "B"].includes(source?.reliability));
  const organization = research.organization || null;
  const evidenceUrl = primaryEvidence[0]?.url || highReliabilityEvidence[0]?.url || evidenceSources[0]?.url || matchUrl;
  const researchComplete = Boolean(
    filled(research.title_en)
    && filled(research.title_pt_br)
    && filled(research.summary_en)
    && filled(research.summary_pt_br)
    && filled(research.region_en)
    && filled(research.region_pt_br)
    && filled(organization?.name)
    && filled(organization?.slug)
    && evidenceSources.length >= 2
    && primaryEvidence.length >= 1
    && highReliabilityEvidence.length >= 2
  );

  plan.push({
    clusterId: candidate.cluster_id,
    memberItemIds: candidate.member_item_ids || [row.id],
    matchUrl,
    canonicalTitle,
    proposedSlug,
    priority: row.relevance_score,
    topicSlugs,
    missingTopicSlugs,
    existingInitiative: existingByOrigin[0] || null,
    researchComplete,
    organization,
    regionEn: research.region_en || null,
    regionPt: research.region_pt_br || null,
    titleEn: research.title_en || null,
    titlePt: research.title_pt_br || null,
    summaryEn: research.summary_en || null,
    summaryPt: research.summary_pt_br || null,
    operationalStatus: ["ANNOUNCED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"].includes(research.initiative_status)
      ? research.initiative_status
      : (["ANNOUNCED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"].includes(classification.initiative_status) ? classification.initiative_status : "ANNOUNCED"),
    evidenceSources,
    evidenceUrl,
    verifiedAt: verification.reviewed_at || research.reviewed_at || new Date().toISOString(),
    research,
    collectedSource: {
      url: row.canonical_url,
      title: row.title,
      publisher: row.publisher,
      sourceType: row.source_type,
      reliability: row.reliability,
      publishedAt: publishedAt.value,
      rejectedFutureDate: publishedAt.rejectedFutureDate,
    },
  });
}

plan.sort((a, b) => b.priority - a.priority || a.canonicalTitle.localeCompare(b.canonicalTitle));
const missingTopics = [...new Set(plan.flatMap((item) => item.missingTopicSlugs))];

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    eligibleResearchClusters: plan.length,
    readyToPromote: plan.filter((item) => item.researchComplete && !item.existingInitiative).length,
    existingInitiatives: plan.filter((item) => item.existingInitiative).length,
    incompleteResearch: plan.filter((item) => !item.researchComplete).length,
    missingTopics,
    plan: plan.map((item) => ({
      slug: item.proposedSlug,
      title: item.canonicalTitle,
      existingInitiative: item.existingInitiative,
      researchComplete: item.researchComplete,
      organization: item.organization?.name || null,
      regionEn: item.regionEn,
      evidenceSources: item.evidenceSources.length,
      primaryEvidence: item.evidenceSources.filter((source) => source.source_type === "PRIMARY" && source.reliability === "A").length,
      highReliabilityEvidence: item.evidenceSources.filter((source) => ["A", "B"].includes(source.reliability)).length,
      missingTopicSlugs: item.missingTopicSlugs,
    })),
  }, null, 2));
  process.exit(0);
}

if (missingTopics.length) throw new Error(`Automated promotion blocked: missing editorial topics: ${missingTopics.join(", ")}`);

const results = [];
for (const item of plan) {
  if (item.existingInitiative) {
    for (const memberItemId of item.memberItemIds) {
      await sql`
        UPDATE ingestion_items
        SET processing_status = 'DRAFTED', updated_at = now()
        WHERE id = ${memberItemId}
          AND processing_status = 'CLASSIFIED'
      `;
    }
    results.push({ action: "SKIPPED_EXISTING", slug: item.existingInitiative.slug, title: item.canonicalTitle });
    continue;
  }
  if (!item.researchComplete) {
    results.push({ action: "SKIPPED_INCOMPLETE_RESEARCH", slug: item.proposedSlug, title: item.canonicalTitle });
    continue;
  }

  const organizationRows = await sql`
    INSERT INTO organizations (slug, name, organization_type, website_url)
    VALUES (
      ${item.organization.slug},
      ${item.organization.name},
      ${item.organization.type || "OTHER"},
      ${item.organization.website_url || null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      organization_type = EXCLUDED.organization_type,
      website_url = COALESCE(EXCLUDED.website_url, organizations.website_url)
    RETURNING id
  `;
  const organizationId = organizationRows[0].id;
  const reviewedAt = item.research.reviewed_at || item.verifiedAt;
  const metadata = {
    provenance_version: 2,
    source_match_url: item.matchUrl,
    source_ingestion_item_id: item.memberItemIds[0] || null,
    editorial_cluster_id: item.clusterId,
    editorial_priority: item.priority,
    verification_sources: item.evidenceSources,
    rejected_future_source_date: item.collectedSource.rejectedFutureDate,
    promoted_at: new Date().toISOString(),
    editorial_preparation: {
      organization_evidence_url: item.evidenceUrl,
      region_evidence_url: item.evidenceUrl,
      region_en: item.regionEn,
      region_pt_br: item.regionPt,
      portuguese_title_state: "EDITORIAL_REVIEWED",
      portuguese_summary_state: "EDITORIAL_REVIEWED",
      english_summary_state: "EDITORIAL_REVIEWED",
      prepared_at: reviewedAt,
      preparation_mode: "AUTOMATED_EVIDENCE_RESEARCH",
      publication_status_unchanged: true,
    },
    editorial_copy_review: {
      review_state: "EDITORIAL_REVIEWED",
      reviewer_type: item.research.reviewer_type || "AI_WEB_RESEARCH",
      reviewed_at: reviewedAt,
      evidence_urls: item.research.evidence_urls || item.evidenceSources.map((source) => source.url),
      review_notes: item.research.review_notes || null,
      human_review_required_for_publication: true,
    },
  };

  const inserted = await sql`
    INSERT INTO initiatives (
      slug, organization_id, region, status, publication_status, last_verified_at, metadata
    ) VALUES (
      ${item.proposedSlug},
      ${organizationId},
      ${item.regionEn},
      ${item.operationalStatus}::initiative_status,
      'DRAFT'::publication_status,
      ${item.verifiedAt}::timestamptz,
      ${JSON.stringify(metadata)}::jsonb
    )
    RETURNING id, slug
  `;
  const initiativeId = inserted[0].id;

  for (const translation of [
    { locale: "en", title: item.titleEn, summary: item.summaryEn },
    { locale: "pt-BR", title: item.titlePt, summary: item.summaryPt },
  ]) {
    await sql`
      INSERT INTO initiative_translations (initiative_id, locale, title, summary)
      VALUES (${initiativeId}, ${translation.locale}, ${translation.title}, ${translation.summary})
      ON CONFLICT (initiative_id, locale) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary
    `;
  }

  const allSources = [
    {
      url: item.collectedSource.url,
      title: item.collectedSource.title,
      publisher: item.collectedSource.publisher,
      source_type: item.collectedSource.sourceType,
      reliability: item.collectedSource.reliability,
      published_at: item.collectedSource.publishedAt,
      role: "collected_primary_record",
    },
    ...item.evidenceSources.map((source) => ({
      url: source.url,
      title: `Verification source — ${source.publisher || "source"}`,
      publisher: source.publisher || null,
      source_type: source.source_type,
      reliability: source.reliability,
      published_at: null,
      role: source.role || "independent_verification",
    })),
  ];
  const seenUrls = new Set();
  for (const source of allSources) {
    if (!source.url || seenUrls.has(source.url)) continue;
    seenUrls.add(source.url);
    const sourceType = ["PRIMARY", "SCIENTIFIC", "JOURNALISTIC", "INSTITUTIONAL", "DISCOVERY"].includes(source.source_type)
      ? source.source_type : "INSTITUTIONAL";
    const reliability = ["A", "B", "C", "D"].includes(source.reliability) ? source.reliability : "C";
    const sourceRows = await sql`
      INSERT INTO sources (url, title, publisher, source_type, reliability, published_at, metadata)
      VALUES (
        ${source.url}, ${source.title || `Source — ${source.publisher || "record"}`}, ${source.publisher || null},
        ${sourceType}::source_type, ${reliability}::reliability_level, ${source.published_at}::timestamptz,
        ${JSON.stringify({ role: source.role, editorial_cluster_id: item.clusterId, provisional_title: source.role !== "collected_primary_record" })}::jsonb
      )
      ON CONFLICT (url) DO UPDATE SET retrieved_at = now()
      RETURNING id
    `;
    await sql`
      INSERT INTO initiative_sources (initiative_id, source_id)
      VALUES (${initiativeId}, ${sourceRows[0].id})
      ON CONFLICT DO NOTHING
    `;
  }

  for (const topicSlug of item.topicSlugs) {
    const topicId = topicIdBySlug.get(topicSlug);
    if (!topicId) continue;
    await sql`
      INSERT INTO initiative_topics (initiative_id, topic_id)
      VALUES (${initiativeId}, ${topicId})
      ON CONFLICT DO NOTHING
    `;
  }

  for (const memberItemId of item.memberItemIds) {
    await sql`
      UPDATE ingestion_items
      SET processing_status = 'DRAFTED', updated_at = now()
      WHERE id = ${memberItemId}
        AND processing_status = 'CLASSIFIED'
    `;
  }

  results.push({
    action: "CREATED_REVIEWED_DRAFT",
    initiativeId,
    slug: item.proposedSlug,
    title: item.canonicalTitle,
    publicationStatus: "DRAFT",
    humanApprovalStillRequired: true,
  });
}

console.log(JSON.stringify({
  mode: "APPLY",
  eligibleResearchClusters: plan.length,
  createdReviewedDrafts: results.filter((item) => item.action === "CREATED_REVIEWED_DRAFT").length,
  skippedExisting: results.filter((item) => item.action === "SKIPPED_EXISTING").length,
  skippedIncompleteResearch: results.filter((item) => item.action === "SKIPPED_INCOMPLETE_RESEARCH").length,
  publicExportChanged: false,
  results,
}, null, 2));
