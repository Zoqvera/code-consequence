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
  if (initiativeSources.has(row.initiative_id)) continue;
  initiativeSources.set(row.initiative_id, {
    name: sourceName(row),
    url: row.url,
    tier: row.reliability,
  });
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
  const source = initiativeSources.get(initiativeId);
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
