import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { sourceRegistry } from "@/lib/source-registry";
import { buildMetadata } from "@/lib/seo";
import styles from "./sources.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: pt ? "Registro de fontes" : "Source registry",
    description: pt
      ? "Registro público das fontes usadas pelo Code & Consequence e dos conteúdos do corpus que cada fonte sustenta."
      : "Public registry of sources used by Code & Consequence and the corpus records each source supports.",
    path: "/sources",
  });
}

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const referenceCount = sourceRegistry.reduce(
    (total, source) => total + source.references.length,
    0,
  );

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Proveniência pública" : "Public provenance"}</p>
      <h1 className="page-title">{pt ? "Fontes" : "Sources"}</h1>
      <p className="page-intro">
        {pt
          ? "Cada registro abaixo corresponde a uma URL canônica usada em conteúdo já publicado. O registro mostra seu tier editorial e onde essa evidência aparece no corpus."
          : "Each record below corresponds to a canonical URL used in already published content. The registry shows its editorial tier and where that evidence appears in the corpus."}
      </p>

      <div className={styles.summary}>
        <span>{sourceRegistry.length} {pt ? "fontes canônicas" : "canonical sources"}</span>
        <span>{referenceCount} {pt ? "vínculos com registros públicos" : "links to public records"}</span>
      </div>

      <div className={styles.list}>
        {sourceRegistry.map((source) => (
          <article className={styles.row} key={source.slug}>
            <span className={styles.tier}>{source.tier}</span>
            <div>
              <div className={styles.meta}>
                <span>Tier {source.tier}</span>
                <span>{source.host}</span>
                <span>
                  {source.references.length} {pt ? "registro(s)" : "record(s)"}
                </span>
              </div>
              <h2>
                <Link href={`/${locale}/sources/${source.slug}`}>
                  {source.name}
                </Link>
              </h2>
              <p>{source.url}</p>
            </div>
            <Link className={styles.link} href={`/${locale}/sources/${source.slug}`}>
              {pt ? "Ver proveniência" : "View provenance"} →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
