import { articles, topics } from "./content";
import { initiatives } from "./initiatives";
import type { Locale } from "./i18n";

export const topicDescriptions: Record<
  (typeof topics)[number]["slug"],
  Record<Locale, string>
> = {
  "power-democracy": {
    en: "Elections, state power, surveillance and information integrity.",
    "pt-BR": "Eleições, poder estatal, vigilância e integridade da informação.",
  },
  "work-economy": {
    en: "Automation, labour, productivity, ownership and inequality.",
    "pt-BR": "Automação, trabalho, produtividade, propriedade e desigualdade.",
  },
  "rights-society": {
    en: "Privacy, discrimination, education, culture and human rights.",
    "pt-BR": "Privacidade, discriminação, educação, cultura e direitos humanos.",
  },
  "governance-regulation": {
    en: "Laws, standards, institutions, accountability and public policy.",
    "pt-BR": "Leis, padrões, instituições, responsabilização e políticas públicas.",
  },
  "infrastructure-planet": {
    en: "Energy, water, data centers, chips, minerals, emissions and e-waste.",
    "pt-BR": "Energia, água, data centers, chips, minerais, emissões e lixo eletrônico.",
  },
  "science-technology": {
    en: "Research, models, infrastructure and technical change with public consequences.",
    "pt-BR": "Pesquisa, modelos, infraestrutura e mudanças técnicas com consequências públicas.",
  },
};

export function getTopicBySlug(slug: string) {
  return topics.find((topic) => topic.slug === slug);
}

export function getTopicArticles(slug: string) {
  const topic = getTopicBySlug(slug);
  if (!topic) return [];

  return articles
    .filter((article) => article.topic.en === topic.en)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getTopicInitiatives(slug: string) {
  const topic = getTopicBySlug(slug);
  if (!topic) return [];

  return initiatives.filter((initiative) => initiative.topic.en === topic.en);
}

export function getTopicStats(slug: string) {
  const topicArticles = getTopicArticles(slug);
  const topicInitiatives = getTopicInitiatives(slug);

  return {
    articles: topicArticles.length,
    news: topicArticles.filter((article) => article.type === "News").length,
    analysis: topicArticles.filter((article) => article.type === "Analysis").length,
    initiatives: topicInitiatives.length,
    activeInitiatives: topicInitiatives.filter((initiative) => initiative.status === "Active").length,
    sourceReferences: topicInitiatives.reduce(
      (total, initiative) => total + initiative.sources.length,
      0,
    ),
  };
}

export function getTopicForArticle(articleSlug: string) {
  const article = articles.find((item) => item.slug === articleSlug);
  if (!article) return undefined;
  return topics.find((topic) => topic.en === article.topic.en);
}

export function getTopicForInitiative(initiativeSlug: string) {
  const initiative = initiatives.find((item) => item.slug === initiativeSlug);
  if (!initiative) return undefined;
  return topics.find((topic) => topic.en === initiative.topic.en);
}

export function getRelatedInitiativesForArticle(articleSlug: string, limit = 3) {
  const article = articles.find((item) => item.slug === articleSlug);
  if (!article) return [];

  return initiatives
    .filter((initiative) => initiative.topic.en === article.topic.en)
    .slice(0, limit);
}

export function getRelatedArticlesForInitiative(initiativeSlug: string, limit = 3) {
  const initiative = initiatives.find((item) => item.slug === initiativeSlug);
  if (!initiative) return [];

  return articles
    .filter((article) => article.topic.en === initiative.topic.en)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
