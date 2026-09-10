-- 0006_payments.sql
-- A SIMPLE record that money was paid. This is deliberately NOT an accounting
-- system: no payment_allocations, no ledger, no invoices, no reconciliation, no
-- gateway integration, no computed balances. One row = one payment event.
--
-- If treatment_plan_id is set, the payment belongs to that plan; otherwise it is
-- a patient-level payment record. treatment_visit_id is an optional finer link.

CREATE TABLE payments (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id         integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  treatment_plan_id  integer,
  treatment_visit_id integer,

  amount             numeric(14,2) NOT NULL CHECK (amount > 0),
  currency           char(3) NOT NULL,
  payment_type       text NOT NULL
                     CHECK (payment_type IN ('deposit', 'balance', 'installment', 'refund', 'other')),
  method             text CHECK (method IN
                       ('bank_transfer', 'credit_card', 'cash', 'stripe', 'paypal', 'wise', 'other')),
  status             text NOT NULL DEFAULT 'received'
                     CHECK (status IN ('pending', 'received', 'failed', 'cancelled', 'refunded')),
  payment_date       date,
  reference_number   text,
  notes              text,

  recorded_by        integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Payments are treated as immutable. A mistake is corrected with a new row or
  -- an explicit void (kept for auditability) rather than editing amounts.
  voided_at          timestamptz,
  voided_by          integer REFERENCES users(id) ON DELETE RESTRICT,
  void_reason        text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_plan_fk
    FOREIGN KEY (treatment_plan_id, patient_id)
    REFERENCES treatment_plans (id, patient_id) ON DELETE RESTRICT,
  CONSTRAINT payments_visit_fk
    FOREIGN KEY (treatment_visit_id, patient_id)
    REFERENCES treatment_visits (id, patient_id) ON DELETE RESTRICT
);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX payments_patient_idx     ON payments (patient_id);
CREATE INDEX payments_plan_idx        ON payments (treatment_plan_id);
CREATE INDEX payments_visit_idx       ON payments (treatment_visit_id);
CREATE INDEX payments_status_idx      ON payments (status);
CREATE INDEX payments_type_idx        ON payments (payment_type);
CREATE INDEX payments_date_idx        ON payments (payment_date);
CREATE INDEX payments_recorded_by_idx ON payments (recorded_by);

-- Payment proof documents attach via document_links
-- (entity_type = 'payment', link_role = 'proof') — see 0007.
