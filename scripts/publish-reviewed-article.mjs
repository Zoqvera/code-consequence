import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const slug = String(process.env.EDITORIAL_ARTICLE_PUBLISH_SLUG || "").trim();
const reviewer = String(process.env.EDITORIAL_HUMAN_REVIEWER || "").trim();
const approvalPhrase = String(process.env.EDITORIAL_APPROVAL_PHRASE || "").trim();
const githubActor = String(process.env.GITHUB_ACTOR || "").trim();
const apply = process.env.EDITORIAL_ARTICLE_PUBLISH_APPLY === "1";

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!slug) throw new Error("EDITORIAL_ARTICLE_PUBLISH_SLUG is required");

const sql = neon(connectionString);

function filled(value) {
  return Boolean(String(value || "").trim());
}

function paragraphCount(value) {
  return String(value || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .length;
}

function ageDays(value) {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return Number.POSITIVE_INFINITY;
  return (Date.now() - timestamp) / 86400000;
}

const rows = await sql`
  SELECT
    a.id,
    a.slug,
    a.type::text AS type,
    a.status::text AS status,
    a.metadata,
    en.title AS title_en,
    en.dek AS dek_en,
    en.body_md AS body_en,
    pt.title AS title_pt,
    pt.dek AS dek_pt,
    pt.body_md AS body_pt,
    COUNT(DISTINCT at.topic_id)::int AS topic_count,
    COUNT(DISTINCT ars.source_id)::int AS source_count,
    COUNT(DISTINCT ars.source_id) FILTER (
      WHERE s.reliability IN ('A','B')
    )::int AS high_reliability_source_count,
    COUNT(DISTINCT ars.source_id) FILTER (
      WHERE s.reliability = 'A'
        AND s.source_type IN ('PRIMARY','SCIENTIFIC')
    )::int AS tier_a_primary_or_scientific_count,
    COUNT(DISTINCT lower(trim(s.publisher))) FILTER (
      WHERE s.reliability IN ('A','B')
        AND NULLIF(trim(s.publisher), '') IS NOT NULL
    )::int AS distinct_reliable_publisher_count
  FROM articles a
  LEFT JOIN article_translations en ON en.article_id = a.id AND en.locale = 'en'
  LEFT JOIN article_translations pt ON pt.article_id = a.id AND pt.locale = 'pt-BR'
  LEFT JOIN article_topics at ON at.article_id = a.id
  LEFT JOIN article_sources ars ON ars.article_id = a.id
  LEFT JOIN sources s ON s.id = ars.source_id
  WHERE a.slug = ${slug}
  GROUP BY a.id, en.title, en.dek, en.body_md, pt.title, pt.dek, pt.body_md
  LIMIT 1
`;

if (!rows.length) throw new Error(`Article not found: ${slug}`);

const row = rows[0];
const copyReview = row.metadata?.editorial_copy_review || {};
const reviewTransition = row.metadata?.review_transition || {};
const researchAgeDays = ageDays(copyReview.reviewed_at);
const maxResearchAgeDays = row.type === "NEWS" ? 14 : 30;
const enParagraphs = paragraphCount(row.body_en);
const ptParagraphs = paragraphCount(row.body_pt);

const checks = {
  isInReview: row.status === "REVIEW",
  englishCopyComplete: [row.title_en, row.dek_en, row.body_en].every(filled),
  portugueseCopyComplete: [row.title_pt, row.dek_pt, row.body_pt].every(filled),
  alignedBodyStructure: enParagraphs >= 2 && enParagraphs === ptParagraphs,
  topicLinked: row.topic_count > 0,
  sourceCoverage: row.source_count >= 2,
  tierAPrimaryOrScientificPresent: row.tier_a_primary_or_scientific_count >= 1,
  highReliabilityCoverage: row.high_reliability_source_count >= 2,
  independentPublisherCorroboration: row.distinct_reliable_publisher_count >= 2,
  aiResearchReviewPresent: copyReview.review_state === "AI_RESEARCHED",
  reviewGateCompleted: reviewTransition.to === "REVIEW",
  researchFresh: researchAgeDays <= maxResearchAgeDays,
  humanPublicationReviewRequired: copyReview.human_review_required_for_publication === true,
  reviewerProvided: filled(reviewer),
  explicitApprovalPhrase: approvalPhrase === "I APPROVE PUBLICATION",
};

const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const plan = {
  slug: row.slug,
  articleId: row.id,
  type: row.type,
  currentStatus: row.status,
  targetStatus: "PUBLISHED",
  title: {
    en: row.title_en,
    "pt-BR": row.title_pt,
  },
  reviewer: reviewer || null,
  githubActor: githubActor || null,
  researchAgeDays: Number.isFinite(researchAgeDays)
    ? Number(researchAgeDays.toFixed(2))
    : null,
  maxResearchAgeDays,
  sourceCounts: {
    total: row.source_count,
    highReliability: row.high_reliability_source_count,
    tierAPrimaryOrScientific: row.tier_a_primary_or_scientific_count,
    distinctReliablePublishers: row.distinct_reliable_publisher_count,
  },
  checks,
  blockers,
};

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    eligible: blockers.length === 0,
    plan,
  }, null, 2));
  process.exit(blockers.length ? 2 : 0);
}

if (blockers.length) {
  throw new Error(`Publication blocked: ${blockers.join(", ")}`);
}

const approvedAt = new Date().toISOString();
const publicationApproval = {
  approval_type: "MANUAL_EDITORIAL_APPROVAL",
  reviewer,
  github_actor: githubActor || null,
  approved_at: approvedAt,
  approval_phrase_confirmed: true,
  source_count_at_approval: row.source_count,
  high_reliability_source_count_at_approval: row.high_reliability_source_count,
  tier_a_primary_or_scientific_count_at_approval: row.tier_a_primary_or_scientific_count,
  distinct_reliable_publisher_count_at_approval: row.distinct_reliable_publisher_count,
  research_reviewed_at: copyReview.reviewed_at,
  research_age_days: Number(researchAgeDays.toFixed(2)),
};

const updated = await sql`
  UPDATE articles
  SET status = 'PUBLISHED'::publication_status,
      published_at = COALESCE(published_at, now()),
      metadata = metadata || ${JSON.stringify({ publication_approval: publicationApproval })}::jsonb,
      updated_at = now()
  WHERE id = ${row.id}
    AND status = 'REVIEW'::publication_status
  RETURNING id, slug, status::text AS status, published_at
`;

if (!updated.length) {
  throw new Error("Publication lost a concurrency race; article is no longer REVIEW");
}

console.log(JSON.stringify({
  mode: "APPLY",
  published: true,
  article: updated[0],
  approval: publicationApproval,
  rebuildRequired: true,
}, null, 2));
