import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { SearchItem } from "@/components/site-search";
import { articles, topics } from "@/lib/content";
import { events } from "@/lib/events";
import { initiatives } from "@/lib/initiatives";
import { isLocale, locales } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const pt = locale === "pt-BR";
  return {
    title: pt ? "Code & Consequence — IA, sociedade e planeta" : "Code & Consequence — AI, society and planet",
    description: pt
      ? "Jornalismo e análise sobre as consequências políticas, sociais e ambientais da inteligência artificial."
      : "Reporting and analysis on the political, social and environmental consequences of artificial intelligence.",
    alternates: { languages: { en: "/en", "pt-BR": "/pt-BR" } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  const searchItems: SearchItem[] = [
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
      meta: item.topic[locale],
    })),
    ...events.map((item) => ({
      href: `/${locale}/events/${item.externalKey}`,
      type: "event" as const,
      title: item.title[locale],
      description: item.summary[locale],
      meta: `${item.organizer} · ${item.startDate}`,
    })),
    ...topics.map((item) => ({
      href: `/${locale}/topics#${item.slug}`,
      type: "topic" as const,
      title: item[locale],
      description: pt
        ? "Explore iniciativas e análises relacionadas a este tema."
        : "Explore initiatives and analysis related to this topic.",
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
