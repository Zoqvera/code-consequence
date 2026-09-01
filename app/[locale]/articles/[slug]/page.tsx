import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.flatMap((article) => locales.map((locale) => ({ locale, slug: article.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = getArticle(slug);
  if (!article) return {};
  return { title: article.title[locale], description: article.dek[locale] };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = getArticle(slug);
  if (!article) notFound();
  return <article className="shell article-page page-pad"><div className="card-meta"><span>{article.type}</span><span>{article.topic[locale]}</span><time>{article.publishedAt}</time></div><h1>{article.title[locale]}</h1><p className="lead">{article.dek[locale]}</p><div className="article-body">{article.body.map((p, i) => <p key={i}>{p[locale]}</p>)}</div><aside className="sources"><p className="eyebrow">{locale === "en" ? "Sources" : "Fontes"}</p>{article.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span className="source-tier">Tier {source.tier}</span>{source.name} ↗</a>)}</aside></article>;
}
