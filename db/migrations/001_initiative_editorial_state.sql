ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS publication_status publication_status NOT NULL DEFAULT 'DRAFT';

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS initiatives_publication_idx
  ON initiatives (publication_status, updated_at DESC);
