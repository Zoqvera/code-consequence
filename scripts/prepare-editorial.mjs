import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);

const stopWords = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with",
  "ai", "artificial", "intelligence",
]);

function cleanTitle(value = "") {
  return value
    .replace(/^(news|article|event)\s*/i, "")
    .replace(/^(news|article|event)(?=[A-Z])/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return cleanTitle(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !stopWords.has(token)));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function intersects(left = [], right = []) {
  if (!left.length || !right.length) return true;
  const rightNormalized = new Set(right.map(normalize));
  return left.some((value) => rightNormalized.has(normalize(value)));
}

function candidateType(classification = {}) {
  if (classification.initiative_detected) return "INITIATIVE";
  switch (classification.content_kind) {
    case "POLICY_SIGNAL": return "POLICY";
    case "RESEARCH_SIGNAL": return "RESEARCH";
    case "ANALYSIS_SIGNAL": return "ANALYSIS";
    case "NEWS": return "NEWS";
    default: return "ARTICLE";
  }
}

function candidateTitle(item) {
  return cleanTitle(item.classification?.initiative_name || item.title || "Untitled candidate");
}

function compatible(left, right) {
  if (left.type !== right.type) return false;
  if (!intersects(left.classification?.countries, right.classification?.countries)) return false;

  const leftOrganizations = left.classification?.organizations || [];
  const rightOrganizations = right.classification?.organizations || [];
  const orgCompatible = intersects(leftOrganizations, rightOrganizations);
  if (!orgCompatible) return false;

  if (left.normalizedTitle === right.normalizedTitle) return true;
  return jaccard(left.titleTokens, right.titleTokens) >= 0.86;
}

const items = await sql`
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
  ORDER BY i.relevance_score DESC, i.discovered_at DESC
`;

const prepared = items.map((item, index) => {
  const title = candidateTitle(item);
  return {
    ...item,
    index,
    type: candidateType(item.classification),
    candidateTitle: title,
    normalizedTitle: normalize(title),
    titleTokens: tokens(title),
  };
});

const parent = prepared.map((_, index) => index);
function find(index) {
  while (parent[index] !== index) {
    parent[index] = parent[parent[index]];
    index = parent[index];
  }
  return index;
}
function union(left, right) {
  const leftRoot = find(left);
  const rightRoot = find(right);
  if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
}

for (let left = 0; left < prepared.length; left += 1) {
  for (let right = left + 1; right < prepared.length; right += 1) {
    if (compatible(prepared[left], prepared[right])) union(left, right);
  }
}

const groups = new Map();
for (let index = 0; index < prepared.length; index += 1) {
  const root = find(index);
  if (!groups.has(root)) groups.set(root, []);
  groups.get(root).push(prepared[index]);
}

const now = new Date().toISOString();
const clusters = [];

for (const members of groups.values()) {
  members.sort((a, b) => b.relevance_score - a.relevance_score);
  const primary = members[0];
  const clusterSeed = `${primary.type}:${primary.normalizedTitle}:${normalize(primary.classification?.organizations?.[0] || "")}`;
  const clusterId = createHash("sha256").update(clusterSeed).digest("hex").slice(0, 16);
  const sourceUrls = [...new Set(members.map((item) => item.canonical_url))];
  const publishers = [...new Set(members.map((item) => item.publisher).filter(Boolean))];
  const organizations = [...new Set(members.flatMap((item) => item.classification?.organizations || []))];
  const countries = [...new Set(members.flatMap((item) => item.classification?.countries || []))];
  const topics = [...new Set(members.flatMap((item) => item.classification?.topics || []))];
  const riskFlags = [...new Set(members.flatMap((item) => item.classification?.risk_flags || []).filter((flag) => flag !== "NONE"))];
  const evidenceSignals = [...new Set(members.flatMap((item) => item.classification?.evidence_signals || []))].slice(0, 12);
  const hasReviewItem = members.some((item) => item.relevance_status === "REVIEW");

  const shared = {
    version: 1,
    cluster_id: clusterId,
    candidate_type: primary.type,
    canonical_title: primary.candidateTitle,
    primary_item_id: primary.id,
    highest_priority: primary.relevance_score,
    review_state: hasReviewItem ? "NEEDS_REVIEW" : "READY_FOR_REVIEW",
    verification_status: sourceUrls.length >= 2 ? "MULTI_SOURCE" : "SINGLE_SOURCE",
    duplicate_group_size: members.length,
    member_item_ids: members.map((item) => item.id),
    source_urls: sourceUrls,
    publishers,
    organizations,
    countries,
    topics,
    risk_flags: riskFlags,
    evidence_signals: evidenceSignals,
    prepared_at: now,
  };

  for (const member of members) {
    const classification = member.classification || {};
    classification.editorial_candidate = shared;
    await sql`
      UPDATE ingestion_items
      SET classification = ${JSON.stringify(classification)}::jsonb,
          updated_at = now()
      WHERE id = ${member.id}
    `;
  }

  clusters.push({
    clusterId,
    type: primary.type,
    title: primary.candidateTitle,
    priority: primary.relevance_score,
    reviewState: shared.review_state,
    verification: shared.verification_status,
    members: members.length,
    publishers,
    organizations,
    countries,
    topics,
    riskFlags,
  });
}

clusters.sort((a, b) => b.priority - a.priority || b.members - a.members);

console.log(JSON.stringify({
  inputItems: items.length,
  candidateClusters: clusters.length,
  duplicateItemsCollapsed: items.length - clusters.length,
  multiSourceClusters: clusters.filter((cluster) => cluster.verification === "MULTI_SOURCE").length,
  needsReview: clusters.filter((cluster) => cluster.reviewState === "NEEDS_REVIEW").length,
  byType: clusters.reduce((acc, cluster) => {
    acc[cluster.type] = (acc[cluster.type] || 0) + 1;
    return acc;
  }, {}),
  topCandidates: clusters.slice(0, 20),
}, null, 2));
