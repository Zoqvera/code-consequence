import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const outputPath = resolve(
  process.env.EDITORIAL_CYCLE_REPORT_PATH || "artifacts/editorial-cycle/cycle-health.json",
);

const [latestIngestionRun] = await sql`
  SELECT
    id,
    started_at,
    completed_at,
    status,
    feeds_checked,
    items_discovered,
    items_inserted,
    errors
  FROM ingestion_runs
  ORDER BY started_at DESC
  LIMIT 1
`;

const processingRows = await sql`
  SELECT processing_status, COUNT(*)::int AS count
  FROM ingestion_items
  GROUP BY processing_status
  ORDER BY processing_status
`;

const relevanceRows = await sql`
  SELECT relevance_status, COUNT(*)::int AS count
  FROM ingestion_items
  GROUP BY relevance_status
  ORDER BY relevance_status
`;

const initiativeRows = await sql`
  SELECT publication_status::text AS publication_status, COUNT(*)::int AS count
  FROM initiatives
  GROUP BY publication_status
  ORDER BY publication_status
`;

const articleRows = await sql`
  SELECT status::text AS status, COUNT(*)::int AS count
  FROM articles
  GROUP BY status
  ORDER BY status
`;

const [staleQueue] = await sql`
  SELECT COUNT(*)::int AS count
  FROM ingestion_items
  WHERE processing_status = 'NEW'
    AND discovered_at < now() - interval '24 hours'
`;

const [sourceErrors] = await sql`
  SELECT COUNT(*)::int AS count
  FROM ingestion_items
  WHERE processing_status = 'ERROR'
`;

function countMap(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], row.count]));
}

function determineHealth({ latestRun, staleNewItems, errorItems }) {
  if (!latestRun) return "NO_DATA";
  if (latestRun.status === "FAILED") return "DEGRADED";
  if (staleNewItems > 0 || errorItems > 0 || latestRun.status === "PARTIAL") return "ATTENTION";
  return "HEALTHY";
}

const processing = countMap(processingRows, "processing_status");
const relevance = countMap(relevanceRows, "relevance_status");
const initiatives = countMap(initiativeRows, "publication_status");
const articles = countMap(articleRows, "status");
const staleNewItems = staleQueue?.count || 0;
const errorItems = sourceErrors?.count || 0;

const payload = {
  generatedAt: new Date().toISOString(),
  health: determineHealth({
    latestRun: latestIngestionRun,
    staleNewItems,
    errorItems,
  }),
  publicationBarrier: "HUMAN_APPROVAL_REQUIRED",
  latestIngestionRun: latestIngestionRun || null,
  ingestionItems: {
    processing,
    relevance,
    staleNewItems,
    errorItems,
  },
  initiatives,
  articles,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outputPath,
      health: payload.health,
      latestIngestionStatus: latestIngestionRun?.status || null,
      staleNewItems,
      errorItems,
      initiativeReviewQueue: initiatives.REVIEW || 0,
      articleReviewQueue: articles.REVIEW || 0,
    },
    null,
    2,
  ),
);
