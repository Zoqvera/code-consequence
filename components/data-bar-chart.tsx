import Link from "next/link";
import type { CountRow } from "@/lib/observatory-data";
import styles from "./data-bar-chart.module.css";

export function DataBarChart({
  rows,
  hrefFor,
  ariaLabel,
}: {
  rows: CountRow[];
  hrefFor?: (row: CountRow) => string | undefined;
  ariaLabel: string;
}) {
  const maximum = rows.reduce((max, row) => Math.max(max, row.count), 0);

  return (
    <div className={styles.chart} role="list" aria-label={ariaLabel}>
      {rows.map((row) => {
        const href = hrefFor?.(row);
        const width = maximum > 0 ? (row.count / maximum) * 100 : 0;

        return (
          <div className={styles.row} role="listitem" key={row.key}>
            <div className={styles.label}>
              {href ? <Link href={href}>{row.label}</Link> : row.label}
            </div>
            <div
              className={styles.track}
              aria-hidden="true"
              title={`${row.label}: ${row.count}`}
            >
              <div className={styles.fill} style={{ width: `${width}%` }} />
            </div>
            <strong className={styles.value}>{row.count}</strong>
          </div>
        );
      })}
    </div>
  );
}
