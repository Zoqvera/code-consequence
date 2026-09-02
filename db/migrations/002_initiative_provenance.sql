ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS initiatives_origin_url_idx
  ON initiatives ((metadata ->> 'source_match_url'));
