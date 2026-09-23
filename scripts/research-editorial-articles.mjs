import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const apiKey = process.env.OPENAI_API_KEY;

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const sql = neon(connectionString);
const model = process.env.EDITORIAL_ARTICLE_RESEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-luna";
const batchSize = boundedInteger(process.env.EDITORIAL_ARTICLE_RESEARCH_BATCH_SIZE, 3, 1, 8);
const retryHoldAfterDays = boundedInteger(process.env.EDITORIAL_ARTICLE_RETRY_HOLD_DAYS, 7, 1, 30);
const currentDate = new Date().toISOString().slice(0, 10);

const primaryDomains = [
  "un.org", "unesco.org", "oecd.org", "worldbank.org", "worldbankgroup.org", "iea.org", "who.int",
  "europa.eu", "ec.europa.eu", "europarl.europa.eu", "consilium.europa.eu", "eur-lex.europa.eu",
  "nato.int", "imf.org", "ilo.org", "wto.org", "itu.int", "unep.org", "undp.org", "unicef.org",
];

const tierBDomains = [
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "ft.com", "technologyreview.com",
  "nature.com", "science.org",
];

const blockedEvidenceDomains = [
  "wikipedia.org", "reddit.com", "quora.com", "facebook.com", "instagram.com",
  "x.com", "twitter.com", "linkedin.com", "youtube.com",
];

const eligibleCandidateTypes = new Set(["NEWS", "ANALYSIS", "POLICY", "RESEARCH", "ARTICLE"]);

const topicValues = [
  "POWER_DEMOCRACY",
  "WORK_ECONOMY",
  "RIGHTS_SOCIETY",
  "GOVERNANCE_REGULATION",
  "INFRASTRUCTURE_PLANET",
  "SCIENCE_TECHNOLOGY",
];

const resultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: { type: "string", enum: ["VERIFIED_ARTICLE", "HOLD", "NOT_ARTICLE"] },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    article_type: { type: ["string", "null"], enum: ["NEWS", "ANALYSIS", null] },
    topic_code: { type: ["string", "null"], enum: [...topicValues, null] },
    title_en: { type: ["string", "null"] },
    title_pt_br: { type: ["string", "null"] },
    dek_en: { type: ["string", "null"] },
    dek_pt_br: { type: ["string", "null"] },
    body_en: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 5 },
    body_pt_br: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 5 },
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
    "decision", "confidence", "article_type", "topic_code", "title_en", "title_pt_br",
    "dek_en", "dek_pt_br", "body_en", "body_pt_br", "evidence_sources", "review_notes",
  ],
};

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

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

function sourceIdentity(source) {
  return hostOf(source.url) || String(source.publisher || "").trim().toLowerCase();
}

function getOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();

  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
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

function daysSince(value) {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / 86400000;
}

function filled(value) {
  return Boolean(String(value || "").trim());
}

function hasCompleteCopy(research) {
  const bodyEn = Array.isArray(research.body_en) ? research.body_en.filter(filled) : [];
  const bodyPt = Array.isArray(research.body_pt_br) ? research.body_pt_br.filter(filled) : [];

  return [
    research.article_type,
    research.topic_code,
    research.title_en,
    research.title_pt_br,
    research.dek_en,
    research.dek_pt_br,
  ].every(filled)
    && bodyEn.length >= 2
    && bodyEn.length === bodyPt.length;
}

