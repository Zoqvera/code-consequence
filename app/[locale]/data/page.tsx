import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getObservatorySnapshot, type CountRow } from "@/lib/observatory-data";
import { buildMetadata } from "@/lib/seo";
import styles from "./data.module.css";

const statusLabels = {
  Active: { en: "Active", "pt-BR": "Ativas" },
  Completed: { en: "Completed", "pt-BR": "Concluídas" },
  Announced: { en: "Announced", "pt-BR": "Anunciadas" },
  Paused: { en: "Paused", "pt-BR": "Pausadas" },
  Cancelled: { en: "Cancelled", "pt-BR": "Canceladas" },
} as const;

function DataRows({
  rows,
  hrefFor,
}: {
  rows: CountRow[];
  hrefFor?: (row: CountRow) => string | undefined;
}) {
  return (
    <div className={styles.rows}>
      {rows.map((row) => {
        const href = hrefFor?.(row);
        return (
          <div className={styles.row} key={row.key}>
            {href ? <Link href={href}>{row.label}</Link> : <span>{row.label}</span>}
            <strong>{row.count}</strong>
          </div>
        );
      })}
    </div>
  );
}

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
    },
    {
      value: snapshot.totals.initiativeSourceReferences,
      label: pt ? "referências de fontes" : "source references",
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
        {metrics.map((metric) => (
          <div className={styles.metric} key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
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
        <DataRows
          rows={snapshot.initiativesByTopic}
          hrefFor={(row) => {
            const topic = [
              { slug: "power-democracy", en: "Power & Democracy", "pt-BR": "Poder & Democracia" },
              { slug: "work-economy", en: "Work & Economy", "pt-BR": "Trabalho & Economia" },
              { slug: "rights-society", en: "Rights & Society", "pt-BR": "Direitos & Sociedade" },
              { slug: "governance-regulation", en: "Governance & Regulation", "pt-BR": "Governança & Regulação" },
              { slug: "infrastructure-planet", en: "Infrastructure & Planet", "pt-BR": "Infraestrutura & Planeta" },
              { slug: "science-technology", en: "Science & Technology", "pt-BR": "Ciência & Tecnologia" },
            ].find((item) => item[locale] === row.label);
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
        <DataRows rows={statusRows} />
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
        <DataRows rows={snapshot.initiativesByRegion} />
      </section>

      <p className={styles.note}>
        {pt
          ? "Estes indicadores descrevem o corpus do Code & Consequence; não representam a totalidade das iniciativas, organizações ou eventos de IA existentes no mundo."
          : "These indicators describe the Code & Consequence corpus; they do not represent the full universe of AI initiatives, organizations or events worldwide."}
      </p>
    </div>
  );
}
