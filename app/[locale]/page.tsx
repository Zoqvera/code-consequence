import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCountdown } from "@/components/event-countdown";
import { articles, topics } from "@/lib/content";
import { getUpcomingEvents, type AiEvent } from "@/lib/events";
import { initiatives, type InitiativeDetail } from "@/lib/initiatives";
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

function verificationTime(item: InitiativeDetail) {
  if (!item.lastVerifiedAt) return 0;
  const time = new Date(item.lastVerifiedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatVerifiedDate(value: string | null, locale: Locale) {
  if (!value) return locale === "pt-BR" ? "Sem data" : "Undated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "pt-BR" ? "Sem data" : "Undated";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary[locale];
  const pt = locale === "pt-BR";
  const upcomingEvents = getUpcomingEvents().slice(0, 3);
  const latestInitiatives = [...initiatives].sort((a, b) => verificationTime(b) - verificationTime(a)).slice(0, 4);
  const sourceCount = initiatives.reduce((total, item) => total + item.sources.length, 0);
  const organizationCount = new Set(initiatives.map((item) => item.organization)).size;
  const regionCount = new Set(initiatives.map((item) => item.region.en)).size;
  const activeCount = initiatives.filter((item) => item.status === "Active").length;
  const latestVerifiedAt = latestInitiatives[0]?.lastVerifiedAt ?? null;

  return (
    <>
      <section className={`hero shell ${styles.hero}`}>
        <p className="eyebrow">{d.heroEyebrow}</p>
        <h1>{d.heroTitle}</h1>
        <p className="hero-copy">{d.heroBody}</p>
        <div className={styles.heroActions}>
          <Link className="button" href={`/${locale}/initiatives`}>{d.heroCta} →</Link>
          <Link className={styles.secondaryAction} href={`/${locale}/radar`}>
            {pt ? "Abrir Global Radar" : "Open Global Radar"} →
          </Link>
        </div>
      </section>

      <section className={`${styles.pulse} shell`} aria-labelledby="observatory-pulse-title">
        <div className={styles.pulseHeading}>
          <p className="eyebrow">01 / {pt ? "Pulso do observatório" : "Observatory pulse"}</p>
          <h2 id="observatory-pulse-title">{pt ? "O que estamos acompanhando agora" : "What we are tracking now"}</h2>
          <p>
            {pt
              ? "Uma visão compacta do corpus público já verificado pelo Code & Consequence."
              : "A compact view of the public corpus already verified by Code & Consequence."}
          </p>
        </div>
        <div className={styles.metrics}>
          <div><strong>{initiatives.length}</strong><span>{pt ? "iniciativas publicadas" : "published initiatives"}</span></div>
          <div><strong>{organizationCount}</strong><span>{pt ? "organizações monitoradas" : "organizations tracked"}</span></div>
          <div><strong>{regionCount}</strong><span>{pt ? "recortes regionais" : "regional records"}</span></div>
          <div><strong>{sourceCount}</strong><span>{pt ? "fontes verificadas" : "verified sources"}</span></div>
        </div>
        <p className={styles.verificationStamp}>
          {pt ? "Verificação mais recente" : "Latest verification"}: {formatVerifiedDate(latestVerifiedAt, locale)} · {activeCount} {pt ? "iniciativas ativas" : "active initiatives"}
        </p>
      </section>

      <section className={styles.radarFeature}>
        <div className={`shell ${styles.radarGrid}`}>
          <div className={styles.radarCopy}>
            <p className="eyebrow">02 / Global Radar</p>
            <h2>{pt ? "Veja onde as respostas à IA estão surgindo." : "See where responses to AI are emerging."}</h2>
            <p>
              {pt
                ? "Explore políticas, mecanismos de fiscalização, avaliações de prontidão, coalizões e outras iniciativas por região, tema, status e organização."
                : "Explore policies, enforcement mechanisms, readiness assessments, coalitions and other initiatives by region, topic, status and organization."}
            </p>
            <Link className={styles.radarButton} href={`/${locale}/radar`}>
              {pt ? "Explorar o Radar" : "Explore the Radar"} →
            </Link>
          </div>
          <div className={styles.radarVisual} aria-hidden="true">
            <div className={`${styles.radarNode} ${styles.radarEurope}`}><span>{pt ? "Europa" : "Europe"}</span><strong>{initiatives.filter((item) => item.region.en.includes("EU") || item.region.en.includes("Europe")).length}</strong></div>
            <div className={`${styles.radarNode} ${styles.radarGlobal}`}><span>Global</span><strong>{initiatives.filter((item) => item.region.en.toLowerCase().includes("global")).length}</strong></div>
            <div className={`${styles.radarNode} ${styles.radarLatam}`}><span>{pt ? "Am. Latina / Caribe" : "LatAm / Caribbean"}</span><strong>{initiatives.filter((item) => /latin|caribbean|anguilla/i.test(item.region.en)).length}</strong></div>
            <div className={`${styles.radarNode} ${styles.radarAsia}`}><span>{pt ? "Ásia-Pacífico" : "Asia-Pacific"}</span><strong>{initiatives.filter((item) => /thailand|asia|pacific/i.test(item.region.en)).length}</strong></div>
            <div className={styles.radarAxis} />
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className={`section-heading ${styles.sectionHeadingWithLink}`}>
            <p className="eyebrow">03 / {pt ? "Registros verificados" : "Verified records"}</p>
            <div>
              <h2>{pt ? "Verificados recentemente" : "Recently verified"}</h2>
              <Link className={styles.sectionLink} href={`/${locale}/initiatives`}>
                {pt ? "Ver todas as iniciativas" : "View all initiatives"} →
              </Link>
            </div>
          </div>
          <div className="initiative-list">
            {latestInitiatives.map((initiative, index) => (
              <article className="initiative-row" key={initiative.slug}>
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="card-meta">{initiative.organization} · {initiative.region[locale]} · {formatVerifiedDate(initiative.lastVerifiedAt, locale)}</p>
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
          <p className="eyebrow">04 / {pt ? "Agenda global" : "Global calendar"}</p>
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
        <div className="section-heading"><p className="eyebrow">05 / Editorial</p><h2>{d.latest}</h2></div>
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

      <section className="section shell">
        <div className="section-heading"><p className="eyebrow">06 / Taxonomy</p><h2>{d.topics}</h2></div>
        <div className="topic-grid">{topics.map((topic, i) => <Link key={topic.slug} href={`/${locale}/topics#${topic.slug}`}><span>0{i + 1}</span>{topic[locale]}</Link>)}</div>
      </section>
    </>
  );
}
