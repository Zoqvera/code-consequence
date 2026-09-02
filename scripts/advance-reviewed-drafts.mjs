import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.EDITORIAL_ADVANCE_APPLY === "1";
const batchSize = Math.max(1, Math.min(Number(process.env.EDITORIAL_ADVANCE_BATCH_SIZE || 10), 50));

function filled(value) {
  return Boolean(String(value || "").trim());
}

const rows = await sql`
  SELECT
    i.id,
    i.slug,
    i.publication_status::text AS publication_status,
    i.region,
    i.organization_id,
    i.last_verified_at,
    i.metadata,
    o.name AS organization_name,
    en.title AS title_en,
    en.summary AS summary_en,
    pt.title AS title_pt,
    pt.summary AS summary_pt,
    COUNT(DISTINCT it.topic_id)::int AS topic_count,
    COUNT(DISTINCT ins.source_id) FILTER (WHERE s.source_type = 'PRIMARY')::int AS primary_source_count,
    COUNT(DISTINCT ins.source_id) FILTER (WHERE s.reliability IN ('A','B'))::int AS high_reliability_source_count
  FROM initiatives i
  LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN initiative_translations pt ON pt.initiative_id = i.id AND pt.locale = 'pt-BR'
  LEFT JOIN initiative_topics it ON it.initiative_id = i.id
  LEFT JOIN initiative_sources ins ON ins.initiative_id = i.id
  LEFT JOIN sources s ON s.id = ins.source_id
  WHERE i.publication_status = 'DRAFT'::publication_status
    AND COALESCE(i.metadata -> 'editorial_copy_review' ->> 'review_state', '') = 'EDITORIAL_REVIEWED'
    AND COALESCE((i.metadata -> 'editorial_copy_review' ->> 'human_review_required_for_publication')::boolean, false) = true
  GROUP BY i.id, o.name, en.title, en.summary, pt.title, pt.summary
  ORDER BY i.updated_at ASC, i.slug
  LIMIT ${batchSize}
`;

const plans = [];
for (const row of rows) {
  const preparation = row.metadata?.editorial_preparation || {};
  const copyReview = row.metadata?.editorial_copy_review || {};
  const checks = {
    isDraft: row.publication_status === "DRAFT",
    englishTitle: filled(row.title_en),
    englishSummary: filled(row.summary_en),
    portugueseTitle: filled(row.title_pt),
    portugueseSummary: filled(row.summary_pt),
    organizationReviewed: Boolean(row.organization_id && row.organization_name && preparation.organization_evidence_url),
    regionReviewed: Boolean(filled(row.region) && preparation.region_evidence_url && preparation.region_en && preparation.region_pt_br),
    topicsLinked: row.topic_count > 0,
    primarySourcePresent: row.primary_source_count > 0,
    corroborationPresent: row.high_reliability_source_count >= 2,
    verificationTimestampPresent: Boolean(row.last_verified_at),
    editorialCopyReviewed: copyReview.review_state === "EDITORIAL_REVIEWED",
    publicationStillRequiresHumanReview: copyReview.human_review_required_for_publication === true,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  plans.push({ row, checks, blockers });
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    draftsConsidered: rows.length,
    eligibleForReview: plans.filter((plan) => !plan.blockers.length).length,
    blocked: plans.filter((plan) => plan.blockers.length).length,
    plans: plans.map(({ row, checks, blockers }) => ({
      slug: row.slug,
      checks,
      blockers,
      sources: {
        primary: row.primary_source_count,
        highReliability: row.high_reliability_source_count,
      },
    })),
  }, null, 2));
  process.exit(0);
}

const results = [];
for (const { row, checks, blockers } of plans) {
  if (blockers.length) {
    results.push({ slug: row.slug, action: "BLOCKED", blockers });
    continue;
  }

  const transition = {
    from: "DRAFT",
    to: "REVIEW",
    transitioned_at: new Date().toISOString(),
    gate_version: 3,
    transition_mode: "AUTOMATED_EVIDENCE_PIPELINE",
    editorial_copy_reviewed: true,
    human_review_still_required_for_publication: true,
  };

  const updated = await sql`
    UPDATE initiatives
    SET publication_status = 'REVIEW'::publication_status,
        metadata = metadata || ${JSON.stringify({ review_transition: transition })}::jsonb,
        updated_at = now()
    WHERE id = ${row.id}
      AND publication_status = 'DRAFT'::publication_status
    RETURNING id, slug, publication_status::text AS publication_status
  `;

  results.push(updated.length
    ? { slug: row.slug, action: "MOVED_TO_REVIEW", checks, publicExportEligible: false, humanReviewStillRequired: true }
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
