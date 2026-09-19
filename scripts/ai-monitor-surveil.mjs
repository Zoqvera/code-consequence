import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const userAgent = process.env.INGESTION_USER_AGENT || "CodeAndConsequenceBot/0.2";
const sources = JSON.parse(await readFile(resolve(root, "config/ai-monitor-sources.json"), "utf8"));
const assessments = JSON.parse(await readFile(resolve(root, "data/ai-monitor-assessments.json"), "utf8"));
const current = assessments[0];

const dimensionKeys = ["incidents", "control", "governance", "capabilities", "institutional"];
const weights = { incidents: 0.30, control: 0.25, governance: 0.20, capabilities: 0.15, institutional: 0.10 };
const outputDir = resolve(root, "artifacts/ai-monitor-surveillance");
const reportPath = resolve(outputDir, "report.json");
const markdownPath = resolve(outputDir, "review.md");
const generatedAt = new Date().toISOString();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function statusFor(score) {
  if (score <= 34) return "green";
  if (score <= 69) return "yellow";
  return "red";
}

function weightedScore(dimensions) {
  return Math.round(
    dimensionKeys.reduce((total, key) => total + Number(dimensions[key] || 0) * weights[key], 0),
  );
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

async function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en,pt-BR;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const $ = load(html);
  $("script,style,noscript,svg,iframe,canvas,form").remove();

  const title = cleanText($("title").first().text() || source.name);
  const main = $("main").length ? $("main") : $("body");
  const text = cleanText(main.text()).slice(0, 18000);

  return { title, text, finalUrl: response.url || source.url };
}

const snapshots = [];
const sourceHealth = [];

for (const source of sources.filter((item) => item.enabled !== false)) {
  try {
    const page = await fetchSource(source);
    snapshots.push({
      id: source.id,
      name: source.name,
      publisher: source.publisher,
      jurisdiction: source.jurisdiction,
      dimensions: source.dimensions,
      url: source.url,
      pageTitle: page.title,
      text: page.text,
    });
    sourceHealth.push({ id: source.id, ok: true, error: null });
  } catch (error) {
    sourceHealth.push({
      id: source.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

if (snapshots.length < 3) {
  throw new Error(`Insufficient surveillance coverage: only ${snapshots.length} sources were fetched successfully`);
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    confidence: { type: "string", enum: ["low", "moderate", "high"] },
    summary_en: { type: "string" },
    summary_pt_br: { type: "string" },
    rationale_en: { type: "string" },
    rationale_pt_br: { type: "string" },
    dimension_deltas: {
      type: "object",
      additionalProperties: false,
      properties: {
        incidents: { type: "integer" },
        control: { type: "integer" },
        governance: { type: "integer" },
        capabilities: { type: "integer" },
        institutional: { type: "integer" },
      },
      required: dimensionKeys,
    },
    signals: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source_id: { type: "string" },
          dimension: { type: "string", enum: dimensionKeys },
          severity: { type: "integer" },
          direction: { type: "string", enum: ["increase", "decrease", "neutral"] },
          title_en: { type: "string" },
          title_pt_br: { type: "string" },
          evidence_en: { type: "string" },
          evidence_pt_br: { type: "string" },
        },
        required: [
          "source_id",
          "dimension",
          "severity",
          "direction",
          "title_en",
          "title_pt_br",
          "evidence_en",
          "evidence_pt_br",
        ],
      },
    },
  },
  required: [
    "confidence",
    "summary_en",
    "summary_pt_br",
    "rationale_en",
    "rationale_pt_br",
    "dimension_deltas",
    "signals",
  ],
};

const sourceBlock = snapshots
  .map((source) => [
    `SOURCE_ID: ${source.id}`,
    `NAME: ${source.name}`,
    `PUBLISHER: ${source.publisher}`,
    `JURISDICTION: ${source.jurisdiction}`,
    `RELEVANT_DIMENSIONS: ${source.dimensions.join(", ")}`,
    `URL: ${source.url}`,
    `PAGE_TITLE: ${source.pageTitle}`,
    "VISIBLE_TEXT:",
    source.text,
  ].join("\n"))
  .join("\n\n--- SOURCE BREAK ---\n\n");

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model,
    store: false,
    reasoning: { effort: "medium" },
    max_output_tokens: 6500,
    instructions: [
      "You are the evidence-analysis layer of C&C AI Monitor, an independent AI-risk observatory.",
      "Use ONLY the supplied source text. Do not use outside knowledge.",
      "Assess changes in five dimensions: incidents, technical control, governance gap, emerging capabilities, and institutional-response gap.",
      "Positive deltas mean more concern. Negative deltas mean less concern.",
      "Each dimension delta must be an integer between -8 and +8. Use 0 when the supplied evidence does not justify a material change.",
      "Do not increase risk merely because regulation exists. Governance and institutional-response scores represent gaps: stronger enforceable oversight can justify a negative delta.",
      "Do not treat hypothetical scenarios as documented incidents. Distinguish demonstrated capability from real-world harm.",
      "Severity must be an integer from 1 to 5. Severity 5 is reserved for unusually consequential, well-supported evidence.",
      "Signals must cite only SOURCE_ID values supplied in the input.",
      "Write concise neutral summaries in English and Brazilian Portuguese. Avoid sensational language.",
      "The output is a recommendation for human editorial review, never an autonomous public status decision.",
    ].join("\n"),
    input: [
      `Generated at: ${generatedAt}`,
      "CURRENT PUBLISHED ASSESSMENT:",
      JSON.stringify({
        date: current.date,
        confidence: current.confidence,
        dimensions: current.dimensions,
        score: weightedScore(current.dimensions),
        status: statusFor(weightedScore(current.dimensions)),
      }, null, 2),
      "SURVEILLANCE SOURCES:",
      sourceBlock,
    ].join("\n\n"),
    text: {
      format: {
        type: "json_schema",
        name: "cc_ai_monitor_surveillance",
        strict: true,
        schema,
      },
    },
  }),
  signal: AbortSignal.timeout(120000),
});

