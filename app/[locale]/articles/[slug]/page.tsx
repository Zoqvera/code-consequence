import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextualRelations } from "@/components/contextual-relations";
import { DossierSections } from "@/components/dossier-sections";
import { SourceList } from "@/components/source-list";
import { StructuredData } from "@/components/structured-data";
import { articles, getArticle } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import {
  getRelatedInitiativesForArticle,
  getTopicForArticle,
} from "@/lib/topic-hubs";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.flatMap((article) =>
    locales.map((locale) => ({ locale, slug: article.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const article = getArticle(slug);
  if (!article) return {};

  return buildMetadata({
    locale,
    title: article.title[locale],
    description: article.dek[locale],
    path: `/articles/${slug}`,
    kind: "article",
    publishedTime: article.publishedAt,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const article = getArticle(slug);
  if (!article) notFound();

  const pt = locale === "pt-BR";
  const topic = getTopicForArticle(slug);
  const relatedInitiatives = getRelatedInitiativesForArticle(slug);
  const collectionHref = article.type === "News"
    ? `/${locale}/news`
    : article.type === "Analysis"
      ? `/${locale}/analysis`
      : `/${locale}/dossiers`;
  const collectionLabel = article.type === "News"
    ? (pt ? "Notícias" : "News")
    : article.type === "Analysis"
      ? (pt ? "Análises" : "Analysis")
      : (pt ? "Dossiês" : "Dossiers");

  const structuredData = [
    buildArticleSchema(article, locale),
    buildBreadcrumbSchema(locale, [
      { name: pt ? "Início" : "Home", path: "" },
      { name: collectionLabel, path: collectionHref.replace(`/${locale}`, "") },
      { name: article.title[locale], path: `/articles/${article.slug}` },
    ]),
  ];

  return (
    <article className="shell article-page page-pad">
      <StructuredData data={structuredData} />
      <Link className="back-link" href={collectionHref}>
        ← {collectionLabel}
      </Link>

      <div className="card-meta">
        <span>{article.type}</span>
        {topic ? (
          <Link href={`/${locale}/topics/${topic.slug}`}>
            {article.topic[locale]}
          </Link>
        ) : (
          <span>{article.topic[locale]}</span>
        )}
        <time dateTime={article.publishedAt}>{article.publishedAt}</time>
      </div>

      <h1>{article.title[locale]}</h1>
      <p className="lead">{article.dek[locale]}</p>

      {article.type === "Dossier" && article.dossier ? (
        <DossierSections dossier={article.dossier} locale={locale} />
      ) : null}

      <div className="article-body">
        {article.body.map((paragraph, index) => (
          <p key={index}>{paragraph[locale]}</p>
        ))}
      </div>

      <aside className="sources">
        <p className="eyebrow">{pt ? "Fontes" : "Sources"}</p>
        <SourceList sources={article.sources} locale={locale} />
      </aside>

      {topic ? (
        <ContextualRelations
          locale={locale}
          topic={topic}
          initiatives={relatedInitiatives}
        />
      ) : null}
    </article>
  );
}
