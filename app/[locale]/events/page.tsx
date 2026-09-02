import { notFound } from "next/navigation";
import { EventCountdown } from "@/components/event-countdown";
import { getUpcomingEvents, type AiEvent } from "@/lib/events";
import { isLocale, type Locale } from "@/lib/i18n";
import styles from "./events.module.css";

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatLabel(format: AiEvent["format"], locale: Locale) {
  if (locale === "en") return format;
  if (format === "Online") return "Online";
  if (format === "Hybrid") return "Híbrido";
  return "Presencial";
}

function locationLabel(event: AiEvent, locale: Locale) {
  if (event.format === "Online") return "Online";
  const parts = [event.venue, event.city, event.country].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return locale === "pt-BR" ? "Local informado na página oficial" : "Venue listed on the official event page";
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";
  const upcoming = getUpcomingEvents();

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Agenda global de IA" : "Global AI calendar"}</p>
      <h1 className="page-title">{pt ? "Eventos" : "Events"}</h1>
      <p className="page-intro">
        {pt
          ? "Conferências, webinars, workshops e encontros relevantes sobre inteligência artificial. A agenda é revisada automaticamente por IA a partir de fontes oficiais, com uma nova varredura aproximadamente a cada dois dias."
          : "Relevant conferences, webinars, workshops and meetings about artificial intelligence. The calendar is automatically reviewed by AI from official sources, with a new scan approximately every two days."}
      </p>

      <div className={styles.statusBar}>
        <strong>{pt ? `${upcoming.length} eventos futuros` : `${upcoming.length} upcoming events`}</strong>
        <span>{pt ? "Datas e formas de participação devem ser confirmadas na fonte oficial." : "Dates and participation details should be confirmed with the official source."}</span>
      </div>

      {upcoming.length === 0 ? (
        <p className={styles.empty}>{pt ? "Nenhum evento futuro verificado no momento." : "No verified upcoming events at the moment."}</p>
      ) : (
        <div className={styles.eventList}>
          {upcoming.map((event) => {
            const participationUrl = event.registrationUrl || event.eventUrl;
            return (
              <article className={styles.eventCard} key={event.externalKey}>
                <div className={styles.dateBlock}>
                  {formatDate(event.startDate, locale)}
                  {event.endDate && event.endDate !== event.startDate ? <span>{pt ? `até ${formatDate(event.endDate, locale)}` : `through ${formatDate(event.endDate, locale)}`}</span> : null}
                </div>

                <div>
                  <p className={styles.meta}>
                    <span>{formatLabel(event.format, locale)}</span>
                    <span>·</span>
                    <span>{event.organizer}</span>
                    {event.isFree === true ? <><span>·</span><span>{pt ? "Gratuito" : "Free"}</span></> : null}
                  </p>
                  <h2 className={styles.title}>{event.title[locale]}</h2>
                  <p className={styles.summary}>{event.summary[locale]}</p>

                  <div className={styles.details}>
                    <div>
                      <span className={styles.detailLabel}>{pt ? "Local" : "Location"}</span>
                      <p className={styles.detailText}>{locationLabel(event, locale)}</p>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>{pt ? "Como participar" : "How to participate"}</span>
                      <p className={styles.detailText}>{event.participation[locale]}</p>
                    </div>
                  </div>
                </div>

                <aside className={styles.side}>
                  <div className={styles.countdown}>
                    <EventCountdown date={event.startDate} startsAt={event.startsAt} locale={locale} />
                  </div>
                  <div className={styles.actions}>
                    <a className={styles.primary} href={participationUrl} target="_blank" rel="noreferrer">
                      {pt ? "Como participar ↗" : "How to participate ↗"}
                    </a>
                    {event.registrationUrl && event.registrationUrl !== event.eventUrl ? (
                      <a className={styles.secondary} href={event.eventUrl} target="_blank" rel="noreferrer">
                        {pt ? "Página oficial ↗" : "Official page ↗"}
                      </a>
                    ) : null}
                  </div>
                  <p className={styles.source}>
                    {pt ? "Fonte:" : "Source:"} <a href={event.source.url} target="_blank" rel="noreferrer">{event.source.name}</a>
                  </p>
                </aside>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
