import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for event export");

const sql = neon(connectionString);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/generated-events.json");

const existing = await sql`SELECT to_regclass('public.events') AS events`;
let rows = [];

if (existing[0]?.events) {
  rows = await sql`
    SELECT
      external_key,
      title_en,
      title_pt_br,
      summary_en,
      summary_pt_br,
      start_date,
      end_date,
      starts_at,
      event_format,
      venue,
      city,
      country,
      organizer,
      participation_en,
      participation_pt_br,
      event_url,
      registration_url,
      source_name,
      source_url,
      is_free
    FROM events
    WHERE published = true
      AND COALESCE(end_date, start_date) >= current_date
    ORDER BY start_date ASC, starts_at ASC NULLS LAST, title_en ASC
  `;
}

const formatMap = {
  ONLINE: "Online",
  IN_PERSON: "In person",
  HYBRID: "Hybrid",
};

const events = rows.map((row) => ({
  externalKey: row.external_key,
  title: { en: row.title_en, "pt-BR": row.title_pt_br },
  summary: { en: row.summary_en, "pt-BR": row.summary_pt_br },
  startDate: new Date(row.start_date).toISOString().slice(0, 10),
  endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : null,
  startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
  format: formatMap[row.event_format] || "Online",
  venue: row.venue || null,
  city: row.city || null,
  country: row.country || null,
  organizer: row.organizer,
  participation: { en: row.participation_en, "pt-BR": row.participation_pt_br },
  eventUrl: row.event_url,
  registrationUrl: row.registration_url || null,
  isFree: row.is_free,
  source: { name: row.source_name, url: row.source_url },
}));

const snapshot = {
  generatedAt: new Date().toISOString(),
  events,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, exportedEvents: events.length }, null, 2));
