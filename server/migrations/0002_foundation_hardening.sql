-- 0002_foundation_hardening.sql
-- Shared helpers + hardening of the foundation tables ahead of the operational
-- model: consistent updated_at, soft-delete columns, and safer delete rules.
--
-- (uuid defaults use gen_random_uuid(), built into PostgreSQL core since 13 —
--  no pgcrypto/uuid-ossp extension required.)

-- One trigger function, reused by every table that carries updated_at.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- users ---------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN is_active  boolean NOT NULL DEFAULT true,
  ADD COLUMN phone      text,
  ADD COLUMN job_title  text;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- email uniqueness now ignores soft-deleted rows (address can be reused).
DROP INDEX IF EXISTS users_email_lower_key;
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX users_active_idx ON users (is_active) WHERE deleted_at IS NULL;

-- teams ---------------------------------------------------------------
ALTER TABLE teams
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at timestamptz;

CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP INDEX IF EXISTS teams_name_lower_key;
CREATE UNIQUE INDEX teams_name_lower_key ON teams (lower(name)) WHERE deleted_at IS NULL;

-- A team must not silently lose its leader once patients are scoped to it.
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_leader_user_id_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_leader_user_id_fkey
  FOREIGN KEY (leader_user_id) REFERENCES users(id) ON DELETE RESTRICT;
