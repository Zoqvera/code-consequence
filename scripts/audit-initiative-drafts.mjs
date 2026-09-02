import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);

const rows = await sql`
  SELECT
    i.id,
    i.slug,
    i.status::text AS operational_status,
    i.publication_status::text AS publication_status,
    i.region,
    i.country_code,
    i.organization_id,
    i.last_verified_at,
    i.metadata,
    o.name AS organization_name,
    en.title AS title_en,
    en.summary AS summary_en,
    en.problem_statement AS problem_en,
    en.goals AS goals_en,
    pt.title AS title_pt,
    pt.summary AS summary_pt,
    pt.problem_statement AS problem_pt,
    pt.goals AS goals_pt,
    COUNT(DISTINCT it.topic_id)::int AS topic_count,
    COUNT(DISTINCT ins.source_id)::int AS source_count,
    COUNT(DISTINCT ins.source_id) FILTER (WHERE s.source_type = 'PRIMARY')::int AS primary_source_count,
    COUNT(DISTINCT ins.source_id) FILTER (WHERE s.reliability IN ('A','B'))::int AS high_reliability_source_count
  FROM initiatives i
  LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN initiative_translations pt ON pt.initiative_id = i.id AND pt.locale = 'pt-BR'
  LEFT JOIN initiative_topics it ON it.initiative_id = i.id
  LEFT JOIN initiative_sources ins ON ins.initiative_id = i.id
  LEFT JOIN sources s ON s.id = ins.source_id
  WHERE i.publication_status IN ('DRAFT'::publication_status, 'REVIEW'::publication_status)
  GROUP BY i.id, o.name, en.title, en.summary, en.problem_statement, en.goals,
           pt.title, pt.summary, pt.problem_statement, pt.goals
  ORDER BY i.updated_at DESC, i.slug
`;

function filled(value) {
  return Boolean(String(value || "").trim());
}

const audits = rows.map((row) => {
  const checks = {
    englishTitle: filled(row.title_en),
    englishSummary: filled(row.summary_en),
    portugueseTitle: filled(row.title_pt),
    portugueseSummary: filled(row.summary_pt),
    organizationReviewed: Boolean(row.organization_id && row.organization_name),
    regionReviewed: filled(row.region),
    topicsLinked: row.topic_count > 0,
    primarySourcePresent: row.primary_source_count > 0,
    corroborationPresent: row.high_reliability_source_count >= 2,
    verificationTimestampPresent: Boolean(row.last_verified_at),
  };

  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    id: row.id,
    slug: row.slug,
    operationalStatus: row.operational_status,
    publicationStatus: row.publication_status,
    titleEn: row.title_en,
    titlePt: row.title_pt,
    organization: row.organization_name,
    region: row.region,
    countryCode: row.country_code,
    topicCount: row.topic_count,
    sourceCount: row.source_count,
    primarySourceCount: row.primary_source_count,
    highReliabilitySourceCount: row.high_reliability_source_count,
    lastVerifiedAt: row.last_verified_at,
    checks,
    blockers,
    readyForReview: blockers.length === 0,
    provenance: {
      sourceMatchUrl: row.metadata?.source_match_url || null,
      editorialClusterId: row.metadata?.editorial_cluster_id || null,
      rejectedFutureSourceDate: row.metadata?.rejected_future_source_date || null,
    },
  };
});

console.log(JSON.stringify({
  auditedDrafts: audits.length,
  readyForReview: audits.filter((item) => item.readyForReview).length,
  blocked: audits.filter((item) => !item.readyForReview).length,
  blockerCounts: audits.reduce((acc, item) => {
    for (const blocker of item.blockers) acc[blocker] = (acc[blocker] || 0) + 1;
    return acc;
  }, {}),
  audits,
}, null, 2));
