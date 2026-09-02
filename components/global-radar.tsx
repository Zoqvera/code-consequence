"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InitiativeDetail } from "@/lib/initiatives";
import type { Locale } from "@/lib/i18n";

type RadarZone =
  | "global"
  | "north-america"
  | "latin-america-caribbean"
  | "europe"
  | "africa"
  | "middle-east"
  | "asia-pacific"
  | "other";

const zoneOrder: RadarZone[] = [
  "north-america",
  "latin-america-caribbean",
  "europe",
  "africa",
  "middle-east",
  "asia-pacific",
  "global",
  "other",
];

const zoneLabels: Record<RadarZone, Record<Locale, string>> = {
  global: { en: "Global / multilateral", "pt-BR": "Global / multilateral" },
  "north-america": { en: "North America", "pt-BR": "América do Norte" },
  "latin-america-caribbean": { en: "Latin America & Caribbean", "pt-BR": "América Latina e Caribe" },
  europe: { en: "Europe", "pt-BR": "Europa" },
  africa: { en: "Africa", "pt-BR": "África" },
  "middle-east": { en: "Middle East", "pt-BR": "Oriente Médio" },
  "asia-pacific": { en: "Asia-Pacific", "pt-BR": "Ásia-Pacífico" },
  other: { en: "Other / unclassified", "pt-BR": "Outras / não classificadas" },
};

const translations = {
  en: {
    coverage: "Regional coverage",
    coverageNote: "Schematic coverage view — regions reflect the editorial record, not a cartographic boundary model.",
    filters: "Filters",
    region: "Region",
    topic: "Topic",
    status: "Status",
    organization: "Organization",
    allRegions: "All regions",
    allTopics: "All topics",
    allStatuses: "All statuses",
    allOrganizations: "All organizations",
    reset: "Reset filters",
    matching: "matching initiatives",
    organizations: "organizations",
    zones: "radar zones",
    verifiedSources: "verified sources",
    results: "Radar results",
    noResults: "No published initiative matches this combination of filters.",
    open: "Open record",
    source: "source",
    sources: "sources",
  },
  "pt-BR": {
    coverage: "Cobertura regional",
    coverageNote: "Visualização esquemática — as regiões refletem o registro editorial, não um modelo cartográfico de fronteiras.",
    filters: "Filtros",
    region: "Região",
    topic: "Tema",
    status: "Status",
    organization: "Organização",
    allRegions: "Todas as regiões",
    allTopics: "Todos os temas",
    allStatuses: "Todos os status",
    allOrganizations: "Todas as organizações",
    reset: "Limpar filtros",
    matching: "iniciativas encontradas",
    organizations: "organizações",
    zones: "zonas do radar",
    verifiedSources: "fontes verificadas",
    results: "Resultados do Radar",
    noResults: "Nenhuma iniciativa publicada corresponde a esta combinação de filtros.",
    open: "Abrir registro",
    source: "fonte",
    sources: "fontes",
  },
} satisfies Record<Locale, Record<string, string>>;

