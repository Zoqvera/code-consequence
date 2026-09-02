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

const initiativeColumns = await sql`
  SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'initiatives'
    AND column_name IN ('publication_status', 'last_verified_at')
`;

const initiativeColumnNames = new Set(initiativeColumns.map((row) => row.column_name));
const missingInitiativeColumns = ["publication_status", "last_verified_at"].filter(
  (column) => !initiativeColumnNames.has(column),
);

if (missingInitiativeColumns.length) {
  throw new Error(
    `Database verification failed. initiatives is missing columns: ${missingInitiativeColumns.join(", ")}`,
  );
}

const publicationColumn = initiativeColumns.find((row) => row.column_name === "publication_status");
if (publicationColumn?.is_nullable !== "NO" || !String(publicationColumn?.column_default || "").includes("DRAFT")) {
  throw new Error("Database verification failed. initiatives.publication_status must be NOT NULL with DRAFT default.");
}

console.log(
  `Database verified: ${expectedTables.length} expected tables and initiative editorial state columns found.`,
);
