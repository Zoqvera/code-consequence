# Editorial operations

Code & Consequence runs one scheduled editorial cycle every six hours. The cycle is intentionally sequential so each editorial pass begins from a fresh discovery run instead of relying on two independent cron schedules.

## Scheduled cycle

The workflow `.github/workflows/editorial-continuous.yml` executes:

1. validate the discovery-source configuration;
2. migrate the Neon schema;
3. collect configured primary-source pages;
4. restore retryable OpenAI and transient source-extraction failures;
5. classify the next source batch;
6. rebuild editorial candidate clusters;
7. research and verify initiative candidates;
8. validate and apply evidence-backed initiative promotion into reviewed drafts;
9. enforce independent-publisher corroboration for initiatives;
10. validate and apply the initiative DRAFT → REVIEW gate;
11. research and verify News/Analysis candidates with web evidence;
12. validate and promote verified article research into DRAFT;
13. validate and apply the article DRAFT → REVIEW gate;
14. generate separate human approval queue artifacts for initiatives and articles;
15. generate a cycle-health artifact with the latest ingestion result, queue counts, source errors and stale NEW items.

The workflow stops when a mandatory stage fails. It no longer ignores a total classification failure and does not continue into downstream stages with a stale or invalid classification state. A final health-report step runs with `if: always()` so operators still receive a diagnostic artifact when an earlier stage fails.

## Publication barrier

Automation may move an initiative or a News/Analysis article as far as `REVIEW`. Publication still requires an explicit human gate: `scripts/publish-reviewed-initiative.mjs` for initiatives and `scripts/publish-reviewed-article.mjs` for articles.

The publication barrier therefore remains:

`automated discovery → evidence research → DRAFT → REVIEW → explicit human approval → PUBLISHED`

Article automation is deliberately limited to `NEWS` and `ANALYSIS`. Dossiers remain a persistent, manually curated format because their indicators, timelines and legislation require longitudinal editorial maintenance.

## Source retry policy

Source extraction errors are not all equivalent. Permanent content problems such as unsupported content types or insufficient extractable text stay in `ERROR` for inspection instead of being requeued forever.

Only transient failures are retried automatically:

- HTTP 408, 409, 425, 429 and 5xx;
- fetch failures and timeouts;
- common transient DNS/socket failures.

The retry count is stored in `raw_payload.source_recovery.attempts`. The scheduled cycle defaults to three attempts, configurable with `RECOVER_SOURCE_MAX_ATTEMPTS`.

## Manual collection

`.github/workflows/ingest.yml` remains available through `workflow_dispatch` for operator diagnostics. It is no longer scheduled, which prevents duplicate discovery runs from racing the consolidated editorial cycle.
