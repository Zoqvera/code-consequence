# Code & Consequence

**Power, society and planet in the age of artificial intelligence.**

Code & Consequence is a bilingual (`en` / `pt-BR`) editorial observatory covering the political, social and environmental consequences of AI, with a special focus on real initiatives responding to those consequences.

## MVP foundation
- Next.js 16 App Router + TypeScript
- React 19
- bilingual routing under `/en` and `/pt-BR`
- editorial homepage, article pages, topics and initiative tracker
- source reliability tiers
- Neon-ready PostgreSQL schema
- serverless Neon driver
- mobile/desktop responsive editorial design

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`; the root route redirects to `/en`.

## Database
Create a Neon Postgres database, set `DATABASE_URL`, then apply `db/schema.sql`. The current UI uses verified seed content in `lib/content.ts` so frontend work is independent of database provisioning.

## Editorial model
See `docs/editorial-policy.md`.

## Planned ingestion pipeline
`source discovery → extraction → deduplication → relevance classification → entity extraction → source verification → editorial draft → review/publication`

The ingestion layer will treat social/search sources as discovery inputs and prioritize primary sources for factual substantiation.
