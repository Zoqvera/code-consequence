# Code & Consequence

**Power, society and planet in the age of artificial intelligence.**

Code & Consequence is a bilingual (`en` / `pt-BR`) editorial observatory covering the political, social and environmental consequences of AI, with a special focus on real initiatives responding to those consequences.

## Architecture

`internet sources → GitHub Actions → Neon Postgres → static Next.js export → GitHub Pages`

The public website is fully static. Neon credentials and ingestion credentials are used only inside trusted GitHub Actions workflows and are never shipped to the browser.

## MVP foundation
- Next.js 16 App Router + TypeScript
- React 19
- static export for GitHub Pages
- bilingual routing under `/en` and `/pt-BR`
- editorial homepage, article pages, topics and initiative tracker
- source reliability tiers
- Neon-ready PostgreSQL schema
- database migration and verification scripts
- mobile/desktop responsive editorial design
- CI plus GitHub Pages deployment workflow

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and choose the English or Portuguese edition.

## GitHub Pages
The production workflow builds the static export in `out/` and deploys it with GitHub Pages. While the project uses the repository URL, the build sets the base path to `/code-consequence`. When a custom domain is adopted, this can be changed to an empty base path.

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
