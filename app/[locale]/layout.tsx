import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  return <><SiteHeader locale={locale} /><main>{children}</main><SiteFooter locale={locale} /></>;
}
