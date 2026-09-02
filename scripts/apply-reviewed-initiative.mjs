import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const slug = String(process.env.EDITORIAL_REVIEW_SLUG || "").trim();
const apply = process.env.EDITORIAL_COPY_APPLY === "1";

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!slug) throw new Error("EDITORIAL_REVIEW_SLUG is required");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviews = JSON.parse(await readFile(resolve(root, "data/editorial/initiative-reviews.json"), "utf8"));
const review = reviews[slug];
if (!review) throw new Error(`No source-verified editorial review found for: ${slug}`);

const sql = neon(connectionString);
const rows = await sql`
  SELECT
    i.id,
    i.slug,
    i.publication_status::text AS publication_status,
    i.region,
    i.metadata,
    o.name AS organization_name,
    en.title AS title_en,
    en.summary AS summary_en,
    pt.title AS title_pt,
    pt.summary AS summary_pt
  FROM initiatives i
  LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN initiative_translations pt ON pt.initiative_id = i.id AND pt.locale = 'pt-BR'
  WHERE i.slug = ${slug}
  LIMIT 1
`;

if (!rows.length) throw new Error(`Initiative not found: ${slug}`);
const row = rows[0];

const blockers = [];
if (row.publication_status !== "DRAFT") blockers.push("initiativeNotDraft");
if (row.organization_name !== review.organization) blockers.push("organizationMismatch");
if (row.region !== review.regionEn) blockers.push("regionMismatch");
if (!review.titleEn || !review.summaryEn || !review.titlePt || !review.summaryPt) blockers.push("reviewCopyIncomplete");
if (!Array.isArray(review.evidenceUrls) || review.evidenceUrls.length < 2) blockers.push("insufficientReviewEvidence");

const plan = {
  slug,
  initiativeId: row.id,
  currentStatus: row.publication_status,
  blockers,
  before: {
    titleEn: row.title_en,
    summaryEn: row.summary_en,
    titlePt: row.title_pt,
    summaryPt: row.summary_pt,
  },
  after: {
    titleEn: review.titleEn,
    summaryEn: review.summaryEn,
    titlePt: review.titlePt,
    summaryPt: review.summaryPt,
  },
  evidenceUrls: review.evidenceUrls,
  reviewNotes: review.reviewNotes || null,
};

if (!apply) {
  console.log(JSON.stringify({ mode: "DRY_RUN", eligible: blockers.length === 0, plan }, null, 2));
  process.exit(blockers.length ? 2 : 0);
}

if (blockers.length) throw new Error(`Editorial copy application blocked: ${blockers.join(", ")}`);

await sql`
  UPDATE initiative_translations
  SET title = ${review.titleEn},
      summary = ${review.summaryEn}
  WHERE initiative_id = ${row.id}
    AND locale = 'en'
`;

await sql`
  UPDATE initiative_translations
  SET title = ${review.titlePt},
      summary = ${review.summaryPt}
  WHERE initiative_id = ${row.id}
    AND locale = 'pt-BR'
`;

const reviewedAt = new Date().toISOString();
const existingPreparation = row.metadata?.editorial_preparation || {};
const metadata = {
  ...(row.metadata || {}),
  editorial_preparation: {
    ...existingPreparation,
    portuguese_title_state: "EDITORIAL_REVIEWED",
    portuguese_summary_state: "EDITORIAL_REVIEWED",
    english_summary_state: "EDITORIAL_REVIEWED",
    copy_reviewed_at: reviewedAt,
  },
  editorial_copy_review: {
    review_state: "EDITORIAL_REVIEWED",
    reviewer_type: "AI_ASSISTED_EDITORIAL_REVIEW",
    reviewed_at: reviewedAt,
    evidence_urls: review.evidenceUrls,
    review_notes: review.reviewNotes || null,
    human_review_required_for_publication: true,
  },
};

await sql`
  UPDATE initiatives
  SET metadata = ${JSON.stringify(metadata)}::jsonb,
      updated_at = now()
  WHERE id = ${row.id}
    AND publication_status = 'DRAFT'::publication_status
`;

console.log(JSON.stringify({
  mode: "APPLY",
  updated: true,
  slug,
  publicationStatus: "DRAFT",
  copyReviewState: "EDITORIAL_REVIEWED",
  humanReviewRequiredForPublication: true,
  evidenceUrls: review.evidenceUrls,
}, null, 2));
