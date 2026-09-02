import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const slug = String(process.env.EDITORIAL_PUBLISH_SLUG || "").trim();
const reviewer = String(process.env.EDITORIAL_HUMAN_REVIEWER || "").trim();
const approvalPhrase = String(process.env.EDITORIAL_APPROVAL_PHRASE || "").trim();
const githubActor = String(process.env.GITHUB_ACTOR || "").trim();
const apply = process.env.EDITORIAL_PUBLISH_APPLY === "1";

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!slug) throw new Error("EDITORIAL_PUBLISH_SLUG is required");

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
    COUNT(DISTINCT ins.source_id)::int AS source_count,
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
const copyReview = row.metadata?.editorial_copy_review || {};
const reviewTransition = row.metadata?.review_transition || {};

function filled(value) {
  return Boolean(String(value || "").trim());
}

const lastVerified = row.last_verified_at ? new Date(row.last_verified_at) : null;
const verificationAgeDays = lastVerified
  ? (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  : Number.POSITIVE_INFINITY;

const checks = {
  isInReview: row.publication_status === "REVIEW",
  bilingualCopyComplete:
    filled(row.title_en) && filled(row.summary_en) && filled(row.title_pt) && filled(row.summary_pt),
  organizationReviewed: Boolean(row.organization_id && row.organization_name && preparation.organization_evidence_url),
  regionReviewed: Boolean(filled(row.region) && preparation.region_evidence_url),
  topicsLinked: row.topic_count > 0,
  sourceCoverage: row.source_count >= 2,
  primarySourcePresent: row.primary_source_count > 0,
  corroborationPresent: row.high_reliability_source_count >= 2,
  verificationTimestampPresent: Boolean(lastVerified),
  verificationFresh: verificationAgeDays <= 30,
  editorialCopyReviewed: copyReview.review_state === "EDITORIAL_REVIEWED",
  reviewGateCompleted: reviewTransition.to === "REVIEW",
  humanPublicationReviewRequired: copyReview.human_review_required_for_publication === true,
  reviewerProvided: filled(reviewer),
  explicitApprovalPhrase: approvalPhrase === "I APPROVE PUBLICATION",
};

const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const plan = {
  slug: row.slug,
  initiativeId: row.id,
  currentStatus: row.publication_status,
  targetStatus: "PUBLISHED",
  title: { en: row.title_en, "pt-BR": row.title_pt },
  organization: row.organization_name,
  region: {
    en: preparation.region_en || row.region || null,
    "pt-BR": preparation.region_pt_br || row.region || null,
  },
  reviewer: reviewer || null,
  githubActor: githubActor || null,
  verificationAgeDays: Number.isFinite(verificationAgeDays)
    ? Number(verificationAgeDays.toFixed(2))
    : null,
  sourceCounts: {
    total: row.source_count,
    primary: row.primary_source_count,
    highReliability: row.high_reliability_source_count,
  },
  checks,
  blockers,
};

if (!apply) {
  console.log(JSON.stringify({ mode: "DRY_RUN", eligible: blockers.length === 0, plan }, null, 2));
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
  primary_source_count_at_approval: row.primary_source_count,
  high_reliability_source_count_at_approval: row.high_reliability_source_count,
  last_verified_at: lastVerified.toISOString(),
  verification_age_days: Number(verificationAgeDays.toFixed(2)),
};

const updated = await sql`
  UPDATE initiatives
  SET publication_status = 'PUBLISHED'::publication_status,
      metadata = metadata || ${JSON.stringify({ publication_approval: publicationApproval })}::jsonb,
      updated_at = now()
  WHERE id = ${row.id}
    AND publication_status = 'REVIEW'::publication_status
  RETURNING id, slug, publication_status::text AS publication_status
`;

if (!updated.length) {
  throw new Error("Publication lost a concurrency race; initiative is no longer REVIEW");
}

console.log(JSON.stringify({
  mode: "APPLY",
  published: true,
  initiative: updated[0],
  approval: publicationApproval,
  rebuildRequired: true,
}, null, 2));
