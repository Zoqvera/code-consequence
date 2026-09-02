import Link from "next/link";
import { notFound } from "next/navigation";
import { initiatives } from "@/lib/initiatives";
import { isLocale } from "@/lib/i18n";

export default async function InitiativesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <p className="eyebrow">Global tracker</p>
      <h1 className="page-title">{pt ? "Iniciativas" : "Initiatives"}</h1>
      <p className="page-intro">
        {pt
          ? "Projetos, políticas e mecanismos reais criados para responder aos impactos sociais, políticos e ambientais da IA. Cada registro publicado possui revisão editorial e fontes verificadas."
          : "Real projects, policies and mechanisms created to respond to the social, political and environmental impacts of AI. Every published record has editorial review and verified sources."}
      </p>
      <p className="tracker-count">
        {initiatives.length} {pt ? "registros publicados" : "published records"}
      </p>

      <div className="initiative-list light">
        {initiatives.map((item, i) => (
          <article className="initiative-row" key={item.slug}>
            <span className="index">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="card-meta">{item.organization} · {item.region[locale]} · {item.status}</p>
              <h2>
                <Link href={`/${locale}/initiatives/${item.slug}`}>{item.title[locale]}</Link>
              </h2>
              <p>{item.summary[locale]}</p>
            </div>
            <Link className="text-link" href={`/${locale}/initiatives/${item.slug}`}>
              {pt ? "Ver registro" : "View record"} →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
