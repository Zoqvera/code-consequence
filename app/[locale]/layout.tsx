import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { SearchItem } from "@/components/site-search";
import { articles, topics } from "@/lib/content";
import { events } from "@/lib/events";
import { initiatives } from "@/lib/initiatives";
import { isLocale, locales } from "@/lib/i18n";
import { organizations } from "@/lib/organizations";
import { buildMetadata } from "@/lib/seo";
import { sourceRegistry } from "@/lib/source-registry";
import { topicDescriptions } from "@/lib/topic-hubs";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: pt ? "IA, sociedade e planeta" : "AI, society and planet",
    description: pt
      ? "Jornalismo e análise sobre as consequências políticas, sociais e ambientais da inteligência artificial."
      : "Reporting and analysis on the political, social and environmental consequences of artificial intelligence.",
  });
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const pt = locale === "pt-BR";

  const searchItems: SearchItem[] = [
    ...sourceRegistry.map((source) => ({
      href: `/${locale}/sources/${source.slug}`,
      type: "source" as const,
      title: source.name,
      description: pt
        ? `Fonte Tier ${source.tier} usada em ${source.references.length} registro(s) público(s).`
        : `Tier ${source.tier} source used in ${source.references.length} public record(s).`,
      meta: source.host,
    })),
    ...organizations.map((organization) => ({
      href: `/${locale}/organizations/${organization.slug}`,
      type: "organization" as const,
      title: organization.name,
      description: pt
        ? `${organization.initiatives.length} iniciativa(s) verificada(s) no corpus público.`
        : `${organization.initiatives.length} verified initiative(s) in the public corpus.`,
      meta: pt ? "Organização" : "Organization",
    })),
    ...initiatives.map((item) => ({
      href: `/${locale}/initiatives/${item.slug}`,
      type: "initiative" as const,
      title: item.title[locale],
      description: item.summary[locale],
      meta: `${item.organization} · ${item.region[locale]}`,
    })),
    ...articles.map((item) => ({
      href: `/${locale}/articles/${item.slug}`,
      type: "article" as const,
      title: item.title[locale],
      description: item.dek[locale],
      meta: `${item.type} · ${item.topic[locale]}`,
    })),
    ...events.map((item) => ({
      href: `/${locale}/events/${item.externalKey}`,
      type: "event" as const,
      title: item.title[locale],
      description: item.summary[locale],
      meta: `${item.organizer} · ${item.startDate}`,
    })),
    ...topics.map((item) => ({
      href: `/${locale}/topics/${item.slug}`,
      type: "topic" as const,
      title: item[locale],
      description: topicDescriptions[item.slug][locale],
      meta: pt ? "Tema" : "Topic",
    })),
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">{pt ? "Pular para o conteúdo" : "Skip to content"}</a>
      <SiteHeader locale={locale} searchItems={searchItems} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
