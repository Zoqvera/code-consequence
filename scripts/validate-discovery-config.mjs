import { readFile } from "node:fs/promises";

const allowed = {
  kind: new Set(["HTML_INDEX", "RSS", "ATOM", "API"]),
  sourceType: new Set(["PRIMARY", "SCIENTIFIC", "JOURNALISTIC", "INSTITUTIONAL", "DISCOVERY"]),
  reliability: new Set(["A", "B", "C", "D"]),
  language: new Set(["en", "pt", "es", "fr"]),
};

const requiredFields = [
  "slug",
  "name",
  "publisher",
  "url",
  "kind",
  "sourceType",
  "reliability",
  "language",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase().split("-")[0];
}

function validateUrl(value, slug) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid URL for feed ${slug}: ${value}`);
  }

  assert(["http:", "https:"].includes(parsed.protocol), `Unsupported URL protocol for feed ${slug}`);
}

const feeds = JSON.parse(
  await readFile(new URL("../config/discovery-sources.json", import.meta.url), "utf8"),
);

assert(Array.isArray(feeds), "discovery-sources.json must contain an array");

const slugs = new Set();
const urls = new Set();
const languageCounts = Object.fromEntries([...allowed.language].map((language) => [language, 0]));

for (const feed of feeds) {
  for (const field of requiredFields) {
    assert(
      typeof feed[field] === "string" && feed[field].trim().length > 0,
      `Feed is missing required field ${field}`,
    );
  }

  const language = normalizeLanguage(feed.language);
  assert(allowed.kind.has(feed.kind), `Unsupported kind for feed ${feed.slug}: ${feed.kind}`);
  assert(
    allowed.sourceType.has(feed.sourceType),
    `Unsupported sourceType for feed ${feed.slug}: ${feed.sourceType}`,
  );
  assert(
    allowed.reliability.has(feed.reliability),
    `Unsupported reliability for feed ${feed.slug}: ${feed.reliability}`,
  );
  assert(
    allowed.language.has(language),
    `Unsupported language for feed ${feed.slug}: ${feed.language}`,
  );
  assert(!slugs.has(feed.slug), `Duplicate feed slug: ${feed.slug}`);
  assert(!urls.has(feed.url), `Duplicate feed URL: ${feed.url}`);

  validateUrl(feed.url, feed.slug);
  slugs.add(feed.slug);
  urls.add(feed.url);
  languageCounts[language] += 1;
}

console.log(
  JSON.stringify(
    {
      feeds: feeds.length,
      enabled: feeds.filter((feed) => feed.enabled !== false).length,
      languages: languageCounts,
    },
    null,
    2,
  ),
);
