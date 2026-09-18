import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InitiativeExplorer } from "@/components/initiative-explorer";
import { initiatives } from "@/lib/initiatives";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";

  return buildMetadata({
    locale,
    title: pt ? "Iniciativas de IA" : "AI initiatives",
    description: pt
      ? "Explore projetos, políticas e mecanismos verificados que respondem aos impactos sociais, políticos e ambientais da inteligência artificial."
      : "Explore verified projects, policies and mechanisms responding to the social, political and environmental impacts of artificial intelligence.",
    path: "/initiatives",
  });
}

export default async function InitiativesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  const explorerItems = initiatives.map((item) => ({
    slug: item.slug,
    organization: item.organization,
    region: item.region[locale],
    status: item.status,
    topic: item.topic[locale],
    title: item.title[locale],
    summary: item.summary[locale],
  }));

  return (
    <div className="shell page-pad">
      <p className="eyebrow">Global tracker</p>
      <h1 className="page-title">{pt ? "Iniciativas" : "Initiatives"}</h1>
      <p className="page-intro">
        {pt
          ? "Projetos, políticas e mecanismos reais criados para responder aos impactos sociais, políticos e ambientais da IA. Pesquise e filtre os registros sem sair da página."
          : "Real projects, policies and mechanisms created to respond to the social, political and environmental impacts of AI. Search and filter the records without leaving the page."}
      </p>
      <p className="tracker-count">
        {initiatives.length} {pt ? "registros publicados" : "published records"} · <Link className="text-link" href={`/${locale}/radar`}>{pt ? "Explorar visualmente no Global Radar" : "Explore visually in Global Radar"} →</Link>
      </p>

      <InitiativeExplorer locale={locale} items={explorerItems} />
    </div>
  );
}
