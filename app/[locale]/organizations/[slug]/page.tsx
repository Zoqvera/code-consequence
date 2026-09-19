import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { isLocale, locales } from "@/lib/i18n";
import { initiativeStatusLabel } from "@/lib/initiative-labels";
import { getOrganization, organizations } from "@/lib/organizations";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { getTopicForInitiative } from "@/lib/topic-hubs";
import styles from "../organizations.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return organizations.flatMap((organization) =>
    locales.map((locale) => ({ locale, slug: organization.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const organization = getOrganization(slug);
  if (!organization) return {};

  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: organization.name,
    description: pt
      ? `Iniciativas verificadas associadas a ${organization.name} no corpus público do Code & Consequence.`
      : `Verified initiatives associated with ${organization.name} in the public Code & Consequence corpus.`,
    path: `/organizations/${organization.slug}`,
  });
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const organization = getOrganization(slug);
  if (!organization) notFound();

  const pt = locale === "pt-BR";
  const localizedTopics = [...new Set(
    organization.initiatives.map((initiative) => initiative.topic[locale]),
  )];
  const localizedRegions = [...new Set(
    organization.initiatives.map((initiative) => initiative.region[locale]),
  )];

  const description = pt
    ? `Iniciativas verificadas associadas a ${organization.name} no corpus público do Code & Consequence.`
    : `Verified initiatives associated with ${organization.name} in the public Code & Consequence corpus.`;
  const structuredData = [
    buildCollectionPageSchema({
      locale,
      path: `/organizations/${organization.slug}`,
      name: organization.name,
      description,
      items: organization.initiatives.map((initiative) => ({
        name: initiative.title[locale],
        path: `/initiatives/${initiative.slug}`,
      })),
    }),
    buildBreadcrumbSchema(locale, [
      { name: pt ? "Início" : "Home", path: "" },
      { name: pt ? "Organizações" : "Organizations", path: "/organizations" },
      { name: organization.name, path: `/organizations/${organization.slug}` },
    ]),
  ];

  const metrics = [
    {
      value: organization.initiatives.length,
      label: pt ? "iniciativas publicadas" : "published initiatives",
    },
    {
      value: organization.activeInitiatives,
      label: pt ? "iniciativas ativas" : "active initiatives",
    },
    {
      value: localizedTopics.length,
      label: pt ? "temas cobertos" : "topics covered",
    },
    {
      value: organization.sourceReferences,
      label: pt ? "referências de fontes" : "source references",
    },
  ];

  return (
    <div className="shell page-pad">
      <StructuredData data={structuredData} />
      <Link className="back-link" href={`/${locale}/organizations`}>
        ← {pt ? "Todas as organizações" : "All organizations"}
      </Link>

      <p className="eyebrow">{pt ? "Organização monitorada" : "Tracked organization"}</p>
      <h1 className="page-title">{organization.name}</h1>
      <p className="page-intro">
        {pt
          ? "Esta página agrega exclusivamente iniciativas já publicadas no observatório que identificam esta organização como responsável."
          : "This page aggregates only initiatives already published by the observatory that identify this organization as responsible."}
      </p>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <div className={styles.metric} key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.meta}>
        <span>{pt ? "Regiões" : "Regions"}: {localizedRegions.join(" · ")}</span>
        <span>{pt ? "Temas" : "Topics"}: {localizedTopics.join(" · ")}</span>
      </div>

      <section className={styles.section}>
        <h2>{pt ? "Iniciativas verificadas" : "Verified initiatives"}</h2>
        <div className="initiative-list light">
          {organization.initiatives.map((initiative, index) => {
            const topic = getTopicForInitiative(initiative.slug);
            return (
              <article className="initiative-row" key={initiative.slug}>
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="card-meta">
                    {topic ? (
                      <Link href={`/${locale}/topics/${topic.slug}`}>
                        {initiative.topic[locale]}
                      </Link>
                    ) : (
                      initiative.topic[locale]
                    )}
                    {" · "}
                    {initiative.region[locale]}
                    {" · "}
                    {initiativeStatusLabel(initiative.status, locale)}
                  </p>
                  <h3>
                    <Link href={`/${locale}/initiatives/${initiative.slug}`}>
                      {initiative.title[locale]}
                    </Link>
                  </h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className="text-link" href={`/${locale}/initiatives/${initiative.slug}`}>
                  {pt ? "Abrir" : "Open"} →
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
