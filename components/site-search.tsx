"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export type SearchItem = {
  href: string;
  type: "initiative" | "article" | "event" | "topic";
  title: string;
  description: string;
  meta?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SiteSearch({
  locale,
  items,
  open,
  onClose,
}: {
  locale: Locale;
  items: SearchItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pt = locale === "pt-BR";

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];

    return items
      .filter((item) => normalize(`${item.title} ${item.description} ${item.meta ?? ""}`).includes(needle))
      .slice(0, 10);
  }, [items, query]);

  if (!open) return null;

  const labels = pt
    ? { initiative: "Iniciativa", article: "Análise", event: "Evento", topic: "Tema" }
    : { initiative: "Initiative", article: "Analysis", event: "Event", topic: "Topic" };

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-labelledby="site-search-title">
      <button
        className="search-backdrop"
        type="button"
        tabIndex={-1}
        aria-label={pt ? "Fechar busca" : "Close search"}
        onClick={onClose}
      />

      <div className="search-panel">
        <div className="search-panel-header">
          <div>
            <p className="eyebrow">{pt ? "Busca global" : "Global search"}</p>
            <h2 id="site-search-title">{pt ? "Encontre o que você procura" : "Find what you need"}</h2>
          </div>
          <button className="search-close" type="button" onClick={onClose} aria-label={pt ? "Fechar busca" : "Close search"}>
            ×
          </button>
        </div>

        <label className="search-field">
          <span className="sr-only">{pt ? "Buscar no site" : "Search the site"}</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={pt ? "Busque por tema, organização, evento..." : "Search by topic, organization, event..."}
            autoComplete="off"
          />
        </label>

        {!query.trim() ? (
          <div className="search-shortcuts">
            <p>{pt ? "Atalhos" : "Shortcuts"}</p>
            <div>
              <Link href={`/${locale}/initiatives`} onClick={onClose}>{pt ? "Explorar iniciativas" : "Explore initiatives"}</Link>
              <Link href={`/${locale}/radar`} onClick={onClose}>Global Radar</Link>
              <Link href={`/${locale}/events`} onClick={onClose}>{pt ? "Próximos eventos" : "Upcoming events"}</Link>
              <Link href={`/${locale}/topics`} onClick={onClose}>{pt ? "Navegar por temas" : "Browse topics"}</Link>
            </div>
          </div>
        ) : (
          <div className="search-results" aria-live="polite">
            <p className="search-result-count">
              {results.length
                ? `${results.length} ${pt ? "resultado(s)" : "result(s)"}`
                : pt ? "Nenhum resultado encontrado" : "No results found"}
            </p>
            {results.map((item) => (
              <Link className="search-result" href={item.href} onClick={onClose} key={`${item.type}-${item.href}`}>
                <span>{labels[item.type]}{item.meta ? ` · ${item.meta}` : ""}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
