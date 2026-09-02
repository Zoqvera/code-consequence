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
  if (!record.cluster_id) throw new Error("Verification record is missing cluster_id");
  if (!validDecisions.has(record.decision)) {
    throw new Error(`Unsupported editorial decision for ${record.cluster_id}: ${record.decision}`);
  }

  const rows = await sql`
    SELECT id, classification
    FROM ingestion_items
    WHERE classification -> 'editorial_candidate' ->> 'cluster_id' = ${record.cluster_id}
  `;

  if (!rows.length) {
    throw new Error(`No ingestion items found for editorial cluster ${record.cluster_id}`);
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
    clusterId: record.cluster_id,
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
