import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
const apply = process.env.PREPARE_DRAFTS_APPLY === "1";

const curated = {
  "thailand-ai-readiness-assessment-unesco-ram": {
    titlePt: "Avaliação de Prontidão para IA da Tailândia (RAM da UNESCO)",
    organization: {
      slug: "unesco",
      name: "UNESCO",
      type: "INTERNATIONAL_ORGANIZATION",
      websiteUrl: "https://www.unesco.org/",
    },
    regionEn: "Thailand",
    regionPt: "Tailândia",
    evidenceUrl: "https://www.unesco.org/en/articles/unescos-ai-readiness-assessment-boost-ethical-governance-ai-thailand-host-country-2025-global-forum",
  },
  "european-union-artificial-intelligence-act": {
    titlePt: "Regulamento de Inteligência Artificial da União Europeia",
    organization: {
      slug: "european-union",
      name: "European Union",
      type: "SUPRANATIONAL_UNION",
      websiteUrl: "https://european-union.europa.eu/",
    },
    regionEn: "European Union",
    regionPt: "União Europeia",
    evidenceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689",
  },
  "declaration-of-santo-domingo-and-regional-roadmap-for-ethical-artificial": {
    titlePt: "Declaração de Santo Domingo e Roteiro Regional para Inteligência Artificial Ética 2026–2027",
    organization: {
      slug: "unesco",
      name: "UNESCO",
      type: "INTERNATIONAL_ORGANIZATION",
      websiteUrl: "https://www.unesco.org/",
    },
    regionEn: "Latin America and the Caribbean",
    regionPt: "América Latina e Caribe",
    evidenceUrl: "https://www.unesco.org/en/articles/caribbean-voices-shape-future-ethical-ai-regional-summit",
  },
  "common-european-language-data-space-lds": {
    titlePt: "Espaço Europeu Comum de Dados Linguísticos (LDS)",
    organization: {
      slug: "european-commission",
      name: "European Commission",
      type: "SUPRANATIONAL_INSTITUTION",
      websiteUrl: "https://commission.europa.eu/",
    },
    regionEn: "European Union",
    regionPt: "União Europeia",
    evidenceUrl: "https://digital-strategy.ec.europa.eu/en/policies/language-technologies",
  },
  "apply-ai-strategy": {
    titlePt: "Estratégia Aplicar a IA",
    organization: {
      slug: "european-commission",
      name: "European Commission",
      type: "SUPRANATIONAL_INSTITUTION",
      websiteUrl: "https://commission.europa.eu/",
    },
    regionEn: "European Union",
    regionPt: "União Europeia",
    evidenceUrl: "https://digital-strategy.ec.europa.eu/en/policies/apply-ai",
  },
  "unesco-recommendation-on-the-ethics-of-artificial-intelligence": {
    titlePt: "Recomendação da UNESCO sobre a Ética da Inteligência Artificial",
    organization: {
      slug: "unesco",
      name: "UNESCO",
      type: "INTERNATIONAL_ORGANIZATION",
      websiteUrl: "https://www.unesco.org/",
    },
    regionEn: "Global",
    regionPt: "Global",
    evidenceUrl: "https://www.unesco.org/en/artificial-intelligence/recommendation-ethics",
  },
  "coalition-for-linguistic-diversity-in-artificial-intelligence": {
    titlePt: "Coalizão para a Diversidade Linguística na Inteligência Artificial",
    organization: {
      slug: "unesco",
      name: "UNESCO",
      type: "INTERNATIONAL_ORGANIZATION",
      websiteUrl: "https://www.unesco.org/",
    },
    regionEn: "Global",
    regionPt: "Global",
    evidenceUrl: "https://www.unesco.org/ethics-ai/en/coalition-linguistic-diversity-artificial-intelligence",
  },
  "european-ai-office": {
    titlePt: "Serviço Europeu para a IA",
    organization: {
      slug: "european-commission",
      name: "European Commission",
      type: "SUPRANATIONAL_INSTITUTION",
      websiteUrl: "https://commission.europa.eu/",
    },
    regionEn: "European Union",
    regionPt: "União Europeia",
    evidenceUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
  },
  "eu-ai-act-enforcement-framework": {
    titlePt: "Quadro de aplicação do Regulamento de Inteligência Artificial da UE",
    organization: {
      slug: "european-commission",
      name: "European Commission",
      type: "SUPRANATIONAL_INSTITUTION",
      websiteUrl: "https://commission.europa.eu/",
    },
    regionEn: "European Union",
    regionPt: "União Europeia",
    evidenceUrl: "https://digital-strategy.ec.europa.eu/en/policies/enforcement-ai-act",
  },
};

