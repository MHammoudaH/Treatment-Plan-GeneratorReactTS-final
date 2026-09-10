-- 0005_treatment_plans.sql
-- patients -> treatment_plans -> (treatment_plan_procedures, treatment_visits)
--
-- A patient may have many plans (revisions, both modalities, repeat trips).
-- treatment_plan  = the proposed/priced set of work.
-- treatment_visit = a scheduled stage/trip; logistics rows can pin to a visit.

CREATE TABLE treatment_plans (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id       uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id      integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  modality        text NOT NULL CHECK (modality IN ('dental', 'plastic_surgery')),
  title           text,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled')),
  version         integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_current      boolean NOT NULL DEFAULT true,
  currency        char(3) NOT NULL DEFAULT 'USD',
  estimated_total numeric(14,2) CHECK (estimated_total IS NULL OR estimated_total >= 0),
  payment_method  text CHECK (payment_method IN ('visit_payments', 'installments')),
  tooth_plan      jsonb,          -- FDI implant/crown map from the dental wizard
  notes           text,
  created_by      integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by     integer REFERENCES users(id) ON DELETE RESTRICT,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (id, patient_id)         -- composite-FK target (see treatment_visits, payments)
);
CREATE TRIGGER treatment_plans_set_updated_at BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX treatment_plans_public_id_key ON treatment_plans (public_id);
CREATE UNIQUE INDEX treatment_plans_current_key
  ON treatment_plans (patient_id, modality) WHERE is_current AND deleted_at IS NULL;
CREATE INDEX treatment_plans_patient_idx ON treatment_plans (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX treatment_plans_status_idx ON treatment_plans (status) WHERE deleted_at IS NULL;

CREATE TABLE treatment_visits (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id         integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  treatment_plan_id  integer,
  clinic_id          integer REFERENCES clinics(id) ON DELETE RESTRICT,
  sequence_no        integer NOT NULL DEFAULT 1 CHECK (sequence_no >= 1),
  title              text,
  status             text NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned', 'scheduled', 'in_progress', 'done', 'cancelled')),
  planned_start_date date,
  planned_end_date   date,
  actual_start_date  date,
  actual_end_date    date,
  notes              text,
  created_by         integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  -- the visit's plan (if any) must belong to the same patient
  CONSTRAINT treatment_visits_plan_fk
    FOREIGN KEY (treatment_plan_id, patient_id)
    REFERENCES treatment_plans (id, patient_id) ON DELETE RESTRICT,
  CONSTRAINT treatment_visits_date_chk
    CHECK (planned_end_date IS NULL OR planned_start_date IS NULL
           OR planned_end_date >= planned_start_date),
  UNIQUE (id, patient_id)         -- composite-FK target (payments / flights / hotels / transfers)
);
CREATE TRIGGER treatment_visits_set_updated_at BEFORE UPDATE ON treatment_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX treatment_visits_seq_key
  ON treatment_visits (patient_id, sequence_no) WHERE deleted_at IS NULL;
CREATE INDEX treatment_visits_patient_idx ON treatment_visits (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX treatment_visits_plan_idx ON treatment_visits (treatment_plan_id);
CREATE INDEX treatment_visits_clinic_idx ON treatment_visits (clinic_id);
CREATE INDEX treatment_visits_schedule_idx
  ON treatment_visits (planned_start_date, status) WHERE deleted_at IS NULL;

CREATE TABLE treatment_plan_procedures (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  treatment_plan_id integer NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  procedure_code    text REFERENCES procedure_catalog(code) ON DELETE SET NULL,
  name              text NOT NULL,
  category          text,
  quantity          numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit              text,
  unit_price        numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  currency          char(3) NOT NULL DEFAULT 'USD',
  line_total        numeric(14,2),
  area_ref          jsonb,        -- tooth numbers / plastic-surgery area
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER treatment_plan_procedures_set_updated_at BEFORE UPDATE ON treatment_plan_procedures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX treatment_plan_procedures_plan_idx
  ON treatment_plan_procedures (treatment_plan_id, sort_order);
