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
    title: pt ? "Notícias" : "News",
    description: pt
      ? "Acontecimentos verificados sobre inteligência artificial com consequências políticas, sociais e ambientais."
      : "Verified developments in artificial intelligence with political, social and environmental consequences.",
    path: "/news",
  });
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">{pt ? "Acontecimentos verificados" : "Verified developments"}</p>
      <h1 className="page-title">{pt ? "Notícias" : "News"}</h1>
      <p className="page-intro">
        {pt
          ? "Acompanhamos acontecimentos que alteram governança, poder, direitos, trabalho ou impactos materiais da IA. Cada matéria publicada mantém fontes rastreáveis."
          : "We track developments that change AI governance, power, rights, work or material impacts. Every published story keeps traceable sources."}
      </p>
      <ArticleIndex locale={locale} type="News" />
    </div>
  );
}
