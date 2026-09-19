import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { topics } from "@/lib/content";
import { isLocale, locales } from "@/lib/i18n";
import {
  getTopicArticles,
  getTopicBySlug,
  getTopicInitiatives,
  getTopicStats,
  topicDescriptions,
} from "@/lib/topic-hubs";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { getTopicSearchContent } from "@/lib/topic-search-content";
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

  const searchContent = getTopicSearchContent(topic.slug);

  return buildMetadata({
    locale,
    title: searchContent.metaTitle[locale],
    description: searchContent.metaDescription[locale],
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
  const searchContent = getTopicSearchContent(topic.slug);
  const relatedTopics = searchContent.relatedTopics
    .map((relatedSlug) => topics.find((item) => item.slug === relatedSlug))
    .filter((item): item is (typeof topics)[number] => Boolean(item));

  const structuredItems = [
    ...topicArticles.map((article) => ({
      name: article.title[locale],
      path: `/articles/${article.slug}`,
    })),
    ...topicInitiatives.map((initiative) => ({
      name: initiative.title[locale],
      path: `/initiatives/${initiative.slug}`,
    })),
  ];
  const structuredData = [
    buildCollectionPageSchema({
      locale,
      path: `/topics/${topic.slug}`,
      name: topic[locale],
      description: searchContent.metaDescription[locale],
      items: structuredItems,
    }),
    buildBreadcrumbSchema(locale, [
      { name: pt ? "Início" : "Home", path: "" },
      { name: pt ? "Temas" : "Topics", path: "/topics" },
      { name: topic[locale], path: `/topics/${topic.slug}` },
    ]),
  ];

  const metrics = [
    { value: stats.articles, label: pt ? "publicações editoriais" : "editorial publications" },
    { value: stats.initiatives, label: pt ? "iniciativas verificadas" : "verified initiatives" },
    { value: stats.activeInitiatives, label: pt ? "iniciativas ativas" : "active initiatives" },
    { value: stats.sourceReferences, label: pt ? "referências de fontes" : "source references" },
  ];

  return (
    <div className="shell page-pad">
      <StructuredData data={structuredData} />
      <Link className="back-link" href={`/${locale}/topics`}>
        ← {pt ? "Todos os temas" : "All topics"}
      </Link>

      <p className="eyebrow">{pt ? "Hub editorial" : "Editorial hub"}</p>
      <h1 className="page-title">{topic[locale]}</h1>
      <p className="page-intro">{topicDescriptions[topic.slug][locale]}</p>

      <section className={styles.pillarIntro} aria-labelledby="topic-overview-title">
        <p className="eyebrow">{pt ? "Guia do tema" : "Topic guide"}</p>
        <h2 id="topic-overview-title">{searchContent.overviewTitle[locale]}</h2>
        <div className={styles.pillarCopy}>
          {searchContent.overview[locale].map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.concepts} aria-label={pt ? "Conceitos relacionados" : "Related concepts"}>
          {searchContent.concepts[locale].map((concept) => (
            <span key={concept}>{concept}</span>
          ))}
        </div>
      </section>

      <div className={styles.summary}>
        {metrics.map((metric) => (
          <div className={styles.metric} key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.section} aria-labelledby="topic-questions-title">
        <div className={styles.sectionHeader}>
          <h2 id="topic-questions-title">{pt ? "Perguntas centrais" : "Key questions"}</h2>
          <p>
            {pt
              ? "Respostas diretas para situar o tema antes de explorar as evidências e os registros do observatório."
              : "Direct answers that establish the topic before you explore the observatory's evidence and records."}
          </p>
        </div>
        <div className={styles.questions}>
          {searchContent.questions.map((item) => (
            <article className={styles.question} key={item.question.en}>
              <h3>{item.question[locale]}</h3>
              <p>{item.answer[locale]}</p>
            </article>
          ))}
        </div>
      </section>

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
          <h2>{pt ? "Temas relacionados" : "Related topics"}</h2>
          <p>
            {pt
              ? "Continue a leitura por eixos que compartilham instituições, riscos ou respostas com este tema."
              : "Continue through editorial axes that share institutions, risks or responses with this topic."}
          </p>
        </div>
        <div className={styles.relatedTopics}>
          {relatedTopics.map((relatedTopic) => (
            <Link key={relatedTopic.slug} href={`/${locale}/topics/${relatedTopic.slug}`}>
              <span>{relatedTopic[locale]}</span>
              <small>{topicDescriptions[relatedTopic.slug][locale]}</small>
            </Link>
          ))}
        </div>
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