const europeCountries = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech", "denmark", "estonia", "finland", "france",
  "germany", "greece", "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta", "netherlands",
  "poland", "portugal", "romania", "slovakia", "slovenia", "spain", "sweden", "iceland", "norway", "switzerland",
  "united kingdom", "uk",
];
const latinCountries = [
  "argentina", "belize", "bolivia", "brazil", "chile", "colombia", "costa rica", "cuba", "dominican", "ecuador",
  "el salvador", "guatemala", "guyana", "haiti", "honduras", "jamaica", "mexico", "nicaragua", "panama", "paraguay",
  "peru", "suriname", "uruguay", "venezuela", "anguilla", "barbados", "bahamas", "trinidad", "caribbean",
];
const asiaPacificCountries = [
  "australia", "bangladesh", "bhutan", "brunei", "cambodia", "china", "fiji", "india", "indonesia", "japan", "korea",
  "laos", "malaysia", "maldives", "mongolia", "myanmar", "nepal", "new zealand", "pakistan", "philippines", "singapore",
  "sri lanka", "thailand", "timor", "vietnam", "pacific",
];
const africaCountries = [
  "algeria", "angola", "benin", "botswana", "burkina", "burundi", "cameroon", "chad", "congo", "egypt", "ethiopia",
  "ghana", "kenya", "madagascar", "malawi", "mali", "mauritius", "morocco", "mozambique", "namibia", "nigeria",
  "rwanda", "senegal", "seychelles", "somalia", "south africa", "sudan", "tanzania", "tunisia", "uganda", "zambia", "zimbabwe",
];
const middleEastCountries = [
  "bahrain", "iran", "iraq", "israel", "jordan", "kuwait", "lebanon", "oman", "palestine", "qatar", "saudi", "syria",
  "turkey", "türkiye", "united arab emirates", "uae", "yemen", "middle east",
];
const northAmericaCountries = ["canada", "united states", "usa", "u.s.", "north america"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function zoneFor(region: string): RadarZone {
  const value = normalize(region);
  if (value.includes("global") || value.includes("multilateral") || value.includes("worldwide") || value.includes("international")) return "global";
  if (value.includes("europe") || value.includes("european union") || value === "eu" || includesAny(value, europeCountries)) return "europe";
  if (value.includes("latin america") || value.includes("caribbean") || includesAny(value, latinCountries)) return "latin-america-caribbean";
  if (value.includes("asia") || value.includes("pacific") || includesAny(value, asiaPacificCountries)) return "asia-pacific";
  if (value.includes("africa") || includesAny(value, africaCountries)) return "africa";
  if (includesAny(value, middleEastCountries)) return "middle-east";
  if (includesAny(value, northAmericaCountries)) return "north-america";
  return "other";
}

function statusLabel(status: InitiativeDetail["status"], locale: Locale) {
  if (locale === "en") return status;
  return ({ Active: "Ativa", Completed: "Concluída", Announced: "Anunciada", Paused: "Pausada", Cancelled: "Cancelada" } as const)[status];
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function GlobalRadar({ initiatives, locale }: { initiatives: InitiativeDetail[]; locale: Locale }) {
  const t = translations[locale];
  const [zone, setZone] = useState<"all" | RadarZone>("all");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [organization, setOrganization] = useState("all");

  const topics = useMemo(() => uniqueSorted(initiatives.map((item) => item.topic[locale])), [initiatives, locale]);
  const statuses = useMemo(() => uniqueSorted(initiatives.map((item) => item.status)), [initiatives]);
  const organizations = useMemo(() => uniqueSorted(initiatives.map((item) => item.organization)), [initiatives]);

  const baseFiltered = useMemo(
    () => initiatives.filter((item) =>
      (topic === "all" || item.topic[locale] === topic) &&
      (status === "all" || item.status === status) &&
      (organization === "all" || item.organization === organization)),
    [initiatives, locale, organization, status, topic],
  );

  const zoneCounts = useMemo(() => {
    const counts = Object.fromEntries(zoneOrder.map((key) => [key, 0])) as Record<RadarZone, number>;
    for (const item of baseFiltered) counts[zoneFor(item.region.en)] += 1;
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(
    () => baseFiltered.filter((item) => zone === "all" || zoneFor(item.region.en) === zone),
    [baseFiltered, zone],
  );

  const stats = useMemo(() => ({
    organizations: new Set(filtered.map((item) => item.organization)).size,
    zones: new Set(filtered.map((item) => zoneFor(item.region.en))).size,
    sources: filtered.reduce((total, item) => total + item.sources.length, 0),
  }), [filtered]);

  const reset = () => {
    setZone("all");
    setTopic("all");
    setStatus("all");
    setOrganization("all");
  };

  return (
    <div className="radar-shell">
      <section className="radar-coverage" aria-labelledby="radar-coverage-title">
        <div className="radar-section-heading">
          <div>
            <p className="eyebrow">01 / {t.coverage}</p>
            <h2 id="radar-coverage-title">{t.coverage}</h2>
          </div>
          <p>{t.coverageNote}</p>
        </div>
        <div className="radar-map" role="group" aria-label={t.region}>
          {zoneOrder.map((key) => (
            <button
              className={`radar-zone radar-zone-${key} ${zone === key ? "is-active" : ""}`}
              disabled={zoneCounts[key] === 0}
              key={key}
              onClick={() => setZone(zone === key ? "all" : key)}
              type="button"
              aria-pressed={zone === key}
            >
              <span>{zoneLabels[key][locale]}</span>
              <strong>{zoneCounts[key]}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="radar-filter-section" aria-labelledby="radar-filter-title">
        <div className="radar-section-heading compact">
          <div>
            <p className="eyebrow">02 / {t.filters}</p>
            <h2 id="radar-filter-title">{t.filters}</h2>
          </div>
          <button className="radar-reset" type="button" onClick={reset}>{t.reset}</button>
        </div>
        <div className="radar-filters">
          <label><span>{t.region}</span><select value={zone} onChange={(event) => setZone(event.target.value as "all" | RadarZone)}><option value="all">{t.allRegions}</option>{zoneOrder.map((key) => <option key={key} value={key}>{zoneLabels[key][locale]} ({zoneCounts[key]})</option>)}</select></label>
          <label><span>{t.topic}</span><select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="all">{t.allTopics}</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>{t.status}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t.allStatuses}</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(value as InitiativeDetail["status"], locale)}</option>)}</select></label>
          <label><span>{t.organization}</span><select value={organization} onChange={(event) => setOrganization(event.target.value)}><option value="all">{t.allOrganizations}</option>{organizations.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="radar-stats" aria-live="polite">
          <div><strong>{filtered.length}</strong><span>{t.matching}</span></div>
          <div><strong>{stats.organizations}</strong><span>{t.organizations}</span></div>
          <div><strong>{stats.zones}</strong><span>{t.zones}</span></div>
          <div><strong>{stats.sources}</strong><span>{t.verifiedSources}</span></div>
        </div>
      </section>

      <section className="radar-results" aria-labelledby="radar-results-title">
        <p className="eyebrow">03 / {t.results}</p>
        <h2 id="radar-results-title">{t.results}</h2>
        {filtered.length === 0 ? <p className="radar-empty">{t.noResults}</p> : (
          <div className="radar-result-list">
            {filtered.map((item, index) => (
              <article className="radar-result" key={item.slug}>
                <span className="radar-result-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="card-meta">{zoneLabels[zoneFor(item.region.en)][locale]} · {item.region[locale]} · {statusLabel(item.status, locale)}</p>
                  <h3><Link href={`/${locale}/initiatives/${item.slug}`}>{item.title[locale]}</Link></h3>
                  <p>{item.summary[locale]}</p>
                  <div className="radar-result-foot"><span>{item.organization}</span><span>{item.topic[locale]}</span><span>{item.sources.length} {item.sources.length === 1 ? t.source : t.sources}</span></div>
                </div>
                <Link className="text-link" href={`/${locale}/initiatives/${item.slug}`}>{t.open} →</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
