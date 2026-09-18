import { articles } from "./content";
import { getUpcomingEvents } from "./events";
import { initiatives } from "./initiatives";
import type { Locale } from "./i18n";

export type CountRow = {
  key: string;
  label: string;
  count: number;
};

function countBy<T>(items: T[], keyFor: (item: T) => string): Map<string, number> {
  return items.reduce((counts, item) => {
    const key = keyFor(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function rowsFromCounts(counts: Map<string, number>): CountRow[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getObservatorySnapshot(locale: Locale, referenceDate = new Date()) {
  const initiativeSourceReferences = initiatives.reduce(
    (total, initiative) => total + initiative.sources.length,
    0,
  );

  return {
    totals: {
      articles: articles.length,
      news: articles.filter((article) => article.type === "News").length,
      analysis: articles.filter((article) => article.type === "Analysis").length,
      dossiers: articles.filter((article) => article.type === "Dossier").length,
      initiatives: initiatives.length,
      activeInitiatives: initiatives.filter((initiative) => initiative.status === "Active").length,
      organizations: new Set(initiatives.map((initiative) => initiative.organization)).size,
      initiativeSourceReferences,
      upcomingEvents: getUpcomingEvents(referenceDate).length,
    },
    initiativesByTopic: rowsFromCounts(
      countBy(initiatives, (initiative) => initiative.topic[locale]),
    ),
    initiativesByStatus: rowsFromCounts(
      countBy(initiatives, (initiative) => initiative.status),
    ),
    initiativesByRegion: rowsFromCounts(
      countBy(initiatives, (initiative) => initiative.region[locale]),
    ),
  };
}
