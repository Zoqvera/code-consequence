import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { topics } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { getTopicStats, topicDescriptions } from "@/lib/topic-hubs";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt ? "Temas" : "Topics",
    description: pt
      ? "Explore a taxonomia editorial do Code & Consequence sobre poder, trabalho, direitos, governança, infraestrutura e tecnologia."
      : "Explore the Code & Consequence editorial taxonomy across power, work, rights, governance, infrastructure and technology.",
    path: "/topics",
  });
}

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">Taxonomy</p>
      <h1 className="page-title">{pt ? "Temas" : "Topics"}</h1>
      <p className="page-intro">
        {pt
          ? "Seis eixos conectam matérias, iniciativas verificadas e indicadores do observatório."
          : "Six editorial axes connect reporting, verified initiatives and observatory indicators."}
      </p>

      <div className="topic-detail-list">
        {topics.map((topic, index) => {
          const stats = getTopicStats(topic.slug);
          return (
            <section key={topic.slug}>
              <span>0{index + 1}</span>
              <div>
                <h2>
                  <Link href={`/${locale}/topics/${topic.slug}`}>
                    {topic[locale]}
                  </Link>
                </h2>
                <p>{topicDescriptions[topic.slug][locale]}</p>
                <p className="card-meta">
                  <span>
                    {stats.articles} {pt ? "publicações" : "publications"}
                  </span>
                  <span>
                    {stats.initiatives} {pt ? "iniciativas" : "initiatives"}
                  </span>
                </p>
                <Link className="text-link" href={`/${locale}/topics/${topic.slug}`}>
                  {pt ? "Explorar tema" : "Explore topic"} →
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
