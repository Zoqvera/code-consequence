import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleIndex } from "@/components/article-index";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";

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
    title: pt ? "Dossiês" : "Dossiers",
    description: pt
      ? "Dossiês persistentes que acompanham problemas de IA ao longo do tempo com indicadores, legislação, iniciativas e fontes verificadas."
      : "Persistent issue dossiers tracking AI-related problems over time with indicators, legislation, initiatives and verified sources.",
    path: "/dossiers",
  });
}

export default async function DossiersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Acompanhamento longitudinal" : "Longitudinal tracking"}</p>
      <h1 className="page-title">{pt ? "Dossiês" : "Dossiers"}</h1>
      <p className="page-intro">
        {pt
          ? "Dossiês reúnem evidências persistentes sobre um problema: indicadores, marcos temporais, países, legislação, respostas verificadas e fontes."
          : "Dossiers gather persistent evidence around an issue: indicators, milestones, countries, legislation, verified responses and sources."}
      </p>

      <ArticleIndex locale={locale} type="Dossier" />
    </div>
  );
}
