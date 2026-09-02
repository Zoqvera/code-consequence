import { mkdir, writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const outputDir = process.env.EDITORIAL_REPORT_DIR || "artifacts/editorial-review";

const rows = await sql`
  SELECT
    i.id,
    i.canonical_url,
    i.title,
    i.published_at,
    i.relevance_score,
    i.relevance_status,
    i.classification,
    f.publisher,
    f.reliability::text AS reliability,
    f.source_type::text AS source_type
  FROM ingestion_items i
  JOIN source_feeds f ON f.id = i.feed_id
  WHERE i.processing_status = 'CLASSIFIED'
    AND i.relevance_status IN ('RELEVANT', 'REVIEW')
    AND i.classification ? 'editorial_candidate'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const clusters = new Map();
for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  if (!candidate?.cluster_id) continue;
  const existing = clusters.get(candidate.cluster_id);
  const member = {
    id: row.id,
    title: row.title,
    url: row.canonical_url,
    publisher: row.publisher,
    reliability: row.reliability,
    sourceType: row.source_type,
    relevanceStatus: row.relevance_status,
    priority: row.relevance_score,
    publishedAt: row.published_at,
    synopsisEn: row.classification?.synopsis_en || null,
    synopsisPtBr: row.classification?.synopsis_pt_br || null,
    problemSummary: row.classification?.problem_summary || null,
    responseSummary: row.classification?.response_summary || null,
    initiativeStatus: row.classification?.initiative_status || null,
  };

  if (!existing) {
    clusters.set(candidate.cluster_id, {
      clusterId: candidate.cluster_id,
      type: candidate.candidate_type,
      title: candidate.canonical_title,
      priority: candidate.highest_priority,
      reviewState: candidate.review_state,
      verificationStatus: candidate.verification_status,
      sourceCount: candidate.source_urls?.length || 1,
      publishers: candidate.publishers || [],
      organizations: candidate.organizations || [],
      countries: candidate.countries || [],
      topics: candidate.topics || [],
      riskFlags: candidate.risk_flags || [],
      evidenceSignals: candidate.evidence_signals || [],
      members: [member],
    });
  } else {
    existing.members.push(member);
  }
}

const candidates = [...clusters.values()].sort((a, b) => b.priority - a.priority || b.sourceCount - a.sourceCount);

function verificationLane(candidate) {
  if (candidate.reviewState === "NEEDS_REVIEW") return "MANUAL_REVIEW";
  if (candidate.riskFlags.length) return "RISK_REVIEW";
  if (candidate.verificationStatus === "SINGLE_SOURCE") return "SECOND_SOURCE_REQUIRED";
  return "VERIFIED_CANDIDATE";
}

for (const candidate of candidates) candidate.lane = verificationLane(candidate);

const counts = candidates.reduce(
  (acc, candidate) => {
    acc.total += 1;
    acc[candidate.lane] = (acc[candidate.lane] || 0) + 1;
    return acc;
  },
  { total: 0, VERIFIED_CANDIDATE: 0, SECOND_SOURCE_REQUIRED: 0, RISK_REVIEW: 0, MANUAL_REVIEW: 0 },
);

const generatedAt = new Date().toISOString();
const report = {
  generatedAt,
  counts,
  candidates,
};

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const lines = [
  "# Code & Consequence — Editorial Review Queue",
  "",
  `Generated: ${generatedAt}`,
  "",
  "## Queue summary",
  "",
  `- Candidate clusters: ${counts.total}`,
  `- Verified candidates: ${counts.VERIFIED_CANDIDATE}`,
  `- Need a second source: ${counts.SECOND_SOURCE_REQUIRED}`,
  `- Need risk review: ${counts.RISK_REVIEW}`,
  `- Need manual review: ${counts.MANUAL_REVIEW}`,
  "",
  "## Priority queue",
  "",
  "| Priority | Lane | Candidate | Sources | Publisher(s) | Risks |",
  "| ---: | --- | --- | ---: | --- | --- |",
];

for (const candidate of candidates) {
  lines.push(
    `| ${candidate.priority} | ${candidate.lane} | ${escapeCell(candidate.title)} | ${candidate.sourceCount} | ${escapeCell(candidate.publishers.join(", "))} | ${escapeCell(candidate.riskFlags.join(", ") || "—")} |`,
  );
}

lines.push("", "## Candidate dossiers", "");

for (const candidate of candidates) {
  lines.push(`### ${candidate.priority} — ${candidate.title}`);
  lines.push("");
  lines.push(`- Lane: ${candidate.lane}`);
  lines.push(`- Verification: ${candidate.verificationStatus}`);
  lines.push(`- Topics: ${candidate.topics.join(", ") || "—"}`);
  lines.push(`- Organizations: ${candidate.organizations.join(", ") || "—"}`);
  lines.push(`- Countries/regions mentioned: ${candidate.countries.join(", ") || "—"}`);
  lines.push(`- Risk flags: ${candidate.riskFlags.join(", ") || "—"}`);
  lines.push(`- Evidence signals: ${candidate.evidenceSignals.join("; ") || "—"}`);
  lines.push("- Source records:");
  for (const member of candidate.members) {
    lines.push(`  - ${member.publisher}: ${member.url}`);
  }
  lines.push("");
}

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(`${outputDir}/editorial-review.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(`${outputDir}/editorial-review.md`, `${lines.join("\n")}\n`, "utf8"),
]);

console.log(JSON.stringify({ outputDir, generatedAt, counts, top10: candidates.slice(0, 10).map(({ clusterId, title, priority, lane, sourceCount, riskFlags }) => ({ clusterId, title, priority, lane, sourceCount, riskFlags })) }, null, 2));