const rows = await sql`
  SELECT
    i.id,
    i.slug,
    i.publication_status::text AS publication_status,
    i.metadata,
    en.title AS title_en,
    en.summary AS summary_en,
    en.problem_statement AS problem_en,
    en.goals AS goals_en,
    source_item.classification
  FROM initiatives i
  LEFT JOIN initiative_translations en ON en.initiative_id = i.id AND en.locale = 'en'
  LEFT JOIN ingestion_items source_item
    ON source_item.id::text = i.metadata ->> 'source_ingestion_item_id'
  WHERE i.publication_status = 'DRAFT'::publication_status
  ORDER BY i.updated_at DESC, i.slug
`;

const plan = [];
for (const row of rows) {
  const decision = curated[row.slug];
  if (!decision) {
    plan.push({ slug: row.slug, action: "BLOCKED_NO_CURATED_DECISION" });
    continue;
  }

  const summaryPt = String(row.classification?.synopsis_pt_br || "").trim();
  const blockers = [];
  if (!row.title_en) blockers.push("missingEnglishTitle");
  if (!row.summary_en) blockers.push("missingEnglishSummary");
  if (!summaryPt) blockers.push("missingPortugueseSummaryDraft");
  if (!decision.titlePt) blockers.push("missingPortugueseTitle");
  if (!decision.organization?.name) blockers.push("missingOrganizationDecision");
  if (!decision.regionEn || !decision.regionPt) blockers.push("missingRegionDecision");
  if (!decision.evidenceUrl) blockers.push("missingDecisionEvidence");

  plan.push({
    slug: row.slug,
    initiativeId: row.id,
    action: blockers.length ? "BLOCKED" : "READY_TO_PREPARE",
    blockers,
    titleEn: row.title_en,
    titlePt: decision.titlePt,
    hasPortugueseSummaryDraft: Boolean(summaryPt),
    organization: decision.organization.name,
    regionEn: decision.regionEn,
    regionPt: decision.regionPt,
    evidenceUrl: decision.evidenceUrl,
  });
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "DRY_RUN",
    drafts: rows.length,
    readyToPrepare: plan.filter((item) => item.action === "READY_TO_PREPARE").length,
    blocked: plan.filter((item) => item.action !== "READY_TO_PREPARE").length,
    plan,
  }, null, 2));
  process.exit(0);
}

const blocked = plan.filter((item) => item.action !== "READY_TO_PREPARE");
if (blocked.length) {
  throw new Error(`Preparation blocked for: ${blocked.map((item) => item.slug).join(", ")}`);
}

const results = [];
for (const row of rows) {
  const decision = curated[row.slug];
  const summaryPt = String(row.classification?.synopsis_pt_br || "").trim();

  const organizationRows = await sql`
    INSERT INTO organizations (slug, name, organization_type, website_url)
    VALUES (
      ${decision.organization.slug},
      ${decision.organization.name},
      ${decision.organization.type},
      ${decision.organization.websiteUrl}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      organization_type = EXCLUDED.organization_type,
      website_url = EXCLUDED.website_url
    RETURNING id
  `;
  const organizationId = organizationRows[0].id;

  await sql`
    INSERT INTO initiative_translations (
      initiative_id, locale, title, summary, problem_statement, goals
    ) VALUES (
      ${row.id},
      'pt-BR',
      ${decision.titlePt},
      ${summaryPt},
      NULL,
      NULL
    )
    ON CONFLICT (initiative_id, locale) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary
  `;

  const editorialPreparation = {
    organization_evidence_url: decision.evidenceUrl,
    region_evidence_url: decision.evidenceUrl,
    region_en: decision.regionEn,
    region_pt_br: decision.regionPt,
    portuguese_title_state: "CURATED_DRAFT",
    portuguese_summary_state: "AI_DRAFT_FROM_SOURCE_CLASSIFICATION",
    prepared_at: new Date().toISOString(),
    publication_status_unchanged: true,
  };

  await sql`
    UPDATE initiatives
    SET organization_id = ${organizationId},
        region = ${decision.regionEn},
        metadata = metadata || ${JSON.stringify({ editorial_preparation: editorialPreparation })}::jsonb,
        updated_at = now()
    WHERE id = ${row.id}
      AND publication_status = 'DRAFT'::publication_status
  `;

  results.push({
    slug: row.slug,
    action: "PREPARED_DRAFT",
    publicationStatus: "DRAFT",
    organization: decision.organization.name,
    regionEn: decision.regionEn,
    regionPt: decision.regionPt,
  });
}

console.log(JSON.stringify({
  mode: "APPLY",
  preparedDrafts: results.length,
  publicationStatusChanged: false,
  results,
}, null, 2));
