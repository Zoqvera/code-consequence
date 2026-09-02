import generatedSnapshot from "../data/generated-content.json";
import { initiatives as seedFallback, type Initiative, type Source } from "./content";

export type InitiativeDetail = Initiative & {
  sources: Source[];
  lastVerifiedAt: string | null;
};

const generatedInitiatives = generatedSnapshot.initiatives as unknown as InitiativeDetail[];

// Once published Neon content exists, it is the only public initiative source.
// Static seeds remain available solely as a development fallback for an empty snapshot.
export const initiatives: InitiativeDetail[] = generatedInitiatives.length
  ? generatedInitiatives
  : seedFallback.map((initiative) => ({
      ...initiative,
      sources: [initiative.source],
      lastVerifiedAt: null,
    }));

export function getInitiative(slug: string) {
  return initiatives.find((initiative) => initiative.slug === slug);
}
