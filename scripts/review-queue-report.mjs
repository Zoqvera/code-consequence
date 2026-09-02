import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const sql = neon(connectionString);
const outputPath = resolve(process.env.EDITORIAL_QUEUE_REPORT_PATH || "artifacts/editorial-queue/review-queue.json");

const rows = await sql`
  SELECT
    i.slug,
    i.status::text AS operational_status,
    i.publication_status::text AS publication_status,
    i.region,
    i.last_verified_at,
    i.updated_at,
    i.metadata,
    o.name AS organization,
    en.title AS title_en,
    en.summary AS summary_en,
    pt.title AS title_pt,
    pt.summary AS summary_pt,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'url', s.url,
        'publisher', s.publisher,
        'sourceType', s.source_type::text,
        'reliability', s.reliability::text
      )) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    ) AS sources
  FROM initiatives i
  LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN initiative_translations pt ON pt.initiative_id = i.id AND pt.locale = 'pt-BR'
  LEFT JOIN initiative_sources ins ON ins.initiative_id = i.id
  LEFT JOIN sources s ON s.id = ins.source_id
  WHERE i.publication_status = 'REVIEW'::publication_status
  GROUP BY i.id, o.name, en.title, en.summary, pt.title, pt.summary
  ORDER BY i.updated_at ASC, i.slug
`;

const queue = rows.map((row) => ({
  slug: row.slug,
  operationalStatus: row.operational_status,
  organization: row.organization,
  region: {
    en: row.metadata?.editorial_preparation?.region_en || row.region || null,
    ptBr: row.metadata?.editorial_preparation?.region_pt_br || row.region || null,
  },
  titleEn: row.title_en,
  summaryEn: row.summary_en,
  titlePtBr: row.title_pt,
  summaryPtBr: row.summary_pt,
  lastVerifiedAt: row.last_verified_at,
  reviewTransition: row.metadata?.review_transition || null,
  copyReview: row.metadata?.editorial_copy_review || null,
  sources: row.sources,
}));

const payload = {
  generatedAt: new Date().toISOString(),
  reviewQueue: queue.length,
  publicationBarrier: "HUMAN_APPROVAL_REQUIRED",
  queue,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, reviewQueue: queue.length, slugs: queue.map((item) => item.slug) }, null, 2));
