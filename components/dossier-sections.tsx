import Link from "next/link";
import type { DossierData } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { initiatives } from "@/lib/initiatives";
import styles from "./dossier-sections.module.css";

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function DossierSections({
  dossier,
  locale,
}: {
  dossier: DossierData;
  locale: Locale;
}) {
  const pt = locale === "pt-BR";
  const linkedInitiatives = dossier.initiativeSlugs
    .map((slug) => initiatives.find((initiative) => initiative.slug === slug))
    .filter((initiative): initiative is NonNullable<typeof initiative> => Boolean(initiative));

  return (
    <div className={styles.root}>
      <section className={styles.problem}>
        <div>
          <p className="eyebrow">{pt ? "Problema acompanhado" : "Tracked problem"}</p>
          <h2>{pt ? "O que está em jogo" : "What is at stake"}</h2>
        </div>
        <div>
          <p className={styles.problemCopy}>{dossier.problemStatement[locale]}</p>
          {dossier.scopeNote ? <p className={styles.scope}>{dossier.scopeNote[locale]}</p> : null}
          <div className={styles.meta}>
            {dossier.countries.length ? (
              <span>{pt ? "Países/territórios" : "Countries/territories"}: {dossier.countries.map((country) => country[locale]).join(" · ")}</span>
            ) : null}
            {dossier.lastVerifiedAt ? (
              <span>
                {pt ? "Última verificação" : "Last verified"}: {formatDate(dossier.lastVerifiedAt, locale)}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {dossier.indicators.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Indicadores" : "Indicators"}</h2>
            <p>
              {pt
                ? "Métricas registradas com fonte explícita e data de observação quando disponível."
                : "Metrics recorded with an explicit source and observation date when available."}
            </p>
          </div>
          <div className={styles.grid}>
            {dossier.indicators.map((indicator, index) => (
              <article className={styles.card} key={`${indicator.label.en}-${index}`}>
                <span className="card-meta">{indicator.observedOn ? formatDate(indicator.observedOn, locale) : null}</span>
                <strong>{indicator.value}{indicator.unit ? ` ${indicator.unit}` : ""}</strong>
                <p>{indicator.label[locale]}</p>
                <a className={styles.source} href={indicator.source.url} target="_blank" rel="noreferrer">
                  {indicator.source.name} ↗
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {dossier.timeline.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Linha do tempo" : "Timeline"}</h2>
            <p>{pt ? "Marcos documentados que ajudam a acompanhar a evolução do problema." : "Documented milestones that track how the issue evolves."}</p>
          </div>
          <div className={styles.timeline}>
            {dossier.timeline.map((event, index) => (
              <article className={styles.timelineItem} key={`${event.date}-${index}`}>
                <time dateTime={event.date}>{formatDate(event.date, locale)}</time>
                <div>
                  <h3>{event.title[locale]}</h3>
                  {event.summary ? <p>{event.summary[locale]}</p> : null}
                  <a className={styles.source} href={event.source.url} target="_blank" rel="noreferrer">
                    {event.source.name} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {dossier.legislation.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Legislação e regulação" : "Legislation and regulation"}</h2>
            <p>{pt ? "Instrumentos normativos ligados ao problema acompanhado." : "Regulatory instruments connected to the tracked issue."}</p>
          </div>
          <div className={styles.grid}>
            {dossier.legislation.map((item, index) => (
              <article className={styles.card} key={`${item.title.en}-${index}`}>
                <span className="card-meta">{item.jurisdiction[locale]}{item.enactedOn ? ` · ${formatDate(item.enactedOn, locale)}` : ""}</span>
                <strong>{item.title[locale]}</strong>
                {item.status ? <p>{item.status[locale]}</p> : null}
                <a className={styles.source} href={item.source.url} target="_blank" rel="noreferrer">
                  {item.source.name} ↗
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {linkedInitiatives.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{pt ? "Respostas acompanhadas" : "Tracked responses"}</h2>
            <p>{pt ? "Iniciativas verificadas formalmente vinculadas a este dossiê." : "Verified initiatives formally linked to this dossier."}</p>
          </div>
          <div className={styles.initiatives}>
            {linkedInitiatives.map((initiative) => (
              <article className={styles.initiative} key={initiative.slug}>
                <div>
                  <p className="card-meta">{initiative.organization} · {initiative.region[locale]}</p>
                  <h3>
                    <Link href={`/${locale}/initiatives/${initiative.slug}`}>{initiative.title[locale]}</Link>
                  </h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className="text-link" href={`/${locale}/initiatives/${initiative.slug}`}>
                  {pt ? "Abrir iniciativa" : "Open initiative"} →
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
