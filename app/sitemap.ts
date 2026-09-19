import type { MetadataRoute } from "next";
import { articles, topics } from "@/lib/content";
import { events } from "@/lib/events";
import { faultlinesIssues } from "@/lib/faultlines";
import { initiatives } from "@/lib/initiatives";
import { locales, type Locale } from "@/lib/i18n";
import { organizations } from "@/lib/organizations";
import { absoluteUrl, languageAlternates, localizedPath } from "@/lib/seo";
import { sourceRegistry } from "@/lib/source-registry";

export const dynamic = "force-static";

type SitemapOptions = {
  lastModified?: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

function entry(locale: Locale, path: string, options: SitemapOptions): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(localizedPath(locale, path)),
    ...options,
    alternates: {
      languages: languageAlternates(path),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "", changeFrequency: "daily" as const, priority: 1 },
    { path: "/news", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/analysis", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/ai-monitor", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/weekly", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/dossiers", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/initiatives", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/organizations", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/sources", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/topics", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/radar", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/data", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/events", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/methodology", changeFrequency: "monthly" as const, priority: 0.6 },
  ];

  const localizedStaticRoutes = locales.flatMap((locale) =>
    staticRoutes.map((route) => entry(locale, route.path, route)),
  );

  const weeklyRoutes = faultlinesIssues.flatMap((issue) =>
    locales.map((locale) =>
      entry(locale, `/weekly/${issue.id}`, {
        lastModified: issue.endDate,
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    ),
  );

  const sourceRoutes = sourceRegistry.flatMap((source) =>
    locales.map((locale) =>
      entry(locale, `/sources/${source.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
  );

  const organizationRoutes = organizations.flatMap((organization) =>
    locales.map((locale) =>
      entry(locale, `/organizations/${organization.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
  );

  const topicRoutes = topics.flatMap((topic) =>
    locales.map((locale) =>
      entry(locale, `/topics/${topic.slug}`, {
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
  );

  const articleRoutes = articles.flatMap((article) =>
    locales.map((locale) =>
      entry(locale, `/articles/${article.slug}`, {
        lastModified: article.publishedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
  );

  const initiativeRoutes = initiatives.flatMap((initiative) =>
    locales.map((locale) =>
      entry(locale, `/initiatives/${initiative.slug}`, {
        ...(initiative.lastVerifiedAt ? { lastModified: initiative.lastVerifiedAt } : {}),
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
  );

  const eventRoutes = events.flatMap((event) =>
    locales.map((locale) =>
      entry(locale, `/events/${event.externalKey}`, {
        changeFrequency: "daily",
        priority: 0.7,
      }),
    ),
  );

  return [...localizedStaticRoutes, ...weeklyRoutes, ...sourceRoutes, ...organizationRoutes, ...topicRoutes, ...articleRoutes, ...initiativeRoutes, ...eventRoutes];
}
