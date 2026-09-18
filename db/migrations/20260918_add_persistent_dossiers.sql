CREATE TABLE IF NOT EXISTS dossier_profiles (
  article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  problem_statement_en TEXT NOT NULL,
  problem_statement_pt_br TEXT NOT NULL,
  scope_note_en TEXT,
  scope_note_pt_br TEXT,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dossier_countries (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  country_code CHAR(2) REFERENCES countries(code),
  PRIMARY KEY (article_id, country_code)
);

CREATE TABLE IF NOT EXISTS dossier_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  label_en TEXT NOT NULL,
  label_pt_br TEXT NOT NULL,
  value_text TEXT NOT NULL,
  unit TEXT,
  observed_on DATE,
  source_id UUID NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dossier_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title_en TEXT NOT NULL,
  title_pt_br TEXT NOT NULL,
  summary_en TEXT,
  summary_pt_br TEXT,
  source_id UUID NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dossier_legislation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  jurisdiction_en TEXT NOT NULL,
  jurisdiction_pt_br TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_pt_br TEXT NOT NULL,
  status_en TEXT,
  status_pt_br TEXT,
  enacted_on DATE,
  source_id UUID NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS dossier_indicators_article_idx
  ON dossier_indicators (article_id, display_order, observed_on);

CREATE INDEX IF NOT EXISTS dossier_timeline_article_idx
  ON dossier_timeline_events (article_id, event_date, display_order);

CREATE INDEX IF NOT EXISTS dossier_legislation_article_idx
  ON dossier_legislation (article_id, display_order, enacted_on);
