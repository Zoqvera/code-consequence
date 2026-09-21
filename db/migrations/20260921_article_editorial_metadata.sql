ALTER TABLE articles
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS articles_origin_url_idx
ON articles ((metadata ->> 'source_match_url'));
