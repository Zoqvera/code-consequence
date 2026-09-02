import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const since = process.env.REPORT_SINCE || "2026-09-02T00:10:00Z";

const rows = await sql`
  SELECT
    id,
    title,
    relevance_status,
    relevance_score,
    classification->>'content_kind' AS content_kind,
    classification->>'initiative_detected' AS initiative_detected,
    classification->>'suggested_action' AS suggested_action,
    classification->>'consequence_relevance' AS consequence_relevance,
    classification->'_meta'->>'model' AS model,
    (classification->'_meta'->>'input_tokens')::int AS input_tokens,
    (classification->'_meta'->>'output_tokens')::int AS output_tokens,
    (classification->'_meta'->>'total_tokens')::int AS total_tokens,
    classification->'_meta'->>'classified_at' AS classified_at
  FROM ingestion_items
  WHERE processing_status = 'CLASSIFIED'
    AND classification->'_meta'->>'classified_at' >= ${since}
  ORDER BY updated_at ASC
`;

const totals = rows.reduce(
  (acc, row) => {
    acc.items += 1;
    acc.input_tokens += row.input_tokens || 0;
    acc.output_tokens += row.output_tokens || 0;
    acc.total_tokens += row.total_tokens || 0;
    return acc;
  },
  { items: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0 },
);

console.log(JSON.stringify({ since, totals, rows }, null, 2));
