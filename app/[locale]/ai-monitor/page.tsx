import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  aiMonitorHistory,
  aiMonitorThresholds,
  currentAiMonitorAssessment,
  getAiMonitorConfidenceLabel,
  getAiMonitorStatusLabel,
  type AiMonitorStatus,
} from "@/lib/ai-monitor";
import { isLocale } from "@/lib/i18n";
import surveillanceSourcesData from "@/config/ai-monitor-sources.json";
import { buildMetadata } from "@/lib/seo";
import styles from "./ai-monitor.module.css";

const statusOrder: AiMonitorStatus[] = ["green", "yellow", "red"];

type SurveillanceSource = {
  id: string;
  name: string;
  publisher: string;
  jurisdiction: string;
  url: string;
  dimensions: string[];
  tier: number;
  enabled: boolean;
};

const surveillanceSources = (surveillanceSourcesData as SurveillanceSource[]).filter(
  (source) => source.enabled,
);

function formatDate(value: string, locale: "en" | "pt-BR") {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
    title: "C&C AI Monitor",
    description: pt
      ? "Indicador editorial e auditável sobre o estado global de risco associado à inteligência artificial."
      : "An editorial, auditable indicator of the global risk conditions surrounding artificial intelligence.",
    path: "/ai-monitor",
  });
}

