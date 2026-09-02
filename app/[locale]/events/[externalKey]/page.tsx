import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCountdown } from "@/components/event-countdown";
import { events, getEvent, type AiEvent } from "@/lib/events";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import styles from "../events.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return events.flatMap((event) => locales.map((locale) => ({ locale, externalKey: event.externalKey })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; externalKey: string }> }): Promise<Metadata> {
  const { locale, externalKey } = await params;
  if (!isLocale(locale)) return {};
  const event = getEvent(externalKey);
  if (!event) return {};
  return { title: event.title[locale], description: event.summary[locale] };
}

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatStartTime(value: string | null, locale: Locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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
  return locale === "pt-BR" ? "Consulte a página oficial" : "See the official event page";
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

function nextDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function compactUtc(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function calendarHref(event: AiEvent, locale: Locale) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Code & Consequence//AI Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.externalKey}@code-consequence`,
    `SUMMARY:${escapeIcs(event.title[locale])}`,
  ];

  if (event.startsAt) {
    lines.push(`DTSTART:${compactUtc(event.startsAt)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(nextDate(event.endDate || event.startDate))}`);
  }

  lines.push(`DESCRIPTION:${escapeIcs(`${event.summary[locale]}\n\n${event.eventUrl}`)}`);
  const location = locationLabel(event, locale);
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  lines.push(`URL:${event.eventUrl}`, "END:VEVENT", "END:VCALENDAR");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

function structuredData(event: AiEvent, locale: Locale) {
  const attendanceMode = event.format === "Online"
    ? "https://schema.org/OnlineEventAttendanceMode"
    : event.format === "Hybrid"
      ? "https://schema.org/MixedEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode";

  const physicalName = [event.venue, event.city, event.country].filter(Boolean).join(", ");
  const location = event.format === "Online" || (event.format === "Hybrid" && !physicalName)
    ? { "@type": "VirtualLocation", url: event.eventUrl }
    : physicalName
      ? { "@type": "Place", name: physicalName }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title[locale],
    description: event.summary[locale],
    startDate: event.startsAt || event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: attendanceMode,
    ...(location ? { location } : {}),
    organizer: { "@type": "Organization", name: event.organizer, url: event.source.url },
    url: event.eventUrl,
    offers: {
      "@type": "Offer",
      url: event.registrationUrl || event.eventUrl,
      availability: "https://schema.org/InStock",
      ...(event.isFree === true ? { price: "0", priceCurrency: "USD" } : {}),
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; externalKey: string }> }) {
  const { locale, externalKey } = await params;
  if (!isLocale(locale)) notFound();
  const event = getEvent(externalKey);
  if (!event) notFound();

  const pt = locale === "pt-BR";
  const participationUrl = event.registrationUrl || event.eventUrl;
  const preciseStart = formatStartTime(event.startsAt, locale);
  const jsonLd = JSON.stringify(structuredData(event, locale)).replace(/</g, "\\u003c");

  return (
    <article className={`shell page-pad ${styles.detailPage}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Link className={styles.backLink} href={`/${locale}/events`}>← {pt ? "Todos os eventos" : "All events"}</Link>

      <p className="eyebrow">{formatLabel(event.format, locale)} · {event.organizer}</p>
      <h1 className={styles.detailTitle}>{event.title[locale]}</h1>
      <p className={styles.detailLead}>{event.summary[locale]}</p>

      <div className={styles.detailCountdown}><EventCountdown date={event.startDate} startsAt={event.startsAt} locale={locale} /></div>

      <dl className={styles.factGrid}>
        <div><dt>{pt ? "Data" : "Date"}</dt><dd>{formatDate(event.startDate, locale)}{event.endDate && event.endDate !== event.startDate ? ` — ${formatDate(event.endDate, locale)}` : ""}</dd></div>
        {preciseStart ? <div><dt>{pt ? "Horário de referência" : "Reference time"}</dt><dd>{preciseStart} UTC</dd></div> : null}
        <div><dt>{pt ? "Formato" : "Format"}</dt><dd>{formatLabel(event.format, locale)}</dd></div>
        <div><dt>{pt ? "Local" : "Location"}</dt><dd>{locationLabel(event, locale)}</dd></div>
        <div><dt>{pt ? "Organização" : "Organizer"}</dt><dd>{event.organizer}</dd></div>
        <div><dt>{pt ? "Custo" : "Cost"}</dt><dd>{event.isFree === true ? (pt ? "Gratuito confirmado" : "Confirmed free") : event.isFree === false ? (pt ? "Pago" : "Paid") : (pt ? "Não confirmado" : "Not confirmed")}</dd></div>
      </dl>

      <section className={styles.participationSection}>
        <div>
          <p className="eyebrow">{pt ? "Participação" : "Participation"}</p>
          <h2>{pt ? "Como participar" : "How to participate"}</h2>
          <p>{event.participation[locale]}</p>
        </div>
        <div className={styles.detailActions}>
          <a className={styles.primary} href={participationUrl} target="_blank" rel="noreferrer">{pt ? "Participar / registrar ↗" : "Participate / register ↗"}</a>
          <a className={styles.secondary} href={calendarHref(event, locale)} download={`${event.externalKey}.ics`}>{pt ? "Adicionar ao calendário ↓" : "Add to calendar ↓"}</a>
          {event.registrationUrl && event.registrationUrl !== event.eventUrl ? <a className={styles.secondary} href={event.eventUrl} target="_blank" rel="noreferrer">{pt ? "Página oficial ↗" : "Official page ↗"}</a> : null}
        </div>
      </section>

      <section className={styles.sourcePanel}>
        <p className="eyebrow">{pt ? "Verificação" : "Verification"}</p>
        <h2>{pt ? "Fonte oficial" : "Official source"}</h2>
        <p>{pt ? "Os dados desta página são derivados da fonte abaixo e passam por validação automatizada antes da publicação." : "The data on this page is derived from the source below and passes automated validation before publication."}</p>
        <a href={event.source.url} target="_blank" rel="noreferrer">{event.source.name} ↗</a>
      </section>
    </article>
  );
}
