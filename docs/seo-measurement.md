# SEO and GEO measurement

This document defines how Code & Consequence measures organic search and generative-search discovery without changing the editorial model.

## Current measurement state

The analytics integration is optional. No Google Analytics script is rendered unless `GA_MEASUREMENT_ID` is present at build time.

Google Search Console verification is also optional. A verification meta tag is rendered only when `GOOGLE_SITE_VERIFICATION` is present at build time.

The GitHub Pages workflow reads both values from GitHub Actions repository variables:

- `GA_MEASUREMENT_ID`
- `GOOGLE_SITE_VERIFICATION`

An unset variable leaves the corresponding integration disabled and does not break the build.

## Google Analytics 4

When a GA4 Measurement ID is configured, the site records normal page views for App Router navigation and adds two SEO/GEO-oriented events.

### Events

#### `page_view`

Sent for each route navigation with:

- `page_location`
- `page_path`
- `page_title`
- `content_language`

#### `topic_pillar_view`

Sent when a visitor opens one of the six topic pillar pages.

Parameters:

- `topic_slug`
- `content_language`
- `page_path`

Use this event to compare visibility and engagement across the six content clusters.

#### `generative_referral_landing`

Sent once per browser tab session when the landing is attributable to ChatGPT through either:

- `utm_source=chatgpt.com`; or
- a `chatgpt.com` referrer.

Parameters:

- `provider=chatgpt`
- `content_language`
- `page_path`
- `topic_slug` when applicable.

OpenAI documents that ChatGPT Search automatically adds `utm_source=chatgpt.com` to referral URLs. This event makes that traffic easy to segment while normal GA4 acquisition reports still retain the standard source/medium data.

## Google Search Console

Use a URL-prefix Search Console property for the currently deployed site:

`https://zoqvera.github.io/code-consequence/`

After obtaining the HTML-tag verification token, store only the token value in the GitHub Actions repository variable `GOOGLE_SITE_VERIFICATION` and redeploy.

Submit the sitemap:

`https://zoqvera.github.io/code-consequence/sitemap.xml`

Track performance by:

- query;
- page;
- country;
- device;
- date;
- localized pillar page.

Google currently counts AI Mode and AI Overviews in the normal Search Console Performance totals. Do not treat that report as a reliable way to isolate AI-feature traffic unless Google introduces a dedicated filter or dimension.

## GEO measurement

Generative visibility is measured through evidence that is actually observable:

1. inbound referral traffic carrying provider attribution;
2. landing pages receiving that traffic;
3. topic pillars reached through generative referrals;
4. downstream navigation into articles, initiatives, organizations and sources;
5. recurring manual citation checks for strategically important queries.

Do not infer a citation merely because a page ranks in Google or receives organic traffic.

## Baseline review cadence

Run a monthly review after enough data exists.

For each pillar record:

- Google impressions;
- Google clicks;
- average position;
- click-through rate;
- top queries;
- top countries;
- GA4 landing sessions;
- ChatGPT-attributed landings;
- meaningful internal navigation from the pillar.

Use observed Search Console queries to decide whether a new supporting guide is justified. Avoid creating pages from speculative keyword variants.

## Preferred Sources and the custom-domain blocker

Google's Preferred Sources feature can highlight a selected publisher in Top Stories and, where available, AI Mode and AI Overviews.

However, Google currently makes only domain-level and subdomain-level sites eligible for Preferred Sources. A subdirectory is not eligible as an independent publication.

The current production URL:

`https://zoqvera.github.io/code-consequence/`

is a subdirectory under `zoqvera.github.io`. This means Code & Consequence cannot establish its own Preferred Sources identity at the current URL structure.

A dedicated custom domain or dedicated subdomain is therefore an SEO/GEO infrastructure priority. Once the site moves to a root domain or subdomain, the Preferred Sources integration can be enabled without fragmenting the publication identity.

## Privacy and consent

GA4 remains disabled until a Measurement ID is configured. Before enabling it in production, document analytics use in the site's privacy information and apply any consent requirements appropriate to the jurisdictions served by the publication.

Do not send names, emails, search text containing personal data or other personally identifiable information in analytics event parameters.
