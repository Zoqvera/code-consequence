import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlobalRadar } from "@/components/global-radar";
import { initiatives } from "@/lib/initiatives";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";
  return {
    title: pt ? "Global Radar — Code & Consequence" : "Global Radar — Code & Consequence",
    description: pt
      ? "Explore iniciativas verificadas de inteligência artificial por região, tema, status e organização."
      : "Explore verified artificial-intelligence initiatives by region, topic, status and organization.",
  };
}

export default async function RadarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad radar-page">
      <p className="eyebrow">Global tracker / Radar</p>
      <h1 className="page-title">Global Radar</h1>
      <p className="page-intro">
        {pt
          ? "Uma visão comparável das iniciativas de IA verificadas pelo Code & Consequence. Explore onde estão concentradas, quem as conduz, quais temas abordam e quais registros já passaram pelo nosso processo editorial."
          : "A comparable view of the AI initiatives verified by Code & Consequence. Explore where activity is concentrated, who leads it, which issues it addresses and which records have passed our editorial process."}
      </p>
      <p className="tracker-count">
        {initiatives.length} {pt ? "registros publicados no radar" : "published records in the radar"}
      </p>
      <GlobalRadar initiatives={initiatives} locale={locale} />
    </div>
  );
}
