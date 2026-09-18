import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { organizations } from "@/lib/organizations";
import { buildMetadata } from "@/lib/seo";
import styles from "./organizations.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: pt ? "Organizações" : "Organizations",
    description: pt
      ? "Organizações presentes nas iniciativas verificadas pelo Code & Consequence."
      : "Organizations represented in the initiatives verified by Code & Consequence.",
    path: "/organizations",
  });
}

export default async function OrganizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Entidades monitoradas" : "Tracked entities"}</p>
      <h1 className="page-title">{pt ? "Organizações" : "Organizations"}</h1>
      <p className="page-intro">
        {pt
          ? "Uma visão das organizações que aparecem em iniciativas já publicadas e verificadas no observatório."
          : "A view of the organizations represented in initiatives already published and verified by the observatory."}
      </p>

      <p className={styles.summary}>
        {organizations.length} {pt ? "organizações no corpus público" : "organizations in the public corpus"}
      </p>

      <div className={styles.list}>
        {organizations.map((organization) => (
          <article className={styles.row} key={organization.slug}>
            <div>
              <div className={styles.meta}>
                <span>
                  {organization.initiatives.length} {pt ? "iniciativas" : "initiatives"}
                </span>
                <span>
                  {organization.activeInitiatives} {pt ? "ativas" : "active"}
                </span>
                <span>
                  {organization.sourceReferences} {pt ? "fontes" : "sources"}
                </span>
              </div>
              <h2>
                <Link href={`/${locale}/organizations/${organization.slug}`}>
                  {organization.name}
                </Link>
              </h2>
              <p>
                {organization.regions.join(" · ")}
              </p>
            </div>
            <Link className={styles.link} href={`/${locale}/organizations/${organization.slug}`}>
              {pt ? "Abrir organização" : "Open organization"} →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
