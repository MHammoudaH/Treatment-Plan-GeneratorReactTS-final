-- 0012_team_performance.sql
-- Team leaders, join requests, targets and the performance leaderboards.
--
-- Performance is measured inside the app only (no Zoho): "quotes sent" and
-- "follow-up notes" are counted from patient_record_entries (0011) by author.

-- Pre-assignment by email: lets an admin seed "X leads team T" / "Y is in team T"
-- before X or Y have signed up. Applied automatically at signup/login (see
-- server/src/team/assignments.ts), then stamped with applied_at.
CREATE TABLE team_email_assignments (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
  team_id     integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  as_leader   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  applied_at  timestamptz
);
CREATE UNIQUE INDEX team_email_assignments_key ON team_email_assignments (email, team_id);
CREATE INDEX team_email_assignments_pending_idx ON team_email_assignments (email) WHERE applied_at IS NULL;

-- A coordinator asks to join a team; that team's leader approves or declines.
CREATE TABLE team_join_requests (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  decided_at  timestamptz,
  decided_by  integer REFERENCES users(id) ON DELETE SET NULL
);
-- At most one open request per user (a coordinator belongs to one team at a time).
CREATE UNIQUE INDEX team_join_requests_one_pending ON team_join_requests (user_id) WHERE status = 'pending';
CREATE INDEX team_join_requests_team_idx ON team_join_requests (team_id, status);

-- Targets per period. user_id NULL = the whole team's target.
CREATE TABLE team_targets (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id        integer REFERENCES users(id) ON DELETE CASCADE,
  period_type    text NOT NULL CHECK (period_type IN ('month', 'quarter')),
  -- First day of the month / quarter.
  period_start   date NOT NULL,
  quotes_target  integer CHECK (quotes_target IS NULL OR quotes_target >= 0),
  notes_target   integer CHECK (notes_target IS NULL OR notes_target >= 0),
  set_by         integer REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_targets_period_start_chk CHECK (
    extract(day FROM period_start) = 1
    AND (period_type = 'month' OR extract(month FROM period_start) IN (1, 4, 7, 10))
  )
);
CREATE TRIGGER team_targets_set_updated_at BEFORE UPDATE ON team_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- One target per (team, member-or-team, period). COALESCE so the team row (NULL) is unique too.
CREATE UNIQUE INDEX team_targets_key ON team_targets (team_id, COALESCE(user_id, 0), period_type, period_start);

-- Leaderboard hot path: entries by author and time.
CREATE INDEX patient_record_entries_author_idx ON patient_record_entries (author_id, kind, created_at);
