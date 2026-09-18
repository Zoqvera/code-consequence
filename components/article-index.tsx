import Link from "next/link";
import { articles, type Article } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import styles from "./article-index.module.css";

type EditorialType = Article["type"];

function formatDate(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function ArticleIndex({
  locale,
  type,
}: {
  locale: Locale;
  type: EditorialType;
}) {
  const items = articles
    .filter((article) => article.type === type)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const pt = locale === "pt-BR";

  if (items.length === 0) {
    return (
      <p className={styles.empty}>
        {pt
          ? "Nenhuma publicação verificada nesta seção no momento."
          : "No verified publications are available in this section yet."}
      </p>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((article, index) => (
        <article className={styles.row} key={article.slug}>
          <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.content}>
            <div className="card-meta">
              <span>{article.topic[locale]}</span>
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
              <span>
                {article.sources.length} {pt ? "fontes" : "sources"}
              </span>
            </div>
            <h2>
              <Link href={`/${locale}/articles/${article.slug}`}>{article.title[locale]}</Link>
            </h2>
            <p>{article.dek[locale]}</p>
          </div>
          <Link className={styles.link} href={`/${locale}/articles/${article.slug}`}>
            {article.type === "Dossier"
              ? (pt ? "Abrir dossiê" : "Open dossier")
              : (pt ? "Ler matéria" : "Read story")} →
          </Link>
        </article>
      ))}
    </div>
  );
}
