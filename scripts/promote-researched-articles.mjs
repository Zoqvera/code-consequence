import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.EDITORIAL_ARTICLE_PROMOTE_APPLY === "1";

const topicSlugByCode = {
  POWER_DEMOCRACY: "power-democracy",
  WORK_ECONOMY: "work-economy",
  RIGHTS_SOCIETY: "rights-society",
  GOVERNANCE_REGULATION: "governance-regulation",
  INFRASTRUCTURE_PLANET: "infrastructure-planet",
  SCIENCE_TECHNOLOGY: "science-technology",
};

function slugify(value) {
  return String(value || "article")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

function stableSuffix(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 8);
}

function filled(value) {
  return Boolean(String(value || "").trim());
}

function bodyComplete(en, pt) {
  return Array.isArray(en)
    && Array.isArray(pt)
    && en.length >= 2
    && en.length === pt.length
    && en.every(filled)
    && pt.every(filled);
}

function normalizeSource(source) {
  const sourceType = ["PRIMARY", "SCIENTIFIC", "JOURNALISTIC", "INSTITUTIONAL", "DISCOVERY"]
    .includes(source?.source_type)
    ? source.source_type
    : "INSTITUTIONAL";
  const reliability = ["A", "B", "C", "D"].includes(source?.reliability)
    ? source.reliability
    : "C";

  return {
    url: source?.url || null,
    publisher: source?.publisher || null,
    sourceType,
    reliability,
    role: source?.role || "verification",
  };
}

