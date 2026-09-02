export const locales = ["en", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "pt-BR" : "en";
}

export const dictionary = {
  en: {
    nav: { home: "Home", initiatives: "Initiatives", events: "Events", topics: "Topics", about: "About" },
    heroEyebrow: "Independent AI observatory",
    heroTitle: "Technology has consequences.",
    heroBody: "We track how artificial intelligence reshapes power, public life and the planet — and document the real initiatives responding to those changes.",
    heroCta: "Explore initiatives",
    latest: "Latest analysis",
    initiatives: "Initiatives to watch",
    topics: "Core fault lines",
    sourceLabel: "Primary source",
    readMore: "Read analysis",
    explore: "Open initiative",
    language: "PT",
  },
  "pt-BR": {
    nav: { home: "Início", initiatives: "Iniciativas", events: "Eventos", topics: "Temas", about: "Sobre" },
    heroEyebrow: "Observatório independente de IA",
    heroTitle: "Tecnologia tem consequências.",
    heroBody: "Acompanhamos como a inteligência artificial transforma poder, vida pública e planeta — e documentamos iniciativas reais que respondem a essas mudanças.",
    heroCta: "Explorar iniciativas",
    latest: "Análises recentes",
    initiatives: "Iniciativas para acompanhar",
    topics: "Principais linhas de tensão",
    sourceLabel: "Fonte primária",
    readMore: "Ler análise",
    explore: "Abrir iniciativa",
    language: "EN",
  },
} satisfies Record<Locale, unknown>;
