CREATE TABLE IF NOT EXISTS events (
  external_key text PRIMARY KEY,
  title_en text NOT NULL,
  title_pt_br text NOT NULL,
  summary_en text NOT NULL,
  summary_pt_br text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  starts_at timestamptz,
  event_format text NOT NULL CHECK (event_format IN ('ONLINE', 'IN_PERSON', 'HYBRID')),
  venue text,
  city text,
  country text,
  organizer text NOT NULL,
  participation_en text NOT NULL,
  participation_pt_br text NOT NULL,
  event_url text NOT NULL,
  registration_url text,
  source_name text NOT NULL,
  source_url text NOT NULL,
  is_free boolean,
  published boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS events_start_date_idx ON events (start_date);
CREATE INDEX IF NOT EXISTS events_last_seen_at_idx ON events (last_seen_at);

CREATE TABLE IF NOT EXISTS event_scan_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'ERROR')),
  sources_scanned integer NOT NULL DEFAULT 0,
  events_found integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS event_scan_runs_completed_idx ON event_scan_runs (completed_at DESC);
