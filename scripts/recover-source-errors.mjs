import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const maxItems = Math.max(1, Math.min(Number(process.env.RECOVER_SOURCE_LIMIT || 20), 50));

const recoverable = await sql`
  SELECT id, title, last_error
  FROM ingestion_items
  WHERE processing_status = 'ERROR'
    AND (
      last_error ILIKE 'Source HTTP %'
      OR last_error ILIKE '%fetch failed%'
      OR last_error ILIKE '%Insufficient extractable source text%'
      OR last_error ILIKE '%Unsupported content type%'
      OR last_error ILIKE '%timed out%'
      OR last_error ILIKE '%Timeout%'
    )
  ORDER BY updated_at ASC
  LIMIT ${maxItems}
`;

for (const item of recoverable) {
  await sql`
    UPDATE ingestion_items
    SET processing_status = 'NEW',
        relevance_status = 'PENDING',
        raw_payload = jsonb_set(
          COALESCE(raw_payload, '{}'::jsonb),
          '{source_recovery}',
          ${JSON.stringify({
            previous_error: item.last_error,
            queued_at: new Date().toISOString(),
            strategy: "resilient-extractor-v1",
          })}::jsonb,
          true
        ),
        last_error = NULL,
        updated_at = now()
    WHERE id = ${item.id}
  `;
}

console.log(JSON.stringify({
  recovered: recoverable.length,
  items: recoverable.map((item) => ({ id: item.id, title: item.title, previousError: item.last_error })),
}, null, 2));
