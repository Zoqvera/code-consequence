import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.EDITORIAL_CORROBORATION_APPLY === "1";

const rows = await sql`
  SELECT
    i.id,
    i.slug,
    i.publication_status::text AS publication_status,
    i.metadata,
    COUNT(DISTINCT ins.source_id) FILTER (WHERE s.reliability IN ('A','B'))::int AS reliable_source_count,
    COUNT(DISTINCT lower(trim(s.publisher))) FILTER (
      WHERE s.reliability IN ('A','B') AND NULLIF(trim(s.publisher), '') IS NOT NULL
    )::int AS distinct_reliable_publisher_count,
    COALESCE(
      array_agg(DISTINCT s.publisher) FILTER (
        WHERE s.reliability IN ('A','B') AND NULLIF(trim(s.publisher), '') IS NOT NULL
      ),
      ARRAY[]::text[]
    ) AS reliable_publishers
  FROM initiatives i
  LEFT JOIN initiative_sources ins ON ins.initiative_id = i.id
  LEFT JOIN sources s ON s.id = ins.source_id
  WHERE i.publication_status = 'REVIEW'::publication_status
    AND COALESCE(i.metadata -> 'review_transition' ->> 'transition_mode', '') = 'AUTOMATED_EVIDENCE_PIPELINE'
  GROUP BY i.id
  ORDER BY i.updated_at ASC, i.slug
`;

const plans = rows.map((row) => ({
  row,
  passes: row.reliable_source_count >= 2 && row.distinct_reliable_publisher_count >= 2,
}));

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    automatedReviewItems: rows.length,
    passing: plans.filter((plan) => plan.passes).length,
    requiringDemotion: plans.filter((plan) => !plan.passes).length,
    plans: plans.map(({ row, passes }) => ({
      slug: row.slug,
      passes,
      reliableSources: row.reliable_source_count,
      distinctReliablePublishers: row.distinct_reliable_publisher_count,
      publishers: row.reliable_publishers,
    })),
  }, null, 2));
  process.exit(0);
}

const results = [];
for (const { row, passes } of plans) {
  if (passes) {
    results.push({ slug: row.slug, action: "KEPT_IN_REVIEW" });
    continue;
  }

  const block = {
    reason: "INDEPENDENT_PUBLISHER_CORROBORATION_REQUIRED",
    enforced_at: new Date().toISOString(),
    reliable_source_count: row.reliable_source_count,
    distinct_reliable_publisher_count: row.distinct_reliable_publisher_count,
    reliable_publishers: row.reliable_publishers,
    previous_status: "REVIEW",
    new_status: "DRAFT",
    human_approval_still_required_for_publication: true,
  };

  const updated = await sql`
    UPDATE initiatives
    SET publication_status = 'DRAFT'::publication_status,
        metadata = metadata || ${JSON.stringify({
          corroboration_block: block,
          review_transition: {
            from: "REVIEW",
            to: "DRAFT",
            transitioned_at: block.enforced_at,
            gate_version: 4,
            transition_mode: "AUTOMATED_CORROBORATION_REMEDIATION",
            reason: block.reason,
            human_review_still_required_for_publication: true
          }
        })}::jsonb,
        updated_at = now()
    WHERE id = ${row.id}
      AND publication_status = 'REVIEW'::publication_status
    RETURNING slug
  `;

  results.push(updated.length
    ? { slug: row.slug, action: "DEMOTED_TO_DRAFT", block }
    : { slug: row.slug, action: "SKIPPED_CONCURRENCY_RACE" });
}

console.log(JSON.stringify({
  mode: "APPLY",
  considered: rows.length,
  keptInReview: results.filter((item) => item.action === "KEPT_IN_REVIEW").length,
  demotedToDraft: results.filter((item) => item.action === "DEMOTED_TO_DRAFT").length,
  publicExportChanged: false,
  results,
}, null, 2));
