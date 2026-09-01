import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(connectionString);
const expectedTables = [
  "countries",
  "organizations",
  "sources",
  "topics",
  "topic_translations",
  "articles",
  "article_translations",
  "initiatives",
  "initiative_translations",
  "article_sources",
  "article_topics",
  "initiative_sources",
  "initiative_topics",
  "article_initiatives",
  "source_feeds",
  "ingestion_runs",
  "ingestion_items",
];

const rows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

const existing = new Set(rows.map((row) => row.table_name));
const missing = expectedTables.filter((table) => !existing.has(table));

if (missing.length) {
  throw new Error(`Database verification failed. Missing tables: ${missing.join(", ")}`);
}

console.log(`Database verified: ${expectedTables.length} expected tables found.`);
