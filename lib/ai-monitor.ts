import type { Locale } from "@/lib/i18n";

export type AiMonitorStatus = "green" | "yellow" | "red";
export type AiMonitorConfidence = "low" | "moderate" | "high";

export type AiMonitorDimension = {
  key: "incidents" | "control" | "governance" | "capabilities" | "institutional";
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
};

export const aiMonitorThresholds = {
  greenMax: 34,
  yellowMax: 69,
} as const;

const currentDimensions: AiMonitorDimension[] = [
  {
    key: "incidents",
    weight: 0.3,
    score: 58,
    title: { en: "Documented incidents", "pt-BR": "Incidentes documentados" },
    description: {
      en: "Observed harms, misuse, failures and security events with credible public evidence.",
      "pt-BR": "Danos, usos indevidos, falhas e eventos de segurança observados com evidência pública confiável.",
    },
  },
  {
    key: "control",
    weight: 0.25,
    score: 58,
    title: { en: "Technical control", "pt-BR": "Controle técnico" },
    description: {
      en: "Evidence about safeguards, autonomous behaviour, jailbreak resistance and containment.",
      "pt-BR": "Evidências sobre salvaguardas, comportamento autônomo, resistência a jailbreaks e contenção.",
    },
  },
  {
    key: "governance",
    weight: 0.2,
    score: 45,
    title: { en: "Governance gap", "pt-BR": "Lacuna de governança" },
    description: {
      en: "How far oversight, enforceable rules and accountability lag behind deployment and capability growth.",
      "pt-BR": "Quanto fiscalização, regras exigíveis e responsabilização ficam atrás da implantação e do avanço de capacidades.",
    },
  },
  {
    key: "capabilities",
    weight: 0.15,
    score: 62,
    title: { en: "Emerging capabilities", "pt-BR": "Capacidades emergentes" },
    description: {
      en: "Growth in agentic, cyber, biological and other capabilities that can amplify consequential risks.",
      "pt-BR": "Avanço de capacidades agênticas, cibernéticas, biológicas e outras que podem ampliar riscos relevantes.",
    },
  },
  {
    key: "institutional",
    weight: 0.1,
    score: 42,
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

const currentScore = calculateWeightedScore(currentDimensions);

export const aiMonitorHistory: AiMonitorAssessment[] = [
  {
    date: "2026-09-19",
    score: currentScore,
    status: getAiMonitorStatus(currentScore),
    confidence: "moderate",
    dimensions: currentDimensions,
    summary: {
      en: "Risk signals are elevated but do not currently support a critical-status classification. The main pressure comes from rapidly advancing capabilities and documented safety or safeguard limitations, while regulatory and institutional responses remain uneven across jurisdictions.",
      "pt-BR": "Os sinais de risco estão elevados, mas não sustentam, neste momento, uma classificação crítica. A principal pressão vem do avanço rápido de capacidades e de limitações documentadas de segurança ou salvaguardas, enquanto as respostas regulatórias e institucionais seguem desiguais entre jurisdições.",
    },
    evidence: [
      {
        id: "oecd-aim-2026",
        title: "AI risks and incidents",
        organization: "OECD",
        jurisdiction: "Global",
        publishedAt: "2026",
        url: "https://www.oecd.org/en/topics/ai-risks-and-incidents.html",
        note: {
          en: "The OECD AI Incidents Monitor documents incidents and hazards to identify patterns in real-world AI risks.",
          "pt-BR": "O AI Incidents Monitor da OCDE documenta incidentes e perigos para identificar padrões de risco de IA no mundo real.",
        },
      },
      {
        id: "eu-gpai-enforcement-2026",
        title: "Guidelines for providers of general-purpose AI models",
        organization: "European Commission",
        jurisdiction: "European Union",
        publishedAt: "2026-08-02",
        url: "https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers",
        note: {
          en: "From 2 August 2026, the Commission's enforcement powers apply to GPAI-provider obligations, including systemic-risk duties.",
          "pt-BR": "Desde 2 de agosto de 2026, os poderes de fiscalização da Comissão se aplicam às obrigações de fornecedores de GPAI, inclusive deveres ligados a risco sistêmico.",
        },
      },
      {
        id: "nist-caisi-glm52-2026",
        title: "CAISI Assessment of Z.ai's GLM-5.2",
        organization: "NIST / CAISI",
        jurisdiction: "United States",
        publishedAt: "2026-07-17",
        url: "https://www.nist.gov/news-events/news/2026/07/caisi-assessment-zais-glm-52",
        note: {
          en: "CAISI reported strong cyber capability and mixed safeguard performance, including assistance with agentic exploit development.",
          "pt-BR": "O CAISI relatou forte capacidade cibernética e desempenho misto de salvaguardas, incluindo assistência ao desenvolvimento agêntico de exploits.",
        },
      },
      {
        id: "brazil-pl2338-2026",
        title: "Comissão Especial sobre Inteligência Artificial (PL 2338/23)",
        organization: "Câmara dos Deputados",
        jurisdiction: "Brazil",
        publishedAt: "2026",
        url: "https://www.camara.leg.br/comissoes/539776/membros",
        note: {
          en: "Brazil's principal AI framework bill remains under examination by a special committee in the Chamber of Deputies.",
          "pt-BR": "O principal projeto brasileiro de marco regulatório de IA segue em análise por comissão especial da Câmara dos Deputados.",
        },
      },
    ],
  },
];

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
