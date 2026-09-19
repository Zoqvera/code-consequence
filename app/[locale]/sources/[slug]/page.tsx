import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { isLocale, locales } from "@/lib/i18n";
import { sourceTiers } from "@/lib/methodology";
import { getSourceRecord, sourceRegistry } from "@/lib/source-registry";
import { buildBreadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import styles from "../sources.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return sourceRegistry.flatMap((source) =>
    locales.map((locale) => ({ locale, slug: source.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const source = getSourceRecord(slug);
  if (!source) return {};

  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: source.name,
    description: pt
      ? `Proveniência pública de ${source.name}: tier editorial e registros publicados sustentados por esta fonte.`
      : `Public provenance for ${source.name}: editorial tier and published records supported by this source.`,
    path: `/sources/${source.slug}`,
  });
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const source = getSourceRecord(slug);
  if (!source) notFound();

  const pt = locale === "pt-BR";
  const tier = sourceTiers.find((item) => item.tier === source.tier);
  const structuredData = buildBreadcrumbSchema(locale, [
    { name: pt ? "Início" : "Home", path: "" },
    { name: pt ? "Fontes" : "Sources", path: "/sources" },
    { name: source.name, path: `/sources/${source.slug}` },
  ]);

  return (
    <article className="shell page-pad">
      <StructuredData data={structuredData} />
      <Link className="back-link" href={`/${locale}/sources`}>
        ← {pt ? "Todas as fontes" : "All sources"}
      </Link>

      <div className={styles.detailHeader}>
        <span className={styles.tier}>{source.tier}</span>
        <div>
          <p className="eyebrow">{pt ? "Registro de proveniência" : "Provenance record"}</p>
          <h1>{source.name}</h1>
          <p>{source.host}</p>
          {tier ? (
            <p>
              <strong>Tier {source.tier} — {tier.title[locale]}.</strong>{" "}
              {tier.publicationRole[locale]}
            </p>
          ) : null}
          <p>
            {source.references.length}{" "}
            {pt ? "registro(s) público(s) usam esta fonte." : "public record(s) use this source."}
          </p>
          <p className={styles.external}>
            <a className="button" href={source.url} target="_blank" rel="noreferrer">
              {pt ? "Abrir fonte original" : "Open original source"} ↗
            </a>
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Onde esta fonte aparece" : "Where this source appears"}</h2>
          <p>
            {pt
              ? "Os vínculos abaixo são calculados diretamente do corpus público. Uma fonte só aparece aqui quando está associada a um conteúdo publicado."
              : "The links below are calculated directly from the public corpus. A source appears here only when it is attached to published content."}
          </p>
        </div>

        <div className={styles.references}>
          {source.references.map((reference) => {
            const href = reference.kind === "article"
              ? `/${locale}/articles/${reference.slug}`
              : `/${locale}/initiatives/${reference.slug}`;
            const typeLabel = reference.kind === "article"
              ? (pt ? "Editorial" : "Editorial")
              : (pt ? "Iniciativa" : "Initiative");

            return (
              <article className={styles.reference} key={`${reference.kind}-${reference.slug}`}>
                <div>
                  <p className={styles.meta}>
                    <span>{typeLabel}</span>
                    <span>{reference.meta[locale]}</span>
                  </p>
                  <h3>
                    <Link href={href}>{reference.title[locale]}</Link>
                  </h3>
                </div>
                <Link className={styles.link} href={href}>
                  {pt ? "Abrir registro" : "Open record"} →
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </article>
  );
}
