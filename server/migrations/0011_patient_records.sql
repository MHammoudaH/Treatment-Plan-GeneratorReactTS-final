-- 0011_patient_records.sql
-- Per-coordinator patient follow-up records ("My Patients").
--
-- A coordinator ticks "Save this patient to my records" when generating a PDF;
-- the patient name + a snapshot of the quoted plan/price is saved, owned by that
-- coordinator. Afterwards the coordinator adds free-text follow-up notes over
-- time. The record's page shows one timeline: the quote(s), then every note.
--
-- Deliberately separate from `patients` (0004): that table is the future
-- clinic-wide CRM record (team, passport, status lifecycle) and is not wired to
-- anything yet. These rows are a coordinator's own lightweight follow-up list.

CREATE TABLE patient_records (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coordinator_id  integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_name    text NOT NULL CHECK (length(btrim(patient_name)) BETWEEN 1 AND 200),
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Bumped whenever a timeline entry is added, so "recently active" sorts first.
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TRIGGER patient_records_set_updated_at BEFORE UPDATE ON patient_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- "My Patients" list: one coordinator's live records, most recently active first.
CREATE INDEX patient_records_coordinator_idx
  ON patient_records (coordinator_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Timeline: append-only. `quote` rows hold the snapshot of what was quoted (the
-- plan + price per option, currency, PDF type) exactly as the PDF showed it;
-- `note` rows hold the coordinator's free text.
CREATE TABLE patient_record_entries (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id   integer NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  author_id   integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind        text NOT NULL CHECK (kind IN ('quote', 'note')),
  -- Optional label for a note, so a long timeline is easy to scan.
  topic       text CHECK (topic IN ('discussion', 'objection', 'price', 'next_step')),
  body        text CHECK (body IS NULL OR length(body) <= 10000),
  quote       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_record_entries_shape_chk CHECK (
    (kind = 'quote' AND quote IS NOT NULL AND topic IS NULL)
    OR (kind = 'note' AND quote IS NULL AND body IS NOT NULL AND length(btrim(body)) > 0)
  )
);

CREATE INDEX patient_record_entries_timeline_idx
  ON patient_record_entries (record_id, created_at, id);
