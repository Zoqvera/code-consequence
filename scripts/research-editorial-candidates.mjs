import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const apiKey = process.env.OPENAI_API_KEY;
if (!connectionString) throw new Error("DATABASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const sql = neon(connectionString);
const model = process.env.EDITORIAL_RESEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-luna";
const batchSize = Math.max(1, Math.min(Number(process.env.EDITORIAL_RESEARCH_BATCH_SIZE || 4), 10));
const retryHoldAfterDays = Math.max(1, Number(process.env.EDITORIAL_RESEARCH_RETRY_HOLD_DAYS || 7));
const currentDate = new Date().toISOString().slice(0, 10);

const primaryDomains = [
  "un.org", "unesco.org", "oecd.org", "worldbank.org", "worldbankgroup.org", "iea.org", "who.int",
  "europa.eu", "ec.europa.eu", "europarl.europa.eu", "consilium.europa.eu", "eur-lex.europa.eu",
  "nato.int", "imf.org", "ilo.org", "wto.org", "itu.int", "unep.org", "undp.org", "unicef.org",
];
const tierBDomains = [
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "ft.com", "technologyreview.com", "nature.com", "science.org",
];
const blockedEvidenceDomains = ["wikipedia.org", "reddit.com", "quora.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "youtube.com"];

const resultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: { type: "string", enum: ["VERIFIED_STANDALONE", "UMBRELLA_NOT_STANDALONE", "NOT_STANDALONE", "SPLIT_REQUIRED", "HOLD"] },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    canonical_title: { type: ["string", "null"] },
    organization_name: { type: ["string", "null"] },
    organization_type: {
      type: ["string", "null"],
      enum: ["GOVERNMENT", "SUPRANATIONAL_INSTITUTION", "INTERNATIONAL_ORGANIZATION", "UNIVERSITY", "RESEARCH_ORGANIZATION", "CIVIL_SOCIETY", "COMPANY", "MULTISTAKEHOLDER", "OTHER", null],
    },
    organization_website_url: { type: ["string", "null"] },
    region_en: { type: ["string", "null"] },
    region_pt_br: { type: ["string", "null"] },
    title_en: { type: ["string", "null"] },
    title_pt_br: { type: ["string", "null"] },
    summary_en: { type: ["string", "null"] },
    summary_pt_br: { type: ["string", "null"] },
    initiative_status: { type: ["string", "null"], enum: ["ANNOUNCED", "ACTIVE", "COMPLETED", "PAUSED", "CANCELLED", null] },
    evidence_sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string" },
          publisher: { type: "string" },
          role: { type: "string" },
        },
        required: ["url", "publisher", "role"],
      },
    },
    review_notes: { type: ["string", "null"] },
  },
  required: [
    "decision", "confidence", "canonical_title", "organization_name", "organization_type", "organization_website_url",
    "region_en", "region_pt_br", "title_en", "title_pt_br", "summary_en", "summary_pt_br", "initiative_status",
    "evidence_sources", "review_notes",
  ],
};

function normalizeUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    const search = url.searchParams.toString();
    return `${url.protocol}//${url.host.toLowerCase()}${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return String(value || "").trim().replace(/\/$/, "");
  }
}

function hostOf(value = "") {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isGovernmentHost(host) {
  return /(^|\.)(gov|gob|gouv|go)\.[a-z]{2,3}$/.test(host)
    || /\.gov$/.test(host)
    || /\.gov\.[a-z]{2}$/.test(host)
    || /\.mil$/.test(host)
    || /\.mil\.[a-z]{2}$/.test(host);
}

function classifySource(url, fallbackPublisher = null) {
  const host = hostOf(url);
  if (primaryDomains.some((domain) => domainMatches(host, domain)) || isGovernmentHost(host)) {
    return { source_type: "PRIMARY", reliability: "A", publisher: fallbackPublisher || host };
  }
  if (/\.edu$/.test(host) || /\.edu\.[a-z]{2}$/.test(host) || /\.ac\.[a-z]{2}$/.test(host)) {
    return { source_type: "SCIENTIFIC", reliability: "A", publisher: fallbackPublisher || host };
  }
  if (tierBDomains.some((domain) => domainMatches(host, domain))) {
    return { source_type: "JOURNALISTIC", reliability: "B", publisher: fallbackPublisher || host };
  }
  return { source_type: "INSTITUTIONAL", reliability: "C", publisher: fallbackPublisher || host || null };
}

function getOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) return content.text.trim();
    }
  }
  return "";
}

function getWebSourceUrls(payload) {
  const urls = new Set();
  for (const item of payload.output || []) {
    if (item.type !== "web_search_call") continue;
    for (const source of item.action?.sources || []) {
      if (source?.url) urls.add(normalizeUrl(source.url));
    }
  }
  return urls;
}

function filled(value) {
  return Boolean(String(value || "").trim());
}

function slugify(value) {
  return String(value || "organization")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "organization";
}

function sourceIdentity(source) {
  return hostOf(source.url) || String(source.publisher || "").toLowerCase();
}

function daysSince(value) {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return Infinity;
  return (Date.now() - time) / 86400000;
}

const rows = await sql`
  SELECT
    i.id,
    i.canonical_url,
    i.title,
    i.published_at,
    i.relevance_score,
    i.classification,
    f.publisher,
    f.source_type::text AS source_type,
    f.reliability::text AS reliability
  FROM ingestion_items i
  JOIN source_feeds f ON f.id = i.feed_id
  WHERE i.processing_status = 'CLASSIFIED'
    AND i.relevance_status = 'RELEVANT'
    AND i.classification ? 'editorial_candidate'
    AND COALESCE(i.classification -> 'editorial_candidate' ->> 'candidate_type', '') = 'INITIATIVE'
    AND COALESCE(i.classification -> 'editorial_candidate' ->> 'review_state', '') = 'READY_FOR_REVIEW'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const clusters = new Map();
