import { notFound } from "next/navigation";
import { topics } from "@/lib/content";
import { isLocale } from "@/lib/i18n";

const descriptions = {
  en: ["Elections, state power, surveillance and information integrity.", "Automation, labour, productivity, ownership and inequality.", "Privacy, discrimination, education, culture and human rights.", "Laws, standards, institutions, accountability and public policy.", "Energy, water, data centers, chips, minerals, emissions and e-waste.", "Research, models, infrastructure and technical change with public consequences."],
  "pt-BR": ["Eleições, poder estatal, vigilância e integridade da informação.", "Automação, trabalho, produtividade, propriedade e desigualdade.", "Privacidade, discriminação, educação, cultura e direitos humanos.", "Leis, padrões, instituições, responsabilização e políticas públicas.", "Energia, água, data centers, chips, minerais, emissões e lixo eletrônico.", "Pesquisa, modelos, infraestrutura e mudanças técnicas com consequências públicas."],
};

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <div className="shell page-pad"><p className="eyebrow">Taxonomy</p><h1 className="page-title">{locale === "en" ? "Topics" : "Temas"}</h1><div className="topic-detail-list">{topics.map((topic, i) => <section id={topic.slug} key={topic.slug}><span>0{i + 1}</span><div><h2>{topic[locale]}</h2><p>{descriptions[locale][i]}</p></div></section>)}</div></div>;
}
