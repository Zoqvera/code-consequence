import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const feeds = JSON.parse(
  await readFile(new URL("../config/discovery-sources.json", import.meta.url), "utf8"),
);

const languageProfiles = {
  en: {
    aiTerms: ["artificial intelligence", "machine learning", "generative ai"],
    impactTerms: [
      "governance", "regulation", "policy", "ethics", "rights", "democracy", "election",
      "labour", "labor", "employment", "work", "inequality", "education", "privacy",
      "surveillance", "transparency", "accountability", "copyright", "environment",
      "climate", "energy", "water", "emissions", "data center", "data centre", "mineral",
      "public sector", "government", "initiative", "programme", "program", "roadmap",
      "framework", "toolkit", "standard", "law", "act", "guideline",
    ],
    navigationLabels: ["home", "read more", "learn more", "more", "next", "previous"],
  },
  pt: {
    aiTerms: ["inteligencia artificial", "aprendizado de maquina", "ia generativa"],
    impactTerms: [
      "governanca", "regulacao", "politica", "etica", "direitos", "democracia", "eleicao",
      "trabalho", "emprego", "desigualdade", "educacao", "privacidade", "vigilancia",
      "transparencia", "responsabilizacao", "direitos autorais", "ambiente", "clima",
      "energia", "agua", "emissoes", "centro de dados", "setor publico", "governo",
      "iniciativa", "programa", "roteiro", "marco", "ferramenta", "norma", "lei", "diretriz",
    ],
    navigationLabels: ["inicio", "ler mais", "saiba mais", "mais", "proximo", "anterior"],
  },
  es: {
    aiTerms: ["inteligencia artificial", "aprendizaje automatico", "ia generativa"],
    impactTerms: [
      "gobernanza", "regulacion", "politica", "etica", "derechos", "democracia", "eleccion",
      "trabajo", "empleo", "desigualdad", "educacion", "privacidad", "vigilancia",
      "transparencia", "rendicion de cuentas", "derechos de autor", "medio ambiente", "clima",
      "energia", "agua", "emisiones", "centro de datos", "sector publico", "gobierno",
      "iniciativa", "programa", "hoja de ruta", "marco", "herramienta", "norma", "ley", "directriz",
    ],
    navigationLabels: ["inicio", "leer mas", "saber mas", "mas", "siguiente", "anterior"],
  },
  fr: {
    aiTerms: ["intelligence artificielle", "apprentissage automatique", "ia generative"],
    impactTerms: [
      "gouvernance", "reglementation", "regulation", "politique", "ethique", "droits",
      "democratie", "election", "travail", "emploi", "inegalite", "education", "vie privee",
      "surveillance", "transparence", "responsabilite", "droit d'auteur", "environnement",
      "climat", "energie", "eau", "emissions", "centre de donnees", "secteur public",
      "gouvernement", "initiative", "programme", "feuille de route", "cadre", "outil",
      "norme", "loi", "directive",
    ],
    navigationLabels: ["accueil", "lire la suite", "en savoir plus", "plus", "suivant", "precedent"],
  },
};

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase().split("-")[0];
}

