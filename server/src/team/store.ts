/**
 * Team + membership data access.
 *
 * Model (see also `auth/roles.ts`):
 *
 *   teams              one row per team. `kind` = 'coordinator' | 'planning'.
 *                      `leader_user_id` -> the managing user (a team_leader for a
 *                      coordinator team, a planning_manager for the planning team).
 *   team_memberships   many-to-many users <-> teams, UNIQUE(team_id, user_id).
 *
 * This is intentionally minimal: enough structure for
 * `Team Leader -> Team -> Coordinators` and `Planning Manager -> Planning Team`
 * to be queried and enforced now, and to hang activity/assignment tables off
 * later without reshaping it.
 */
import { query, queryOne, type TeamRow } from '../db.js';
import { type TeamKind } from '../auth/roles.js';

export interface Team {
  id: number;
  name: string;
  kind: string;
  leaderUserId: number | null;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    leaderUserId: row.leader_user_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/** Teams the given user manages (is `leader_user_id` of). */
export async function getTeamsLedBy(userId: number): Promise<Team[]> {
  const { rows } = await query<TeamRow>(
    'SELECT * FROM teams WHERE leader_user_id = $1 ORDER BY lower(name)',
    [userId],
  );
  return rows.map(toTeam);
}

/** Teams the given user is a member of. */
export async function getTeamsForMember(userId: number): Promise<Team[]> {
  const { rows } = await query<TeamRow>(
    `SELECT t.* FROM teams t
       JOIN team_memberships m ON m.team_id = t.id
      WHERE m.user_id = $1
      ORDER BY lower(t.name)`,
    [userId],
  );
  return rows.map(toTeam);
}

export async function getTeamById(teamId: number): Promise<Team | null> {
  const row = await queryOne<TeamRow>('SELECT * FROM teams WHERE id = $1', [teamId]);
  return row ? toTeam(row) : null;
}

/** Members of a team, with their user record fields. */
export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const { rows } = await query<{
    id: number;
    email: string;
    name: string;
    role: string;
    joined_at: Date | string;
  }>(
    `SELECT u.id, u.email, u.name, u.role, m.created_at AS joined_at
       FROM team_memberships m
       JOIN users u ON u.id = m.user_id
      WHERE m.team_id = $1
      ORDER BY lower(u.name), u.id`,
    [teamId],
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    joinedAt: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
  }));
}

/** Members across every team the given leader manages (de-duplicated). */
export async function getMembersForLeader(userId: number): Promise<TeamMember[]> {
  const { rows } = await query<{
    id: number;
    email: string;
    name: string;
    role: string;
    joined_at: Date | string;
  }>(
    `SELECT DISTINCT ON (u.id) u.id, u.email, u.name, u.role, m.created_at AS joined_at
       FROM teams t
       JOIN team_memberships m ON m.team_id = t.id
       JOIN users u ON u.id = m.user_id
      WHERE t.leader_user_id = $1
      ORDER BY u.id, m.created_at`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    joinedAt: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
  }));
}

export async function listTeams(): Promise<Team[]> {
  const { rows } = await query<TeamRow>('SELECT * FROM teams ORDER BY kind, lower(name)');
  return rows.map(toTeam);
}

export async function createTeam(input: {
  name: string;
  kind: TeamKind;
  leaderUserId?: number | null;
}): Promise<Team> {
  const row = await queryOne<TeamRow>(
    'INSERT INTO teams (name, kind, leader_user_id) VALUES ($1, $2, $3) RETURNING *',
    [input.name.trim(), input.kind, input.leaderUserId ?? null],
  );
  if (!row) throw new Error('Failed to create team.');
  return toTeam(row);
}

export async function setTeamLeader(teamId: number, leaderUserId: number | null): Promise<Team | null> {
  const row = await queryOne<TeamRow>(
    'UPDATE teams SET leader_user_id = $1 WHERE id = $2 RETURNING *',
    [leaderUserId, teamId],
  );
  return row ? toTeam(row) : null;
}

/** Add a user to a team. Idempotent (ON CONFLICT DO NOTHING on the unique pair). */
export async function addTeamMember(teamId: number, userId: number): Promise<void> {
  await query(
    `INSERT INTO team_memberships (team_id, user_id) VALUES ($1, $2)
     ON CONFLICT (team_id, user_id) DO NOTHING`,
    [teamId, userId],
  );
}

export async function removeTeamMember(teamId: number, userId: number): Promise<void> {
  await query('DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
}

export async function findTeamByName(name: string): Promise<Team | null> {
  const row = await queryOne<TeamRow>('SELECT * FROM teams WHERE lower(name) = $1', [
    name.trim().toLowerCase(),
  ]);
  return row ? toTeam(row) : null;
}
