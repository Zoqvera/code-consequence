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
8. validate and apply evidence-backed promotion into reviewed drafts;
9. enforce independent-publisher corroboration;
10. validate and apply the DRAFT → REVIEW gate;
11. generate the human approval queue artifact;
12. generate a cycle-health artifact with the latest ingestion result, queue counts, source errors and stale NEW items.

The workflow stops when a mandatory stage fails. It no longer ignores a total classification failure and does not continue into downstream stages with a stale or invalid classification state. A final health-report step runs with `if: always()` so operators still receive a diagnostic artifact when an earlier stage fails.

## Publication barrier

Automation may move an initiative as far as `REVIEW`. Publication still requires the existing explicit human gate in `scripts/publish-reviewed-initiative.mjs`.

The publication barrier therefore remains:

`automated discovery → automated evidence processing → REVIEW → explicit human approval → PUBLISHED`

## Source retry policy

Source extraction errors are not all equivalent. Permanent content problems such as unsupported content types or insufficient extractable text stay in `ERROR` for inspection instead of being requeued forever.

Only transient failures are retried automatically:

- HTTP 408, 409, 425, 429 and 5xx;
- fetch failures and timeouts;
- common transient DNS/socket failures.

The retry count is stored in `raw_payload.source_recovery.attempts`. The scheduled cycle defaults to three attempts, configurable with `RECOVER_SOURCE_MAX_ATTEMPTS`.

## Manual collection

`.github/workflows/ingest.yml` remains available through `workflow_dispatch` for operator diagnostics. It is no longer scheduled, which prevents duplicate discovery runs from racing the consolidated editorial cycle.
