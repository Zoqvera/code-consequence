import type { Locale } from "./i18n";

type Localized = Record<Locale, string>;

export const sourceTiers = [
  {
    tier: "A",
    title: {
      en: "Primary and authoritative",
      "pt-BR": "Primárias e autoritativas",
    },
    description: {
      en: "Laws, public institutions, intergovernmental bodies, peer-reviewed research and first-party project documentation.",
      "pt-BR": "Leis, instituições públicas, organismos intergovernamentais, pesquisa revisada por pares e documentação oficial de projetos.",
    },
    publicationRole: {
      en: "Preferred factual foundation.",
      "pt-BR": "Base factual preferencial.",
    },
  },
  {
    tier: "B",
    title: {
      en: "Established journalism",
      "pt-BR": "Jornalismo estabelecido",
    },
    description: {
      en: "News organizations with transparent editorial standards and accountable reporting practices.",
      "pt-BR": "Organizações jornalísticas com padrões editoriais transparentes e práticas de apuração responsabilizáveis.",
    },
    publicationRole: {
      en: "Corroboration, context and reporting.",
      "pt-BR": "Corroboração, contexto e apuração.",
    },
  },
  {
    tier: "C",
    title: {
      en: "Specialist institutions",
      "pt-BR": "Instituições especializadas",
    },
    description: {
      en: "NGOs, think tanks, research institutes and specialist organizations with identifiable methods or expertise.",
      "pt-BR": "ONGs, think tanks, institutos de pesquisa e organizações especializadas com métodos ou expertise identificáveis.",
    },
    publicationRole: {
      en: "Specialist context and supporting evidence.",
      "pt-BR": "Contexto especializado e evidência complementar.",
    },
  },
  {
    tier: "D",
    title: {
      en: "Discovery sources",
      "pt-BR": "Fontes de descoberta",
    },
    description: {
      en: "Social posts, newsletters, forums and unsourced aggregators used to identify leads.",
      "pt-BR": "Posts em redes sociais, newsletters, fóruns e agregadores sem fonte usados para identificar pistas.",
    },
    publicationRole: {
      en: "Lead generation only; never sufficient alone for publication.",
      "pt-BR": "Apenas geração de pistas; nunca suficiente isoladamente para publicação.",
    },
  },
] satisfies Array<{
  tier: string;
  title: Localized;
  description: Localized;
  publicationRole: Localized;
}>;

export const automationStages = [
  {
    key: "discover",
    title: { en: "Discover", "pt-BR": "Descobrir" },
    description: {
      en: "Scheduled collectors scan configured primary-source feeds in English, Portuguese, Spanish and French and identify candidate pages.",
      "pt-BR": "Coletores agendados examinam fontes primárias configuradas em inglês, português, espanhol e francês e identificam páginas candidatas.",
    },
  },
  {
    key: "extract",
    title: { en: "Extract", "pt-BR": "Extrair" },
    description: {
      en: "The pipeline fetches source text and preserves the canonical URL and provenance.",
      "pt-BR": "O pipeline obtém o texto da fonte e preserva a URL canônica e a proveniência.",
    },
  },
  {
    key: "classify",
    title: { en: "Classify", "pt-BR": "Classificar" },
    description: {
      en: "AI classifies relevance, topic, organizations, countries, problem-response signals and editorial priority using only supplied source material.",
      "pt-BR": "A IA classifica relevância, tema, organizações, países, sinais de problema-resposta e prioridade editorial usando apenas o material fornecido pela fonte.",
    },
  },
  {
    key: "research",
    title: { en: "Verify", "pt-BR": "Verificar" },
    description: {
      en: "Candidate initiatives are researched and checked against source-quality and corroboration rules.",
      "pt-BR": "Iniciativas candidatas são pesquisadas e verificadas segundo regras de qualidade de fonte e corroboração.",
    },
  },
  {
    key: "draft",
    title: { en: "Prepare", "pt-BR": "Preparar" },
    description: {
      en: "Eligible records receive bilingual draft copy and structured metadata for editorial review.",
      "pt-BR": "Registros elegíveis recebem texto bilíngue preliminar e metadados estruturados para revisão editorial.",
    },
  },
  {
    key: "review",
    title: { en: "Human gate", "pt-BR": "Gate humano" },
    description: {
      en: "Automation may move qualified records into the review queue, but publication requires explicit human approval.",
      "pt-BR": "A automação pode mover registros qualificados para a fila de revisão, mas a publicação exige aprovação humana explícita.",
    },
  },
] satisfies Array<{
  key: string;
  title: Localized;
  description: Localized;
}>;
