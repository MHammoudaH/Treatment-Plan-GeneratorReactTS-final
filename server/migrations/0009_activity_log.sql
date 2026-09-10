-- 0009_activity_log.sql
-- Lightweight, append-only audit trail for important operational changes:
-- patient assignment, status changes, treatment-plan changes, logistics changes,
-- role/team changes. Written by the application inside the same transaction as
-- the change. Never updated, never deleted, no soft-delete.

CREATE TABLE activity_log (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id   integer REFERENCES users(id) ON DELETE RESTRICT,    -- null = system action
  actor_role      text,                                              -- role snapshot at the time
  entity_type     text NOT NULL,
  entity_id       integer NOT NULL,
  patient_id      integer REFERENCES patients(id) ON DELETE RESTRICT, -- denormalised for fast timelines
  action          text NOT NULL,                                      -- see ACTIVITY_ACTIONS in domain/status.ts
  previous_status text,
  new_status      text,
  changed_fields  jsonb,                                              -- { field: { from, to } }
  summary         text,
  context         jsonb,                                              -- { request_id, ip, user_agent } (minimal)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_log_entity_idx  ON activity_log (entity_type, entity_id, created_at DESC);
CREATE INDEX activity_log_patient_idx ON activity_log (patient_id, created_at DESC) WHERE patient_id IS NOT NULL;
CREATE INDEX activity_log_actor_idx   ON activity_log (actor_user_id, created_at DESC);
CREATE INDEX activity_log_action_idx  ON activity_log (action, created_at DESC);