function normalizeForMatch(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getLanguageProfile(language) {
  const key = normalizeLanguage(language);
  const profile = languageProfiles[key];
  if (!profile) throw new Error(`Unsupported discovery language: ${language}`);
  return profile;
}

for (const feed of feeds) {
  getLanguageProfile(feed.language);
}

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalize(value, base) {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key.startsWith("mc_") || ["fbclid", "gclid"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function relevanceScore(text, language) {
  const haystack = normalizeForMatch(text);
  const profile = getLanguageProfile(language);
  let score = 1;

  for (const term of profile.aiTerms) {
    if (haystack.includes(term)) score += 3;
  }

  for (const term of profile.impactTerms) {
    if (haystack.includes(term)) score += 1;
  }

  return Math.min(score, 10);
}

function looksLikeContent(url, title, sourceUrl, language) {
  if (title.length < 12) return false;

  const candidate = new URL(url);
  const source = new URL(sourceUrl);
  if (candidate.hostname !== source.hostname) return false;
  if (candidate.toString() === source.toString()) return false;
  if (/\/(tags?|topics?|search|about|contact)(\/|$)/i.test(candidate.pathname)) return false;

  const normalizedTitle = normalizeForMatch(title);
  const navigationLabels = getLanguageProfile(language).navigationLabels;
  if (navigationLabels.includes(normalizedTitle)) return false;

  return true;
}

const [run] = await sql`
  INSERT INTO ingestion_runs DEFAULT VALUES
  RETURNING id
`;

let feedsChecked = 0;
let itemsDiscovered = 0;
let itemsInserted = 0;
const errors = [];
const languageStats = Object.fromEntries(
  Object.keys(languageProfiles).map((language) => [
    language,
    { feedsChecked: 0, discovered: 0, inserted: 0, errors: 0 },
  ]),
);

for (const feed of feeds) {
  const enabled = feed.enabled !== false;
  const sourceLanguage = normalizeLanguage(feed.language);
  const languageStat = languageStats[sourceLanguage];
  const [feedRow] = await sql`
    INSERT INTO source_feeds (slug, name, publisher, url, kind, source_type, reliability, language, is_active)
    VALUES (${feed.slug}, ${feed.name}, ${feed.publisher}, ${feed.url}, ${feed.kind}, ${feed.sourceType}, ${feed.reliability}, ${sourceLanguage}, ${enabled})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      publisher = EXCLUDED.publisher,
      url = EXCLUDED.url,
      kind = EXCLUDED.kind,
      source_type = EXCLUDED.source_type,
      reliability = EXCLUDED.reliability,
      language = EXCLUDED.language,
      is_active = EXCLUDED.is_active,
      updated_at = now()
    RETURNING id
  `;

  if (!enabled) continue;

  try {
    const response = await fetch(feed.url, {
      headers: {
        "user-agent": "Code & Consequence/0.1 (+https://github.com/Zoqvera/code-consequence)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": `${sourceLanguage},en;q=0.7`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${feed.url}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates = new Map();

    $("a[href]").each((_, element) => {
      const title = cleanText($(element).text());
      const url = canonicalize($(element).attr("href"), feed.url);
      if (!url || !looksLikeContent(url, title, feed.url, sourceLanguage)) return;
      if (!candidates.has(url) || title.length > candidates.get(url).length) {
        candidates.set(url, title);
      }
    });

    const selected = [...candidates.entries()]
      .map(([url, title]) => ({
        url,
        title,
        score: relevanceScore(`${title} ${url}`, sourceLanguage),
      }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 150);

    itemsDiscovered += selected.length;
    languageStat.discovered += selected.length;

    for (const item of selected) {
      const hash = createHash("sha256").update(`${item.title}\n${item.url}`).digest("hex");
      const rawPayload = JSON.stringify({
        anchorText: item.title,
        sourcePage: feed.url,
        sourceLanguage,
      });
      const rows = await sql`
        INSERT INTO ingestion_items (
          feed_id, run_id, canonical_url, title, content_hash, relevance_score,
          relevance_status, processing_status, raw_payload
        )
        VALUES (
          ${feedRow.id}, ${run.id}, ${item.url}, ${item.title}, ${hash}, ${item.score},
          'PENDING', 'NEW', ${rawPayload}::jsonb
        )
        ON CONFLICT (canonical_url) DO NOTHING
        RETURNING id
      `;
      if (rows.length) {
        itemsInserted += 1;
        languageStat.inserted += 1;
      }
    }

    await sql`
      UPDATE source_feeds
      SET last_checked_at = now(), last_success_at = now(), updated_at = now()
      WHERE id = ${feedRow.id}
    `;
    feedsChecked += 1;
    languageStat.feedsChecked += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ feed: feed.slug, language: sourceLanguage, message });
    languageStat.errors += 1;
    await sql`
      UPDATE source_feeds
      SET last_checked_at = now(), updated_at = now()
      WHERE id = ${feedRow.id}
    `;
  }
}

const status = errors.length === 0 ? "SUCCESS" : feedsChecked > 0 ? "PARTIAL" : "FAILED";
await sql`
  UPDATE ingestion_runs
  SET completed_at = now(), status = ${status}, feeds_checked = ${feedsChecked},
      items_discovered = ${itemsDiscovered}, items_inserted = ${itemsInserted},
      errors = ${JSON.stringify(errors)}::jsonb
  WHERE id = ${run.id}
`;

console.log(
  JSON.stringify(
    {
      status,
      supportedLanguages: Object.keys(languageProfiles),
      languageStats,
      feedsChecked,
      itemsDiscovered,
      itemsInserted,
      errors,
    },
    null,
    2,
  ),
);
if (status === "FAILED") process.exitCode = 1;
