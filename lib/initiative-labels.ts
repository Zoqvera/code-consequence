import type { Initiative } from "./content";
import type { Locale } from "./i18n";

const labels: Record<Initiative["status"], Record<Locale, string>> = {
  Active: { en: "Active", "pt-BR": "Ativa" },
  Completed: { en: "Completed", "pt-BR": "Concluída" },
  Announced: { en: "Announced", "pt-BR": "Anunciada" },
  Paused: { en: "Paused", "pt-BR": "Pausada" },
  Cancelled: { en: "Cancelled", "pt-BR": "Cancelada" },
};

export function initiativeStatusLabel(status: Initiative["status"], locale: Locale) {
  return labels[status][locale];
}