export default async function AiMonitorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const assessment = currentAiMonitorAssessment;
  const statusLabel = getAiMonitorStatusLabel(assessment.status, locale);

  const thresholdCopy = {
    green: {
      range: `0–${aiMonitorThresholds.greenMax}`,
      title: pt ? "Verde · Controlado" : "Green · Controlled",
      body: pt
        ? "Não há evidência suficiente de deterioração sistêmica. Incidentes permanecem localizados e existem mecanismos razoáveis de contenção."
        : "There is insufficient evidence of systemic deterioration. Incidents remain localized and reasonable containment mechanisms exist.",
    },
    yellow: {
      range: `${aiMonitorThresholds.greenMax + 1}–${aiMonitorThresholds.yellowMax}`,
      title: pt ? "Amarelo · Elevado" : "Yellow · Elevated",
      body: pt
        ? "Capacidades, incidentes ou lacunas de governança exigem atenção ampliada, mas não indicam uma situação crítica generalizada."
        : "Capabilities, incidents or governance gaps warrant heightened attention but do not indicate a generalized critical condition.",
    },
    red: {
      range: `${aiMonitorThresholds.yellowMax + 1}–100`,
      title: pt ? "Vermelho · Crítico" : "Red · Critical",
      body: pt
        ? "Há evidência verificável de falhas graves ou repetidas de controle, incidentes sistêmicos ou incapacidade relevante de contenção."
        : "There is verifiable evidence of severe or repeated control failures, systemic incidents or materially insufficient containment.",
    },
  };

  return (
    <div className="shell page-pad">
      <p className="eyebrow">C&C AI Monitor</p>

      <section className={styles.hero}>
        <div className={styles.statusPanel} data-status={assessment.status}>
          <div className={styles.statusDot} aria-hidden="true" />
          <span>{pt ? "Status global" : "Global status"}</span>
          <strong>{statusLabel}</strong>
          <div className={styles.score}>
            <b>{assessment.score}</b>
            <span>/ 100</span>
          </div>
        </div>

        <div className={styles.heroCopy}>
          <h1>{pt ? "Um semáforo auditável para o risco de IA." : "An auditable signal for AI risk."}</h1>
          <p>{assessment.summary[locale]}</p>
          <dl className={styles.meta}>
            <div>
              <dt>{pt ? "Atualizado" : "Updated"}</dt>
              <dd>{formatDate(assessment.date, locale)}</dd>
            </div>
            <div>
              <dt>{pt ? "Confiança" : "Confidence"}</dt>
              <dd>{getAiMonitorConfidenceLabel(assessment.confidence, locale)}</dd>
            </div>
            <div>
              <dt>{pt ? "Modelo" : "Model"}</dt>
              <dd>{pt ? "Pontuação ponderada + revisão editorial" : "Weighted score + editorial review"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.surveillance} aria-labelledby="surveillance-title">
        <div className={styles.surveillanceIntro}>
          <div>
            <p className="eyebrow">{pt ? "Vigilância contínua" : "Continuous surveillance"}</p>
            <h2 id="surveillance-title">
              {pt ? "O Monitor verifica novas evidências a cada seis horas." : "The Monitor checks for new evidence every six hours."}
            </h2>
          </div>
          <p>
            {pt
              ? "Fontes institucionais são coletadas automaticamente e analisadas contra a avaliação pública vigente. Mudanças materiais geram uma fila de revisão; nenhuma recomendação altera a cor pública sem aprovação editorial humana."
              : "Institutional sources are collected automatically and analysed against the current public assessment. Material changes create an editorial review queue; no recommendation changes the public color without human approval."}
          </p>
        </div>

        <div className={styles.surveillanceMetrics}>
          <div><strong>6h</strong><span>{pt ? "cadência de varredura" : "scan cadence"}</span></div>
          <div><strong>{surveillanceSources.length}</strong><span>{pt ? "fontes institucionais" : "institutional sources"}</span></div>
          <div><strong>1</strong><span>{pt ? "gate humano obrigatório" : "mandatory human gate"}</span></div>
        </div>

        <div className={styles.watchList}>
          {surveillanceSources.map((source) => (
            <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
              <div>
                <strong>{source.publisher}</strong>
                <span>{source.name}</span>
              </div>
              <small>{source.jurisdiction} · Tier {source.tier} ↗</small>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Dimensões do indicador" : "Indicator dimensions"}</h2>
          <p>
            {pt
              ? "Pontuações mais altas representam maior preocupação. Os pesos somam 100% e a pontuação global é calculada a partir das cinco dimensões."
              : "Higher scores represent greater concern. Weights total 100%, and the global score is calculated from the five dimensions."}
          </p>
        </div>

        <div className={styles.dimensions}>
          {assessment.dimensions.map((dimension) => (
            <article className={styles.dimension} key={dimension.key}>
              <div className={styles.dimensionHeading}>
                <div>
                  <h3>{dimension.title[locale]}</h3>
                  <p>{dimension.description[locale]}</p>
                </div>
                <div className={styles.dimensionScore}>
                  <strong>{dimension.score}</strong>
                  <span>{Math.round(dimension.weight * 100)}%</span>
                </div>
              </div>
              <div
                className={styles.track}
                role="img"
                aria-label={`${dimension.title[locale]}: ${dimension.score} ${pt ? "de" : "of"} 100`}
              >
                <span style={{ width: `${dimension.score}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Como as cores funcionam" : "How the colors work"}</h2>
          <p>
            {pt
              ? "A cor não é definida pela existência de uma única lei, empresa ou incidente. Ela sintetiza um conjunto de sinais verificáveis e pode ser revista editorialmente quando houver evidência extraordinária."
              : "The color is not determined by any single law, company or incident. It synthesizes a set of verifiable signals and can be editorially reviewed when extraordinary evidence appears."}
          </p>
        </div>

        <div className={styles.thresholds}>
          {statusOrder.map((status) => (
            <article className={styles.threshold} data-status={status} key={status}>
              <div className={styles.thresholdTop}>
                <span className={styles.miniDot} aria-hidden="true" />
                <b>{thresholdCopy[status].range}</b>
              </div>
              <h3>{thresholdCopy[status].title}</h3>
              <p>{thresholdCopy[status].body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Evidências desta avaliação" : "Evidence behind this assessment"}</h2>
          <p>
            {pt
              ? "O Monitor privilegia fontes institucionais e registros verificáveis. Estes itens sustentam a avaliação atual, mas não constituem uma lista exaustiva."
              : "The Monitor prioritizes institutional sources and verifiable records. These items support the current assessment but are not exhaustive."}
          </p>
        </div>

        <div className={styles.evidenceList}>
          {assessment.evidence.map((item, index) => (
            <article className={styles.evidence} key={item.id}>
              <span className={styles.evidenceIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="card-meta">{item.organization} · {item.jurisdiction} · {item.publishedAt}</p>
                <h3>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title} ↗
                  </a>
                </h3>
                <p>{item.note[locale]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Histórico" : "History"}</h2>
          <p>
            {pt
              ? "Cada mudança de status será preservada para que a evolução do indicador possa ser auditada ao longo do tempo."
              : "Every status change will be retained so the indicator's evolution can be audited over time."}
          </p>
        </div>

        <div className={styles.history}>
          {aiMonitorHistory.map((item) => (
            <article className={styles.historyRow} key={item.date}>
              <time dateTime={item.date}>{formatDate(item.date, locale)}</time>
              <span className={styles.historyStatus} data-status={item.status}>
                <i aria-hidden="true" />
                {getAiMonitorStatusLabel(item.status, locale)}
              </span>
              <strong>{item.score}/100</strong>
            </article>
          ))}
        </div>

        <p className={styles.methodologyNote}>
          {pt
            ? "O C&C AI Monitor é um indicador editorial, não uma previsão probabilística de catástrofe nem uma medida de uma única tecnologia. A vigilância automática apenas recomenda alterações; a publicação de uma nova avaliação exige aprovação humana explícita e fica preservada no histórico."
            : "C&C AI Monitor is an editorial indicator, not a probabilistic catastrophe forecast or a measure of any single technology. Automated surveillance only recommends changes; publishing a new assessment requires explicit human approval and remains preserved in the history."}
          {" "}
          <Link className="text-link" href={`/${locale}/methodology`}>
            {pt ? "Ver metodologia editorial" : "View editorial methodology"} →
          </Link>
        </p>
      </section>
    </div>
  );
}
