-- 0013_patient_record_plans.sql
-- Re-open a saved quote and update it instead of starting from scratch.
--
-- A quote entry now also keeps the editable plan it was generated from (the dental
-- wizard's options / products / prices / currency / notes, or the plastic module's
-- selected procedures / hotel / currency / overrides). "Open & update" loads it back
-- into the wizard; generating the PDF again adds an "Updated quote" to the same record.
-- Uploaded photos are not stored (they stay in the coordinator's browser only).
-- Quotes saved before this migration simply have no plan (NULL) and can't be re-opened.

ALTER TABLE patient_record_entries
  ADD COLUMN plan jsonb,
  ADD CONSTRAINT patient_record_entries_plan_chk CHECK (
    plan IS NULL OR (kind = 'quote' AND jsonb_typeof(plan) = 'object')
  );
