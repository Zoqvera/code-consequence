import generatedSnapshot from "../data/generated-events.json";
import type { Locale } from "./i18n";

type LocalizedText = Record<Locale, string>;

export type EventFormat = "Online" | "In person" | "Hybrid";

export type AiEvent = {
  externalKey: string;
  title: LocalizedText;
  summary: LocalizedText;
  startDate: string;
  endDate: string | null;
  startsAt: string | null;
  format: EventFormat;
  venue: string | null;
  city: string | null;
  country: string | null;
  organizer: string;
  participation: LocalizedText;
  eventUrl: string;
  registrationUrl: string | null;
  isFree: boolean | null;
  source: { name: string; url: string };
};

const seedEvents: AiEvent[] = [
  {
    externalKey: "seed-ai-for-good-ict-infrastructure-2026-09-15",
    title: {
      en: "Machine Learning for ICT infrastructure detection",
      "pt-BR": "Machine Learning para detecção de infraestrutura de TIC",
    },
    summary: {
      en: "An AI for Good session on machine-learning methods for detecting and mapping ICT infrastructure.",
      "pt-BR": "Uma sessão do AI for Good sobre métodos de machine learning para detectar e mapear infraestrutura de TIC.",
    },
    startDate: "2026-09-15",
    endDate: null,
    startsAt: "2026-09-15T14:00:00+02:00",
    format: "Online",
    venue: null,
    city: null,
    country: null,
    organizer: "ITU AI for Good",
    participation: {
      en: "Attend online through AI for Good. Use the official event page to register or log in to the Neural Network platform.",
      "pt-BR": "Participe online pelo AI for Good. Use a página oficial do evento para fazer o registro ou entrar na plataforma Neural Network.",
    },
    eventUrl: "https://aiforgood.itu.int/event/machine-learning-for-ict-infrastructure-detection/",
    registrationUrl: null,
    isFree: null,
    source: {
      name: "ITU AI for Good",
      url: "https://aiforgood.itu.int/event/machine-learning-for-ict-infrastructure-detection/",
    },
  },
  {
    externalKey: "seed-ai-for-good-embodied-intelligence-2026-09-22",
    title: {
      en: "Open world embodied intelligence: Learning from perception to action in the wild",
      "pt-BR": "Inteligência incorporada em mundo aberto: da percepção à ação em ambientes reais",
    },
    summary: {
      en: "A hybrid AI for Good session examining embodied intelligence systems that learn and act in open-world environments.",
      "pt-BR": "Uma sessão híbrida do AI for Good sobre sistemas de inteligência incorporada que aprendem e agem em ambientes de mundo aberto.",
    },
    startDate: "2026-09-22",
    endDate: null,
    startsAt: "2026-09-22T16:00:00+02:00",
    format: "Hybrid",
    venue: null,
    city: null,
    country: null,
    organizer: "ITU AI for Good",
    participation: {
      en: "The session is hybrid. Check the official AI for Good event page for registration and attendance instructions.",
      "pt-BR": "A sessão é híbrida. Consulte a página oficial do AI for Good para registro e instruções de participação.",
    },
    eventUrl: "https://aiforgood.itu.int/event/open-world-embodied-intelligence-learning-from-perception-to-action-in-the-wild/",
    registrationUrl: null,
    isFree: null,
    source: {
      name: "ITU AI for Good",
      url: "https://aiforgood.itu.int/event/open-world-embodied-intelligence-learning-from-perception-to-action-in-the-wild/",
    },
  },
  {
    externalKey: "seed-ai-for-good-weather-climate-2026-09-23",
    title: {
      en: "Computational and data opportunities for weather and climate modelling",
      "pt-BR": "Oportunidades computacionais e de dados para modelagem meteorológica e climática",
    },
    summary: {
      en: "An online AI for Good session on computational and data approaches for advancing weather and climate modelling.",
      "pt-BR": "Uma sessão online do AI for Good sobre abordagens computacionais e de dados para avançar a modelagem meteorológica e climática.",
    },
    startDate: "2026-09-23",
    endDate: null,
    startsAt: "2026-09-23T17:00:00+02:00",
    format: "Online",
    venue: null,
    city: null,
    country: null,
    organizer: "ITU AI for Good",
    participation: {
      en: "Attend online through AI for Good. Consult the official event page for registration or platform access.",
      "pt-BR": "Participe online pelo AI for Good. Consulte a página oficial para registro ou acesso à plataforma.",
    },
    eventUrl: "https://aiforgood.itu.int/event/computational-and-data-opportunities-for-weather-and-climate-modelling/",
    registrationUrl: null,
    isFree: null,
    source: {
      name: "ITU AI for Good",
      url: "https://aiforgood.itu.int/event/computational-and-data-opportunities-for-weather-and-climate-modelling/",
    },
  },
];

const generatedEvents = generatedSnapshot.events as unknown as AiEvent[];

function mergeByKey(primary: AiEvent[], fallback: AiEvent[]) {
  const seen = new Set(primary.map((event) => `${event.title.en.toLowerCase()}|${event.startDate}`));
  return [...primary, ...fallback.filter((event) => !seen.has(`${event.title.en.toLowerCase()}|${event.startDate}`))];
}

export const events: AiEvent[] = mergeByKey(generatedEvents, seedEvents).sort((a, b) =>
  a.startDate.localeCompare(b.startDate),
);

export function getUpcomingEvents(referenceDate = new Date()) {
  const today = referenceDate.toISOString().slice(0, 10);
  return events.filter((event) => (event.endDate || event.startDate) >= today);
}
