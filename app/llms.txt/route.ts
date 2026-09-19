import { topics } from "@/lib/content";
import { absoluteUrl, localizedPath, siteName } from "@/lib/seo";

export const dynamic = "force-static";

function route(locale: "en" | "pt-BR", path = "") {
  return absoluteUrl(localizedPath(locale, path));
}

export function GET() {
  const topicLines = topics
    .map((topic) => `- [${topic.en}](${route("en", `/topics/${topic.slug}`)}) / [${topic["pt-BR"]}](${route("pt-BR", `/topics/${topic.slug}`)})`)
    .join("\n");

  const body = `# ${siteName}

> Independent bilingual editorial observatory covering the political, social and environmental consequences of artificial intelligence and verified responses to them.

## Canonical editions
- [English](${route("en")})
- [Português do Brasil](${route("pt-BR")})

## Primary sections
- [News](${route("en", "/news")})
- [Analysis](${route("en", "/analysis")})
- [Persistent dossiers](${route("en", "/dossiers")})
- [Verified initiatives](${route("en", "/initiatives")})
- [Organizations](${route("en", "/organizations")})
- [Topics](${route("en", "/topics")})
- [Global Radar](${route("en", "/radar")})
- [Data](${route("en", "/data")})
- [AI events](${route("en", "/events")})
- [C&C AI Monitor](${route("en", "/ai-monitor")})

## Editorial trust and provenance
- [About](${route("en", "/about")})
- [Methodology](${route("en", "/methodology")})
- [Public source registry](${route("en", "/sources")})
- Articles and initiative records expose the external sources used to support the published record.
- Automated discovery and classification do not have independent publication authority; published records require the editorial gates described in the methodology.

## Core topics
${topicLines}

## Machine-readable discovery
- [XML sitemap](${absoluteUrl("/sitemap.xml")})
- [robots.txt](${absoluteUrl("/robots.txt")})

Use canonical page URLs when citing Code & Consequence. Prefer the source links shown on article and initiative pages when verifying underlying factual claims.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
