import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaultlinesIssueView } from "@/components/faultlines-issue";
import { faultlinesIssues, getLatestFaultlinesIssue } from "@/lib/faultlines";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import styles from "./weekly.module.css";

function formatRange(startDate: string, endDate: string, locale: "en" | "pt-BR") {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(new Date(`${startDate}T12:00:00Z`))} — ${formatter.format(new Date(`${endDate}T12:00:00Z`))}`;
}

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
    title: "Faultlines Weekly",
    description: pt
      ? "Edição semanal derivada exclusivamente do corpus publicado do Code & Consequence: editorial, iniciativas, dossiês e próximos eventos."
      : "A weekly edition derived exclusively from the published Code & Consequence corpus: editorial, initiatives, dossiers and upcoming events.",
    path: "/weekly",
  });
}

export default async function WeeklyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const latest = getLatestFaultlinesIssue();

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Distribuição recorrente" : "Recurring distribution"}</p>
      <h1 className="page-title">Faultlines Weekly</h1>
      <p className="page-intro">
        {pt
          ? "Uma edição semanal automática construída somente a partir de conteúdo que já passou pelo processo editorial do observatório. Nenhuma nova afirmação factual é criada para compor o boletim."
          : "An automatic weekly edition built only from content that has already passed the observatory's editorial process. No new factual claim is created to assemble the digest."}
      </p>

      <div className={styles.actions}>
        <Link className="button" href={`/${locale}/weekly/feed.xml`}>
          RSS ↗
        </Link>
        <Link className="text-link" href={`/${locale}/methodology`}>
          {pt ? "Como o boletim é gerado" : "How the digest is generated"} →
        </Link>
      </div>

      <FaultlinesIssueView issue={latest} locale={locale} />

      <section className={styles.archive}>
        <div className={styles.archiveHeader}>
          <h2>{pt ? "Arquivo" : "Archive"}</h2>
          <p>
            {pt
              ? "As edições são reconstruídas de forma determinística a partir das datas e verificações do corpus publicado."
              : "Issues are reconstructed deterministically from publication and verification dates in the published corpus."}
          </p>
        </div>

        <div className={styles.archiveList}>
          {faultlinesIssues.map((issue) => (
            <article className={styles.archiveRow} key={issue.id}>
              <span className={styles.archiveId}>{issue.id}</span>
              <div>
                <h3>
                  <Link href={`/${locale}/weekly/${issue.id}`}>
                    Faultlines Weekly · {formatRange(issue.startDate, issue.endDate, locale)}
                  </Link>
                </h3>
                <p>
                  {issue.articles.length} {pt ? "publicação(ões)" : "publication(s)"} ·{" "}
                  {issue.updatedInitiatives.length} {pt ? "iniciativa(s) atualizada(s)" : "initiative update(s)"} ·{" "}
                  {issue.upcomingEvents.length} {pt ? "evento(s)" : "event(s)"}
                </p>
              </div>
              <Link className="text-link" href={`/${locale}/weekly/${issue.id}`}>
                {pt ? "Abrir edição" : "Open issue"} →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
