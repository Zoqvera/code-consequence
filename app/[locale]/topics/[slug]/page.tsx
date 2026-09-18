import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { topics } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";
import {
  getTopicArticles,
  getTopicBySlug,
  getTopicInitiatives,
  getTopicStats,
  topicDescriptions,
} from "@/lib/topic-hubs";
import { buildMetadata } from "@/lib/seo";
import styles from "./topic.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return topics.flatMap((topic) =>
    locales.map((locale) => ({ locale, slug: topic.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const topic = getTopicBySlug(slug);
  if (!topic) return {};

  return buildMetadata({
    locale,
    title: topic[locale],
    description: topicDescriptions[topic.slug][locale],
    path: `/topics/${topic.slug}`,
  });
}

function formatDate(value: string, locale: "en" | "pt-BR") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const pt = locale === "pt-BR";
  const topicArticles = getTopicArticles(slug);
  const topicInitiatives = getTopicInitiatives(slug);
  const stats = getTopicStats(slug);

  const metrics = [
    { value: stats.articles, label: pt ? "publicações editoriais" : "editorial publications" },
    { value: stats.initiatives, label: pt ? "iniciativas verificadas" : "verified initiatives" },
    { value: stats.activeInitiatives, label: pt ? "iniciativas ativas" : "active initiatives" },
    { value: stats.sourceReferences, label: pt ? "referências de fontes" : "source references" },
  ];

  return (
    <div className="shell page-pad">
      <Link className="back-link" href={`/${locale}/topics`}>
        ← {pt ? "Todos os temas" : "All topics"}
      </Link>

      <p className="eyebrow">{pt ? "Hub editorial" : "Editorial hub"}</p>
      <h1 className="page-title">{topic[locale]}</h1>
      <p className="page-intro">{topicDescriptions[topic.slug][locale]}</p>

      <div className={styles.summary}>
        {metrics.map((metric) => (
          <div className={styles.metric} key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Editorial" : "Editorial"}</h2>
          <p>
            {pt
              ? "Notícias, análises e dossiês publicados neste eixo temático."
              : "News, analysis and dossiers published within this topic."}
          </p>
        </div>

        {topicArticles.length ? (
          <div className={styles.list}>
            {topicArticles.map((article) => (
              <article className={styles.row} key={article.slug}>
                <div>
                  <div className="card-meta">
                    <span>{article.type}</span>
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
                  </div>
                  <h3>
                    <Link href={`/${locale}/articles/${article.slug}`}>
                      {article.title[locale]}
                    </Link>
                  </h3>
                  <p>{article.dek[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/articles/${article.slug}`}>
                  {pt ? "Ler" : "Read"} →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {pt
              ? "Ainda não há publicações editoriais verificadas neste tema."
              : "No verified editorial publications are available for this topic yet."}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Iniciativas verificadas" : "Verified initiatives"}</h2>
          <p>
            {pt
              ? "Registros publicados que compartilham este mesmo eixo temático."
              : "Published records that share this editorial topic."}
          </p>
        </div>

        {topicInitiatives.length ? (
          <div className={styles.list}>
            {topicInitiatives.map((initiative) => (
              <article className={styles.row} key={initiative.slug}>
                <div>
                  <div className="card-meta">
                    <span>{initiative.organization}</span>
                    <span>{initiative.region[locale]}</span>
                    <span>{initiative.status}</span>
                  </div>
                  <h3>
                    <Link href={`/${locale}/initiatives/${initiative.slug}`}>
                      {initiative.title[locale]}
                    </Link>
                  </h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/initiatives/${initiative.slug}`}>
                  {pt ? "Abrir" : "Open"} →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {pt
              ? "Ainda não há iniciativas verificadas neste tema."
              : "No verified initiatives are available for this topic yet."}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Continue explorando" : "Keep exploring"}</h2>
          <p>
            {pt
              ? "Compare este tema com o restante do corpus no Global Radar e na área de Data."
              : "Compare this topic with the wider corpus in Global Radar and Data."}
          </p>
        </div>
        <div>
          <Link className="button" href={`/${locale}/radar`}>
            Global Radar →
          </Link>
          {" "}
          <Link className="text-link" href={`/${locale}/data`}>
            Data →
          </Link>
        </div>
      </section>
    </div>
  );
}
