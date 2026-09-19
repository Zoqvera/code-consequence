import assessmentsData from "@/data/ai-monitor-assessments.json";
import type { Locale } from "@/lib/i18n";

export type AiMonitorStatus = "green" | "yellow" | "red";
export type AiMonitorConfidence = "low" | "moderate" | "high";
export type AiMonitorDimensionKey =
  | "incidents"
  | "control"
  | "governance"
  | "capabilities"
  | "institutional";

export type AiMonitorDimension = {
  key: AiMonitorDimensionKey;
  weight: number;
  score: number;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
};

export type AiMonitorEvidence = {
  id: string;
  title: string;
  organization: string;
  jurisdiction: string;
  publishedAt: string;
  url: string;
  note: Record<Locale, string>;
};

export type AiMonitorAssessment = {
  date: string;
  score: number;
  status: AiMonitorStatus;
  confidence: AiMonitorConfidence;
  dimensions: AiMonitorDimension[];
  summary: Record<Locale, string>;
  evidence: AiMonitorEvidence[];
  publicationReason?: string;
};

type StoredAssessment = {
  date: string;
  confidence: AiMonitorConfidence;
  dimensions: Record<AiMonitorDimensionKey, number>;
  summary: Record<Locale, string>;
  evidence: AiMonitorEvidence[];
  publicationReason?: string;
};

export const aiMonitorThresholds = {
  greenMax: 34,
  yellowMax: 69,
} as const;

const dimensionDefinitions: Omit<AiMonitorDimension, "score">[] = [
  {
    key: "incidents",
    weight: 0.3,
    title: { en: "Documented incidents", "pt-BR": "Incidentes documentados" },
    description: {
      en: "Observed harms, misuse, failures and security events with credible public evidence.",
      "pt-BR": "Danos, usos indevidos, falhas e eventos de segurança observados com evidência pública confiável.",
    },
  },
  {
    key: "control",
    weight: 0.25,
    title: { en: "Technical control", "pt-BR": "Controle técnico" },
    description: {
      en: "Evidence about safeguards, autonomous behaviour, jailbreak resistance and containment.",
      "pt-BR": "Evidências sobre salvaguardas, comportamento autônomo, resistência a jailbreaks e contenção.",
    },
  },
  {
    key: "governance",
    weight: 0.2,
    title: { en: "Governance gap", "pt-BR": "Lacuna de governança" },
    description: {
      en: "How far oversight, enforceable rules and accountability lag behind deployment and capability growth.",
      "pt-BR": "Quanto fiscalização, regras exigíveis e responsabilização ficam atrás da implantação e do avanço de capacidades.",
    },
  },
  {
    key: "capabilities",
    weight: 0.15,
    title: { en: "Emerging capabilities", "pt-BR": "Capacidades emergentes" },
    description: {
      en: "Growth in agentic, cyber, biological and other capabilities that can amplify consequential risks.",
      "pt-BR": "Avanço de capacidades agênticas, cibernéticas, biológicas e outras que podem ampliar riscos relevantes.",
    },
  },
  {
    key: "institutional",
    weight: 0.1,
    title: { en: "Institutional response gap", "pt-BR": "Lacuna de resposta institucional" },
    description: {
      en: "The remaining gap after accounting for evaluations, reporting systems, enforcement and mitigation capacity.",
      "pt-BR": "A lacuna restante após considerar avaliações, sistemas de reporte, fiscalização e capacidade de mitigação.",
    },
  },
];

function calculateWeightedScore(dimensions: AiMonitorDimension[]) {
  return Math.round(
    dimensions.reduce((total, dimension) => total + dimension.score * dimension.weight, 0),
  );
}

export function getAiMonitorStatus(score: number): AiMonitorStatus {
  if (score <= aiMonitorThresholds.greenMax) return "green";
  if (score <= aiMonitorThresholds.yellowMax) return "yellow";
  return "red";
}

function buildAssessment(stored: StoredAssessment): AiMonitorAssessment {
  const dimensions = dimensionDefinitions.map((definition) => ({
    ...definition,
    score: stored.dimensions[definition.key],
  }));
  const score = calculateWeightedScore(dimensions);

  return {
    date: stored.date,
    score,
    status: getAiMonitorStatus(score),
    confidence: stored.confidence,
    dimensions,
    summary: stored.summary,
    evidence: stored.evidence,
    publicationReason: stored.publicationReason,
  };
}

const storedAssessments = assessmentsData as unknown as StoredAssessment[];

export const aiMonitorHistory: AiMonitorAssessment[] = storedAssessments.map(buildAssessment);

if (aiMonitorHistory.length === 0) {
  throw new Error("C&C AI Monitor requires at least one published assessment");
}

export const currentAiMonitorAssessment = aiMonitorHistory[0];

export function getAiMonitorStatusLabel(status: AiMonitorStatus, locale: Locale) {
  const labels: Record<AiMonitorStatus, Record<Locale, string>> = {
    green: { en: "Controlled", "pt-BR": "Controlado" },
    yellow: { en: "Elevated", "pt-BR": "Elevado" },
    red: { en: "Critical", "pt-BR": "Crítico" },
  };

  return labels[status][locale];
}

export function getAiMonitorConfidenceLabel(confidence: AiMonitorConfidence, locale: Locale) {
  const labels: Record<AiMonitorConfidence, Record<Locale, string>> = {
    low: { en: "Low", "pt-BR": "Baixa" },
    moderate: { en: "Moderate", "pt-BR": "Moderada" },
    high: { en: "High", "pt-BR": "Alta" },
  };

  return labels[confidence][locale];
}