const payload = await response.json();
if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);

const outputText = getOutputText(payload);
if (!outputText) throw new Error("OpenAI response did not contain structured output");

const analysis = JSON.parse(outputText);
const allowedSourceIds = new Set(snapshots.map((source) => source.id));

const deltas = Object.fromEntries(
  dimensionKeys.map((key) => [key, clamp(Math.trunc(Number(analysis.dimension_deltas?.[key] || 0)), -8, 8)]),
);

const recommendedDimensions = Object.fromEntries(
  dimensionKeys.map((key) => [key, clamp(Number(current.dimensions[key]) + deltas[key], 0, 100)]),
);

const sanitizedSignals = (analysis.signals || [])
  .filter((signal) => allowedSourceIds.has(signal.source_id) && dimensionKeys.includes(signal.dimension))
  .map((signal) => ({
    ...signal,
    severity: clamp(Math.trunc(Number(signal.severity || 1)), 1, 5),
  }));

const currentScore = weightedScore(current.dimensions);
const recommendedScore = weightedScore(recommendedDimensions);
const currentStatus = statusFor(currentScore);
const recommendedStatus = statusFor(recommendedScore);
const maxDelta = Math.max(...Object.values(deltas).map((value) => Math.abs(value)));
const severeSignal = sanitizedSignals.some((signal) => signal.severity >= 4);
const requiresReview =
  recommendedStatus !== currentStatus ||
  Math.abs(recommendedScore - currentScore) >= 3 ||
  maxDelta >= 4 ||
  severeSignal;

const report = {
  generatedAt,
  model,
  current: {
    date: current.date,
    dimensions: current.dimensions,
    score: currentScore,
    status: currentStatus,
  },
  recommendation: {
    dimensions: recommendedDimensions,
    deltas,
    score: recommendedScore,
    status: recommendedStatus,
    confidence: analysis.confidence,
    summary: {
      en: cleanText(analysis.summary_en),
      "pt-BR": cleanText(analysis.summary_pt_br),
    },
    rationale: {
      en: cleanText(analysis.rationale_en),
      "pt-BR": cleanText(analysis.rationale_pt_br),
    },
  },
  signals: sanitizedSignals,
  sourceHealth,
  sourcesChecked: snapshots.length,
  sourcesConfigured: sources.filter((item) => item.enabled !== false).length,
  requiresReview,
};

const sourceMap = new Map(sources.map((source) => [source.id, source]));
const signalLines = sanitizedSignals.length
  ? sanitizedSignals.map((signal) => {
      const source = sourceMap.get(signal.source_id);
      return `- **${signal.title_en}** — ${signal.dimension}, severity ${signal.severity}/5, ${signal.direction}. ${signal.evidence_en} ([source](${source?.url || "#"}))`;
    }).join("\n")
  : "- No material signals extracted.";

const deltaLines = dimensionKeys
  .map((key) => `- **${key}**: ${current.dimensions[key]} → ${recommendedDimensions[key]} (${deltas[key] >= 0 ? "+" : ""}${deltas[key]})`)
  .join("\n");

const markdown = `## C&C AI Monitor surveillance review

**Generated:** ${generatedAt}
**Current:** ${currentStatus.toUpperCase()} · ${currentScore}/100
**Recommended:** ${recommendedStatus.toUpperCase()} · ${recommendedScore}/100
**Confidence:** ${analysis.confidence}
**Sources:** ${snapshots.length}/${sources.filter((item) => item.enabled !== false).length} available

### Recommended dimension changes
${deltaLines}

### Rationale
${cleanText(analysis.rationale_en)}

### Material signals
${signalLines}

### Editorial gate
This report is advisory. The public C&C AI Monitor status changes only through the manual **AI Monitor — Approve assessment** workflow.
`;

await mkdir(outputDir, { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
await writeFile(markdownPath, markdown, "utf8");

await writeOutput("requires_review", String(requiresReview));
await writeOutput("recommended_status", recommendedStatus);
await writeOutput("recommended_score", String(recommendedScore));
await writeOutput("generated_date", generatedAt.slice(0, 10));

console.log(JSON.stringify(report, null, 2));
