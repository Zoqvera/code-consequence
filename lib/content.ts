import generatedSnapshot from "../data/generated-content.json";
import type { Locale } from "./i18n";

type LocalizedText = Record<Locale, string>;

export type Source = { name: string; url: string; tier: "A" | "B" | "C" | "D" };
export type Article = {
  slug: string;
  type: "Analysis" | "News" | "Dossier";
  topic: LocalizedText;
  publishedAt: string;
  title: LocalizedText;
  dek: LocalizedText;
  body: LocalizedText[];
  sources: Source[];
};
export type Initiative = {
  slug: string;
  organization: string;
  region: LocalizedText;
  status: "Active" | "Completed" | "Announced" | "Paused" | "Cancelled";
  topic: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  source: Source;
};

export const topics = [
  { slug: "power-democracy", en: "Power & Democracy", "pt-BR": "Poder & Democracia" },
  { slug: "work-economy", en: "Work & Economy", "pt-BR": "Trabalho & Economia" },
  { slug: "rights-society", en: "Rights & Society", "pt-BR": "Direitos & Sociedade" },
  { slug: "governance-regulation", en: "Governance & Regulation", "pt-BR": "Governança & Regulação" },
  { slug: "infrastructure-planet", en: "Infrastructure & Planet", "pt-BR": "Infraestrutura & Planeta" },
  { slug: "science-technology", en: "Science & Technology", "pt-BR": "Ciência & Tecnologia" },
] as const;

const seedArticles: Article[] = [
  {
    slug: "environmental-footprint-is-a-policy-question",
    type: "Analysis",
    topic: { en: "Infrastructure & Planet", "pt-BR": "Infraestrutura & Planeta" },
    publishedAt: "2026-09-01",
    title: {
      en: "AI's environmental footprint is becoming a governance question",
      "pt-BR": "A pegada ambiental da IA está se tornando uma questão de governança",
    },
    dek: {
      en: "Energy, water, mineral extraction and e-waste are moving from side effects of computing into the center of AI policy.",
      "pt-BR": "Energia, água, extração mineral e lixo eletrônico deixam de ser efeitos colaterais da computação e entram no centro das políticas de IA.",
    },
    body: [
      {
        en: "The environmental debate around artificial intelligence is shifting. The question is no longer only whether AI can help climate and biodiversity goals, but how governments should account for the material footprint of the systems themselves.",
        "pt-BR": "O debate ambiental sobre inteligência artificial está mudando. A questão já não é apenas se a IA pode contribuir para metas climáticas e de biodiversidade, mas como governos devem contabilizar a pegada material dos próprios sistemas.",
      },
      {
        en: "UNESCO's AI for Environment and Ecosystems Toolkit explicitly connects AI governance with energy and water use, rare-mineral extraction and e-waste. That framing matters because it converts environmental impact from a voluntary corporate concern into a public-policy problem.",
        "pt-BR": "O toolkit da UNESCO sobre IA, meio ambiente e ecossistemas relaciona explicitamente a governança de IA ao uso de energia e água, à extração de minerais raros e ao lixo eletrônico. Esse enquadramento importa porque transforma impacto ambiental de uma preocupação corporativa voluntária em um problema de política pública.",
      },
    ],
    sources: [
      {
        name: "UNESCO — AI for Environment and Ecosystems Toolkit",
        url: "https://www.unesco.org/ethics-ai/en/node/288",
        tier: "A",
      },
    ],
  },
  {
    slug: "ai-government-governance-gap",
    type: "Analysis",
    topic: { en: "Governance & Regulation", "pt-BR": "Governança & Regulação" },
    publishedAt: "2026-09-01",
    title: {
      en: "Government adoption is outrunning parts of AI oversight",
      "pt-BR": "A adoção governamental de IA avança mais rápido que partes da fiscalização",
    },
    dek: {
      en: "The OECD's 2026 digital-government assessment shows broad adoption alongside uneven transparency, impact measurement and citizen feedback.",
      "pt-BR": "A avaliação de governo digital da OCDE de 2026 mostra adoção ampla, mas transparência, medição de impacto e participação cidadã ainda desiguais.",
    },
    body: [
      {
        en: "AI is becoming routine infrastructure inside public administrations, but governance capacity is not developing at the same speed everywhere. This creates a critical policy gap: deployment can scale faster than mechanisms for transparency, redress and evidence-based evaluation.",
        "pt-BR": "A IA está se tornando infraestrutura rotineira nas administrações públicas, mas a capacidade de governança não se desenvolve na mesma velocidade em todos os lugares. Isso cria uma lacuna crítica: a implantação pode escalar mais rapidamente que mecanismos de transparência, reparação e avaliação baseada em evidências.",
      },
    ],
    sources: [
      {
        name: "OECD — Digital Government Outlook 2026",
        url: "https://www.oecd.org/en/publications/2026/06/digital-government-outlook_4585678e/full-report/adopting-and-governing-ai-in-government_7ef312a9.html",
        tier: "A",
      },
    ],
  },
  {
    slug: "global-ai-governance-multilateral-phase",
    type: "News",
    topic: { en: "Power & Democracy", "pt-BR": "Poder & Democracia" },
    publishedAt: "2026-09-01",
    title: {
      en: "Global AI governance enters a more formal multilateral phase",
      "pt-BR": "A governança global de IA entra em uma fase multilateral mais formal",
    },
    dek: {
      en: "The UN Global Dialogue on AI Governance creates a standing venue for governments and non-state actors to negotiate priorities and share practices.",
      "pt-BR": "O Diálogo Global da ONU sobre Governança de IA cria um espaço permanente para governos e atores não estatais discutirem prioridades e práticas.",
    },
    body: [
      {
        en: "The first session of the UN Global Dialogue on AI Governance took place in Geneva in July 2026. Its significance is institutional: AI governance is increasingly being treated as a recurring multilateral issue rather than a sequence of isolated national debates.",
        "pt-BR": "A primeira sessão do Diálogo Global da ONU sobre Governança de IA ocorreu em Genebra em julho de 2026. Sua importância é institucional: a governança de IA passa a ser tratada cada vez mais como uma questão multilateral recorrente, e não como uma sequência de debates nacionais isolados.",
      },
    ],
    sources: [
      {
        name: "UNESCO — Global Dialogue on AI Governance",
        url: "https://www.unesco.org/en/articles/global-dialogue-ai-governance-geneva-6-7-july",
        tier: "A",
      },
    ],
  },
];

