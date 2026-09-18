import type { MetadataRoute } from "next";
import { articles } from "@/lib/content";
import { events } from "@/lib/events";
import { initiatives } from "@/lib/initiatives";
import { locales, type Locale } from "@/lib/i18n";
import { absoluteUrl, languageAlternates, localizedPath } from "@/lib/seo";

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
    { path: "/initiatives", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/radar", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/events", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/topics", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  const localizedStaticRoutes = locales.flatMap((locale) =>
    staticRoutes.map((route) => entry(locale, route.path, route)),
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

  return [...localizedStaticRoutes, ...articleRoutes, ...initiativeRoutes, ...eventRoutes];
}
