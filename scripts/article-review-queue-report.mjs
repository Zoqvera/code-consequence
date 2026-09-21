import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const outputPath = resolve(
  process.env.EDITORIAL_ARTICLE_QUEUE_REPORT_PATH || "artifacts/editorial-articles/review-queue.json",
);

const rows = await sql`
  SELECT
    a.slug,
    a.type::text AS type,
    a.status::text AS status,
    a.updated_at,
    a.metadata,
    en.title AS title_en,
    en.dek AS dek_en,
    en.body_md AS body_en,
    pt.title AS title_pt,
    pt.dek AS dek_pt,
    pt.body_md AS body_pt,
    MAX(tt_en.name) AS topic_en,
    MAX(tt_pt.name) AS topic_pt,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'url', s.url,
        'publisher', s.publisher,
        'sourceType', s.source_type::text,
        'reliability', s.reliability::text,
        'isPrimary', ars.is_primary
      )) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    ) AS sources
  FROM articles a
  LEFT JOIN article_translations en ON en.article_id = a.id AND en.locale = 'en'
  LEFT JOIN article_translations pt ON pt.article_id = a.id AND pt.locale = 'pt-BR'
  LEFT JOIN article_topics at ON at.article_id = a.id
  LEFT JOIN topic_translations tt_en ON tt_en.topic_id = at.topic_id AND tt_en.locale = 'en'
  LEFT JOIN topic_translations tt_pt ON tt_pt.topic_id = at.topic_id AND tt_pt.locale = 'pt-BR'
  LEFT JOIN article_sources ars ON ars.article_id = a.id
  LEFT JOIN sources s ON s.id = ars.source_id
  WHERE a.status = 'REVIEW'::publication_status
  GROUP BY a.id, en.title, en.dek, en.body_md, pt.title, pt.dek, pt.body_md
  ORDER BY a.updated_at ASC, a.slug
`;

const queue = rows.map((row) => ({
  slug: row.slug,
  type: row.type,
  topic: {
    en: row.topic_en || null,
    ptBr: row.topic_pt || null,
  },
  copy: {
    en: {
      title: row.title_en,
      dek: row.dek_en,
      body: row.body_en,
    },
    ptBr: {
      title: row.title_pt,
      dek: row.dek_pt,
      body: row.body_pt,
    },
  },
  researchReview: row.metadata?.editorial_copy_review || null,
  reviewTransition: row.metadata?.review_transition || null,
  sources: row.sources,
  updatedAt: row.updated_at,
}));

const payload = {
  generatedAt: new Date().toISOString(),
  reviewQueue: queue.length,
  publicationBarrier: "HUMAN_APPROVAL_REQUIRED",
  queue,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  reviewQueue: queue.length,
  slugs: queue.map((item) => item.slug),
}, null, 2));
