import { readdir, readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(connectionString);

async function applySqlSource(label, source) {
  // The schema and migration files currently contain only simple DDL
  // statements, so semicolon splitting is sufficient. Keep function or
  // procedure bodies out of these files unless this runner is upgraded to a
  // full SQL parser.
  const statements = source
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await sql.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Fresh-schema creation and additive migrations are intentionally
      // re-runnable. Other errors must remain visible.
      if (/already exists|duplicate column/i.test(message)) {
        console.log(`skip ${label}: ${message}`);
        continue;
      }

      throw error;
    }
  }

  console.log(`Applied ${statements.length} statements from ${label}.`);
}

const migrationsUrl = new URL("../db/migrations/", import.meta.url);
let migrationFiles = [];
try {
  migrationFiles = (await readdir(migrationsUrl))
    .filter((name) => name.endsWith(".sql"))
    .sort();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const existingCoreTables = await sql`
  SELECT to_regclass('public.initiatives') AS initiatives,
         to_regclass('public.ingestion_items') AS ingestion_items
`;
const hasBaseSchema = Boolean(existingCoreTables[0]?.initiatives && existingCoreTables[0]?.ingestion_items);

if (!hasBaseSchema) {
  const schemaUrl = new URL("../db/schema.sql", import.meta.url);
  await applySqlSource("db/schema.sql", await readFile(schemaUrl, "utf8"));
} else {
  console.log("Base schema already exists; applying versioned migrations only.");
}

for (const migrationFile of migrationFiles) {
  const migrationUrl = new URL(migrationFile, migrationsUrl);
  await applySqlSource(`db/migrations/${migrationFile}`, await readFile(migrationUrl, "utf8"));
}

console.log(`Database migration complete. ${migrationFiles.length} migration file(s) checked.`);
