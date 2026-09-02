import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const apiKey = process.env.OPENAI_API_KEY;

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const sql = neon(connectionString);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const batchSize = Math.max(1, Math.min(Number(process.env.ENRICH_BATCH_SIZE || 6), 20));

const topicValues = [
  "POWER_DEMOCRACY",
  "WORK_ECONOMY",
  "RIGHTS_SOCIETY",
  "GOVERNANCE_REGULATION",
  "INFRASTRUCTURE_PLANET",
  "SCIENCE_TECHNOLOGY",
];

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_ai_related: { type: "boolean" },
    consequence_relevance: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "NONE"] },
    editorial_priority: { type: "integer", minimum: 0, maximum: 100 },
    content_kind: {
      type: "string",
      enum: ["NEWS", "ANALYSIS_SIGNAL", "INITIATIVE_SIGNAL", "POLICY_SIGNAL", "RESEARCH_SIGNAL", "BACKGROUND", "IRRELEVANT"],
    },
    topics: { type: "array", items: { type: "string", enum: topicValues } },
    countries: { type: "array", items: { type: "string" } },
    organizations: { type: "array", items: { type: "string" } },
    initiative_detected: { type: "boolean" },
    initiative_name: { type: ["string", "null"] },
    initiative_status: {
      type: ["string", "null"],
      enum: ["ANNOUNCED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED", null],
    },
    problem_summary: { type: ["string", "null"] },
    response_summary: { type: ["string", "null"] },
    synopsis_en: { type: "string" },
    synopsis_pt_br: { type: "string" },
    evidence_signals: { type: "array", items: { type: "string" } },
    risk_flags: {
      type: "array",
      items: {
        type: "string",
        enum: ["ANNOUNCEMENT_ONLY", "UNCLEAR_DATE", "UNCLEAR_ACTOR", "LIMITED_EVIDENCE", "MARKETING_LANGUAGE", "NONE"],
      },
    },
    suggested_action: { type: "string", enum: ["DISMISS", "REVIEW", "PRIORITIZE"] },
  },
  required: [
    "is_ai_related",
    "consequence_relevance",
    "editorial_priority",
    "content_kind",
    "topics",
    "countries",
    "organizations",
    "initiative_detected",
    "initiative_name",
    "initiative_status",
    "problem_summary",
    "response_summary",
    "synopsis_en",
    "synopsis_pt_br",
    "evidence_signals",
    "risk_flags",
    "suggested_action",
  ],
};

