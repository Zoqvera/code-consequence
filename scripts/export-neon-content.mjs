import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for published-content export");

const sql = neon(connectionString);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/generated-content.json");

const articleTypeMap = {
  NEWS: "News",
  ANALYSIS: "Analysis",
  DOSSIER: "Dossier",
};

const initiativeStatusMap = {
  ANNOUNCED: "Announced",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
};

function splitParagraphs(value) {
  return String(value || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildLocalizedParagraphs(enBody, ptBody) {
  const en = splitParagraphs(enBody);
  const pt = splitParagraphs(ptBody);
  if (en.length === 0 || en.length !== pt.length) return null;
  return en.map((paragraph, index) => ({
    en: paragraph,
    "pt-BR": pt[index],
  }));
}

function sourceName(row) {
  return row.publisher || row.title || "Source";
}

function toSource(row) {
  return {
    name: sourceName(row),
    url: row.url,
    tier: row.reliability,
  };
}

function toDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function toTimestamp(value) {
  return value ? new Date(value).toISOString() : null;
}

const articleRows = await sql`
  SELECT
    a.id,
    a.slug,
    a.type::text AS type,
    a.published_at,
    at.locale,
    at.title,
    at.dek,
    at.body_md
  FROM articles a
  JOIN article_translations at ON at.article_id = a.id
  WHERE a.status = 'PUBLISHED'::publication_status
  ORDER BY a.published_at DESC NULLS LAST, a.slug, at.locale
`;

const articleTopicRows = await sql`
  SELECT at.article_id, tt.locale, tt.name
  FROM article_topics at
  JOIN topics t ON t.id = at.topic_id
  JOIN topic_translations tt ON tt.topic_id = t.id
  JOIN articles a ON a.id = at.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
  ORDER BY at.article_id, t.slug, tt.locale
`;

const articleSourceRows = await sql`
  SELECT
    article_id,
    s.url,
    s.title,
    s.publisher,
    s.reliability::text AS reliability
  FROM article_sources ars
  JOIN sources s ON s.id = ars.source_id
  JOIN articles a ON a.id = ars.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
  ORDER BY article_id, s.reliability, s.publisher, s.title
`;

const dossierProfileRows = await sql`
  SELECT
    dp.article_id,
    dp.problem_statement_en,
    dp.problem_statement_pt_br,
    dp.scope_note_en,
    dp.scope_note_pt_br,
    dp.last_verified_at
  FROM dossier_profiles dp
  JOIN articles a ON a.id = dp.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
`;

const dossierCountryRows = await sql`
  SELECT dc.article_id, c.code, c.name_en, c.name_pt_br
  FROM dossier_countries dc
  JOIN countries c ON c.code = dc.country_code
  JOIN articles a ON a.id = dc.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
  ORDER BY dc.article_id, c.name_en
`;

const dossierIndicatorRows = await sql`
  SELECT
    di.article_id, di.label_en, di.label_pt_br, di.value_text, di.unit, di.observed_on,
    s.url, s.title, s.publisher, s.reliability::text AS reliability
  FROM dossier_indicators di
  JOIN sources s ON s.id = di.source_id
  JOIN articles a ON a.id = di.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
  ORDER BY di.article_id, di.display_order, di.observed_on NULLS LAST, di.id
`;

const dossierTimelineRows = await sql`
  SELECT
    dte.article_id, dte.event_date, dte.title_en, dte.title_pt_br,
    dte.summary_en, dte.summary_pt_br,
    s.url, s.title, s.publisher, s.reliability::text AS reliability
  FROM dossier_timeline_events dte
  JOIN sources s ON s.id = dte.source_id
  JOIN articles a ON a.id = dte.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
  ORDER BY dte.article_id, dte.event_date, dte.display_order, dte.id
`;

const dossierLegislationRows = await sql`
  SELECT
    dl.article_id, dl.jurisdiction_en, dl.jurisdiction_pt_br,
    dl.title_en, dl.title_pt_br, dl.status_en, dl.status_pt_br, dl.enacted_on,
    s.url, s.title, s.publisher, s.reliability::text AS reliability
  FROM dossier_legislation dl
  JOIN sources s ON s.id = dl.source_id
  JOIN articles a ON a.id = dl.article_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
  ORDER BY dl.article_id, dl.display_order, dl.enacted_on NULLS LAST, dl.id
`;

const dossierInitiativeRows = await sql`
  SELECT ai.article_id, i.slug
  FROM article_initiatives ai
  JOIN articles a ON a.id = ai.article_id
  JOIN initiatives i ON i.id = ai.initiative_id
  WHERE a.status = 'PUBLISHED'::publication_status
    AND a.type = 'DOSSIER'::article_type
    AND i.publication_status = 'PUBLISHED'::publication_status
  ORDER BY ai.article_id, i.slug
`;

const articleTopics = new Map();
for (const row of articleTopicRows) {
  const entry = articleTopics.get(row.article_id) || {};
  if (!entry[row.locale]) entry[row.locale] = row.name;
  articleTopics.set(row.article_id, entry);
}

const articleSources = new Map();
for (const row of articleSourceRows) {
  const entry = articleSources.get(row.article_id) || [];
  entry.push({ name: sourceName(row), url: row.url, tier: row.reliability });
  articleSources.set(row.article_id, entry);
}

const dossierProfiles = new Map(dossierProfileRows.map((row) => [row.article_id, row]));

const dossierCountries = new Map();
for (const row of dossierCountryRows) {
  const entry = dossierCountries.get(row.article_id) || [];
  entry.push({ en: row.name_en, "pt-BR": row.name_pt_br });
  dossierCountries.set(row.article_id, entry);
}

const dossierIndicators = new Map();
for (const row of dossierIndicatorRows) {
  const entry = dossierIndicators.get(row.article_id) || [];
  entry.push({
    label: { en: row.label_en, "pt-BR": row.label_pt_br },
    value: row.value_text,
    unit: row.unit,
    observedOn: toDate(row.observed_on),
    source: toSource(row),
  });
  dossierIndicators.set(row.article_id, entry);
}

const dossierTimeline = new Map();
for (const row of dossierTimelineRows) {
  const entry = dossierTimeline.get(row.article_id) || [];
  entry.push({
    date: toDate(row.event_date),
    title: { en: row.title_en, "pt-BR": row.title_pt_br },
    summary: row.summary_en && row.summary_pt_br
      ? { en: row.summary_en, "pt-BR": row.summary_pt_br }
      : null,
    source: toSource(row),
  });
  dossierTimeline.set(row.article_id, entry);
}

const dossierLegislation = new Map();
for (const row of dossierLegislationRows) {
  const entry = dossierLegislation.get(row.article_id) || [];
  entry.push({
    jurisdiction: { en: row.jurisdiction_en, "pt-BR": row.jurisdiction_pt_br },
    title: { en: row.title_en, "pt-BR": row.title_pt_br },
    status: row.status_en && row.status_pt_br
      ? { en: row.status_en, "pt-BR": row.status_pt_br }
      : null,
    enactedOn: toDate(row.enacted_on),
    source: toSource(row),
  });
  dossierLegislation.set(row.article_id, entry);
}

const dossierInitiatives = new Map();
for (const row of dossierInitiativeRows) {
  const entry = dossierInitiatives.get(row.article_id) || [];
  entry.push(row.slug);
  dossierInitiatives.set(row.article_id, entry);
}

const articleGroups = new Map();
for (const row of articleRows) {
  const entry = articleGroups.get(row.id) || { base: row, translations: {} };
  entry.translations[row.locale] = row;
  articleGroups.set(row.id, entry);
}

const articles = [];
const skippedArticles = [];
for (const [articleId, group] of articleGroups) {
  const en = group.translations.en;
  const pt = group.translations["pt-BR"];
  const topics = articleTopics.get(articleId) || {};
  const sources = articleSources.get(articleId) || [];
  const body = en && pt ? buildLocalizedParagraphs(en.body_md, pt.body_md) : null;
  const complete = Boolean(
    en &&
      pt &&
      topics.en &&
      topics["pt-BR"] &&
      sources.length > 0 &&
      group.base.published_at &&
      body,
  );

  if (!complete) {
    skippedArticles.push(group.base.slug);
    continue;
  }

  articles.push({
    slug: group.base.slug,
    type: articleTypeMap[group.base.type] || "Analysis",
    topic: { en: topics.en, "pt-BR": topics["pt-BR"] },
    publishedAt: new Date(group.base.published_at).toISOString().slice(0, 10),
    title: { en: en.title, "pt-BR": pt.title },
    dek: { en: en.dek || "", "pt-BR": pt.dek || "" },
    body,
    sources,
  });
}

const initiativeRows = await sql`
  SELECT
    i.id,
    i.slug,
    i.status::text AS status,
    i.region,
    i.last_verified_at,
    i.metadata,
    o.name AS organization,
    it.locale,
    it.title,
    it.summary
  FROM initiatives i
  JOIN initiative_translations it ON it.initiative_id = i.id
  LEFT JOIN organizations o ON o.id = i.organization_id
  WHERE i.publication_status = 'PUBLISHED'::publication_status
  ORDER BY i.updated_at DESC, i.slug, it.locale
`;

const initiativeTopicRows = await sql`
  SELECT it.initiative_id, tt.locale, tt.name
  FROM initiative_topics it
  JOIN topics t ON t.id = it.topic_id
  JOIN topic_translations tt ON tt.topic_id = t.id
  JOIN initiatives i ON i.id = it.initiative_id
  WHERE i.publication_status = 'PUBLISHED'::publication_status
  ORDER BY it.initiative_id, t.slug, tt.locale
`;

const initiativeSourceRows = await sql`
  SELECT
    initiative_id,
    s.url,
    s.title,
    s.publisher,
    s.reliability::text AS reliability
  FROM initiative_sources ins
  JOIN sources s ON s.id = ins.source_id
  JOIN initiatives i ON i.id = ins.initiative_id
  WHERE i.publication_status = 'PUBLISHED'::publication_status
  ORDER BY initiative_id, s.reliability, s.publisher, s.title
`;

const initiativeTopics = new Map();
for (const row of initiativeTopicRows) {
  const entry = initiativeTopics.get(row.initiative_id) || {};
  if (!entry[row.locale]) entry[row.locale] = row.name;
  initiativeTopics.set(row.initiative_id, entry);
}

const initiativeSources = new Map();
for (const row of initiativeSourceRows) {
  const entry = initiativeSources.get(row.initiative_id) || [];
  entry.push({
    name: sourceName(row),
    url: row.url,
    tier: row.reliability,
  });
  initiativeSources.set(row.initiative_id, entry);
}

const initiativeGroups = new Map();
for (const row of initiativeRows) {
  const entry = initiativeGroups.get(row.id) || { base: row, translations: {} };
  entry.translations[row.locale] = row;
  initiativeGroups.set(row.id, entry);
}

const initiatives = [];
const skippedInitiatives = [];
for (const [initiativeId, group] of initiativeGroups) {
  const en = group.translations.en;
  const pt = group.translations["pt-BR"];
  const topics = initiativeTopics.get(initiativeId) || {};
  const sources = initiativeSources.get(initiativeId) || [];
  const source = sources[0];
  const organization = String(group.base.organization || "").trim();
  const preparation = group.base.metadata?.editorial_preparation || {};
  const regionEn = String(preparation.region_en || group.base.region || "").trim();
  const regionPt = String(preparation.region_pt_br || group.base.region || "").trim();
  const organizationReviewed = Boolean(preparation.organization_evidence_url);
  const regionReviewed = Boolean(preparation.region_evidence_url);
  const complete = Boolean(
    en &&
      pt &&
      topics.en &&
      topics["pt-BR"] &&
      source &&
      organization &&
      regionEn &&
      regionPt &&
      organizationReviewed &&
      regionReviewed,
  );

  if (!complete) {
    skippedInitiatives.push(group.base.slug);
    continue;
  }

  initiatives.push({
    slug: group.base.slug,
    organization,
    region: { en: regionEn, "pt-BR": regionPt },
    status: initiativeStatusMap[group.base.status] || "Announced",
    topic: { en: topics.en, "pt-BR": topics["pt-BR"] },
    title: { en: en.title, "pt-BR": pt.title },
    summary: { en: en.summary, "pt-BR": pt.summary },
    source,
    sources,
    lastVerifiedAt: group.base.last_verified_at
      ? new Date(group.base.last_verified_at).toISOString()
      : null,
  });
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  publicationRule:
    "Only complete bilingual records explicitly marked PUBLISHED in Neon are exported; published initiatives also require evidence-backed organization, localized region, topic and source fields.",
  articles,
  initiatives,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outputPath,
      publishedArticles: articles.length,
      publishedInitiatives: initiatives.length,
      skippedIncompleteArticles: skippedArticles,
      skippedIncompleteInitiatives: skippedInitiatives,
    },
    null,
    2,
  ),
);
