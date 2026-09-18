import Link from "next/link";
import type { Source } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { getSourceRecordByUrl } from "@/lib/source-registry";
import styles from "./source-list.module.css";

export function SourceList({
  sources,
  locale,
}: {
  sources: Source[];
  locale: Locale;
}) {
  const pt = locale === "pt-BR";

  return (
    <div className={styles.list}>
      {sources.map((source, index) => {
        const record = getSourceRecordByUrl(source.url);

        return (
          <div className={styles.row} key={`${source.url}-${index}`}>
            <span className={styles.tier}>Tier {source.tier}</span>

            {record ? (
              <Link className={styles.record} href={`/${locale}/sources/${record.slug}`}>
                <strong>{source.name}</strong>
                <span>{pt ? "Ver proveniência no corpus" : "View provenance in corpus"}</span>
              </Link>
            ) : (
              <div className={styles.record}>
                <strong>{source.name}</strong>
              </div>
            )}

            <a
              className={styles.external}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              aria-label={pt ? `Abrir fonte original: ${source.name}` : `Open original source: ${source.name}`}
            >
              ↗
            </a>
          </div>
        );
      })}
    </div>
  );
}