const seedInitiatives: Initiative[] = [
  {
    slug: "unesco-ai-environment-toolkit",
    organization: "UNESCO",
    region: { en: "Global", "pt-BR": "Global" },
    status: "Active",
    topic: { en: "Infrastructure & Planet", "pt-BR": "Infraestrutura & Planeta" },
    title: {
      en: "AI for Environment and Ecosystems Toolkit",
      "pt-BR": "Toolkit de IA para Meio Ambiente e Ecossistemas",
    },
    summary: {
      en: "A policy toolkit linking AI governance to planetary boundaries and practical public-sector action.",
      "pt-BR": "Um toolkit de políticas que relaciona governança de IA a limites planetários e ações práticas do setor público.",
    },
    source: { name: "UNESCO", url: "https://www.unesco.org/ethics-ai/en/node/288", tier: "A" },
  },
  {
    slug: "un-global-dialogue-ai-governance",
    organization: "United Nations / UNESCO / ITU",
    region: { en: "Global", "pt-BR": "Global" },
    status: "Active",
    topic: { en: "Governance & Regulation", "pt-BR": "Governança & Regulação" },
    title: {
      en: "UN Global Dialogue on AI Governance",
      "pt-BR": "Diálogo Global da ONU sobre Governança de IA",
    },
    summary: {
      en: "A UN platform for governments, civil society, academia and industry to discuss international AI governance.",
      "pt-BR": "Uma plataforma da ONU para governos, sociedade civil, academia e indústria discutirem governança internacional de IA.",
    },
    source: {
      name: "UNESCO",
      url: "https://www.unesco.org/en/articles/global-dialogue-ai-governance-geneva-6-7-july",
      tier: "A",
    },
  },
  {
    slug: "unesco-ai-environment-subgroup",
    organization: "UNESCO Global AI Ethics and Governance Observatory",
    region: { en: "Global", "pt-BR": "Global" },
    status: "Active",
    topic: { en: "Rights & Society", "pt-BR": "Direitos & Sociedade" },
    title: {
      en: "AI, Environment and Ecosystems subgroup",
      "pt-BR": "Subgrupo de IA, Meio Ambiente e Ecossistemas",
    },
    summary: {
      en: "A civil-society and expert subgroup working on shared approaches to AI's environmental risks and environmental uses.",
      "pt-BR": "Um subgrupo de sociedade civil e especialistas voltado a abordagens compartilhadas para riscos ambientais da IA e seus usos ambientais.",
    },
    source: { name: "UNESCO", url: "https://www.unesco.org/ethics-ai/en/node/337", tier: "A" },
  },
];

function mergeBySlug<T extends { slug: string }>(primary: T[], fallback: T[]) {
  const seen = new Set(primary.map((item) => item.slug));
  return [...primary, ...fallback.filter((item) => !seen.has(item.slug))];
}

const generatedArticles = generatedSnapshot.articles as unknown as Article[];
const generatedInitiatives = generatedSnapshot.initiatives as unknown as Initiative[];

// Neon is authoritative for records that have passed publication review.
// Static seeds remain as a transitional fallback until they are migrated into Neon.
export const articles: Article[] = mergeBySlug(generatedArticles, seedArticles);
export const initiatives: Initiative[] = mergeBySlug(generatedInitiatives, seedInitiatives);

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
