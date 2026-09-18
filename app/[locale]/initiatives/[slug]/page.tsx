import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextualRelations } from "@/components/contextual-relations";
import { getInitiative, initiatives } from "@/lib/initiatives";
import { initiativeStatusLabel } from "@/lib/initiative-labels";
import { getOrganizationForInitiative } from "@/lib/organizations";
import { isLocale, locales } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import {
  getRelatedArticlesForInitiative,
  getTopicForInitiative,
} from "@/lib/topic-hubs";

export const dynamicParams = false;

export function generateStaticParams() {
  return initiatives.flatMap((initiative) =>
    locales.map((locale) => ({ locale, slug: initiative.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const initiative = getInitiative(slug);
  if (!initiative) return {};

  return buildMetadata({
    locale,
    title: initiative.title[locale],
    description: initiative.summary[locale],
    path: `/initiatives/${slug}`,
  });
}

function formatVerifiedAt(value: string | null, locale: "en" | "pt-BR") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const initiative = getInitiative(slug);
  if (!initiative) notFound();

  const pt = locale === "pt-BR";
  const verifiedAt = formatVerifiedAt(initiative.lastVerifiedAt, locale);
  const status = initiativeStatusLabel(initiative.status, locale);
  const topic = getTopicForInitiative(slug);
  const relatedArticles = getRelatedArticlesForInitiative(slug);
  const organization = getOrganizationForInitiative(slug);

  return (
    <article className="shell initiative-detail page-pad">
      <Link className="back-link" href={`/${locale}/initiatives`}>
        ← {pt ? "Todas as iniciativas" : "All initiatives"}
      </Link>

      <div className="initiative-detail-meta card-meta">
        {topic ? (
          <Link href={`/${locale}/topics/${topic.slug}`}>
            {initiative.topic[locale]}
          </Link>
        ) : (
          <span>{initiative.topic[locale]}</span>
        )}
        <span>{initiative.region[locale]}</span>
        <span className="status-pill">{status}</span>
      </div>

      <h1>{initiative.title[locale]}</h1>
      <p className="initiative-detail-summary">{initiative.summary[locale]}</p>

      <dl className="initiative-facts">
        <div>
          <dt>{pt ? "Organização responsável" : "Responsible organization"}</dt>
          <dd>
            {organization ? (
              <Link href={`/${locale}/organizations/${organization.slug}`}>
                {initiative.organization}
              </Link>
            ) : (
              initiative.organization
            )}
          </dd>
        </div>
        <div>
          <dt>{pt ? "Região" : "Region"}</dt>
          <dd>{initiative.region[locale]}</dd>
        </div>
        <div>
          <dt>{pt ? "Status" : "Status"}</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>{pt ? "Tema" : "Topic"}</dt>
          <dd>
            {topic ? (
              <Link href={`/${locale}/topics/${topic.slug}`}>
                {initiative.topic[locale]}
              </Link>
            ) : (
              initiative.topic[locale]
            )}
          </dd>
        </div>
        {verifiedAt ? (
          <div>
            <dt>{pt ? "Última verificação" : "Last verified"}</dt>
            <dd>{verifiedAt}</dd>
          </div>
        ) : null}
        <div>
          <dt>{pt ? "Fontes verificadas" : "Verified sources"}</dt>
          <dd>{initiative.sources.length}</dd>
        </div>
      </dl>

      <section className="initiative-evidence">
        <div>
          <p className="eyebrow">{pt ? "Evidências" : "Evidence"}</p>
          <h2>{pt ? "Fontes verificadas" : "Verified sources"}</h2>
          <p>
            {pt
              ? "Estas fontes sustentam a identificação, o status e a descrição editorial desta iniciativa. A publicação exige revisão humana explícita."
              : "These sources support the identity, status and editorial description of this initiative. Publication requires explicit human review."}
          </p>
        </div>
        <div className="initiative-source-list">
          {initiative.sources.map((source, index) => (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={`${source.url}-${index}`}
            >
              <span className="source-tier">Tier {source.tier}</span>
              <span>{source.name}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      {topic ? (
        <ContextualRelations
          locale={locale}
          topic={topic}
          articles={relatedArticles}
        />
      ) : null}

      <p className="initiative-method-note">
        {pt
          ? "Code & Consequence acompanha iniciativas reais relacionadas aos impactos sociais, políticos e ambientais da inteligência artificial. Registros publicados são separados de rascunhos e itens em revisão no banco editorial."
          : "Code & Consequence tracks real initiatives related to the social, political and environmental impacts of artificial intelligence. Published records are separated from drafts and review-stage items in the editorial database."}
      </p>
    </article>
  );
}
