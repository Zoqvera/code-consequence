import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const expectedSlugs = new Set([
  "thailand-ai-readiness-assessment-unesco-ram",
  "european-union-artificial-intelligence-act",
  "declaration-of-santo-domingo-and-regional-roadmap-for-ethical-artificial",
  "common-european-language-data-space-lds",
  "apply-ai-strategy",
  "unesco-recommendation-on-the-ethics-of-artificial-intelligence",
  "coalition-for-linguistic-diversity-in-artificial-intelligence",
  "european-ai-office",
  "eu-ai-act-enforcement-framework",
]);

const sql = neon(connectionString);
const rows = await sql`
  SELECT slug, publication_status::text AS publication_status, metadata
  FROM initiatives
  ORDER BY slug
`;

const reviewed = rows.filter((row) => expectedSlugs.has(row.slug));
const missing = [...expectedSlugs].filter((slug) => !reviewed.some((row) => row.slug === slug));
const wrongStatus = reviewed.filter((row) => row.publication_status !== "REVIEW");
const missingCopyReview = reviewed.filter(
  (row) => row.metadata?.editorial_copy_review?.review_state !== "EDITORIAL_REVIEWED",
);
const publishedCount = rows.filter((row) => row.publication_status === "PUBLISHED").length;

const result = {
  expected: expectedSlugs.size,
  found: reviewed.length,
  inReview: reviewed.filter((row) => row.publication_status === "REVIEW").length,
  publishedInitiatives: publishedCount,
  missing,
  wrongStatus: wrongStatus.map((row) => ({ slug: row.slug, status: row.publication_status })),
  missingCopyReview: missingCopyReview.map((row) => row.slug),
};

console.log(JSON.stringify(result, null, 2));

if (missing.length || wrongStatus.length || missingCopyReview.length || publishedCount !== 0) {
  process.exit(1);
}
