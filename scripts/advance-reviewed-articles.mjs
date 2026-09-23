import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.EDITORIAL_ARTICLE_ADVANCE_APPLY === "1";
const batchSize = boundedInteger(process.env.EDITORIAL_ARTICLE_ADVANCE_BATCH_SIZE, 6, 1, 30);

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

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

function reviewAgeDays(value) {
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
  WHERE a.status = 'DRAFT'::publication_status
    AND COALESCE(a.metadata -> 'editorial_copy_review' ->> 'review_state', '') = 'AI_RESEARCHED'
    AND COALESCE(
      (a.metadata -> 'editorial_copy_review' ->> 'human_review_required_for_publication')::boolean,
      false
    ) = true
  GROUP BY a.id, en.title, en.dek, en.body_md, pt.title, pt.dek, pt.body_md
  ORDER BY a.updated_at ASC, a.slug
  LIMIT ${batchSize}
`;

const plans = rows.map((row) => {
  const copyReview = row.metadata?.editorial_copy_review || {};
  const ageDays = reviewAgeDays(copyReview.reviewed_at);
  const maxAgeDays = row.type === "NEWS" ? 14 : 30;
  const enParagraphs = paragraphCount(row.body_en);
  const ptParagraphs = paragraphCount(row.body_pt);

  const checks = {
    isDraft: row.status === "DRAFT",
    englishCopyComplete: [row.title_en, row.dek_en, row.body_en].every(filled),
    portugueseCopyComplete: [row.title_pt, row.dek_pt, row.body_pt].every(filled),
    alignedBodyStructure: enParagraphs >= 2 && enParagraphs === ptParagraphs,
    topicLinked: row.topic_count > 0,
    tierAPrimaryOrScientificPresent: row.tier_a_primary_or_scientific_count >= 1,
    highReliabilityCoverage: row.high_reliability_source_count >= 2,
    independentPublisherCorroboration: row.distinct_reliable_publisher_count >= 2,
    aiResearchReviewPresent: copyReview.review_state === "AI_RESEARCHED",
    researchFresh: ageDays <= maxAgeDays,
    publicationStillRequiresHumanReview: copyReview.human_review_required_for_publication === true,
  };

  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    row,
    checks,
    blockers,
    ageDays: Number.isFinite(ageDays) ? Number(ageDays.toFixed(2)) : null,
    maxAgeDays,
  };
});

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    draftsConsidered: rows.length,
    eligibleForReview: plans.filter((plan) => !plan.blockers.length).length,
    blocked: plans.filter((plan) => plan.blockers.length).length,
    plans: plans.map(({ row, checks, blockers, ageDays, maxAgeDays }) => ({
      slug: row.slug,
      type: row.type,
      checks,
      blockers,
      researchAgeDays: ageDays,
      maxResearchAgeDays: maxAgeDays,
    })),
  }, null, 2));
  process.exit(0);
}

const results = [];

for (const { row, checks, blockers, ageDays, maxAgeDays } of plans) {
  if (blockers.length) {
    results.push({ slug: row.slug, action: "BLOCKED", blockers });
    continue;
  }

  const transition = {
    from: "DRAFT",
    to: "REVIEW",
    transitioned_at: new Date().toISOString(),
    gate_version: 1,
    transition_mode: "AUTOMATED_EVIDENCE_ARTICLE_PIPELINE",
    research_age_days: ageDays,
    max_research_age_days: maxAgeDays,
    independent_publisher_corroboration: true,
    human_review_still_required_for_publication: true,
  };

  const updated = await sql`
    UPDATE articles
    SET status = 'REVIEW'::publication_status,
        metadata = metadata || ${JSON.stringify({ review_transition: transition })}::jsonb,
        updated_at = now()
    WHERE id = ${row.id}
      AND status = 'DRAFT'::publication_status
    RETURNING id, slug, status::text AS status
  `;

  results.push(updated.length
    ? {
        slug: row.slug,
        action: "MOVED_TO_REVIEW",
        checks,
        publicExportEligible: false,
        humanReviewStillRequired: true,
      }
    : { slug: row.slug, action: "SKIPPED_CONCURRENCY_RACE" });
}

console.log(JSON.stringify({
  mode: "APPLY",
  considered: rows.length,
  movedToReview: results.filter((item) => item.action === "MOVED_TO_REVIEW").length,
  blocked: results.filter((item) => item.action === "BLOCKED").length,
  publicExportChanged: false,
  results,
}, null, 2));
