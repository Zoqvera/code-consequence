import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt ? "Sobre o Code & Consequence" : "About Code & Consequence",
    description: pt
      ? "Conheça o método editorial, os critérios de cobertura e o uso de automação no Code & Consequence."
      : "Learn about the editorial method, coverage criteria and use of automation at Code & Consequence.",
    path: "/about",
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  return (
    <article className="shell prose page-pad">
      <p className="eyebrow">Method</p>
      <h1 className="page-title">{pt ? "Sobre o Code & Consequence" : "About Code & Consequence"}</h1>
      <p className="lead">
        {pt
          ? "Um observatório editorial independente sobre IA, poder, sociedade e planeta."
          : "An independent editorial observatory on AI, power, society and the planet."}
      </p>

      <h2>{pt ? "O que acompanhamos" : "What we track"}</h2>
      <p>
        {pt
          ? "Não cobrimos lançamentos de produtos por si só. Priorizamos acontecimentos e iniciativas que alterem relações de poder, direitos, trabalho, governança pública ou impactos ambientais."
          : "We do not cover product launches for their own sake. We prioritize events and initiatives that change power relations, rights, labour, public governance or environmental impacts."}
      </p>

      <h2>{pt ? "Como usamos IA" : "How we use AI"}</h2>
      <p>
        {pt
          ? "Automação pode ajudar na descoberta, classificação, deduplicação e preparação editorial. Publicação exige rastreabilidade de fontes e aprovação humana explícita."
          : "Automation may assist discovery, classification, deduplication and editorial preparation. Publication requires source traceability and explicit human approval."}
      </p>

      <Link className="button" href={`/${locale}/methodology`}>
        {pt ? "Ver metodologia completa" : "Read the full methodology"} →
      </Link>
    </article>
  );
}
