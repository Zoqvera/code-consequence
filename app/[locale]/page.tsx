import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCountdown } from "@/components/event-countdown";
import { articles, topics } from "@/lib/content";
import { getUpcomingEvents, type AiEvent } from "@/lib/events";
import { initiatives } from "@/lib/initiatives";
import { dictionary, isLocale, type Locale } from "@/lib/i18n";
import styles from "./home.module.css";

function formatEventDate(date: string, locale: Locale) {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    day: new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: "UTC" }).format(value),
    month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(value).replace(".", ""),
  };
}

function formatEventFormat(format: AiEvent["format"], locale: Locale) {
  if (locale === "en") return format;
  if (format === "Hybrid") return "Híbrido";
  if (format === "In person") return "Presencial";
  return "Online";
}

function eventLocation(event: AiEvent, locale: Locale) {
  if (event.format === "Online") return "Online";
  const location = [event.city, event.country].filter(Boolean).join(" · ");
  return location || (locale === "pt-BR" ? "Local a confirmar" : "Location to confirm");
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary[locale];
  const pt = locale === "pt-BR";
  const upcomingEvents = getUpcomingEvents().slice(0, 3);

  return (
    <>
      <section className="hero shell">
        <p className="eyebrow">{d.heroEyebrow}</p>
        <h1>{d.heroTitle}</h1>
        <p className="hero-copy">{d.heroBody}</p>
        <Link className="button" href={`/${locale}/initiatives`}>{d.heroCta} →</Link>
      </section>

      <section className="section shell">
        <div className="section-heading"><p className="eyebrow">01 / Editorial</p><h2>{d.latest}</h2></div>
        <div className="article-grid">
          {articles.map((article, index) => (
            <article className={index === 0 ? "article-card featured" : "article-card"} key={article.slug}>
              <div className="card-meta"><span>{article.type}</span><span>{article.topic[locale]}</span></div>
              <h3><Link href={`/${locale}/articles/${article.slug}`}>{article.title[locale]}</Link></h3>
              <p>{article.dek[locale]}</p>
              <Link className="text-link" href={`/${locale}/articles/${article.slug}`}>{d.readMore} →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">02 / Global tracker</p><h2>{d.initiatives}</h2></div>
          <div className="initiative-list">
            {initiatives.map((initiative, index) => (
              <article className="initiative-row" key={initiative.slug}>
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="card-meta">{initiative.organization} · {initiative.region[locale]}</p>
                  <h3><Link href={`/${locale}/initiatives/${initiative.slug}`}>{initiative.title[locale]}</Link></h3>
                  <p>{initiative.summary[locale]}</p>
                </div>
                <Link className="text-link" href={`/${locale}/initiatives/${initiative.slug}`}>{d.explore} →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section shell ${styles.events}`}>
        <div className={`section-heading ${styles.heading}`}>
          <p className="eyebrow">03 / {pt ? "Agenda global" : "Global calendar"}</p>
          <div>
            <h2>{pt ? "Próximos eventos de IA" : "Upcoming AI events"}</h2>
            <p className={styles.intro}>
              {pt
                ? "Eventos verificados a partir de fontes oficiais e revisados automaticamente pela nossa rotina de monitoramento."
                : "Events verified from official sources and automatically reviewed by our monitoring workflow."}
            </p>
          </div>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className={styles.list}>
            {upcomingEvents.map((event) => {
              const date = formatEventDate(event.startDate, locale);
              return (
                <article className={styles.row} key={event.externalKey}>
                  <div className={styles.date} aria-label={event.startDate}>
                    <strong>{date.day}</strong>
                    <span>{date.month}</span>
                  </div>
                  <div className={styles.main}>
                    <p className="card-meta">
                      <span>{formatEventFormat(event.format, locale)}</span>
                      <span>{event.organizer}</span>
                      <span>{eventLocation(event, locale)}</span>
                    </p>
                    <h3><Link href={`/${locale}/events/${event.externalKey}`}>{event.title[locale]}</Link></h3>
                    <p>{event.summary[locale]}</p>
                  </div>
                  <div className={styles.side}>
                    <div className={styles.countdown}>
                      <EventCountdown date={event.startDate} startsAt={event.startsAt} locale={locale} />
                    </div>
                    <Link className="text-link" href={`/${locale}/events/${event.externalKey}`}>
                      {pt ? "Ver evento" : "View event"} →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>{pt ? "Nenhum evento futuro verificado no momento." : "No verified upcoming events at the moment."}</p>
        )}

        <div className={styles.footer}>
          <Link className="button" href={`/${locale}/events`}>
            {pt ? "Ver agenda completa" : "View full calendar"} →
          </Link>
          <p>{pt ? "A agenda é atualizada aproximadamente a cada dois dias." : "The calendar is refreshed approximately every two days."}</p>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading"><p className="eyebrow">04 / Taxonomy</p><h2>{d.topics}</h2></div>
        <div className="topic-grid">{topics.map((topic, i) => <Link key={topic.slug} href={`/${locale}/topics#${topic.slug}`}><span>0{i + 1}</span>{topic[locale]}</Link>)}</div>
      </section>
    </>
  );
}
