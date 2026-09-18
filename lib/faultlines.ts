import { articles, type Article } from "./content";
import { events, type AiEvent } from "./events";
import { initiatives, type InitiativeDetail } from "./initiatives";

const DAY_MS = 86_400_000;

export type FaultlinesIssue = {
  id: string;
  startDate: string;
  endDate: string;
  articles: Article[];
  dossierUpdates: Article[];
  updatedInitiatives: InitiativeDetail[];
  watchlist: InitiativeDetail[];
  upcomingEvents: AiEvent[];
};

function toUtcDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfIsoWeek(value: string | Date) {
  const date = toUtcDate(value);
  const weekday = date.getUTCDay() || 7;
  return addDays(date, 1 - weekday);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isoWeekId(value: Date) {
  const date = new Date(value.getTime());
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));

  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);

  return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
}

function inWindow(value: string, start: Date, endExclusive: Date) {
  const date = toUtcDate(value);
  return date >= start && date < endExclusive;
}

function initiativeSort(a: InitiativeDetail, b: InitiativeDetail) {
  const aVerified = a.lastVerifiedAt ?? "";
  const bVerified = b.lastVerifiedAt ?? "";

  return (
    bVerified.localeCompare(aVerified) ||
    a.organization.localeCompare(b.organization) ||
    a.title.en.localeCompare(b.title.en)
  );
}

function collectIssueStarts(referenceDate: Date) {
  const starts = new Map<string, Date>();

  const add = (value: string | Date) => {
    const start = startOfIsoWeek(value);
    starts.set(isoWeekId(start), start);
  };

  add(referenceDate);

  for (const article of articles) {
    add(article.publishedAt);
    if (article.type === "Dossier" && article.dossier?.lastVerifiedAt) {
      add(article.dossier.lastVerifiedAt);
    }
  }

  for (const initiative of initiatives) {
    if (initiative.lastVerifiedAt) add(initiative.lastVerifiedAt);
  }

  return [...starts.values()].sort((a, b) => b.getTime() - a.getTime());
}

export function buildFaultlinesIssues(referenceDate = new Date()): FaultlinesIssue[] {
  const currentWeekStart = startOfIsoWeek(referenceDate);

  return collectIssueStarts(referenceDate).map((start) => {
    const nextWeek = addDays(start, 7);
    const eventWindowEnd = addDays(start, 14);
    const updatedInitiativeSlugs = new Set(
      initiatives
        .filter(
          (initiative) =>
            initiative.lastVerifiedAt &&
            inWindow(initiative.lastVerifiedAt, start, nextWeek),
        )
        .map((initiative) => initiative.slug),
    );

    const weeklyArticles = articles
      .filter((article) => inWindow(article.publishedAt, start, nextWeek))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    const dossierUpdates = articles
      .filter(
        (article) =>
          article.type === "Dossier" &&
          article.dossier?.lastVerifiedAt &&
          inWindow(article.dossier.lastVerifiedAt, start, nextWeek) &&
          !weeklyArticles.some((weeklyArticle) => weeklyArticle.slug === article.slug),
      )
      .sort((a, b) =>
        (b.dossier?.lastVerifiedAt ?? "").localeCompare(a.dossier?.lastVerifiedAt ?? ""),
      );

    const updatedInitiatives = initiatives
      .filter((initiative) => updatedInitiativeSlugs.has(initiative.slug))
      .sort(initiativeSort);

    const isCurrentIssue = start.getTime() === currentWeekStart.getTime();
    const watchlist = isCurrentIssue
      ? initiatives
          .filter(
            (initiative) =>
              initiative.status === "Active" && !updatedInitiativeSlugs.has(initiative.slug),
          )
          .sort(initiativeSort)
          .slice(0, 4)
      : [];

    const upcomingEvents = events
      .filter((event) => inWindow(event.startDate, start, eventWindowEnd))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);

    return {
      id: isoWeekId(start),
      startDate: toIsoDate(start),
      endDate: toIsoDate(addDays(start, 6)),
      articles: weeklyArticles,
      dossierUpdates,
      updatedInitiatives,
      watchlist,
      upcomingEvents,
    };
  });
}

export const faultlinesIssues = buildFaultlinesIssues();

export function getFaultlinesIssue(id: string) {
  return faultlinesIssues.find((issue) => issue.id === id);
}

export function getLatestFaultlinesIssue() {
  const issue = faultlinesIssues[0];
  if (!issue) throw new Error("Faultlines Weekly could not build a current issue");
  return issue;
}
