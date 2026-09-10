-- 0001_init.sql
-- Baseline schema: exactly what the old db.ts `initDb()` created (roles, users,
-- teams, team_memberships, zoho_connection, oauth_states) plus the seeded roles
-- and the users.role foreign key.
--
-- Every statement is guarded (IF NOT EXISTS / ON CONFLICT / DO block) so this is
-- a safe no-op against a database that the previous boot-time initDb() had
-- already populated, and a full create against a fresh database.

CREATE TABLE IF NOT EXISTS roles (
  key        text PRIMARY KEY,
  label      text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,
  name          text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'coordinator',
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'coordinator';
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS teams (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           text NOT NULL,
  kind           text NOT NULL DEFAULT 'coordinator' CHECK (kind IN ('coordinator', 'planning')),
  leader_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS teams_name_lower_key ON teams (lower(name));
CREATE INDEX IF NOT EXISTS teams_kind_idx ON teams (kind);
CREATE INDEX IF NOT EXISTS teams_leader_idx ON teams (leader_user_id);

CREATE TABLE IF NOT EXISTS team_memberships (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS team_memberships_user_idx ON team_memberships (user_id);
CREATE INDEX IF NOT EXISTS team_memberships_team_idx ON team_memberships (team_id);

-- Single-row table (id = 1) holding the org-wide Zoho CRM connection.
CREATE TABLE IF NOT EXISTS zoho_connection (
  id            integer PRIMARY KEY CHECK (id = 1),
  refresh_token text NOT NULL,
  access_token  text,
  expires_at    bigint NOT NULL DEFAULT 0,  -- epoch ms
  api_domain    text,
  scope         text,
  connected_by  text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Short-lived OAuth "state" values for CSRF protection on the consent round-trip.
CREATE TABLE IF NOT EXISTS oauth_states (
  state      text PRIMARY KEY,
  user_id    integer,
  created_at bigint NOT NULL  -- epoch ms
);

-- Seed the role lookup (kept in sync with server/src/auth/roles.ts).
INSERT INTO roles (key, label, sort_order) VALUES
  ('coordinator',      'Coordinator',      0),
  ('team_leader',      'Team Leader',      1),
  ('planning_manager', 'Planning Manager', 2)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- users.role -> roles(key), added after the seed so existing rows validate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES roles(key);
  END IF;
END $$;
