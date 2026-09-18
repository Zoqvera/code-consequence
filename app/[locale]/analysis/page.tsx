import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleIndex } from "@/components/article-index";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt ? "Análises" : "Analysis",
    description: pt
      ? "Análises baseadas em fontes sobre as consequências políticas, sociais e ambientais da inteligência artificial."
      : "Source-based analysis of the political, social and environmental consequences of artificial intelligence.",
    path: "/analysis",
  });
}

export default async function AnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Contexto e consequência" : "Context and consequence"}</p>
      <h1 className="page-title">{pt ? "Análises" : "Analysis"}</h1>
      <p className="page-intro">
        {pt
          ? "Leituras explicativas que conectam evidências, iniciativas verificadas e mudanças institucionais para mostrar por que um desenvolvimento em IA importa."
          : "Explanatory reporting that connects evidence, verified initiatives and institutional change to show why an AI development matters."}
      </p>
      <ArticleIndex locale={locale} type="Analysis" />
    </div>
  );
}
