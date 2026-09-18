import { initiatives, type InitiativeDetail } from "./initiatives";

function slugifyOrganization(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type OrganizationRecord = {
  slug: string;
  name: string;
  initiatives: InitiativeDetail[];
  topics: string[];
  regions: string[];
  activeInitiatives: number;
  sourceReferences: number;
};

function buildOrganizations(): OrganizationRecord[] {
  const grouped = new Map<string, InitiativeDetail[]>();

  for (const initiative of initiatives) {
    const current = grouped.get(initiative.organization) ?? [];
    current.push(initiative);
    grouped.set(initiative.organization, current);
  }

  return [...grouped.entries()]
    .map(([name, organizationInitiatives]) => ({
      slug: slugifyOrganization(name),
      name,
      initiatives: organizationInitiatives,
      topics: [...new Set(organizationInitiatives.map((item) => item.topic.en))].sort(),
      regions: [...new Set(organizationInitiatives.map((item) => item.region.en))].sort(),
      activeInitiatives: organizationInitiatives.filter((item) => item.status === "Active").length,
      sourceReferences: organizationInitiatives.reduce(
        (total, item) => total + item.sources.length,
        0,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const organizations = buildOrganizations();

export function getOrganization(slug: string) {
  return organizations.find((organization) => organization.slug === slug);
}

export function getOrganizationForInitiative(initiativeSlug: string) {
  const initiative = initiatives.find((item) => item.slug === initiativeSlug);
  if (!initiative) return undefined;

  return organizations.find(
    (organization) => organization.name === initiative.organization,
  );
}
