import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataBarChart } from "@/components/data-bar-chart";
import { topics } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { getObservatorySnapshot } from "@/lib/observatory-data";
import { buildMetadata } from "@/lib/seo";
import styles from "./data.module.css";

const statusLabels = {
  Active: { en: "Active", "pt-BR": "Ativas" },
  Completed: { en: "Completed", "pt-BR": "Concluídas" },
  Announced: { en: "Announced", "pt-BR": "Anunciadas" },
  Paused: { en: "Paused", "pt-BR": "Pausadas" },
  Cancelled: { en: "Cancelled", "pt-BR": "Canceladas" },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: "Data",
    description: pt
      ? "Indicadores derivados do corpus público e verificado do Code & Consequence."
      : "Indicators derived from the public, verified Code & Consequence corpus.",
    path: "/data",
  });
}

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const snapshot = getObservatorySnapshot(locale);
  const statusRows = snapshot.initiativesByStatus.map((row) => ({
    ...row,
    label: statusLabels[row.key as keyof typeof statusLabels]?.[locale] ?? row.label,
  }));

  const metrics = [
    {
      value: snapshot.totals.initiatives,
      label: pt ? "iniciativas publicadas" : "published initiatives",
    },
    {
      value: snapshot.totals.activeInitiatives,
      label: pt ? "iniciativas ativas" : "active initiatives",
    },
    {
      value: snapshot.totals.organizations,
      label: pt ? "organizações monitoradas" : "organizations tracked",
      href: `/${locale}/organizations`,
    },
    {
      value: snapshot.totals.sources,
      label: pt ? "fontes canônicas" : "canonical sources",
      href: `/${locale}/sources`,
    },
    {
      value: snapshot.totals.news,
      label: pt ? "notícias publicadas" : "published news stories",
    },
    {
      value: snapshot.totals.analysis,
      label: pt ? "análises publicadas" : "published analyses",
    },
    {
      value: snapshot.totals.dossiers,
      label: pt ? "dossiês publicados" : "published dossiers",
    },
    {
      value: snapshot.totals.upcomingEvents,
      label: pt ? "eventos futuros" : "upcoming events",
    },
  ];

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Corpus público" : "Public corpus"}</p>
      <h1 className="page-title">Data</h1>
      <p className="page-intro">
        {pt
          ? "Uma leitura quantitativa do que o Code & Consequence já publicou e verificou. Os números abaixo são calculados diretamente a partir do corpus público usado pelo site."
          : "A quantitative view of what Code & Consequence has already published and verified. The figures below are calculated directly from the public corpus used by the site."}
      </p>

      <div className={styles.metrics}>
        {metrics.map((metric) => {
          const content = (
            <>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </>
          );

          return metric.href ? (
            <Link className={styles.metric} href={metric.href} key={metric.label}>
              {content}
            </Link>
          ) : (
            <div className={styles.metric} key={metric.label}>
              {content}
            </div>
          );
        })}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>{pt ? "Iniciativas por tema" : "Initiatives by topic"}</h2>
          <p>
            {pt
              ? "Distribuição dos registros publicados segundo a taxonomia editorial do observatório."
              : "Distribution of published records across the observatory's editorial taxonomy."}
          </p>
        </div>
        <DataBarChart
          rows={snapshot.initiativesByTopic}
          ariaLabel={pt ? "Iniciativas por tema" : "Initiatives by topic"}
          hrefFor={(row) => {
            const topic = topics.find((item) => item[locale] === row.label);
            return topic ? `/${locale}/topics/${topic.slug}` : undefined;
          }}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>{pt ? "Iniciativas por status" : "Initiatives by status"}</h2>
          <p>
            {pt
              ? "Estado atual informado nos registros que passaram pelo processo de publicação."
              : "Current state recorded for initiatives that passed the publication process."}
          </p>
        </div>
        <DataBarChart rows={statusRows} ariaLabel={pt ? "Iniciativas por status" : "Initiatives by status"} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>{pt ? "Iniciativas por região" : "Initiatives by region"}</h2>
          <p>
            {pt
              ? "Cobertura geográfica tal como descrita nos registros verificados."
              : "Geographic coverage as described in the verified records."}
          </p>
        </div>
        <DataBarChart rows={snapshot.initiativesByRegion} ariaLabel={pt ? "Iniciativas por região" : "Initiatives by region"} />
      </section>

      <p className={styles.note}>
        {pt
          ? "Estes indicadores descrevem o corpus do Code & Consequence; não representam a totalidade das iniciativas, organizações ou eventos de IA existentes no mundo."
          : "These indicators describe the Code & Consequence corpus; they do not represent the full universe of AI initiatives, organizations or events worldwide."}
      </p>
    </div>
  );
}
