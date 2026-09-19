import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { topics } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { buildAboutPageSchema, buildBreadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt ? "Sobre o Code & Consequence" : "About Code & Consequence",
    description: pt
      ? "Entenda o Code & Consequence, observatório bilíngue sobre impactos da IA, governança, democracia, trabalho, direitos e meio ambiente."
      : "Understand Code & Consequence, a bilingual observatory on AI impacts, governance, democracy, work, rights and the environment.",
    path: "/about",
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";
  const description = pt
    ? "Code & Consequence é um observatório editorial bilíngue e independente que acompanha consequências políticas, sociais e ambientais da inteligência artificial e as respostas concretas a elas."
    : "Code & Consequence is an independent bilingual editorial observatory tracking the political, social and environmental consequences of artificial intelligence and concrete responses to them.";
  const structuredData = [
    buildAboutPageSchema(locale, description),
    buildBreadcrumbSchema(locale, [
      { name: pt ? "Início" : "Home", path: "" },
      { name: pt ? "Sobre" : "About", path: "/about" },
    ]),
  ];

  return (
    <article className="shell prose page-pad">
      <StructuredData data={structuredData} />
      <p className="eyebrow">{pt ? "Identidade editorial" : "Editorial identity"}</p>
      <h1 className="page-title">{pt ? "Sobre o Code & Consequence" : "About Code & Consequence"}</h1>
      <p className="lead">{description}</p>

      <h2>{pt ? "O que é o Code & Consequence" : "What Code & Consequence is"}</h2>
      <p>
        {pt
          ? "O site reúne notícias, análises, dossiês, iniciativas verificadas, organizações, fontes, dados e eventos para documentar como a IA altera instituições, relações de poder, economia, direitos e infraestrutura."
          : "The site brings together news, analysis, dossiers, verified initiatives, organizations, sources, data and events to document how AI changes institutions, power relations, the economy, rights and infrastructure."}
      </p>

      <h2>{pt ? "Áreas de cobertura" : "Coverage areas"}</h2>
      <ul>
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link href={`/${locale}/topics/${topic.slug}`}>{topic[locale]}</Link>
          </li>
        ))}
      </ul>

      <h2>{pt ? "O que acompanhamos" : "What we track"}</h2>
      <p>
        {pt
          ? "Não cobrimos lançamentos de produtos por si só. Priorizamos acontecimentos e iniciativas que alterem relações de poder, direitos, trabalho, governança pública ou impactos ambientais."
          : "We do not cover product launches for their own sake. We prioritize events and initiatives that change power relations, rights, labour, public governance or environmental impacts."}
      </p>

      <h2>{pt ? "Proveniência e verificabilidade" : "Provenance and verifiability"}</h2>
      <p>
        {pt
          ? "Artigos e iniciativas publicados preservam suas fontes, e o registro público de proveniência mostra onde cada fonte aparece no corpus. Isso permite separar afirmações editoriais de evidências externas e facilita a verificação independente."
          : "Published articles and initiatives preserve their sources, and the public provenance registry shows where each source appears in the corpus. This separates editorial claims from external evidence and supports independent verification."}
      </p>
      <p>
        <Link className="text-link" href={`/${locale}/sources`}>
          {pt ? "Consultar o registro de fontes" : "Browse the source registry"} →
        </Link>
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
