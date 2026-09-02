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
  const verification = row.classification?.editorial_verification || null;
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
      title: verification?.canonical_title || candidate.canonical_title,
      priority: candidate.highest_priority,
      reviewState: candidate.review_state,
      automatedVerificationStatus: candidate.verification_status || "SINGLE_DOCUMENT",
      sourceCount: candidate.canonical_source_urls?.length || candidate.source_urls?.length || 1,
      publisherCount: candidate.distinct_publisher_count || new Set(candidate.publishers || []).size,
      publishers: candidate.publishers || [],
      organizations: candidate.organizations || [],
      countries: candidate.countries || [],
      topics: candidate.topics || [],
      riskFlags: candidate.risk_flags || [],
      evidenceSignals: candidate.evidence_signals || [],
      editorialVerification: verification,
      members: [member],
    });
  } else {
    existing.members.push(member);
    if (!existing.editorialVerification && verification) existing.editorialVerification = verification;
  }
}

const candidates = [...clusters.values()].sort((a, b) => b.priority - a.priority || b.sourceCount - a.sourceCount);

function verificationLane(candidate) {
  const manual = candidate.editorialVerification;
  if (["UMBRELLA_NOT_STANDALONE", "NOT_STANDALONE"].includes(manual?.decision)) return "NOT_STANDALONE";
  if (manual?.decision === "SPLIT_REQUIRED") return "SPLIT_REQUIRED";
  if (manual?.decision === "HOLD") return "MANUAL_REVIEW";
  if (candidate.reviewState === "NEEDS_REVIEW") return "MANUAL_REVIEW";
  if (candidate.riskFlags.length) return "RISK_REVIEW";
  if (manual?.decision === "VERIFIED_STANDALONE" && manual?.verification_level === "INDEPENDENT_CONFIRMED") {
    return "VERIFIED_CANDIDATE";
  }
  return "INDEPENDENT_SOURCE_REQUIRED";
}

for (const candidate of candidates) candidate.lane = verificationLane(candidate);

const counts = candidates.reduce(
  (acc, candidate) => {
    acc.total += 1;
    acc[candidate.lane] = (acc[candidate.lane] || 0) + 1;
    return acc;
  },
  {
    total: 0,
    VERIFIED_CANDIDATE: 0,
    INDEPENDENT_SOURCE_REQUIRED: 0,
    RISK_REVIEW: 0,
    MANUAL_REVIEW: 0,
    NOT_STANDALONE: 0,
    SPLIT_REQUIRED: 0,
  },
);

const generatedAt = new Date().toISOString();
const report = { generatedAt, counts, candidates };

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
  `- Independently verified candidates: ${counts.VERIFIED_CANDIDATE}`,
  `- Need an independent source: ${counts.INDEPENDENT_SOURCE_REQUIRED}`,
  `- Need risk review: ${counts.RISK_REVIEW}`,
  `- Need manual review: ${counts.MANUAL_REVIEW}`,
  `- Background, umbrella or event records not suitable as standalone initiatives: ${counts.NOT_STANDALONE}`,
  `- Records that must be split into distinct initiatives: ${counts.SPLIT_REQUIRED}`,
  "",
  "Verification is conservative: multiple URLs from the same publisher do not count as independent verification. Manual verification records can promote, reclassify or split a candidate.",
  "",
  "## Priority queue",
  "",
  "| Priority | Lane | Candidate | Documents | Publishers | Decision | Risks |",
  "| ---: | --- | --- | ---: | ---: | --- | --- |",
];

for (const candidate of candidates) {
  lines.push(
    `| ${candidate.priority} | ${candidate.lane} | ${escapeCell(candidate.title)} | ${candidate.sourceCount} | ${candidate.publisherCount} | ${escapeCell(candidate.editorialVerification?.decision || "—")} | ${escapeCell(candidate.riskFlags.join(", ") || "—")} |`,
  );
}

lines.push("", "## Candidate dossiers", "");

for (const candidate of candidates) {
  lines.push(`### ${candidate.priority} — ${candidate.title}`);
  lines.push("");
  lines.push(`- Lane: ${candidate.lane}`);
  lines.push(`- Automated verification: ${candidate.automatedVerificationStatus}`);
  lines.push(`- Editorial decision: ${candidate.editorialVerification?.decision || "—"}`);
  lines.push(`- Editorial verification level: ${candidate.editorialVerification?.verification_level || "—"}`);
  lines.push(`- Distinct collected documents: ${candidate.sourceCount}`);
  lines.push(`- Distinct collected publishers: ${candidate.publisherCount}`);
  lines.push(`- Topics: ${candidate.topics.join(", ") || "—"}`);
  lines.push(`- Organizations: ${candidate.organizations.join(", ") || "—"}`);
  lines.push(`- Countries/regions mentioned: ${candidate.countries.join(", ") || "—"}`);
  lines.push(`- Risk flags: ${candidate.riskFlags.join(", ") || "—"}`);
  lines.push(`- Evidence signals: ${candidate.evidenceSignals.join("; ") || "—"}`);
  if (candidate.editorialVerification?.editorial_notes) {
    lines.push(`- Editorial notes: ${candidate.editorialVerification.editorial_notes}`);
  }
  if (candidate.editorialVerification?.split_targets?.length) {
    lines.push(`- Split targets: ${candidate.editorialVerification.split_targets.join("; ")}`);
  }
  lines.push("- Collected source records:");
  for (const member of candidate.members) lines.push(`  - ${member.publisher}: ${member.url}`);
  if (candidate.editorialVerification?.evidence_sources?.length) {
    lines.push("- External verification sources:");
    for (const source of candidate.editorialVerification.evidence_sources) {
      lines.push(`  - ${source.publisher}: ${source.url} — ${source.role || "verification"}`);
    }
  }
  lines.push("");
}

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(`${outputDir}/editorial-review.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(`${outputDir}/editorial-review.md`, `${lines.join("\n")}\n`, "utf8"),
]);

console.log(JSON.stringify({
  outputDir,
  generatedAt,
  counts,
  top10: candidates.slice(0, 10).map(({ clusterId, title, priority, lane, editorialVerification, riskFlags }) => ({
    clusterId,
    title,
    priority,
    lane,
    decision: editorialVerification?.decision || null,
    riskFlags,
  })),
}, null, 2));
