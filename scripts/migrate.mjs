import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(connectionString);
const source = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

// The schema currently contains only simple DDL statements, so semicolon
// splitting is sufficient. Keep function/procedure bodies out of this file
// unless this migration runner is upgraded to a full SQL parser.
const statements = source
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  try {
    await sql.query(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Initial schema creation should be re-runnable. PostgreSQL reports these
    // cases when an enum/table/index already exists.
    if (/already exists/i.test(message)) {
      console.log(`skip: ${message}`);
      continue;
    }

    throw error;
  }
}

console.log(`Applied ${statements.length} schema statements.`);
