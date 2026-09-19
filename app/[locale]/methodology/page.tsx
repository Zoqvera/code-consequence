import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { automationStages, sourceTiers } from "@/lib/methodology";
import { buildMetadata } from "@/lib/seo";
import styles from "./methodology.module.css";

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
    title: pt ? "Metodologia e transparência" : "Methodology and transparency",
    description: pt
      ? "Como o Code & Consequence seleciona fontes, usa automação e aplica revisão humana antes da publicação."
      : "How Code & Consequence selects sources, uses automation and applies human review before publication.",
    path: "/methodology",
  });
}

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  const gates = [
    {
      title: pt ? "Evidência rastreável" : "Traceable evidence",
      body: pt
        ? "Afirmações factuais devem manter ligação com fontes identificáveis. Fontes de descoberta não bastam isoladamente."
        : "Factual claims must remain linked to identifiable sources. Discovery sources are never sufficient on their own.",
    },
    {
      title: pt ? "Estrutura antes da publicação" : "Structure before publication",
      body: pt
        ? "Iniciativas, eventos e dossiês têm requisitos mínimos próprios antes de poderem entrar no corpus público."
        : "Initiatives, events and dossiers have their own minimum requirements before they can enter the public corpus.",
    },
    {
      title: pt ? "Aprovação humana" : "Human approval",
      body: pt
        ? "A automação prepara e prioriza; a mudança final para PUBLISHED exige aprovação humana explícita."
        : "Automation prepares and prioritizes; the final transition to PUBLISHED requires explicit human approval.",
    },
  ];

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Transparência editorial" : "Editorial transparency"}</p>
      <h1 className="page-title">{pt ? "Metodologia" : "Methodology"}</h1>
      <p className="page-intro">
        {pt
          ? "O Code & Consequence combina automação, rastreabilidade de fontes e revisão humana. Esta página descreve o que cada camada faz — e o que não pode fazer."
          : "Code & Consequence combines automation, source traceability and human review. This page explains what each layer does — and what it cannot do."}
      </p>

      <section className={styles.introGrid}>
        <h2>{pt ? "Problema → resposta" : "Problem → response"}</h2>
        <p>
          {pt
            ? "O observatório não trata IA como uma sequência de lançamentos de produto. A unidade editorial é a consequência pública: primeiro identificamos um problema ou mudança material; depois acompanhamos respostas concretas, instituições, políticas, iniciativas e evidências relacionadas."
            : "The observatory does not treat AI as a sequence of product launches. The editorial unit is the public consequence: first we identify a material problem or change; then we track concrete responses, institutions, policies, initiatives and related evidence."}
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Hierarquia de fontes" : "Source hierarchy"}</h2>
          <p>
            {pt
              ? "As fontes não têm o mesmo peso editorial. A classificação abaixo define como cada grupo pode ser usado."
              : "Sources do not carry equal editorial weight. The hierarchy below defines how each group may be used."}
          </p>
        </div>

        <div className={styles.tiers}>
          {sourceTiers.map((source) => (
            <article className={styles.tier} key={source.tier}>
              <span className={styles.badge}>Tier {source.tier}</span>
              <h3>{source.title[locale]}</h3>
              <p>{source.description[locale]}</p>
              <p className={styles.role}>{source.publicationRole[locale]}</p>
            </article>
          ))}
        </div>

        <p className={styles.note}>
          <Link className="text-link" href={`/${locale}/sources`}>
            {pt ? "Consultar o registro público de fontes" : "Browse the public source registry"} →
          </Link>
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Onde a IA entra" : "Where AI enters"}</h2>
          <p>
            {pt
              ? "A automação reduz trabalho repetitivo e organiza evidências; ela não recebe autoridade editorial para publicar por conta própria."
              : "Automation reduces repetitive work and organizes evidence; it is not given editorial authority to publish on its own."}
          </p>
        </div>

        <div className={styles.pipeline}>
          {automationStages.map((stage, index) => (
            <article className={styles.stage} key={stage.key}>
              <span className={styles.stageIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{stage.title[locale]}</h3>
                <p>{stage.description[locale]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Vigilância do C&C AI Monitor" : "C&C AI Monitor surveillance"}</h2>
          <p>
            {pt
              ? "O Monitor executa uma varredura recorrente de fontes institucionais e produz recomendações estruturadas sem autoridade para alterar o status público sozinho."
              : "The Monitor runs recurring scans of institutional sources and produces structured recommendations without authority to change the public status on its own."}
          </p>
        </div>

        <div className={styles.gates}>
          <article className={styles.gate}>
            <strong>{pt ? "1. Coleta" : "1. Collection"}</strong>
            <p>
              {pt
                ? "A cada seis horas, fontes configuradas são consultadas e o texto público relevante é preparado para análise."
                : "Every six hours, configured sources are checked and relevant public text is prepared for analysis."}
            </p>
          </article>
          <article className={styles.gate}>
            <strong>{pt ? "2. Recomendação" : "2. Recommendation"}</strong>
            <p>
              {pt
                ? "O sistema compara as novas evidências com a avaliação publicada e recomenda deltas limitados para as cinco dimensões de risco."
                : "The system compares new evidence with the published assessment and recommends bounded deltas across the five risk dimensions."}
            </p>
          </article>
          <article className={styles.gate}>
            <strong>{pt ? "3. Gate humano" : "3. Human gate"}</strong>
            <p>
              {pt
                ? "Mudanças materiais entram em fila de revisão. Uma nova pontuação só é publicada após aprovação humana explícita e fica registrada no histórico."
                : "Material changes enter a review queue. A new score is published only after explicit human approval and remains recorded in the history."}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{pt ? "Barreiras de publicação" : "Publication gates"}</h2>
          <p>
            {pt
              ? "Um registro só chega ao site quando as exigências de evidência, estrutura e revisão são satisfeitas."
              : "A record reaches the public site only after evidence, structure and review requirements are satisfied."}
          </p>
        </div>

        <div className={styles.gates}>
          {gates.map((gate) => (
            <article className={styles.gate} key={gate.title}>
              <strong>{gate.title}</strong>
              <p>{gate.body}</p>
            </article>
          ))}
        </div>

        <p className={styles.note}>
          {pt
            ? "A classificação automática pode errar. Por isso, URLs, proveniência, status editorial e requisitos de publicação são preservados como dados verificáveis em vez de depender apenas do texto gerado."
            : "Automated classification can be wrong. That is why URLs, provenance, editorial status and publication requirements are preserved as verifiable data rather than relying only on generated prose."}
        </p>
      </section>
    </div>
  );
}
