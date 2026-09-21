import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const maxItems = boundedInteger(process.env.RECOVER_SOURCE_LIMIT, 20, 1, 50);
const maxAttempts = boundedInteger(process.env.RECOVER_SOURCE_MAX_ATTEMPTS, 3, 1, 10);

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function recoveryAttempts(rawPayload) {
  const attempts = Number(rawPayload?.source_recovery?.attempts || 0);
  return Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) : 0;
}

const recoverable = await sql`
  SELECT id, title, last_error, raw_payload
  FROM ingestion_items
  WHERE processing_status = 'ERROR'
    AND (
      last_error ~* '^Source HTTP (408|409|425|429|5[0-9][0-9])'
      OR last_error ILIKE '%fetch failed%'
      OR last_error ILIKE '%timed out%'
      OR last_error ILIKE '%timeout%'
      OR last_error ILIKE '%ECONNRESET%'
      OR last_error ILIKE '%ECONNREFUSED%'
      OR last_error ILIKE '%ENOTFOUND%'
      OR last_error ILIKE '%EAI_AGAIN%'
    )
    AND COALESCE((raw_payload -> 'source_recovery' ->> 'attempts')::int, 0) < ${maxAttempts}
  ORDER BY updated_at ASC
  LIMIT ${maxItems}
`;

const results = [];

for (const item of recoverable) {
  const attempts = recoveryAttempts(item.raw_payload) + 1;
  const recovery = {
    attempts,
    max_attempts: maxAttempts,
    previous_error: item.last_error,
    queued_at: new Date().toISOString(),
    strategy: "transient-source-retry-v2",
  };

  const updated = await sql`
    UPDATE ingestion_items
    SET processing_status = 'NEW',
        relevance_status = 'PENDING',
        raw_payload = jsonb_set(
          COALESCE(raw_payload, '{}'::jsonb),
          '{source_recovery}',
          ${JSON.stringify(recovery)}::jsonb,
          true
        ),
        last_error = NULL,
        updated_at = now()
    WHERE id = ${item.id}
      AND processing_status = 'ERROR'
    RETURNING id
  `;

  results.push({
    id: item.id,
    title: item.title,
    action: updated.length ? "REQUEUED" : "SKIPPED_CONCURRENCY_RACE",
    attempts,
    previousError: item.last_error,
  });
}

console.log(
  JSON.stringify(
    {
      strategy: "transient-source-retry-v2",
      maxAttempts,
      considered: recoverable.length,
      requeued: results.filter((item) => item.action === "REQUEUED").length,
      results,
    },
    null,
    2,
  ),
);
