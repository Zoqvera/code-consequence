import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, initiatives, topics } from "@/lib/content";
import { dictionary, isLocale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary[locale];
  return (
    <>
      <section className="hero shell">
        <p className="eyebrow">{d.heroEyebrow}</p>
        <h1>{d.heroTitle}</h1>
        <p className="hero-copy">{d.heroBody}</p>
        <Link className="button" href={`/${locale}/initiatives`}>{d.heroCta} →</Link>
      </section>

      <section className="section shell">
        <div className="section-heading"><p className="eyebrow">01 / Editorial</p><h2>{d.latest}</h2></div>
        <div className="article-grid">
          {articles.map((article, index) => (
            <article className={index === 0 ? "article-card featured" : "article-card"} key={article.slug}>
              <div className="card-meta"><span>{article.type}</span><span>{article.topic[locale]}</span></div>
              <h3><Link href={`/${locale}/articles/${article.slug}`}>{article.title[locale]}</Link></h3>
              <p>{article.dek[locale]}</p>
              <Link className="text-link" href={`/${locale}/articles/${article.slug}`}>{d.readMore} →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">02 / Global tracker</p><h2>{d.initiatives}</h2></div>
          <div className="initiative-list">
            {initiatives.map((initiative, index) => (
              <article className="initiative-row" key={initiative.slug}>
                <span className="index">0{index + 1}</span>
                <div><p className="card-meta">{initiative.organization} · {initiative.region[locale]}</p><h3>{initiative.title[locale]}</h3><p>{initiative.summary[locale]}</p></div>
                <a className="text-link" href={initiative.source.url} target="_blank" rel="noreferrer">{d.explore} ↗</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading"><p className="eyebrow">03 / Taxonomy</p><h2>{d.topics}</h2></div>
        <div className="topic-grid">{topics.map((topic, i) => <Link key={topic.slug} href={`/${locale}/topics#${topic.slug}`}><span>0{i + 1}</span>{topic[locale]}</Link>)}</div>
      </section>
    </>
  );
}
