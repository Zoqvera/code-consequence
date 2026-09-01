import { notFound } from "next/navigation";
import { initiatives } from "@/lib/content";
import { isLocale } from "@/lib/i18n";

export default async function InitiativesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";
  return <div className="shell page-pad"><p className="eyebrow">Global tracker</p><h1 className="page-title">{pt ? "Iniciativas" : "Initiatives"}</h1><p className="page-intro">{pt ? "Projetos, políticas e mecanismos reais criados para responder aos impactos sociais, políticos e ambientais da IA." : "Real projects, policies and mechanisms created to respond to the social, political and environmental impacts of AI."}</p><div className="initiative-list light">{initiatives.map((item, i) => <article className="initiative-row" key={item.slug}><span className="index">0{i + 1}</span><div><p className="card-meta">{item.organization} · {item.region[locale]} · {item.status}</p><h2>{item.title[locale]}</h2><p>{item.summary[locale]}</p></div><a className="text-link" href={item.source.url} target="_blank" rel="noreferrer">{pt ? "Fonte primária" : "Primary source"} ↗</a></article>)}</div></div>;
}
