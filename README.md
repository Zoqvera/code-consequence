# Code & Consequence

**Power, society and planet in the age of artificial intelligence.**

Code & Consequence is a bilingual (`en` / `pt-BR`) editorial observatory covering the political, social and environmental consequences of AI, with a special focus on real initiatives responding to those consequences.

## Architecture

`internet sources → GitHub Actions → Neon Postgres → static Next.js export → GitHub Pages`

The public website is fully static. Neon credentials and ingestion credentials are used only inside trusted GitHub Actions workflows and are never shipped to the browser.

## Public information architecture

`News → Analysis → Initiatives → Topics → Global Radar → Data`

Events and methodology pages complement the main editorial path. News and Analysis use the published editorial corpus, while Data derives its indicators directly from the public verified records already used by the site.

Topics are first-class hubs rather than static taxonomy labels. Each topic page aggregates matching editorial publications and verified initiatives, exposes corpus-derived counts, and links onward to Radar and Data. Article/initiative relationship blocks are deterministic: they use the shared canonical topic in the published corpus rather than inferred associations.

Organizations are also exposed as derived public entities. Organization pages are generated only from names already attached to published initiatives and aggregate those verified records; no external organization profile data is inferred or invented.

Persistent Dossiers track an issue over time. A published dossier requires a bilingual problem statement and can accumulate countries, indicators, timeline events, legislation and formally linked published initiatives, with source-level provenance for every structured evidence item.

## MVP foundation
- Next.js 16 App Router + TypeScript
- React 19
- static export for GitHub Pages
- bilingual routing under `/en` and `/pt-BR`
- editorial homepage plus dedicated News, Analysis and persistent Dossier collections
- initiative tracker, detail pages, topics and Global Radar
- corpus-derived Data dashboard
- verified AI events calendar
- source reliability tiers
- Neon-ready PostgreSQL schema
- database migration and verification scripts
- mobile/desktop responsive editorial design
- global search and initiative filters
- bilingual canonical URLs, hreflang metadata, Open Graph/Twitter metadata, sitemap and robots metadata routes
- CI plus GitHub Pages deployment workflow

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and choose the English or Portuguese edition.

## GitHub Pages
The production workflow builds the static export in `out/` and deploys it with GitHub Pages. The current public root is `https://zoqvera.github.io/code-consequence`, so production builds set:

```text
NEXT_PUBLIC_BASE_PATH=/code-consequence
NEXT_PUBLIC_SITE_URL=https://zoqvera.github.io/code-consequence
```

When a custom domain is adopted, update both values so routes and public metadata remain aligned.

In GitHub repository settings, Pages must use **GitHub Actions** as the deployment source.

## Neon database
The dedicated Neon project is **Code & Consequence**. Save its connection string in the GitHub repository secret `DATABASE_URL`; never commit the connection string to the repository.

After the secret exists, run **Actions → Initialize Neon database → Run workflow**. The workflow executes:

```bash
npm run db:migrate
npm run db:verify
```

`db:migrate` applies `db/schema.sql`; `db:verify` confirms that all expected editorial tables exist.

The browser never receives `DATABASE_URL`. Database reads and writes happen in GitHub Actions during ingestion and static-site generation.

The current UI uses verified seed content in `lib/content.ts` until the Neon ingestion pipeline is connected.

## Editorial model
See `docs/editorial-policy.md`.

## Planned ingestion pipeline
`source discovery → extraction → deduplication → relevance classification → entity extraction → source verification → Neon → static build → publication`

The ingestion layer treats social/search sources as discovery inputs and prioritizes primary sources for factual substantiation.
