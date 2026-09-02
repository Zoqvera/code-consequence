import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const slug = String(process.env.EDITORIAL_REVIEW_SLUG || "").trim();
const apply = process.env.EDITORIAL_REVIEW_APPLY === "1";

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!slug) throw new Error("EDITORIAL_REVIEW_SLUG is required");

const sql = neon(connectionString);

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
  WHERE i.slug = ${slug}
  GROUP BY i.id, o.name, en.title, en.summary, pt.title, pt.summary
  LIMIT 1
`;

if (!rows.length) throw new Error(`Initiative not found: ${slug}`);
const row = rows[0];
const preparation = row.metadata?.editorial_preparation || {};

function filled(value) {
  return Boolean(String(value || "").trim());
}

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
};

const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const plan = {
  slug: row.slug,
  initiativeId: row.id,
  currentStatus: row.publication_status,
  targetStatus: "REVIEW",
  blockers,
  checks,
  translationStates: {
    titlePt: preparation.portuguese_title_state || null,
    summaryPt: preparation.portuguese_summary_state || null,
  },
};

if (!apply) {
  console.log(JSON.stringify({ mode: "DRY_RUN", eligible: blockers.length === 0, plan }, null, 2));
  process.exit(blockers.length ? 2 : 0);
}

if (blockers.length) {
  throw new Error(`Review transition blocked: ${blockers.join(", ")}`);
}

const transition = {
  from: "DRAFT",
  to: "REVIEW",
  transitioned_at: new Date().toISOString(),
  gate_version: 1,
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

if (!updated.length) throw new Error("Transition lost a concurrency race; initiative is no longer DRAFT");

console.log(JSON.stringify({
  mode: "APPLY",
  transitioned: true,
  initiative: updated[0],
  publicationStatus: "REVIEW",
  publicExportEligible: false,
  humanReviewStillRequired: true,
}, null, 2));
