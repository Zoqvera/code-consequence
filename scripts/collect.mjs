import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const feeds = JSON.parse(
  await readFile(new URL("../config/discovery-sources.json", import.meta.url), "utf8"),
);

const impactTerms = [
  "governance", "regulation", "policy", "ethics", "rights", "democracy", "election",
  "labour", "labor", "employment", "work", "inequality", "education", "privacy",
  "surveillance", "transparency", "accountability", "copyright", "environment",
  "climate", "energy", "water", "emissions", "data center", "data centre", "mineral",
  "public sector", "government", "initiative", "programme", "program", "roadmap",
  "framework", "toolkit", "standard", "law", "act", "guideline",
];

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalize(value, base) {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function relevanceScore(text) {
  const haystack = text.toLowerCase();
  let score = 2;
  for (const term of impactTerms) {
    if (haystack.includes(term)) score += 1;
  }
  return Math.min(score, 10);
}

function looksLikeContent(url, title, sourceUrl) {
  if (title.length < 12) return false;
  const candidate = new URL(url);
  const source = new URL(sourceUrl);
  if (candidate.hostname !== source.hostname) return false;
  if (candidate.toString() === source.toString()) return false;
  if (/\/(tags?|topics?|search|about|contact)(\/|$)/i.test(candidate.pathname)) return false;
  if (/^(home|read more|learn more|more|next|previous)$/i.test(title)) return false;
  return true;
}

const [run] = await sql`
  INSERT INTO ingestion_runs DEFAULT VALUES
  RETURNING id
`;

let feedsChecked = 0;
let itemsDiscovered = 0;
let itemsInserted = 0;
const errors = [];

for (const feed of feeds) {
  const enabled = feed.enabled !== false;
  const [feedRow] = await sql`
    INSERT INTO source_feeds (slug, name, publisher, url, kind, source_type, reliability, language, is_active)
    VALUES (${feed.slug}, ${feed.name}, ${feed.publisher}, ${feed.url}, ${feed.kind}, ${feed.sourceType}, ${feed.reliability}, ${feed.language}, ${enabled})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      publisher = EXCLUDED.publisher,
      url = EXCLUDED.url,
      kind = EXCLUDED.kind,
      source_type = EXCLUDED.source_type,
      reliability = EXCLUDED.reliability,
      language = EXCLUDED.language,
      is_active = EXCLUDED.is_active,
      updated_at = now()
    RETURNING id
  `;

  if (!enabled) continue;

  try {
    const response = await fetch(feed.url, {
      headers: {
        "user-agent": "Code & Consequence/0.1 (+https://github.com/Zoqvera/code-consequence)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${feed.url}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates = new Map();

    $("a[href]").each((_, element) => {
      const title = cleanText($(element).text());
      const url = canonicalize($(element).attr("href"), feed.url);
      if (!url || !looksLikeContent(url, title, feed.url)) return;
      if (!candidates.has(url) || title.length > candidates.get(url).length) candidates.set(url, title);
    });

    const selected = [...candidates.entries()]
      .map(([url, title]) => ({ url, title, score: relevanceScore(`${title} ${url}`) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 150);

    itemsDiscovered += selected.length;

    for (const item of selected) {
      const hash = createHash("sha256").update(`${item.title}\n${item.url}`).digest("hex");
      const rawPayload = JSON.stringify({ anchorText: item.title, sourcePage: feed.url });
      const rows = await sql`
        INSERT INTO ingestion_items (
          feed_id, run_id, canonical_url, title, content_hash, relevance_score,
          relevance_status, processing_status, raw_payload
        )
        VALUES (
          ${feedRow.id}, ${run.id}, ${item.url}, ${item.title}, ${hash}, ${item.score},
          'PENDING', 'NEW', ${rawPayload}::jsonb
        )
        ON CONFLICT (canonical_url) DO NOTHING
        RETURNING id
      `;
      if (rows.length) itemsInserted += 1;
    }

    await sql`
      UPDATE source_feeds
      SET last_checked_at = now(), last_success_at = now(), updated_at = now()
      WHERE id = ${feedRow.id}
    `;
    feedsChecked += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ feed: feed.slug, message });
    await sql`
      UPDATE source_feeds
      SET last_checked_at = now(), updated_at = now()
      WHERE id = ${feedRow.id}
    `;
  }
}

const status = errors.length === 0 ? "SUCCESS" : feedsChecked > 0 ? "PARTIAL" : "FAILED";
await sql`
  UPDATE ingestion_runs
  SET completed_at = now(), status = ${status}, feeds_checked = ${feedsChecked},
      items_discovered = ${itemsDiscovered}, items_inserted = ${itemsInserted},
      errors = ${JSON.stringify(errors)}::jsonb
  WHERE id = ${run.id}
`;

console.log(JSON.stringify({ status, feedsChecked, itemsDiscovered, itemsInserted, errors }, null, 2));
if (status === "FAILED") process.exitCode = 1;
