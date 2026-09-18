import { faultlinesIssues } from "@/lib/faultlines";
import { isLocale, locales } from "@/lib/i18n";
import { absoluteUrl, localizedPath } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function issueDescription(
  issue: (typeof faultlinesIssues)[number],
  locale: "en" | "pt-BR",
) {
  const pt = locale === "pt-BR";
  return pt
    ? `${issue.articles.length} publicação(ões), ${issue.updatedInitiatives.length} iniciativa(s) atualizada(s) e ${issue.upcomingEvents.length} evento(s) nos próximos 14 dias.`
    : `${issue.articles.length} publication(s), ${issue.updatedInitiatives.length} initiative update(s), and ${issue.upcomingEvents.length} event(s) in the next 14 days.`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return new Response("Not found", { status: 404 });
  }

  const pt = locale === "pt-BR";
  const channelUrl = absoluteUrl(localizedPath(locale, "/weekly"));
  const latest = faultlinesIssues[0];
  const lastBuildDate = new Date(`${latest.endDate}T12:00:00Z`).toUTCString();

  const items = faultlinesIssues
    .slice(0, 20)
    .map((issue) => {
      const url = absoluteUrl(localizedPath(locale, `/weekly/${issue.id}`));
      const publicationDate = new Date(`${issue.endDate}T12:00:00Z`).toUTCString();

      return [
        "<item>",
        `<title>${escapeXml(`Faultlines Weekly · ${issue.id}`)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<pubDate>${escapeXml(publicationDate)}</pubDate>`,
        `<description>${escapeXml(issueDescription(issue, locale))}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml("Faultlines Weekly — Code & Consequence")}</title>`,
    `<link>${escapeXml(channelUrl)}</link>`,
    `<description>${escapeXml(
      pt
        ? "Edição semanal derivada exclusivamente do corpus publicado do Code & Consequence."
        : "A weekly edition derived exclusively from the published Code & Consequence corpus.",
    )}</description>`,
    `<language>${locale}</language>`,
    `<lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
