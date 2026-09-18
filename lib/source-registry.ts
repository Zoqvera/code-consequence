import { articles, type Source } from "./content";
import { initiatives } from "./initiatives";
import type { Locale } from "./i18n";

export type SourceReference = {
  kind: "article" | "initiative";
  slug: string;
  title: Record<Locale, string>;
  meta: Record<Locale, string>;
};

export type SourceRecord = {
  slug: string;
  name: string;
  url: string;
  host: string;
  tier: Source["tier"];
  references: SourceReference[];
};

function canonicalizeSourceUrl(value: string) {
  const url = new URL(value);
  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function sourceSlug(source: Source) {
  const canonicalUrl = canonicalizeSourceUrl(source.url);
  const host = new URL(canonicalUrl).hostname.replace(/^www\\./, "");
  return `${slugify(`${source.name}-${host}`)}-${stableHash(canonicalUrl)}`;
}

function uniqueReferences(references: SourceReference[]) {
  const seen = new Set<string>();

  return references.filter((reference) => {
    const key = `${reference.kind}:${reference.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type SourceAccumulator = {
  source: Source;
  canonicalUrl: string;
  references: SourceReference[];
};

function addSourceReference(
  accumulators: Map<string, SourceAccumulator>,
  source: Source,
  reference: SourceReference,
) {
  const canonicalUrl = canonicalizeSourceUrl(source.url);
  const existing = accumulators.get(canonicalUrl);

  if (existing && existing.source.tier !== source.tier) {
    throw new Error(
      `Source tier conflict for ${canonicalUrl}: ${existing.source.tier} vs ${source.tier}`,
    );
  }

  if (existing) {
    existing.references.push(reference);
    return;
  }

  accumulators.set(canonicalUrl, {
    source,
    canonicalUrl,
    references: [reference],
  });
}

function collectArticleSources(accumulators: Map<string, SourceAccumulator>) {
  for (const article of articles) {
    const reference: SourceReference = {
      kind: "article",
      slug: article.slug,
      title: article.title,
      meta: article.topic,
    };

    const dossierSources = article.dossier
      ? [
          ...article.dossier.indicators.map((item) => item.source),
          ...article.dossier.timeline.map((item) => item.source),
          ...article.dossier.legislation.map((item) => item.source),
        ]
      : [];

    for (const source of [...article.sources, ...dossierSources]) {
      addSourceReference(accumulators, source, reference);
    }
  }
}

function collectInitiativeSources(accumulators: Map<string, SourceAccumulator>) {
  for (const initiative of initiatives) {
    const reference: SourceReference = {
      kind: "initiative",
      slug: initiative.slug,
      title: initiative.title,
      meta: initiative.region,
    };

    for (const source of initiative.sources) {
      addSourceReference(accumulators, source, reference);
    }
  }
}

function buildSourceRegistry() {
  const accumulators = new Map<string, SourceAccumulator>();
  collectArticleSources(accumulators);
  collectInitiativeSources(accumulators);

  return [...accumulators.values()]
    .map(({ source, canonicalUrl, references }): SourceRecord => ({
      slug: sourceSlug({ ...source, url: canonicalUrl }),
      name: source.name,
      url: canonicalUrl,
      host: new URL(canonicalUrl).hostname.replace(/^www\\./, ""),
      tier: source.tier,
      references: uniqueReferences(references).sort((a, b) =>
        a.title.en.localeCompare(b.title.en),
      ),
    }))
    .sort(
      (a, b) =>
        a.tier.localeCompare(b.tier) ||
        b.references.length - a.references.length ||
        a.name.localeCompare(b.name),
    );
}

export const sourceRegistry = buildSourceRegistry();

export function getSourceRecord(slug: string) {
  return sourceRegistry.find((source) => source.slug === slug);
}

export function getSourceRecordByUrl(url: string) {
  const canonicalUrl = canonicalizeSourceUrl(url);
  return sourceRegistry.find((source) => source.url === canonicalUrl);
}
