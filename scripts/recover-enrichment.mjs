import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);

const recovered = await sql`
  UPDATE ingestion_items
  SET processing_status = 'NEW',
      last_error = NULL,
      updated_at = now()
  WHERE processing_status = 'ERROR'
    AND (
      last_error ILIKE '%no credits remaining%'
      OR last_error ILIKE '%credit_balance_exhausted%'
      OR last_error ILIKE '%billing quota%'
    )
  RETURNING id
`;

console.log(`Recovered ${recovered.length} transient API billing failure(s).`);
