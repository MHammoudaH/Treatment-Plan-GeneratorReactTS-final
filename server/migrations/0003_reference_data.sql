-- 0003_reference_data.sql
-- Small reference/lookup tables the operational model points at. Rows (except
-- patient_statuses) are managed later by the app/CLI; here they start empty.

-- Patient lifecycle vocabulary. `users.role` uses the same lookup-table pattern.
CREATE TABLE patient_statuses (
  key               text PRIMARY KEY,
  label             text NOT NULL,
  sort_order        integer NOT NULL DEFAULT 0,
  is_terminal       boolean NOT NULL DEFAULT false,
  triggers_planning boolean NOT NULL DEFAULT false
);
INSERT INTO patient_statuses (key, label, sort_order, is_terminal, triggers_planning) VALUES
  ('lead',         'Lead',         0, false, false),
  ('quoted',       'Quoted',       1, false, false),
  ('confirmed',    'Confirmed',    2, false, true),
  ('scheduled',    'Scheduled',    3, false, true),
  ('arrived',      'Arrived',      4, false, true),
  ('in_treatment', 'In treatment', 5, false, true),
  ('completed',    'Completed',    6, true,  false),
  ('cancelled',    'Cancelled',    7, true,  false),
  ('no_show',      'No show',      8, true,  false);

CREATE TABLE clinics (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  city       text,
  country    char(2),
  address    text,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clinics_name_city_key ON clinics (lower(name), coalesce(lower(city), ''));
CREATE TRIGGER clinics_set_updated_at BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE hotels (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  city       text,
  country    char(2),
  address    text,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hotels_name_city_key ON hotels (lower(name), coalesce(lower(city), ''));
CREATE TRIGGER hotels_set_updated_at BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Mirrors the crown/implant/procedure catalog in src/data/pricing.ts.
-- Treatment-plan line items may still be free-text (procedure_code is nullable).
CREATE TABLE procedure_catalog (
  code          text PRIMARY KEY,
  name          text NOT NULL,
  modality      text NOT NULL CHECK (modality IN ('dental', 'plastic_surgery', 'shared')),
  category      text,
  default_price numeric(14,2) CHECK (default_price IS NULL OR default_price >= 0),
  currency      char(3) NOT NULL DEFAULT 'USD',
  unit          text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER procedure_catalog_set_updated_at BEFORE UPDATE ON procedure_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