function collectEvidence(research, knownSources, webSourceUrls) {
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

  return evidence;
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
    AND COALESCE(i.classification -> 'editorial_candidate' ->> 'review_state', '') = 'READY_FOR_REVIEW'
  ORDER BY i.relevance_score DESC, i.updated_at DESC
`;

const clusters = new Map();

for (const row of rows) {
  const candidate = row.classification?.editorial_candidate;
  if (!candidate?.cluster_id || !eligibleCandidateTypes.has(candidate.candidate_type)) continue;
  if ((candidate.risk_flags || []).some((flag) => flag && flag !== "NONE")) continue;

  const members = clusters.get(candidate.cluster_id) || [];
  members.push(row);
  clusters.set(candidate.cluster_id, members);
}

const queue = [];

for (const [clusterId, members] of clusters) {
  members.sort((left, right) => right.relevance_score - left.relevance_score);
  const representative = members[0];
  const existingResearch = members
    .map((member) => member.classification?.editorial_article_research)
    .find(Boolean) || null;

  if (existingResearch?.decision && existingResearch.decision !== "HOLD") continue;
  if (existingResearch?.decision === "HOLD" && daysSince(existingResearch.reviewed_at) < retryHoldAfterDays) continue;

  queue.push({ clusterId, members, representative });
}

queue.sort((left, right) => right.representative.relevance_score - left.representative.relevance_score);

const selected = queue.slice(0, batchSize);
const results = [];

for (const cluster of selected) {
  const { clusterId, members, representative } = cluster;
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
    `Candidate type: ${candidate.candidate_type || "ARTICLE"}`,
    `Candidate title: ${candidate.canonical_title || representative.title}`,
    `Candidate topics: ${(candidate.topics || []).join(", ") || "none"}`,
    `Organizations: ${(candidate.organizations || []).join(", ") || "none"}`,
    `Countries/jurisdictions: ${(candidate.countries || []).join(", ") || "none"}`,
    `Evidence signals: ${(candidate.evidence_signals || []).join(" | ") || "none"}`,
    `Existing synopsis: ${representative.classification?.synopsis_en || "none"}`,
    `Problem summary: ${representative.classification?.problem_summary || "none"}`,
    `Response summary: ${representative.classification?.response_summary || "none"}`,
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
        max_output_tokens: 5200,
        instructions: [
          "You are the evidence-verification editor for Code & Consequence, a bilingual observatory of the political, social and environmental consequences of artificial intelligence.",
          "You MUST use web search before deciding. Use only evidence you actually inspect.",
          "Create an article only when the candidate represents a consequential, source-verifiable development or analytical finding about AI and society, power, rights, governance, work, infrastructure, the environment, science or technology.",
          "Use NEWS only for a concrete development whose timing is material. Use ANALYSIS for evidence-based interpretation, policy/research synthesis, or durable consequences.",
          "Be conservative. If the evidence is ambiguous, too thin, promotional, stale for a news treatment, or cannot support a coherent article, return HOLD.",
          "Prefer official primary sources, laws, government or intergovernmental pages, universities, peer-reviewed sources, and reputable journalism.",
          "Do not use social media, Wikipedia, Reddit, Quora, marketing aggregators, or search-result snippets as evidence.",
          "Evidence URLs must be pages actually consulted through web search or supplied collected-source URLs. Never invent a URL.",
          "A VERIFIED_ARTICLE should have at least one primary or scientific Tier-A source plus independent corroboration from a distinct reliable publisher.",
          "Write original paraphrases. Do not quote source text. Do not add facts that are not supported by the evidence.",
          "title_pt_br, dek_pt_br and body_pt_br must be faithful Brazilian Portuguese versions of the English copy, not expansions.",
          "Write two to five concise body paragraphs in each language. The English and Portuguese arrays must have the same paragraph count and aligned meaning.",
          "Do not present future events as completed. Clearly distinguish announced plans from implemented actions.",
          "Select exactly one canonical topic code from the provided topic taxonomy.",
          "review_notes should briefly document the evidence basis and any limitations.",
        ].join("\n"),
        input,
        text: {
          format: {
            type: "json_schema",
            name: "editorial_article_research",
            strict: true,
            schema: resultSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);

    const outputText = getOutputText(payload);
    if (!outputText) throw new Error("OpenAI response did not contain structured article research output");

    const research = JSON.parse(outputText);
    const webSourceUrls = getWebSourceUrls(payload);
    if (!webSourceUrls.size) throw new Error("Article research returned no web-search sources");

    const evidence = collectEvidence(research, knownSources, webSourceUrls);
    const reliableEvidence = evidence.filter((source) => ["A", "B"].includes(source.reliability));
    const tierAPrimaryEvidence = evidence.filter(
      (source) => ["PRIMARY", "SCIENTIFIC"].includes(source.source_type) && source.reliability === "A",
    );
    const distinctReliablePublishers = new Set(reliableEvidence.map(sourceIdentity).filter(Boolean));
    const copyComplete = hasCompleteCopy(research);

    const sourceChecksPass = tierAPrimaryEvidence.length >= 1
      && reliableEvidence.length >= 2
      && distinctReliablePublishers.size >= 2;

    const canVerify = research.decision === "VERIFIED_ARTICLE"
      && research.confidence !== "LOW"
      && ["NEWS", "ANALYSIS"].includes(research.article_type)
      && topicValues.includes(research.topic_code)
      && copyComplete
      && sourceChecksPass;

    const finalDecision = canVerify
      ? "VERIFIED_ARTICLE"
      : research.decision === "VERIFIED_ARTICLE" ? "HOLD" : research.decision;

    const reviewedAt = new Date().toISOString();
    const researchRecord = {
      version: 1,
      model: payload.model || model,
      response_id: payload.id || null,
      reviewed_at: reviewedAt,
      decision: finalDecision,
      confidence: research.confidence,
      verification_level: canVerify ? "INDEPENDENT_CONFIRMED" : "NOT_APPLICABLE",
      candidate_type: candidate.candidate_type || "ARTICLE",
      article_type: research.article_type,
      topic_code: research.topic_code,
      title_en: research.title_en,
      title_pt_br: research.title_pt_br,
      dek_en: research.dek_en,
      dek_pt_br: research.dek_pt_br,
      body_en: research.body_en,
      body_pt_br: research.body_pt_br,
      evidence_sources: evidence,
      source_match_url: representative.canonical_url,
      source_published_at: representative.published_at || null,
      review_notes: research.review_notes || null,
      automated_checks: {
        tier_a_primary_or_scientific_sources: tierAPrimaryEvidence.length,
        high_reliability_sources: reliableEvidence.length,
        distinct_high_reliability_publishers: distinctReliablePublishers.size,
        copy_complete: copyComplete,
        web_search_source_count: webSourceUrls.size,
      },
      reviewer_type: "AI_WEB_RESEARCH",
      human_review_required_for_publication: true,
    };

    for (const member of members) {
      const classification = member.classification || {};
      classification.editorial_article_research = researchRecord;

      await sql`
        UPDATE ingestion_items
        SET classification = ${JSON.stringify(classification)}::jsonb,
            updated_at = now()
        WHERE id = ${member.id}
      `;
    }

    results.push({
      clusterId,
      title: research.title_en || candidate.canonical_title || representative.title,
      decision: finalDecision,
      articleType: research.article_type,
      confidence: research.confidence,
      reliableSources: reliableEvidence.length,
      distinctReliablePublishers: distinctReliablePublishers.size,
      readyForDraft: canVerify,
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
  verified: results.filter((item) => item.decision === "VERIFIED_ARTICLE").length,
  held: results.filter((item) => item.decision === "HOLD").length,
  errors: results.filter((item) => item.decision === "ERROR").length,
  results,
}, null, 2));
