import Link from "next/link";
import {
  currentAiMonitorAssessment,
  getAiMonitorStatusLabel,
  type AiMonitorStatus,
} from "@/lib/ai-monitor";
import type { Locale } from "@/lib/i18n";
import styles from "./ai-monitor-teaser.module.css";

const trafficLightOrder: AiMonitorStatus[] = ["red", "yellow", "green"];

function formatAssessmentDate(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00Z`);

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
}

function getAlertTitle(status: AiMonitorStatus, locale: Locale) {
  const labels: Record<AiMonitorStatus, Record<Locale, string>> = {
    green: {
      en: "Controlled status",
      "pt-BR": "Status controlado",
    },
    yellow: {
      en: "Elevated alert",
      "pt-BR": "Alerta elevado",
    },
    red: {
      en: "Critical alert",
      "pt-BR": "Alerta crítico",
    },
  };

  return labels[status][locale];
}

export function AiMonitorTeaser({ locale }: { locale: Locale }) {
  const assessment = currentAiMonitorAssessment;
  const pt = locale === "pt-BR";
  const statusLabel = getAiMonitorStatusLabel(assessment.status, locale);

  return (
    <section className={styles.section} aria-labelledby="home-ai-monitor-title">
      <div className={styles.card} data-status={assessment.status}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>C&C AI Monitor</p>
            <h2 id="home-ai-monitor-title" className={styles.title}>
              {pt ? "Semáforo global de IA" : "Global AI traffic light"}
            </h2>
          </div>

          <div className={styles.updated}>
            <span>{pt ? "Atualizado" : "Updated"}</span>
            <strong>{formatAssessmentDate(assessment.date, locale)}</strong>
          </div>
        </header>

        <div className={styles.body}>
          <div
            className={styles.trafficLight}
            role="img"
            aria-label={
              pt
                ? `Semáforo do C&C AI Monitor: status ${statusLabel}`
                : `C&C AI Monitor traffic light: ${statusLabel} status`
            }
          >
            {trafficLightOrder.map((status) => (
              <span
                key={status}
                className={styles.light}
                data-light={status}
                data-active={assessment.status === status ? "true" : "false"}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className={styles.status}>
            <div className={styles.statusMeta}>
              <span>{pt ? "Estado atual" : "Current state"}</span>
              <strong>{assessment.score}/100</strong>
            </div>

            <p className={styles.alertTitle}>{getAlertTitle(assessment.status, locale)}</p>
            <p className={styles.summary}>{assessment.summary[locale]}</p>
          </div>
        </div>

        <footer className={styles.footer}>
          <div className={styles.liveSignal} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <p>
            {pt
              ? "Vigilância contínua de riscos, capacidades, incidentes e governança"
              : "Continuous surveillance of risks, capabilities, incidents and governance"}
          </p>

          <Link href={`/${locale}/ai-monitor`}>
            {pt ? "Abrir monitor completo" : "Open full monitor"} <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </div>
    </section>
  );
}
