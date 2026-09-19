import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { topics } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { getTopicStats, topicDescriptions } from "@/lib/topic-hubs";
import { buildCollectionPageSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { getTopicSearchContent } from "@/lib/topic-search-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt
      ? "Temas de IA: governança, empregos, direitos e meio ambiente"
      : "AI Topics: Governance, Jobs, Rights & Environment",
    description: pt
      ? "Explore seis guias sobre IA e democracia, empregos, direitos humanos, regulação, impacto ambiental e segurança, conectados ao corpus verificado do observatório."
      : "Explore six guides on AI and democracy, jobs, human rights, regulation, environmental impact and safety, connected to the observatory's verified corpus.",
    path: "/topics",
  });
}

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const pageDescription = pt
    ? "Seis páginas-pilar conectam as principais questões públicas sobre inteligência artificial a matérias, iniciativas, organizações, fontes e dados verificados."
    : "Six pillar pages connect major public questions about artificial intelligence to verified reporting, initiatives, organizations, sources and data.";
  const structuredData = buildCollectionPageSchema({
    locale,
    path: "/topics",
    name: pt ? "Temas de IA" : "AI topics",
    description: pageDescription,
    items: topics.map((topic) => ({
      name: getTopicSearchContent(topic.slug).metaTitle[locale],
      path: `/topics/${topic.slug}`,
    })),
  });

  return (
    <div className="shell page-pad">
      <StructuredData data={structuredData} />
      <p className="eyebrow">{pt ? "Guias temáticos" : "Topic guides"}</p>
      <h1 className="page-title">{pt ? "Temas de inteligência artificial" : "Artificial intelligence topics"}</h1>
      <p className="page-intro">{pageDescription}</p>

      <div className="topic-detail-list">
        {topics.map((topic, index) => {
          const stats = getTopicStats(topic.slug);
          const searchContent = getTopicSearchContent(topic.slug);
          return (
            <section key={topic.slug}>
              <span>0{index + 1}</span>
              <div>
                <h2>
                  <Link href={`/${locale}/topics/${topic.slug}`}>
                    {topic[locale]}
                  </Link>
                </h2>
                <p>{searchContent.metaDescription[locale]}</p>
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