const rows = await sql`
  SELECT
    i.id,
    i.canonical_url,
    i.title,
    i.relevance_score,
    i.classification
  FROM ingestion_items i
  WHERE i.processing_status = 'CLASSIFIED'
    AND i.relevance_status = 'RELEVANT'
    AND i.classification ? 'editorial_candidate'
    AND i.classification ? 'editorial_article_research'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const grouped = new Map();

for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  const research = row.classification?.editorial_article_research;

  if (!candidate?.cluster_id || !research) continue;
  if (research.decision !== "VERIFIED_ARTICLE") continue;
  if (research.verification_level !== "INDEPENDENT_CONFIRMED") continue;
  if (research.human_review_required_for_publication !== true) continue;

  const existing = grouped.get(candidate.cluster_id);
  if (!existing || row.relevance_score > existing.relevance_score) {
    grouped.set(candidate.cluster_id, row);
  }
}

const topicRows = await sql`SELECT id, slug FROM topics`;
const topicIdBySlug = new Map(topicRows.map((row) => [row.slug, row.id]));
const plan = [];

for (const row of grouped.values()) {
  const candidate = row.classification.editorial_candidate;
  const research = row.classification.editorial_article_research;
  const sourceMatchUrl = research.source_match_url || row.canonical_url;
  const baseSlug = slugify(research.title_en || candidate.canonical_title || row.title);

  const existingByOrigin = await sql`
    SELECT id, slug, status::text AS status
    FROM articles
    WHERE metadata ->> 'source_match_url' = ${sourceMatchUrl}
    LIMIT 1
  `;

  let proposedSlug = existingByOrigin[0]?.slug || baseSlug;
  if (!existingByOrigin.length) {
    const slugRows = await sql`SELECT id FROM articles WHERE slug = ${baseSlug} LIMIT 1`;
    if (slugRows.length) proposedSlug = `${baseSlug}-${stableSuffix(sourceMatchUrl)}`;
  }

  const topicSlug = topicSlugByCode[research.topic_code] || null;
  const topicId = topicSlug ? topicIdBySlug.get(topicSlug) : null;
  const evidenceSources = Array.isArray(research.evidence_sources)
    ? research.evidence_sources.map(normalizeSource).filter((source) => source.url)
    : [];

  const reliableSources = evidenceSources.filter((source) => ["A", "B"].includes(source.reliability));
  const tierAPrimarySources = evidenceSources.filter(
    (source) => ["PRIMARY", "SCIENTIFIC"].includes(source.sourceType) && source.reliability === "A",
  );
  const distinctReliablePublishers = new Set(
    reliableSources.map((source) => String(source.publisher || new URL(source.url).hostname).trim().toLowerCase()),
  );

  const copyComplete = [
    research.title_en,
    research.title_pt_br,
    research.dek_en,
    research.dek_pt_br,
  ].every(filled) && bodyComplete(research.body_en, research.body_pt_br);

  const ready = Boolean(
    ["NEWS", "ANALYSIS"].includes(research.article_type)
      && topicId
      && copyComplete
      && tierAPrimarySources.length >= 1
      && reliableSources.length >= 2
      && distinctReliablePublishers.size >= 2,
  );

  plan.push({
    clusterId: candidate.cluster_id,
    memberItemIds: candidate.member_item_ids || [row.id],
    sourceMatchUrl,
    sourcePublishedAt: research.source_published_at || null,
    proposedSlug,
    articleType: research.article_type,
    topicSlug,
    topicId,
    titleEn: research.title_en,
    titlePt: research.title_pt_br,
    dekEn: research.dek_en,
    dekPt: research.dek_pt_br,
    bodyEn: research.body_en,
    bodyPt: research.body_pt_br,
    evidenceSources,
    reviewedAt: research.reviewed_at,
    reviewNotes: research.review_notes || null,
    existingArticle: existingByOrigin[0] || null,
    priority: row.relevance_score,
    ready,
  });
}

plan.sort((left, right) => right.priority - left.priority || left.proposedSlug.localeCompare(right.proposedSlug));

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    eligibleClusters: plan.length,
    readyToPromote: plan.filter((item) => item.ready && !item.existingArticle).length,
    existingArticles: plan.filter((item) => item.existingArticle).length,
    blocked: plan.filter((item) => !item.ready).length,
    plan: plan.map((item) => ({
      slug: item.proposedSlug,
      articleType: item.articleType,
      topicSlug: item.topicSlug,
      evidenceSources: item.evidenceSources.length,
      existingArticle: item.existingArticle,
      ready: item.ready,
    })),
  }, null, 2));
  process.exit(0);
}

const results = [];

for (const item of plan) {
  if (item.existingArticle) {
    for (const memberItemId of item.memberItemIds) {
      await sql`
        UPDATE ingestion_items
        SET processing_status = 'DRAFTED', updated_at = now()
        WHERE id = ${memberItemId}
          AND processing_status = 'CLASSIFIED'
      `;
    }
    results.push({ action: "SKIPPED_EXISTING", slug: item.existingArticle.slug });
    continue;
  }

  if (!item.ready) {
    results.push({ action: "BLOCKED", slug: item.proposedSlug });
    continue;
  }

  const metadata = {
    provenance_version: 1,
    source_match_url: item.sourceMatchUrl,
    editorial_cluster_id: item.clusterId,
    editorial_priority: item.priority,
    source_published_at: item.sourcePublishedAt,
    editorial_copy_review: {
      review_state: "AI_RESEARCHED",
      reviewer_type: "AI_WEB_RESEARCH",
      reviewed_at: item.reviewedAt,
      evidence_urls: item.evidenceSources.map((source) => source.url),
      review_notes: item.reviewNotes,
      human_review_required_for_publication: true,
    },
  };

  const inserted = await sql`
    INSERT INTO articles (slug, type, status, primary_language, metadata)
    VALUES (
      ${item.proposedSlug},
      ${item.articleType}::article_type,
      'DRAFT'::publication_status,
      'en',
      ${JSON.stringify(metadata)}::jsonb
    )
    RETURNING id, slug
  `;

  const articleId = inserted[0].id;

  for (const translation of [
    {
      locale: "en",
      title: item.titleEn,
      dek: item.dekEn,
      body: item.bodyEn.join("\n\n"),
    },
    {
      locale: "pt-BR",
      title: item.titlePt,
      dek: item.dekPt,
      body: item.bodyPt.join("\n\n"),
    },
  ]) {
    await sql`
      INSERT INTO article_translations (
        article_id, locale, title, dek, body_md, seo_title, seo_description
      )
      VALUES (
        ${articleId},
        ${translation.locale},
        ${translation.title},
        ${translation.dek},
        ${translation.body},
        ${translation.title},
        ${translation.dek}
      )
      ON CONFLICT (article_id, locale) DO UPDATE SET
        title = EXCLUDED.title,
        dek = EXCLUDED.dek,
        body_md = EXCLUDED.body_md,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description
    `;
  }

  for (const source of item.evidenceSources) {
    const sourceRows = await sql`
      INSERT INTO sources (url, title, publisher, source_type, reliability, metadata)
      VALUES (
        ${source.url},
        ${`Editorial evidence — ${source.publisher || "source"}`},
        ${source.publisher},
        ${source.sourceType}::source_type,
        ${source.reliability}::reliability_level,
        ${JSON.stringify({
          role: source.role,
          editorial_cluster_id: item.clusterId,
          provisional_title: true,
        })}::jsonb
      )
      ON CONFLICT (url) DO UPDATE SET retrieved_at = now()
      RETURNING id
    `;

    await sql`
      INSERT INTO article_sources (article_id, source_id, is_primary)
      VALUES (${articleId}, ${sourceRows[0].id}, ${source.sourceType === "PRIMARY"})
      ON CONFLICT DO NOTHING
    `;
  }

  await sql`
    INSERT INTO article_topics (article_id, topic_id)
    VALUES (${articleId}, ${item.topicId})
    ON CONFLICT DO NOTHING
  `;

  for (const memberItemId of item.memberItemIds) {
    await sql`
      UPDATE ingestion_items
      SET processing_status = 'DRAFTED', updated_at = now()
      WHERE id = ${memberItemId}
        AND processing_status = 'CLASSIFIED'
    `;
  }

  results.push({
    action: "CREATED_ARTICLE_DRAFT",
    articleId,
    slug: item.proposedSlug,
    articleType: item.articleType,
    publicationStatus: "DRAFT",
    humanApprovalStillRequired: true,
  });
}

console.log(JSON.stringify({
  mode: "APPLY",
  considered: plan.length,
  createdDrafts: results.filter((item) => item.action === "CREATED_ARTICLE_DRAFT").length,
  skippedExisting: results.filter((item) => item.action === "SKIPPED_EXISTING").length,
  blocked: results.filter((item) => item.action === "BLOCKED").length,
  publicExportChanged: false,
  results,
}, null, 2));
