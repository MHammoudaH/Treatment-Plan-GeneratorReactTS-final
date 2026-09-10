-- 0004_patients.sql
-- The patient record + assignment history. One patient is the root every
-- treatment / payment / logistics / document row hangs off.

CREATE TABLE patients (
  id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id               uuid NOT NULL DEFAULT gen_random_uuid(),

  -- identity / passport
  full_name               text NOT NULL,
  passport_name           text,
  passport_number         text,
  nationality             char(2),
  date_of_birth           date,
  gender                  text CHECK (gender IN ('female', 'male', 'other', 'unspecified')),

  -- contact
  phone                   text,
  email                   text,
  preferred_language      text,
  country_of_residence    char(2),

  -- lifecycle
  status                  text NOT NULL DEFAULT 'lead' REFERENCES patient_statuses(key),
  confirmed_at            timestamptz,
  arrival_date            date,
  departure_date          date,

  -- ownership
  assigned_coordinator_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id                 integer NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,

  -- Zoho references (Zoho remains the CRM; these are just pointers)
  zoho_deal_id            text,
  zoho_contact_id         text,
  source                  text,

  notes                   text,

  created_by              integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz,

  CONSTRAINT patients_travel_window_chk
    CHECK (departure_date IS NULL OR arrival_date IS NULL OR departure_date >= arrival_date)
);

CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX patients_public_id_key ON patients (public_id);

-- De-duplication protections. Partial: only enforced once the identifier exists
-- and only among live (non-soft-deleted) rows.
CREATE UNIQUE INDEX patients_zoho_deal_key
  ON patients (zoho_deal_id)
  WHERE zoho_deal_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX patients_passport_key
  ON patients (nationality, upper(passport_number))
  WHERE passport_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX patients_name_dob_idx
  ON patients (lower(full_name), date_of_birth)
  WHERE deleted_at IS NULL;

-- Reporting / scoping hot paths.
CREATE INDEX patients_status_arrival_idx
  ON patients (status, arrival_date) WHERE deleted_at IS NULL;
CREATE INDEX patients_team_idx
  ON patients (team_id) WHERE deleted_at IS NULL;
CREATE INDEX patients_coordinator_idx
  ON patients (assigned_coordinator_id) WHERE deleted_at IS NULL;
CREATE INDEX patients_zoho_contact_idx
  ON patients (zoho_contact_id) WHERE zoho_contact_id IS NOT NULL;

-- Assignment history: who owned a patient, and when. Exactly one row per patient
-- has unassigned_at IS NULL (the current owner, mirrored on patients for speed).
CREATE TABLE patient_assignments (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id     integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  coordinator_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id        integer NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  assigned_by    integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  unassigned_at  timestamptz,
  reason         text
);
CREATE UNIQUE INDEX patient_assignments_active_key
  ON patient_assignments (patient_id) WHERE unassigned_at IS NULL;
CREATE INDEX patient_assignments_coordinator_idx ON patient_assignments (coordinator_id);
CREATE INDEX patient_assignments_patient_idx ON patient_assignments (patient_id);
