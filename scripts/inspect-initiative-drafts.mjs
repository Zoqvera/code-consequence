import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const rows = await sql`
  SELECT
    i.slug,
    i.status::text AS operational_status,
    i.publication_status::text AS publication_status,
    i.region,
    i.metadata,
    o.name AS organization,
    en.title AS title_en,
    en.summary AS summary_en,
    pt.title AS title_pt,
    pt.summary AS summary_pt
  FROM initiatives i
  LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN initiative_translations pt ON pt.initiative_id = i.id AND pt.locale = 'pt-BR'
  WHERE i.publication_status = 'DRAFT'::publication_status
  ORDER BY i.slug
`;

console.log(JSON.stringify({
  draftCount: rows.length,
  drafts: rows.map((row) => ({
    slug: row.slug,
    operationalStatus: row.operational_status,
    organization: row.organization,
    region: row.region,
    titleEn: row.title_en,
    summaryEn: row.summary_en,
    titlePt: row.title_pt,
    summaryPt: row.summary_pt,
    sourceMatchUrl: row.metadata?.source_match_url || null,
    verificationSources: row.metadata?.verification_sources || [],
    rejectedFutureSourceDate: row.metadata?.rejected_future_source_date || null,
  })),
}, null, 2));
