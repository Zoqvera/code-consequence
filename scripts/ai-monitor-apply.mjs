import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

if (process.env.AI_MONITOR_APPROVAL !== "APPLY") {
  throw new Error("AI_MONITOR_APPROVAL=APPLY is required. Automated surveillance cannot publish by itself.");
}

const proposalPath = resolve(getArg("--proposal") || "artifacts/ai-monitor-surveillance/report.json");
const reason = (getArg("--reason") || "Human editorial approval of fresh surveillance recommendation.").trim();

const proposal = JSON.parse(await readFile(proposalPath, "utf8"));
const assessmentsPath = resolve("data/ai-monitor-assessments.json");
const assessments = JSON.parse(await readFile(assessmentsPath, "utf8"));
const current = assessments[0];

const dimensions = ["incidents", "control", "governance", "capabilities", "institutional"];
for (const key of dimensions) {
  const value = Number(proposal.recommendation?.dimensions?.[key]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid recommended dimension ${key}: ${value}`);
  }
}

const generatedAt = new Date(proposal.generatedAt);
if (Number.isNaN(generatedAt.getTime())) throw new Error("Proposal has invalid generatedAt");
if (Date.now() - generatedAt.getTime() > 24 * 60 * 60 * 1000) {
  throw new Error("Proposal is older than 24 hours. Run surveillance again before approval.");
}

const sourceConfig = JSON.parse(await readFile(resolve("config/ai-monitor-sources.json"), "utf8"));
const sourceMap = new Map(sourceConfig.map((source) => [source.id, source]));

const evidence = [];
const seen = new Set();

for (const signal of proposal.signals || []) {
  if (seen.has(signal.source_id)) continue;
  const source = sourceMap.get(signal.source_id);
  if (!source) continue;
  seen.add(signal.source_id);
  evidence.push({
    id: `${signal.source_id}-${proposal.generatedAt.slice(0, 10)}`,
    title: signal.title_en,
    organization: source.publisher,
    jurisdiction: source.jurisdiction,
    publishedAt: proposal.generatedAt.slice(0, 10),
    url: source.url,
    note: {
      en: signal.evidence_en,
      "pt-BR": signal.evidence_pt_br,
    },
  });
}

const sameDimensions = dimensions.every(
  (key) => Number(current.dimensions[key]) === Number(proposal.recommendation.dimensions[key]),
);

if (sameDimensions && current.confidence === proposal.recommendation.confidence) {
  throw new Error("The fresh recommendation does not materially change the published assessment.");
}

const assessment = {
  date: proposal.generatedAt.slice(0, 10),
  confidence: proposal.recommendation.confidence,
  dimensions: proposal.recommendation.dimensions,
  summary: proposal.recommendation.summary,
  evidence: evidence.length ? evidence : current.evidence,
  publicationReason: reason,
};

assessments.unshift(assessment);
await writeFile(assessmentsPath, JSON.stringify(assessments, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  published: true,
  date: assessment.date,
  dimensions: assessment.dimensions,
  confidence: assessment.confidence,
  evidenceCount: assessment.evidence.length,
  publicationReason: reason,
}, null, 2));
