import type { Article } from "./content";
import type { InitiativeDetail } from "./initiatives";
import type { Locale } from "./i18n";
import { absoluteUrl, localizedPath, siteName } from "./seo";

export type StructuredDataObject = Record<string, unknown>;

type BreadcrumbItem = {
  name: string;
  path: string;
};

const organizationId = absoluteUrl("/#organization");
const websiteId = absoluteUrl("/#website");

export function buildSiteSchemas(): StructuredDataObject[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: siteName,
      url: absoluteUrl("/"),
      description:
        "Independent bilingual editorial observatory covering the political, social and environmental consequences of artificial intelligence.",
      publishingPrinciples: absoluteUrl("/en/methodology"),
      knowsAbout: [
        "artificial intelligence",
        "AI governance",
        "AI regulation",
        "democracy",
        "labour and automation",
        "digital rights",
        "AI infrastructure",
        "environmental impacts of AI",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": websiteId,
      url: absoluteUrl("/"),
      name: siteName,
      description:
        "Independent reporting, analysis and verified public records about the consequences and governance of artificial intelligence.",
      publisher: { "@id": organizationId },
      inLanguage: ["en", "pt-BR"],
    },
  ];
}

export function buildBreadcrumbSchema(
  locale: Locale,
  items: BreadcrumbItem[],
): StructuredDataObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizedPath(locale, item.path)),
    })),
  };
}

export function buildArticleSchema(
  article: Article,
  locale: Locale,
): StructuredDataObject {
  const url = absoluteUrl(localizedPath(locale, `/articles/${article.slug}`));

  return {
    "@context": "https://schema.org",
    "@type": article.type === "News" ? "NewsArticle" : "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: article.title[locale],
    description: article.dek[locale],
    datePublished: article.publishedAt,
    inLanguage: locale,
    articleSection: article.topic[locale],
    author: { "@id": organizationId },
    publisher: { "@id": organizationId },
    isPartOf: { "@id": websiteId },
    about: {
      "@type": "Thing",
      name: article.topic[locale],
    },
    citation: article.sources.map((source) => source.url),
  };
}

export function buildInitiativePageSchema(
  initiative: InitiativeDetail,
  locale: Locale,
): StructuredDataObject {
  const url = absoluteUrl(localizedPath(locale, `/initiatives/${initiative.slug}`));

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: initiative.title[locale],
    description: initiative.summary[locale],
    inLanguage: locale,
    isPartOf: { "@id": websiteId },
    publisher: { "@id": organizationId },
    ...(initiative.lastVerifiedAt
      ? { lastReviewed: initiative.lastVerifiedAt.slice(0, 10) }
      : {}),
    about: {
      "@type": "Thing",
      "@id": `${url}#initiative`,
      name: initiative.title[locale],
      description: initiative.summary[locale],
      identifier: initiative.slug,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: locale === "pt-BR" ? "Organização responsável" : "Responsible organization",
          value: initiative.organization,
        },
        {
          "@type": "PropertyValue",
          name: locale === "pt-BR" ? "Região" : "Region",
          value: initiative.region[locale],
        },
        {
          "@type": "PropertyValue",
          name: locale === "pt-BR" ? "Status" : "Status",
          value: initiative.status,
        },
        {
          "@type": "PropertyValue",
          name: locale === "pt-BR" ? "Tema" : "Topic",
          value: initiative.topic[locale],
        },
      ],
      subjectOf: initiative.sources.map((source) => source.url),
    },
  };
}

export function buildCollectionPageSchema({
  locale,
  path,
  name,
  description,
  items,
}: {
  locale: Locale;
  path: string;
  name: string;
  description: string;
  items: Array<{ name: string; path: string }>;
}): StructuredDataObject {
  const url = absoluteUrl(localizedPath(locale, path));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name,
    description,
    inLanguage: locale,
    isPartOf: { "@id": websiteId },
    publisher: { "@id": organizationId },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(localizedPath(locale, item.path)),
      })),
    },
  };
}


export function buildAboutPageSchema(
  locale: Locale,
  description: string,
): StructuredDataObject {
  const url = absoluteUrl(localizedPath(locale, "/about"));

  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${url}#about`,
    url,
    name: locale === "pt-BR" ? "Sobre o Code & Consequence" : "About Code & Consequence",
    description,
    inLanguage: locale,
    isPartOf: { "@id": websiteId },
    publisher: { "@id": organizationId },
    mainEntity: { "@id": organizationId },
  };
}
