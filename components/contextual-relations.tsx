import Link from "next/link";
import type { Article } from "@/lib/content";
import type { InitiativeDetail } from "@/lib/initiatives";
import type { Locale } from "@/lib/i18n";
import styles from "./contextual-relations.module.css";

type TopicRef = {
  slug: string;
  en: string;
  "pt-BR": string;
};

export function ContextualRelations({
  locale,
  topic,
  articles = [],
  initiatives = [],
}: {
  locale: Locale;
  topic: TopicRef;
  articles?: Article[];
  initiatives?: InitiativeDetail[];
}) {
  const pt = locale === "pt-BR";

  if (!articles.length && !initiatives.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className="eyebrow">{pt ? "Contexto relacionado" : "Related context"}</p>
          <h2>{topic[locale]}</h2>
          <Link className={`text-link ${styles.topicLink}`} href={`/${locale}/topics/${topic.slug}`}>
            {pt ? "Abrir hub do tema" : "Open topic hub"} →
          </Link>
        </div>
        <p>
          {pt
            ? "Relações calculadas pelo mesmo eixo temático do corpus publicado; não são associações editoriais inferidas manualmente."
            : "Relations are calculated from the shared topic in the published corpus; they are not manually inferred editorial associations."}
        </p>
      </div>

      <div className={styles.columns}>
        {articles.length ? (
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>{pt ? "Editorial relacionado" : "Related editorial"}</h3>
            {articles.map((article) => (
              <Link className={styles.item} href={`/${locale}/articles/${article.slug}`} key={article.slug}>
                <span>{article.type} · {article.topic[locale]}</span>
                <strong>{article.title[locale]}</strong>
              </Link>
            ))}
          </div>
        ) : null}

        {initiatives.length ? (
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>{pt ? "Iniciativas relacionadas" : "Related initiatives"}</h3>
            {initiatives.map((initiative) => (
              <Link className={styles.item} href={`/${locale}/initiatives/${initiative.slug}`} key={initiative.slug}>
                <span>{initiative.organization} · {initiative.region[locale]}</span>
                <strong>{initiative.title[locale]}</strong>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
