CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE source_type AS ENUM ('PRIMARY','SCIENTIFIC','JOURNALISTIC','INSTITUTIONAL','DISCOVERY');
CREATE TYPE reliability_level AS ENUM ('A','B','C','D');
CREATE TYPE publication_status AS ENUM ('DRAFT','REVIEW','PUBLISHED','ARCHIVED');
CREATE TYPE article_type AS ENUM ('NEWS','ANALYSIS','DOSSIER');
CREATE TYPE initiative_status AS ENUM ('ANNOUNCED','ACTIVE','COMPLETED','PAUSED','CANCELLED');

CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_pt_br TEXT NOT NULL
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  country_code CHAR(2) REFERENCES countries(code),
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT,
  source_type source_type NOT NULL,
  reliability reliability_level NOT NULL,
  published_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE topic_translations (
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en','pt-BR')),
  name TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (topic_id, locale)
);

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  type article_type NOT NULL,
  status publication_status NOT NULL DEFAULT 'DRAFT',
  primary_language TEXT NOT NULL DEFAULT 'en' CHECK (primary_language IN ('en','pt-BR')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE article_translations (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en','pt-BR')),
  title TEXT NOT NULL,
  dek TEXT,
  body_md TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  PRIMARY KEY (article_id, locale)
);

CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  country_code CHAR(2) REFERENCES countries(code),
  region TEXT,
  status initiative_status NOT NULL DEFAULT 'ANNOUNCED',
  publication_status publication_status NOT NULL DEFAULT 'DRAFT',
  started_on DATE,
  ended_on DATE,
  last_verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE initiative_translations (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en','pt-BR')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem_statement TEXT,
  goals TEXT,
  results TEXT,
  PRIMARY KEY (initiative_id, locale)
);

CREATE TABLE article_sources (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (article_id, source_id)
);
CREATE TABLE article_topics (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, topic_id)
);
CREATE TABLE initiative_sources (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  PRIMARY KEY (initiative_id, source_id)
);
CREATE TABLE initiative_topics (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (initiative_id, topic_id)
);
CREATE TABLE article_initiatives (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, initiative_id)
);

CREATE TABLE source_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'HTML_INDEX' CHECK (kind IN ('HTML_INDEX','RSS','ATOM','API')),
  source_type source_type NOT NULL DEFAULT 'PRIMARY',
  reliability reliability_level NOT NULL DEFAULT 'A',
  language TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  poll_interval_minutes INTEGER NOT NULL DEFAULT 360 CHECK (poll_interval_minutes >= 60),
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','SUCCESS','PARTIAL','FAILED')),
  feeds_checked INTEGER NOT NULL DEFAULT 0,
  items_discovered INTEGER NOT NULL DEFAULT 0,
  items_inserted INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE ingestion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID REFERENCES source_feeds(id) ON DELETE CASCADE,
  run_id UUID REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  canonical_url TEXT UNIQUE NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  relevance_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (relevance_status IN ('PENDING','RELEVANT','IRRELEVANT','REVIEW')),
  processing_status TEXT NOT NULL DEFAULT 'NEW' CHECK (processing_status IN ('NEW','FETCHED','CLASSIFIED','DRAFTED','DISMISSED','ERROR')),
  classification JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX articles_published_idx ON articles (status, published_at DESC);
CREATE INDEX initiatives_status_idx ON initiatives (status, updated_at DESC);
CREATE INDEX initiatives_publication_idx ON initiatives (publication_status, updated_at DESC);
CREATE INDEX initiatives_origin_url_idx ON initiatives ((metadata ->> 'source_match_url'));
CREATE INDEX sources_type_reliability_idx ON sources (source_type, reliability);
CREATE INDEX source_feeds_active_idx ON source_feeds (is_active, last_checked_at);
CREATE INDEX ingestion_items_queue_idx ON ingestion_items (processing_status, relevance_status, discovered_at DESC);
CREATE INDEX ingestion_items_feed_idx ON ingestion_items (feed_id, discovered_at DESC);
