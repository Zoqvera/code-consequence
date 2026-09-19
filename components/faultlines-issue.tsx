import Link from "next/link";
import type { FaultlinesIssue } from "@/lib/faultlines";
import type { Locale } from "@/lib/i18n";
import { initiativeStatusLabel } from "@/lib/initiative-labels";
import styles from "./faultlines-issue.module.css";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function FaultlinesIssueView({
  issue,
  locale,
}: {
  issue: FaultlinesIssue;
  locale: Locale;
}) {
  const pt = locale === "pt-BR";
  const editorialCount = issue.articles.length + issue.dossierUpdates.length;

  return (
    <>
      <div className={styles.issueMeta}>
        <span>{issue.id}</span>
        <span>
          {formatDate(issue.startDate, locale)} — {formatDate(issue.endDate, locale)}
        </span>
        <span>
          {editorialCount} {pt ? "item(ns) editorial(is)" : "editorial item(s)"}
        </span>
        <span>
          {issue.updatedInitiatives.length} {pt ? "iniciativa(s) atualizada(s)" : "initiative update(s)"}
        </span>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Editorial da semana" : "This week's editorial"}</h2>
          <p>
            {pt
              ? "Conteúdo já publicado no observatório durante esta semana. O boletim não cria resumos factuais novos."
              : "Content already published by the observatory during this week. The digest does not create new factual summaries."}
          </p>
        </div>

        {issue.articles.length ? (
          <div className={styles.list}>
            {issue.articles.map((article) => (
              <article className={styles.row} key={article.slug}>
                <div>
                  <p className="card-meta">
                    {article.type} · {article.topic[locale]} · {formatDate(article.publishedAt, locale)}
                  </p>
                  <h3>
                    <Link href={`/${locale}/articles/${article.slug}`}>
                      {article.title[locale]}
                    </Link>
                  </h3>
                  <p>{article.dek[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/articles/${article.slug}`}>
                  {pt ? "Ler" : "Read"} →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {pt
              ? "Nenhuma nova publicação editorial entrou no corpus nesta semana."
              : "No new editorial publication entered the corpus this week."}
          </p>
        )}
      </section>

      {issue.dossierUpdates.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Dossiês atualizados" : "Updated dossiers"}</h2>
            <p>
              {pt
                ? "Dossiês persistentes que receberam nova verificação nesta semana."
                : "Persistent dossiers that received a new verification during this week."}
            </p>
          </div>
          <div className={styles.list}>
            {issue.dossierUpdates.map((article) => (
              <article className={styles.row} key={article.slug}>
                <div>
                  <p className="card-meta">
                    {article.topic[locale]} · {article.dossier?.lastVerifiedAt
                      ? formatDate(article.dossier.lastVerifiedAt, locale)
                      : ""}
                  </p>
                  <h3>
                    <Link href={`/${locale}/articles/${article.slug}`}>
                      {article.title[locale]}
                    </Link>
                  </h3>
                  <p>{article.dek[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/articles/${article.slug}`}>
                  {pt ? "Abrir dossiê" : "Open dossier"} →
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {issue.updatedInitiatives.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Iniciativas verificadas nesta semana" : "Initiatives verified this week"}</h2>
            <p>
              {pt
                ? "Registros publicados cuja última verificação ocorreu dentro da janela desta edição."
                : "Published records whose latest verification falls inside this issue's weekly window."}
            </p>
          </div>
          <div className={styles.list}>
            {issue.updatedInitiatives.map((initiative) => (
              <article className={styles.row} key={initiative.slug}>
                <div>
                  <p className="card-meta">
                    {initiative.organization} · {initiative.region[locale]} · {initiativeStatusLabel(initiative.status, locale)}
                  </p>
                  <h3>
                    <Link href={`/${locale}/initiatives/${initiative.slug}`}>
                      {initiative.title[locale]}
                    </Link>
                  </h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/initiatives/${initiative.slug}`}>
                  {pt ? "Abrir iniciativa" : "Open initiative"} →
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Iniciativas para acompanhar" : "Initiatives to watch"}</h2>
          <p>
            {pt
              ? "Uma watchlist derivada de iniciativas ativas já publicadas. A seleção é determinística, não uma nova avaliação editorial."
              : "A watchlist derived from already published active initiatives. Selection is deterministic, not a new editorial judgment."}
          </p>
        </div>

        {issue.watchlist.length ? (
          <div className={styles.list}>
            {issue.watchlist.map((initiative) => (
              <article className={styles.row} key={initiative.slug}>
                <div>
                  <p className="card-meta">
                    {initiative.organization} · {initiative.topic[locale]} · {initiative.region[locale]}
                  </p>
                  <h3>
                    <Link href={`/${locale}/initiatives/${initiative.slug}`}>
                      {initiative.title[locale]}
                    </Link>
                  </h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/initiatives/${initiative.slug}`}>
                  {pt ? "Acompanhar" : "Track"} →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {pt ? "Nenhuma iniciativa ativa disponível." : "No active initiative available."}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Próximos 14 dias" : "Next 14 days"}</h2>
          <p>
            {pt
              ? "Eventos verificados cuja data de início cai entre o começo desta edição e os 14 dias seguintes."
              : "Verified events whose start date falls between this issue's start and the following 14 days."}
          </p>
        </div>

        {issue.upcomingEvents.length ? (
          <div className={styles.list}>
            {issue.upcomingEvents.map((event) => (
              <article className={styles.row} key={event.externalKey}>
                <div>
                  <p className="card-meta">
                    {formatDate(event.startDate, locale)} · {event.organizer} · {event.format}
                  </p>
                  <h3>
                    <Link href={`/${locale}/events/${event.externalKey}`}>
                      {event.title[locale]}
                    </Link>
                  </h3>
                  <p>{event.summary[locale]}</p>
                </div>
                <Link className={styles.rowLink} href={`/${locale}/events/${event.externalKey}`}>
                  {pt ? "Ver evento" : "View event"} →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>
            {pt
              ? "Nenhum evento verificado nesta janela."
              : "No verified event falls inside this window."}
          </p>
        )}
      </section>
    </>
  );
}
