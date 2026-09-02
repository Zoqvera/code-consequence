import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUpcomingEvents } from "@/lib/events";
import { isLocale } from "@/lib/i18n";
import { EventList } from "./event-list";
import styles from "./events.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";
  return {
    title: pt ? "Eventos de inteligência artificial" : "Artificial intelligence events",
    description: pt
      ? "Agenda verificada de conferências, webinars, workshops e encontros sobre inteligência artificial, atualizada automaticamente a partir de fontes oficiais."
      : "A verified calendar of artificial intelligence conferences, webinars, workshops and meetings, automatically refreshed from official sources.",
  };
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
        <EventList events={upcoming} locale={locale} />
      )}
    </div>
  );
}
