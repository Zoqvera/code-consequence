import crypto from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { load } from "cheerio";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const apiKey = process.env.OPENAI_API_KEY;
if (!connectionString) throw new Error("DATABASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const sql = neon(connectionString);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const userAgent = process.env.INGESTION_USER_AGENT || "CodeAndConsequenceBot/0.1";
const forceRun = process.env.EVENTS_FORCE_RUN === "1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(await readFile(resolve(root, "config/event-sources.json"), "utf8"));
const today = new Date().toISOString().slice(0, 10);

const eventSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    events: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title_en: { type: "string" },
          title_pt_br: { type: "string" },
          summary_en: { type: "string" },
          summary_pt_br: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: ["string", "null"] },
          starts_at: { type: ["string", "null"] },
          event_format: { type: "string", enum: ["ONLINE", "IN_PERSON", "HYBRID"] },
          venue: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          organizer: { type: "string" },
          participation_en: { type: "string" },
          participation_pt_br: { type: "string" },
          event_url: { type: "string" },
          registration_url: { type: ["string", "null"] },
          is_free: { type: ["boolean", "null"] },
        },
        required: [
          "title_en",
          "title_pt_br",
          "summary_en",
          "summary_pt_br",
          "start_date",
          "end_date",
          "starts_at",
          "event_format",
          "venue",
          "city",
          "country",
          "organizer",
          "participation_en",
          "participation_pt_br",
          "event_url",
          "registration_url",
          "is_free"
        ],
      },
    },
  },
  required: ["events"],
};

function getOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

function normalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeForComparison(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function cleanNullable(value) {
  const cleaned = String(value || "").trim();
  return cleaned || null;
}

function eventKey(event) {
  return crypto
    .createHash("sha256")
    .update(`${event.title_en.trim().toLowerCase()}|${event.start_date}|${event.organizer.trim().toLowerCase()}`)
    .digest("hex");
}

async function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${source.url}`);

  const html = await response.text();
  const $ = load(html);
  $("script,style,noscript,svg,iframe,canvas").remove();

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 36000);

  const linkMap = new Map();
  $("a[href]").each((_, element) => {
    if (linkMap.size >= 180) return;
    const href = normalizeUrl($(element).attr("href"), source.url);
    if (!href) return;
    const label = $(element).text().replace(/\s+/g, " ").trim().slice(0, 160) || "Link";
    if (!linkMap.has(href)) linkMap.set(href, label);
  });

  return {
    text,
    links: [...linkMap.entries()].map(([url, label]) => ({ label, url })),
  };
}

async function extractEvents(source, page) {
  const allowed = new Map();
  for (const candidate of [source.url, ...page.links.map((link) => link.url)]) {
    const key = normalizeForComparison(candidate);
    if (key && !allowed.has(key)) allowed.set(key, normalizeUrl(candidate) || candidate);
  }

  const input = [
    `Today: ${today}`,
    `Source: ${source.name}`,
    `Source URL: ${source.url}`,
    `Source scope: ${source.scope}`,
    "Visible page text:",
    page.text,
    "Links present on the supplied page:",
    page.links.map((link) => `${link.label}: ${link.url}`).join("\n"),
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 5000,
      instructions: [
        "You curate the Events section of Code & Consequence, a bilingual observatory about artificial intelligence and its consequences.",
        "Use ONLY the supplied source text and supplied links. Never add facts, dates, places, prices, URLs or participation instructions from outside knowledge.",
        `Include only genuine upcoming events with an explicit calendar start date on or after ${today} and a substantive connection to artificial intelligence.`,
        "Do not treat a paper-submission deadline, application deadline, publication date or call-for-proposals deadline as an event unless the source also identifies an actual meeting, webinar, conference, workshop or public session with its own event date.",
        "Each included event must have a supported title, start date, organizer, format, concise description and a credible way to participate or learn how to participate.",
        "For ONLINE events, city/country/venue may be null. For IN_PERSON or HYBRID events, preserve supported venue/city/country details when present; do not infer missing geography.",
        "Set starts_at only when an exact start time and sufficient timezone information are explicitly supported; otherwise null. Use ISO 8601 with an offset when non-null.",
        "event_url and registration_url must be URLs that appear in the supplied source URL or supplied links. Never fabricate or reconstruct a URL.",
        "If the source does not establish that participation is free, set is_free=null.",
        "Write concise, neutral English and Brazilian Portuguese paraphrases. Avoid promotional language.",
        "Omit events whose date or participation path is too ambiguous to publish safely.",
      ].join("\n"),
      input,
      text: {
        format: {
          type: "json_schema",
          name: "ai_event_discovery",
          strict: true,
          schema: eventSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(90000),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
  const outputText = getOutputText(payload);
  if (!outputText) throw new Error("OpenAI response did not contain structured output text");

  const parsed = JSON.parse(outputText);
  const accepted = [];
  for (const raw of parsed.events || []) {
    if (!validIsoDate(raw.start_date) || raw.start_date < today) continue;
    if (raw.end_date && (!validIsoDate(raw.end_date) || raw.end_date < raw.start_date)) continue;
    if (!String(raw.title_en || "").trim() || !String(raw.organizer || "").trim()) continue;
    if (!String(raw.summary_en || "").trim() || !String(raw.summary_pt_br || "").trim()) continue;
    if (!String(raw.participation_en || "").trim() || !String(raw.participation_pt_br || "").trim()) continue;

    const eventUrlKey = normalizeForComparison(raw.event_url);
    const eventUrl = eventUrlKey ? allowed.get(eventUrlKey) : null;
    if (!eventUrl) continue;

    let registrationUrl = null;
    if (raw.registration_url) {
      const registrationKey = normalizeForComparison(raw.registration_url);
      registrationUrl = registrationKey ? allowed.get(registrationKey) || null : null;
    }

    let startsAt = cleanNullable(raw.starts_at);
    if (startsAt && Number.isNaN(Date.parse(startsAt))) startsAt = null;

    accepted.push({
      ...raw,
      title_en: String(raw.title_en).trim(),
      title_pt_br: String(raw.title_pt_br).trim(),
      summary_en: String(raw.summary_en).trim(),
      summary_pt_br: String(raw.summary_pt_br).trim(),
      organizer: String(raw.organizer).trim(),
      participation_en: String(raw.participation_en).trim(),
      participation_pt_br: String(raw.participation_pt_br).trim(),
      end_date: cleanNullable(raw.end_date),
      starts_at: startsAt,
      venue: cleanNullable(raw.venue),
      city: cleanNullable(raw.city),
      country: cleanNullable(raw.country),
      event_url: eventUrl,
      registration_url: registrationUrl,
      is_free: typeof raw.is_free === "boolean" ? raw.is_free : null,
      _model: payload.model || model,
      _responseId: payload.id || null,
    });
  }
  return accepted;
}

const lastSuccessful = await sql`
  SELECT completed_at
  FROM event_scan_runs
  WHERE status = 'SUCCESS' AND completed_at IS NOT NULL
  ORDER BY completed_at DESC
  LIMIT 1
`;

if (!forceRun && lastSuccessful[0]?.completed_at) {
  const elapsedHours = (Date.now() - new Date(lastSuccessful[0].completed_at).getTime()) / 3_600_000;
  if (elapsedHours < 47) {
    await writeOutput("collected", "false");
    console.log(JSON.stringify({ skipped: true, reason: "Last successful event scan is less than 47 hours old", elapsedHours }, null, 2));
    process.exit(0);
  }
}

const runRows = await sql`
  INSERT INTO event_scan_runs (status, metadata)
  VALUES ('RUNNING', ${JSON.stringify({ model, forceRun, sourceCount: sources.length })}::jsonb)
  RETURNING id
`;
const runId = runRows[0].id;

const report = { runId, model, sourcesScanned: 0, eventsFound: 0, eventsStored: 0, errors: [] };

for (const source of sources) {
  try {
    const page = await fetchSource(source);
    if (page.text.length < 120) throw new Error("Insufficient extractable source text");
    const events = await extractEvents(source, page);
    report.sourcesScanned += 1;
    report.eventsFound += events.length;

    for (const event of events) {
      const externalKey = eventKey(event);
      const metadata = {
        collectedAt: new Date().toISOString(),
        model: event._model,
        responseId: event._responseId,
        sourceScope: source.scope,
      };

      await sql`
        INSERT INTO events (
          external_key, title_en, title_pt_br, summary_en, summary_pt_br,
          start_date, end_date, starts_at, event_format, venue, city, country,
          organizer, participation_en, participation_pt_br, event_url,
          registration_url, source_name, source_url, is_free, published, metadata
        ) VALUES (
          ${externalKey}, ${event.title_en}, ${event.title_pt_br}, ${event.summary_en}, ${event.summary_pt_br},
          ${event.start_date}::date, ${event.end_date}::date, ${event.starts_at}::timestamptz,
          ${event.event_format}, ${event.venue}, ${event.city}, ${event.country},
          ${event.organizer}, ${event.participation_en}, ${event.participation_pt_br}, ${event.event_url},
          ${event.registration_url}, ${source.name}, ${source.url}, ${event.is_free}, true, ${JSON.stringify(metadata)}::jsonb
        )
        ON CONFLICT (external_key) DO UPDATE SET
          title_en = EXCLUDED.title_en,
          title_pt_br = EXCLUDED.title_pt_br,
          summary_en = EXCLUDED.summary_en,
          summary_pt_br = EXCLUDED.summary_pt_br,
          end_date = EXCLUDED.end_date,
          starts_at = EXCLUDED.starts_at,
          event_format = EXCLUDED.event_format,
          venue = EXCLUDED.venue,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          participation_en = EXCLUDED.participation_en,
          participation_pt_br = EXCLUDED.participation_pt_br,
          event_url = EXCLUDED.event_url,
          registration_url = EXCLUDED.registration_url,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url,
          is_free = EXCLUDED.is_free,
          published = true,
          last_seen_at = now(),
          updated_at = now(),
          metadata = EXCLUDED.metadata
      `;
      report.eventsStored += 1;
    }
  } catch (error) {
    report.errors.push({ source: source.name, error: error instanceof Error ? error.message : String(error) });
  }
}

const succeeded = report.sourcesScanned > 0;
await sql`
  UPDATE event_scan_runs
  SET completed_at = now(),
      status = ${succeeded ? "SUCCESS" : "ERROR"},
      sources_scanned = ${report.sourcesScanned},
      events_found = ${report.eventsFound},
      error_message = ${succeeded ? null : "All configured event sources failed"},
      metadata = ${JSON.stringify({ model, forceRun, errors: report.errors })}::jsonb
  WHERE id = ${runId}
`;

await writeOutput("collected", succeeded ? "true" : "false");
console.log(JSON.stringify(report, null, 2));
if (!succeeded) process.exitCode = 1;
