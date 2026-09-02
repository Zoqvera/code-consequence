import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const verificationFile = process.env.EDITORIAL_VERIFICATION_FILE || "data/editorial-verifications.json";
const payload = JSON.parse(await readFile(verificationFile, "utf8"));

if (!Array.isArray(payload.records) || !payload.records.length) {
  throw new Error("No editorial verification records found");
}

const validDecisions = new Set([
  "VERIFIED_STANDALONE",
  "UMBRELLA_NOT_STANDALONE",
  "SPLIT_REQUIRED",
  "HOLD",
]);

let updatedItems = 0;
const applied = [];

for (const record of payload.records) {
  if (!record.match_url) throw new Error("Verification record is missing match_url");
  if (!validDecisions.has(record.decision)) {
    throw new Error(`Unsupported editorial decision for ${record.match_url}: ${record.decision}`);
  }

  const anchorRows = await sql`
    SELECT id, canonical_url, classification
    FROM ingestion_items
    WHERE canonical_url = ${record.match_url}
    LIMIT 1
  `;

  if (!anchorRows.length) {
    throw new Error(`No ingestion item found for verification anchor ${record.match_url}`);
  }

  const anchor = anchorRows[0];
  const resolvedClusterId = anchor.classification?.editorial_candidate?.cluster_id;
  if (!resolvedClusterId) {
    throw new Error(`Verification anchor has no editorial cluster: ${record.match_url}`);
  }

  const rows = await sql`
    SELECT id, canonical_url, classification
    FROM ingestion_items
    WHERE classification -> 'editorial_candidate' ->> 'cluster_id' = ${resolvedClusterId}
  `;

  if (!rows.length) {
    throw new Error(`No ingestion items found for resolved editorial cluster ${resolvedClusterId}`);
  }

  const verification = {
    version: payload.version || 1,
    reviewed_at: payload.reviewed_at || new Date().toISOString(),
    decision: record.decision,
    verification_level: record.verification_level || "NOT_APPLICABLE",
    canonical_title: record.canonical_title || null,
    editorial_notes: record.editorial_notes || null,
    evidence_sources: record.evidence_sources || [],
    split_targets: record.split_targets || [],
    match_url: record.match_url,
    previous_cluster_id: record.previous_cluster_id || null,
    resolved_cluster_id: resolvedClusterId,
  };

  for (const row of rows) {
    const classification = row.classification || {};
    classification.editorial_verification = verification;
    await sql`
      UPDATE ingestion_items
      SET classification = ${JSON.stringify(classification)}::jsonb,
          updated_at = now()
      WHERE id = ${row.id}
    `;
    updatedItems += 1;
  }

  applied.push({
    matchUrl: record.match_url,
    previousClusterId: record.previous_cluster_id || null,
    resolvedClusterId,
    decision: record.decision,
    verificationLevel: verification.verification_level,
    itemsUpdated: rows.length,
    evidenceSources: verification.evidence_sources.length,
  });
}

console.log(JSON.stringify({
  verificationFile,
  recordsApplied: applied.length,
  updatedItems,
  applied,
}, null, 2));
