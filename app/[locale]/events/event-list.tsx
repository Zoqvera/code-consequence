"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCountdown } from "@/components/event-countdown";
import type { AiEvent } from "@/lib/events";
import type { Locale } from "@/lib/i18n";
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

export function EventList({ events, locale }: { events: AiEvent[]; locale: Locale }) {
  const pt = locale === "pt-BR";
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<"all" | AiEvent["format"]>("all");
  const [freeOnly, setFreeOnly] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      if (format !== "all" && event.format !== format) return false;
      if (freeOnly && event.isFree !== true) return false;
      if (!normalized) return true;
      return [event.title[locale], event.summary[locale], event.organizer, event.city, event.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [events, format, freeOnly, locale, query]);

  return (
    <>
      <div className={styles.filters} aria-label={pt ? "Filtros de eventos" : "Event filters"}>
        <label>
          <span>{pt ? "Buscar" : "Search"}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={pt ? "Tema, cidade ou organização" : "Topic, city or organization"} />
        </label>
        <label>
          <span>{pt ? "Formato" : "Format"}</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as "all" | AiEvent["format"])}>
            <option value="all">{pt ? "Todos" : "All"}</option>
            <option value="Online">Online</option>
            <option value="In person">{pt ? "Presencial" : "In person"}</option>
            <option value="Hybrid">{pt ? "Híbrido" : "Hybrid"}</option>
          </select>
        </label>
        <label className={styles.checkFilter}>
          <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
          <span>{pt ? "Somente gratuitos confirmados" : "Confirmed free events only"}</span>
        </label>
        <p className={styles.filterCount}>{pt ? `${filtered.length} exibidos` : `${filtered.length} shown`}</p>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>{pt ? "Nenhum evento corresponde aos filtros." : "No events match these filters."}</p>
      ) : (
        <div className={styles.eventList}>
          {filtered.map((event) => {
            const participationUrl = event.registrationUrl || event.eventUrl;
            return (
              <article className={styles.eventCard} key={event.externalKey}>
                <div className={styles.dateBlock}>
                  {formatDate(event.startDate, locale)}
                  {event.endDate && event.endDate !== event.startDate ? <span>{pt ? `até ${formatDate(event.endDate, locale)}` : `through ${formatDate(event.endDate, locale)}`}</span> : null}
                </div>
                <div>
                  <p className={styles.meta}>
                    <span>{formatLabel(event.format, locale)}</span><span>·</span><span>{event.organizer}</span>
                    {event.isFree === true ? <><span>·</span><span>{pt ? "Gratuito" : "Free"}</span></> : null}
                  </p>
                  <h2 className={styles.title}><Link href={`/${locale}/events/${event.externalKey}`}>{event.title[locale]}</Link></h2>
                  <p className={styles.summary}>{event.summary[locale]}</p>
                  <div className={styles.details}>
                    <div><span className={styles.detailLabel}>{pt ? "Local" : "Location"}</span><p className={styles.detailText}>{locationLabel(event, locale)}</p></div>
                    <div><span className={styles.detailLabel}>{pt ? "Como participar" : "How to participate"}</span><p className={styles.detailText}>{event.participation[locale]}</p></div>
                  </div>
                </div>
                <aside className={styles.side}>
                  <div className={styles.countdown}><EventCountdown date={event.startDate} startsAt={event.startsAt} locale={locale} /></div>
                  <div className={styles.actions}>
                    <Link className={styles.primary} href={`/${locale}/events/${event.externalKey}`}>{pt ? "Ver detalhes" : "View details"}</Link>
                    <a className={styles.secondary} href={participationUrl} target="_blank" rel="noreferrer">{pt ? "Participar ↗" : "Participate ↗"}</a>
                  </div>
                  <p className={styles.source}>{pt ? "Fonte:" : "Source:"} <a href={event.source.url} target="_blank" rel="noreferrer">{event.source.name}</a></p>
                </aside>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
