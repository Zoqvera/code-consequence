import type { Metadata } from "next";
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