function normalizeText(value = "") {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePublishedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function normalizeEditorialPriority(classification) {
  const parsed = Number(classification.editorial_priority);
  const bounded = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;

  if (!classification.is_ai_related || classification.suggested_action === "DISMISS") {
    return Math.min(29, bounded);
  }
  if (classification.suggested_action === "PRIORITIZE") {
    return Math.max(70, bounded);
  }
  return Math.max(30, Math.min(69, bounded));
}

function extractPage(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header, form, dialog").remove();

  const pageTitle = normalizeText($("meta[property='og:title']").attr("content") || $("h1").first().text() || $("title").text());
  const description = normalizeText(
    $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "",
  );
  const rawPublishedAt = normalizeText(
    $("meta[property='article:published_time']").attr("content") ||
      $("meta[name='date']").attr("content") ||
      $("time[datetime]").first().attr("datetime") ||
      "",
  );

  const root = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("[role='main']").first().length
        ? $("[role='main']").first()
        : $("body");

  const blocks = [];
  root.find("h1, h2, h3, p, li, blockquote").each((_, element) => {
    const text = normalizeText($(element).text());
    if (text.length >= 35) blocks.push(text);
  });

  const body = [...new Set(blocks)].join("\n").slice(0, 16000);
  return {
    pageTitle,
    description,
    rawPublishedAt,
    publishedAt: normalizePublishedAt(rawPublishedAt),
    body,
  };
}

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

async function classifyItem(item, page) {
  const input = [
    `Source publisher: ${item.publisher}`,
    `Discovery title: ${item.title}`,
    `Canonical URL: ${item.canonical_url}`,
    page.pageTitle ? `Page title: ${page.pageTitle}` : "",
    page.rawPublishedAt ? `Published date shown by page: ${page.rawPublishedAt}` : "",
    page.description ? `Page description: ${page.description}` : "",
    "Source text:",
    page.body,
  ]
    .filter(Boolean)
    .join("\n\n");

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
      max_output_tokens: 2200,
      instructions: [
        "You are the evidence-constrained editorial classification engine for Code & Consequence, a bilingual observatory of the sociopolitical and environmental consequences of artificial intelligence and real initiatives responding to them.",
        "Analyze ONLY the supplied source material. Do not use outside knowledge and do not fill gaps by inference.",
        "A page is relevant when AI substantively intersects with power, democracy, work, economy, rights, society, governance, regulation, infrastructure, energy, water, climate, minerals, public institutions, education, or another consequential social/environmental domain.",
        "Set initiative_detected=true only for a concrete law, regulation, public programme, research project, civil-society action, toolkit, standard, governance process, or other identifiable response to a problem. Mere commentary is not an initiative.",
        "Countries and organizations must be explicitly supported by the supplied source. If uncertain, omit them from arrays rather than guessing.",
        "problem_summary, response_summary, evidence_signals and both synopses must be concise paraphrases, not quotations.",
        "Keep evidence_signals to at most five short items.",
        "editorial_priority uses a 0-to-100 scale where 100 is the highest editorial priority and 0 is the lowest. Required bands: DISMISS=0-29, REVIEW=30-69, PRIORITIZE=70-100.",
        "Use PRIORITIZE only for strong consequential relevance or a concrete response initiative; REVIEW for plausible but incomplete evidence; DISMISS for navigation pages, generic AI promotion, or non-substantive material.",
      ].join("\n"),
      input,
      text: {
        format: {
          type: "json_schema",
          name: "editorial_classification",
          strict: true,
          schema: classificationSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(90000),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI HTTP ${response.status}`;
    throw new Error(message);
  }

  const text = getOutputText(payload);
  if (!text) throw new Error("OpenAI response did not contain structured output text");
  const classification = JSON.parse(text);
  const originalPriority = classification.editorial_priority;
  classification.editorial_priority = normalizeEditorialPriority(classification);

  classification._meta = {
    model: payload.model || model,
    response_id: payload.id || null,
    input_tokens: payload.usage?.input_tokens ?? null,
    output_tokens: payload.usage?.output_tokens ?? null,
    total_tokens: payload.usage?.total_tokens ?? null,
    fetched_chars: page.body.length,
    priority_original: originalPriority,
    priority_adjusted: originalPriority !== classification.editorial_priority,
    classified_at: new Date().toISOString(),
  };

  return classification;
}

function mapRelevance(classification) {
  if (!classification.is_ai_related || classification.suggested_action === "DISMISS") return "IRRELEVANT";
  if (classification.suggested_action === "PRIORITIZE") return "RELEVANT";
  return "REVIEW";
}

const items = await sql`
  SELECT i.id, i.canonical_url, i.title, i.relevance_score, f.publisher
  FROM ingestion_items i
  JOIN source_feeds f ON f.id = i.feed_id
  WHERE i.processing_status = 'NEW'
  ORDER BY i.relevance_score DESC, i.discovered_at DESC
  LIMIT ${batchSize}
`;

const results = [];

for (const item of items) {
  try {
    const response = await fetch(item.canonical_url, {
      headers: {
        "user-agent": process.env.INGESTION_USER_AGENT || "CodeAndConsequenceBot/0.1",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) throw new Error(`Unsupported content type: ${contentType || "unknown"}`);

    const html = await response.text();
    const page = extractPage(html);
    if (page.body.length < 300) throw new Error("Insufficient extractable source text");

    await sql`
      UPDATE ingestion_items
      SET processing_status = 'FETCHED', last_error = NULL, updated_at = now()
      WHERE id = ${item.id}
    `;

    const classification = await classifyItem(item, page);
    const relevanceStatus = mapRelevance(classification);

    await sql`
      UPDATE ingestion_items
      SET processing_status = 'CLASSIFIED',
          relevance_status = ${relevanceStatus},
          relevance_score = ${classification.editorial_priority},
          summary = ${classification.synopsis_en},
          published_at = COALESCE(published_at, ${page.publishedAt}::timestamptz),
          classification = ${JSON.stringify(classification)}::jsonb,
          last_error = NULL,
          updated_at = now()
      WHERE id = ${item.id}
    `;

    results.push({
      id: item.id,
      title: item.title,
      status: relevanceStatus,
      priority: classification.editorial_priority,
      priorityAdjusted: classification._meta.priority_adjusted,
      kind: classification.content_kind,
      initiative: classification.initiative_detected,
      usage: {
        inputTokens: classification._meta.input_tokens,
        outputTokens: classification._meta.output_tokens,
        totalTokens: classification._meta.total_tokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sql`
      UPDATE ingestion_items
      SET processing_status = 'ERROR', last_error = ${message.slice(0, 1000)}, updated_at = now()
      WHERE id = ${item.id}
    `;
    results.push({ id: item.id, title: item.title, status: "ERROR", error: message });
  }
}

const summary = results.reduce(
  (acc, result) => {
    acc.processed += 1;
    if (result.status === "RELEVANT") acc.relevant += 1;
    else if (result.status === "REVIEW") acc.review += 1;
    else if (result.status === "IRRELEVANT") acc.irrelevant += 1;
    else if (result.status === "ERROR") acc.errors += 1;
    if (result.usage) {
      acc.inputTokens += result.usage.inputTokens || 0;
      acc.outputTokens += result.usage.outputTokens || 0;
      acc.totalTokens += result.usage.totalTokens || 0;
    }
    return acc;
  },
  { processed: 0, relevant: 0, review: 0, irrelevant: 0, errors: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
);

console.log(JSON.stringify({ model, batchSize, summary, results }, null, 2));
if (summary.processed > 0 && summary.errors === summary.processed) process.exitCode = 1;