for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  if (!candidate?.cluster_id) continue;
  if ((candidate.risk_flags || []).some((flag) => flag && flag !== "NONE")) continue;
  if (!clusters.has(candidate.cluster_id)) clusters.set(candidate.cluster_id, []);
  clusters.get(candidate.cluster_id).push(row);
}

const queue = [];
for (const [clusterId, members] of clusters) {
  members.sort((a, b) => b.relevance_score - a.relevance_score);
  const representative = members[0];
  const existingVerification = members.map((member) => member.classification?.editorial_verification).find(Boolean) || null;
  if (existingVerification?.decision && existingVerification.decision !== "HOLD") continue;
  if (existingVerification?.decision === "HOLD" && daysSince(existingVerification.reviewed_at) < retryHoldAfterDays) continue;
  queue.push({ clusterId, members, representative });
}
queue.sort((a, b) => b.representative.relevance_score - a.representative.relevance_score);

const selected = queue.slice(0, batchSize);
const results = [];

for (const cluster of selected) {
  const { representative, members, clusterId } = cluster;
  const candidate = representative.classification?.editorial_candidate || {};
  const knownSources = new Map();
  for (const member of members) {
    const url = normalizeUrl(member.canonical_url);
    if (!url) continue;
    knownSources.set(url, {
      url,
      publisher: member.publisher,
      source_type: member.source_type,
      reliability: member.reliability,
      role: "collected_source",
    });
  }

  const input = [
    `Current date: ${currentDate}`,
    `Candidate title: ${candidate.canonical_title || representative.title}`,
    `Candidate organizations from source classification: ${(candidate.organizations || []).join(", ") || "none"}`,
    `Candidate countries/jurisdictions from source classification: ${(candidate.countries || []).join(", ") || "none"}`,
    `Candidate topics: ${(candidate.topics || []).join(", ") || "none"}`,
    `Evidence signals already extracted: ${(candidate.evidence_signals || []).join(" | ") || "none"}`,
    "Collected source URLs:",
    ...[...knownSources.values()].map((source) => `- ${source.publisher || "source"}: ${source.url}`),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "medium" },
        tools: [{ type: "web_search", search_context_size: "medium" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_output_tokens: 3200,
        instructions: [
          "You are the evidence-verification editor for Code & Consequence, a bilingual observatory of consequential AI initiatives.",
          "You MUST use web search before deciding. Verify whether the candidate is a concrete standalone initiative rather than a generic topic, umbrella label, event mention, or commentary.",
          "Be conservative. If identity, responsible actor, jurisdiction, operational scope, or source support is ambiguous, return HOLD rather than guessing.",
          "Prefer official primary sources, laws, government or intergovernmental pages, universities, peer-reviewed sources, and reputable journalism. Do not use social media, Wikipedia, Reddit, Quora, marketing aggregators, or search-result snippets as evidence.",
          "Evidence URLs must be pages actually consulted through web search or one of the supplied collected-source URLs. Never invent a URL.",
          "A VERIFIED_STANDALONE decision should have at least one primary/official source and independent corroboration when available.",
          "organization_name means the institution principally responsible for the initiative, not merely the publisher of an article. region_en/region_pt_br mean the initiative's jurisdiction or operational scope, not the source publisher's location.",
          "Write concise source-backed editorial copy. title_pt_br and summary_pt_br must be faithful Brazilian Portuguese versions of the English copy, not expansions.",
          "Do not state future events or dates as completed facts. Do not infer claims beyond the evidence.",
          "review_notes should briefly record what was verified, narrowed, or left uncertain.",
        ].join("\n"),
        input,
        text: {
          format: {
            type: "json_schema",
            name: "editorial_research",
            strict: true,
            schema: resultSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
    const text = getOutputText(payload);
    if (!text) throw new Error("OpenAI response did not contain structured editorial research output");
    const research = JSON.parse(text);
    const webSourceUrls = getWebSourceUrls(payload);
    if (!webSourceUrls.size) throw new Error("Editorial research returned no web-search sources");

    const allowedUrls = new Set([...knownSources.keys(), ...webSourceUrls]);
    const evidence = [];
    const seen = new Set();
    for (const proposed of research.evidence_sources || []) {
      const url = normalizeUrl(proposed.url);
      if (!url || seen.has(url) || !allowedUrls.has(url)) continue;
      const host = hostOf(url);
      if (blockedEvidenceDomains.some((domain) => domainMatches(host, domain))) continue;
      const known = knownSources.get(url);
      const classified = known || { url, ...classifySource(url, proposed.publisher), role: proposed.role };
      evidence.push({
        url,
        publisher: proposed.publisher || classified.publisher || host || "source",
        source_type: classified.source_type,
        reliability: classified.reliability,
        role: proposed.role || classified.role || "verification",
      });
      seen.add(url);
    }

    for (const known of knownSources.values()) {
      if (seen.has(known.url)) continue;
      if (known.source_type === "PRIMARY" || known.reliability === "A") {
        evidence.push(known);
        seen.add(known.url);
      }
    }

    const reliableEvidence = evidence.filter((source) => ["A", "B"].includes(source.reliability));
    const primaryEvidence = evidence.filter((source) => source.source_type === "PRIMARY" && source.reliability === "A");
    const distinctReliablePublishers = new Set(reliableEvidence.map(sourceIdentity).filter(Boolean));
    const copyComplete = [
      research.title_en, research.title_pt_br, research.summary_en, research.summary_pt_br,
      research.organization_name, research.region_en, research.region_pt_br,
    ].every(filled);

    const sourceChecksPass = primaryEvidence.length >= 1 && reliableEvidence.length >= 2 && distinctReliablePublishers.size >= 2;
    const canVerify = research.decision === "VERIFIED_STANDALONE"
      && research.confidence !== "LOW"
      && sourceChecksPass
      && copyComplete;
    const finalDecision = canVerify ? "VERIFIED_STANDALONE" : (research.decision === "VERIFIED_STANDALONE" ? "HOLD" : research.decision);
    const reviewedAt = new Date().toISOString();
    const verification = {
      version: 3,
      reviewed_at: reviewedAt,
      decision: finalDecision,
      verification_level: canVerify ? "INDEPENDENT_CONFIRMED" : "NOT_APPLICABLE",
      canonical_title: research.canonical_title || research.title_en || candidate.canonical_title || representative.title,
      editorial_notes: research.review_notes || null,
      evidence_sources: evidence,
      split_targets: [],
      match_url: representative.canonical_url,
      previous_cluster_id: null,
      resolved_cluster_id: clusterId,
      automated_checks: {
        primary_source_count: primaryEvidence.length,
        high_reliability_source_count: reliableEvidence.length,
        distinct_high_reliability_publishers: distinctReliablePublishers.size,
        copy_complete: copyComplete,
        web_search_source_count: webSourceUrls.size,
      },
    };
    const researchRecord = {
      version: 1,
      model: payload.model || model,
      response_id: payload.id || null,
      reviewed_at: reviewedAt,
      confidence: research.confidence,
      decision: finalDecision,
      organization: research.organization_name ? {
        slug: slugify(research.organization_name),
        name: research.organization_name,
        type: research.organization_type || "OTHER",
        website_url: research.organization_website_url || null,
      } : null,
      region_en: research.region_en,
      region_pt_br: research.region_pt_br,
      title_en: research.title_en,
      title_pt_br: research.title_pt_br,
      summary_en: research.summary_en,
      summary_pt_br: research.summary_pt_br,
      initiative_status: research.initiative_status,
      evidence_urls: evidence.map((source) => source.url),
      review_notes: research.review_notes || null,
      reviewer_type: "AI_WEB_RESEARCH",
      human_review_required_for_publication: true,
    };

    for (const member of members) {
      const classification = member.classification || {};
      classification.editorial_verification = verification;
      classification.editorial_research = researchRecord;
      await sql`
        UPDATE ingestion_items
        SET classification = ${JSON.stringify(classification)}::jsonb,
            updated_at = now()
        WHERE id = ${member.id}
      `;
    }

    results.push({
      clusterId,
      title: verification.canonical_title,
      decision: finalDecision,
      confidence: research.confidence,
      primarySources: primaryEvidence.length,
      reliableSources: reliableEvidence.length,
      distinctReliablePublishers: distinctReliablePublishers.size,
      evidenceSources: evidence.length,
      autoReadyForPromotion: canVerify,
    });
  } catch (error) {
    results.push({
      clusterId,
      title: candidate.canonical_title || representative.title,
      decision: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify({
  model,
  candidateClusters: clusters.size,
  queuedForResearch: queue.length,
  processed: selected.length,
  verified: results.filter((item) => item.decision === "VERIFIED_STANDALONE").length,
  held: results.filter((item) => item.decision === "HOLD").length,
  errors: results.filter((item) => item.decision === "ERROR").length,
  results,
}, null, 2));
