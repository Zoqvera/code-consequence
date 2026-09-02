"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

type ExplorerItem = {
  slug: string;
  organization: string;
  region: string;
  status: string;
  topic: string;
  title: string;
  summary: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const statusLabels: Record<string, { en: string; "pt-BR": string }> = {
  Active: { en: "Active", "pt-BR": "Ativa" },
  Completed: { en: "Completed", "pt-BR": "Concluída" },
  Announced: { en: "Announced", "pt-BR": "Anunciada" },
  Paused: { en: "Paused", "pt-BR": "Pausada" },
  Cancelled: { en: "Cancelled", "pt-BR": "Cancelada" },
};

export function InitiativeExplorer({ locale, items }: { locale: Locale; items: ExplorerItem[] }) {
  const pt = locale === "pt-BR";
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");

  const topics = useMemo(() => [...new Set(items.map((item) => item.topic))].sort(), [items]);
  const regions = useMemo(() => [...new Set(items.map((item) => item.region))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map((item) => item.status))].sort(), [items]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return items.filter((item) => {
      const matchesQuery = !needle || normalize(`${item.title} ${item.summary} ${item.organization} ${item.topic} ${item.region}`).includes(needle);
      return matchesQuery && (!topic || item.topic === topic) && (!region || item.region === region) && (!status || item.status === status);
    });
  }, [items, query, topic, region, status]);

  const hasFilters = Boolean(query || topic || region || status);

  const clearFilters = () => {
    setQuery("");
    setTopic("");
    setRegion("");
    setStatus("");
  };

  return (
    <section className="initiative-explorer" aria-labelledby="initiative-explorer-title">
      <div className="explorer-toolbar" id="initiative-search">
        <div className="explorer-search">
          <label htmlFor="initiative-query">{pt ? "Buscar iniciativas" : "Search initiatives"}</label>
          <input
            id="initiative-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={pt ? "Nome, organização, tema ou região" : "Name, organization, topic or region"}
            autoComplete="off"
          />
        </div>

        <label>
          <span>{pt ? "Tema" : "Topic"}</span>
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">{pt ? "Todos os temas" : "All topics"}</option>
            {topics.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          <span>{pt ? "Região" : "Region"}</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">{pt ? "Todas as regiões" : "All regions"}</option>
            {regions.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{pt ? "Todos os status" : "All statuses"}</option>
            {statuses.map((value) => <option value={value} key={value}>{statusLabels[value]?.[locale] ?? value}</option>)}
          </select>
        </label>
      </div>

      <div className="explorer-summary">
        <p id="initiative-explorer-title" aria-live="polite">
          <strong>{filtered.length}</strong> {pt ? "iniciativa(s) encontrada(s)" : "initiative(s) found"}
        </p>
        {hasFilters ? <button type="button" onClick={clearFilters}>{pt ? "Limpar filtros" : "Clear filters"}</button> : null}
      </div>

      {filtered.length ? (
        <div className="initiative-list light">
          {filtered.map((item, index) => (
            <article className="initiative-row" key={item.slug}>
              <span className="index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="card-meta">{item.organization} · {item.region} · {statusLabels[item.status]?.[locale] ?? item.status}</p>
                <h2><Link href={`/${locale}/initiatives/${item.slug}`}>{item.title}</Link></h2>
                <p>{item.summary}</p>
              </div>
              <Link className="text-link" href={`/${locale}/initiatives/${item.slug}`}>
                {pt ? "Ver registro" : "View record"} →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="explorer-empty">
          <h2>{pt ? "Nenhuma iniciativa corresponde aos filtros." : "No initiatives match these filters."}</h2>
          <p>{pt ? "Tente remover um filtro ou usar um termo de busca mais amplo." : "Remove a filter or try a broader search term."}</p>
          <button type="button" onClick={clearFilters}>{pt ? "Mostrar todas" : "Show all"}</button>
        </div>
      )}
    </section>
  );
}
