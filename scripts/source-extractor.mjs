import * as cheerio from "cheerio";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export function normalizeText(value = "") {
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePublishedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function collectJsonLd(value, output) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLd(item, output);
    return;
  }
  if (typeof value !== "object") return;

  for (const key of ["headline", "name", "description", "articleBody", "text", "abstract"]) {
    if (typeof value[key] === "string") {
      const text = normalizeText(value[key]);
      if (text.length >= 35) output.push(text);
    }
  }

  for (const key of ["@graph", "mainEntity", "hasPart", "itemListElement"]) {
    if (value[key]) collectJsonLd(value[key], output);
  }
}

function extractHtml(html) {
  const $ = cheerio.load(html);
  const jsonLdBlocks = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      collectJsonLd(JSON.parse(raw), jsonLdBlocks);
    } catch {
      // Ignore malformed structured metadata and continue with visible HTML.
    }
  });

  const pageTitle = normalizeText(
    $("meta[property='og:title']").attr("content") ||
      $("meta[name='twitter:title']").attr("content") ||
      $("h1").first().text() ||
      $("title").text(),
  );
  const description = normalizeText(
    $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='twitter:description']").attr("content") ||
      "",
  );
  const rawPublishedAt = normalizeText(
    $("meta[property='article:published_time']").attr("content") ||
      $("meta[name='date']").attr("content") ||
      $("meta[name='publish-date']").attr("content") ||
      $("time[datetime]").first().attr("datetime") ||
      "",
  );

  $("script, style, noscript, svg, nav, footer, header, form, dialog").remove();

  const preferredRoots = [
    "article",
    "[itemprop='articleBody']",
    ".article-body",
    ".article-content",
    ".field--name-body",
    ".content-body",
    "main",
    "[role='main']",
  ];
  let root = null;
  for (const selector of preferredRoots) {
    const candidate = $(selector).first();
    if (candidate.length) {
      root = candidate;
      break;
    }
  }
  if (!root) root = $("body");

  const blocks = [];
  root.find("h1, h2, h3, h4, p, li, blockquote, td").each((_, element) => {
    const text = normalizeText($(element).text());
    if (text.length >= 30) blocks.push(text);
  });

  const combined = [description, ...jsonLdBlocks, ...blocks].filter(Boolean);
  const body = [...new Set(combined)].join("\n").slice(0, 18000);

  return {
    pageTitle,
    description,
    rawPublishedAt,
    publishedAt: normalizePublishedAt(rawPublishedAt),
    body,
    sourceFormat: "HTML",
  };
}

async function extractPdf(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const parser = new PDFParse({ data: bytes, CanvasFactory });
  try {
    const result = await parser.getText({ first: 15 });
    const body = normalizeText(result.text || "").slice(0, 18000);
    return {
      pageTitle: "",
      description: "",
      rawPublishedAt: "",
      publishedAt: null,
      body,
      sourceFormat: "PDF",
    };
  } finally {
    await parser.destroy();
  }
}

function shouldRetryStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSource(url, userAgent) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5",
          "accept-language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(35000),
      });

      if (!response.ok) {
        const error = new Error(`Source HTTP ${response.status}`);
        if (attempt < 3 && shouldRetryStatus(response.status)) {
          lastError = error;
          await delay(700 * attempt);
          continue;
        }
        throw error;
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const isPdf = contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(url);
      if (isPdf) return await extractPdf(response);
      if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || !contentType) {
        return extractHtml(await response.text());
      }
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryableNetworkError = message === "fetch failed" || message.includes("timed out") || message.includes("Timeout");
      if (attempt < 3 && retryableNetworkError) {
        await delay(700 * attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Source fetch failed");
}
