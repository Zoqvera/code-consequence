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
  started_on DATE,
  ended_on DATE,
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

CREATE INDEX articles_published_idx ON articles (status, published_at DESC);
CREATE INDEX initiatives_status_idx ON initiatives (status, updated_at DESC);
CREATE INDEX sources_type_reliability_idx ON sources (source_type, reliability);
