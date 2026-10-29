/**
 * Team performance — leaderboards, targets and join requests (migration 0012).
 *
 * Measures are counted inside the app only (no Zoho):
 *   quotes  = quote entries a member saved to My Patients in the period (patient_record_entries)
 *   notes   = follow-up notes a member added in the period
 * Only coordinator teams take part. A team's numbers are the sum of its members'.
 */
import { query, queryOne, withTransaction } from '../db.js';
import { CLINIC_TIME_ZONE, type Period, type PeriodType } from './periods.js';

export interface Target {
  quotes: number | null;
  notes: number | null;
}

export interface MemberStats {
  userId: number;
  name: string;
  email: string;
  quotes: number;
  notes: number;
  target: Target;
}

export interface TeamBoard {
  id: number;
  name: string;
  leaderId: number | null;
  leaderName: string | null;
  memberCount: number;
  quotes: number;
  notes: number;
  /** Quotes per member — what teams of different sizes are ranked by. */
  quotesPerMember: number;
  target: Target;
  /** True when the viewer belongs to / leads this team: `members` is filled in. */
  isMine: boolean;
  /** Each member's numbers, best first — only for the viewer's own team(s). */
  members: MemberStats[];
}

const displayName = (alias: string) => `COALESCE(NULLIF(${alias}.name, ''), ${alias}.email)`;

/** Every coordinator team's numbers for `period`, best first; member detail for the viewer's teams. */
export async function getBoard(viewerId: number, period: Period): Promise<TeamBoard[]> {
  const { rows: teams } = await query<{ id: number; name: string; leader_user_id: number | null; leader_name: string | null }>(
    `SELECT t.id, t.name, t.leader_user_id, ${displayName('l')} AS leader_name
       FROM teams t LEFT JOIN users l ON l.id = t.leader_user_id
      WHERE t.kind = 'coordinator'
      ORDER BY lower(t.name)`,
  );

  const { rows: members } = await query<{ team_id: number; user_id: number; name: string; email: string; quotes: number; notes: number }>(
    `SELECT m.team_id, u.id AS user_id, ${displayName('u')} AS name, u.email,
            count(e.id) FILTER (WHERE e.kind = 'quote')::int AS quotes,
            count(e.id) FILTER (WHERE e.kind = 'note')::int AS notes
       FROM team_memberships m
       JOIN teams t ON t.id = m.team_id AND t.kind = 'coordinator'
       JOIN users u ON u.id = m.user_id
       LEFT JOIN patient_record_entries e
              ON e.author_id = u.id
             AND e.created_at >= ($1::date)::timestamp AT TIME ZONE '${CLINIC_TIME_ZONE}'
             AND e.created_at <  ($2::date)::timestamp AT TIME ZONE '${CLINIC_TIME_ZONE}'
      GROUP BY m.team_id, u.id, u.name, u.email`,
    [period.start, period.end],
  );

  const { rows: targets } = await query<{ team_id: number; user_id: number | null; quotes_target: number | null; notes_target: number | null }>(
    `SELECT team_id, user_id, quotes_target, notes_target FROM team_targets WHERE period_type = $1 AND period_start = $2`,
    [period.type, period.start],
  );
  const targetFor = (teamId: number, userId: number | null): Target => {
    const t = targets.find((row) => row.team_id === teamId && row.user_id === userId);
    return { quotes: t?.quotes_target ?? null, notes: t?.notes_target ?? null };
  };

  const boards = teams.map((team): TeamBoard => {
    const own = members.filter((m) => m.team_id === team.id);
    const isMine = team.leader_user_id === viewerId || own.some((m) => m.user_id === viewerId);
    const quotes = own.reduce((sum, m) => sum + m.quotes, 0);
    const notes = own.reduce((sum, m) => sum + m.notes, 0);
    return {
      id: team.id,
      name: team.name,
      leaderId: team.leader_user_id,
      leaderName: team.leader_name,
      memberCount: own.length,
      quotes,
      notes,
      quotesPerMember: own.length ? Math.round((quotes / own.length) * 10) / 10 : 0,
      target: targetFor(team.id, null),
      isMine,
      members: isMine
        ? own
            .map((m) => ({ userId: m.user_id, name: m.name, email: m.email, quotes: m.quotes, notes: m.notes, target: targetFor(team.id, m.user_id) }))
            .sort((a, b) => b.quotes - a.quotes || b.notes - a.notes || a.name.localeCompare(b.name))
        : [],
    };
  });
  return boards.sort((a, b) => b.quotesPerMember - a.quotesPerMember || b.quotes - a.quotes || a.name.localeCompare(b.name));
}

// ---- joining a team ------------------------------------------------------------

export interface TeamDirectoryEntry {
  id: number;
  name: string;
  leaderName: string | null;
  memberCount: number;
}

export interface MyTeamStatus {
  teams: TeamDirectoryEntry[];
  /** Coordinator teams the viewer is a member of. */
  memberOf: number[];
  /** Teams the viewer leads. */
  leads: number[];
  pendingRequest: { id: number; teamId: number; createdAt: string } | null;
}

export async function getMyTeamStatus(userId: number): Promise<MyTeamStatus> {
  const { rows: teams } = await query<{ id: number; name: string; leader_user_id: number | null; leader_name: string | null; member_count: number }>(
    `SELECT t.id, t.name, t.leader_user_id, ${displayName('l')} AS leader_name,
            (SELECT count(*)::int FROM team_memberships m WHERE m.team_id = t.id) AS member_count
       FROM teams t LEFT JOIN users l ON l.id = t.leader_user_id
      WHERE t.kind = 'coordinator'
      ORDER BY lower(t.name)`,
  );
  const { rows: memberOf } = await query<{ team_id: number }>(
    `SELECT m.team_id FROM team_memberships m JOIN teams t ON t.id = m.team_id AND t.kind = 'coordinator' WHERE m.user_id = $1`,
    [userId],
  );
  const pending = await queryOne<{ id: number; team_id: number; created_at: Date }>(
    `SELECT id, team_id, created_at FROM team_join_requests WHERE user_id = $1 AND status = 'pending'`,
    [userId],
  );
  return {
    teams: teams.map((t) => ({ id: t.id, name: t.name, leaderName: t.leader_name, memberCount: t.member_count })),
    memberOf: memberOf.map((r) => r.team_id),
    leads: teams.filter((t) => t.leader_user_id === userId).map((t) => t.id),
    pendingRequest: pending ? { id: pending.id, teamId: pending.team_id, createdAt: pending.created_at.toISOString() } : null,
  };
}

export type JoinResult = 'ok' | 'no_such_team' | 'already_member' | 'is_leader';

/** Opens a join request (replacing any other open request of this user). */
export async function requestToJoin(userId: number, teamId: number): Promise<JoinResult> {
  return withTransaction(async (client) => {
    const team = await client.query<{ leader_user_id: number | null }>(`SELECT leader_user_id FROM teams WHERE id = $1 AND kind = 'coordinator'`, [teamId]);
    if (team.rowCount === 0) return 'no_such_team';
    if (team.rows[0].leader_user_id === userId) return 'is_leader';
    const member = await client.query(
      `SELECT 1 FROM team_memberships m JOIN teams t ON t.id = m.team_id AND t.kind = 'coordinator' WHERE m.user_id = $1`,
      [userId],
    );
    if ((member.rowCount ?? 0) > 0) return 'already_member';
    await client.query(`UPDATE team_join_requests SET status = 'cancelled', decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [userId]);
    await client.query(`INSERT INTO team_join_requests (team_id, user_id) VALUES ($1, $2)`, [teamId, userId]);
    return 'ok';
  });
}

export async function cancelJoinRequest(userId: number): Promise<void> {
  await query(`UPDATE team_join_requests SET status = 'cancelled', decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [userId]);
}

// ---- leader actions --------------------------------------------------------------

export interface PendingRequest {
  id: number;
  teamId: number;
  teamName: string;
  userId: number;
  name: string;
  email: string;
  createdAt: string;
}

/** Open join requests for the teams this leader leads. */
export async function getPendingRequests(leaderId: number): Promise<PendingRequest[]> {
  const { rows } = await query<{ id: number; team_id: number; team_name: string; user_id: number; name: string; email: string; created_at: Date }>(
    `SELECT r.id, r.team_id, t.name AS team_name, u.id AS user_id, ${displayName('u')} AS name, u.email, r.created_at
       FROM team_join_requests r
       JOIN teams t ON t.id = r.team_id
       JOIN users u ON u.id = r.user_id
      WHERE r.status = 'pending' AND t.leader_user_id = $1
      ORDER BY r.created_at`,
    [leaderId],
  );
  return rows.map((r) => ({
    id: r.id,
    teamId: r.team_id,
    teamName: r.team_name,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    createdAt: r.created_at.toISOString(),
  }));
}

/** Approve / decline one of this leader's open requests. False when it isn't theirs or isn't open;
 *  'already_member' when the person joined another team in the meantime (request closed). */
export async function decideRequest(leaderId: number, requestId: number, approve: boolean): Promise<boolean | 'already_member'> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ team_id: number; user_id: number }>(
      `SELECT r.team_id, r.user_id FROM team_join_requests r JOIN teams t ON t.id = r.team_id
        WHERE r.id = $1 AND r.status = 'pending' AND t.leader_user_id = $2 FOR UPDATE OF r`,
      [requestId, leaderId],
    );
    if (rows.length === 0) return false;
    // One coordinator team per person: if they were placed in a team meanwhile (e.g. by email
    // assignment), the request can only be declined.
    const inTeam = await client.query(
      `SELECT 1 FROM team_memberships m JOIN teams t ON t.id = m.team_id AND t.kind = 'coordinator' WHERE m.user_id = $1`,
      [rows[0].user_id],
    );
    if (approve && (inTeam.rowCount ?? 0) > 0) {
      await client.query(`UPDATE team_join_requests SET status = 'cancelled', decided_at = now() WHERE id = $1`, [requestId]);
      return 'already_member';
    }
    await client.query(`UPDATE team_join_requests SET status = $1, decided_at = now(), decided_by = $2 WHERE id = $3`, [
      approve ? 'approved' : 'declined',
      leaderId,
      requestId,
    ]);
    if (approve) {
      await client.query(`INSERT INTO team_memberships (team_id, user_id) VALUES ($1, $2) ON CONFLICT (team_id, user_id) DO NOTHING`, [
        rows[0].team_id,
        rows[0].user_id,
      ]);
    }
    return true;
  });
}

export async function leadsTeam(leaderId: number, teamId: number): Promise<boolean> {
  return (await queryOne(`SELECT 1 FROM teams WHERE id = $1 AND leader_user_id = $2`, [teamId, leaderId])) !== null;
}

export async function isTeamMember(teamId: number, userId: number): Promise<boolean> {
  return (await queryOne(`SELECT 1 FROM team_memberships WHERE team_id = $1 AND user_id = $2`, [teamId, userId])) !== null;
}

/** Sets (or clears, with both null) a member's or the whole team's target for one period. */
export async function setTarget(input: {
  leaderId: number;
  teamId: number;
  userId: number | null;
  periodType: PeriodType;
  periodStart: string;
  quotes: number | null;
  notes: number | null;
}): Promise<void> {
  const { leaderId, teamId, userId, periodType, periodStart, quotes, notes } = input;
  if (quotes === null && notes === null) {
    await query(
      `DELETE FROM team_targets WHERE team_id = $1 AND COALESCE(user_id, 0) = COALESCE($2::int, 0) AND period_type = $3 AND period_start = $4`,
      [teamId, userId, periodType, periodStart],
    );
    return;
  }
  await query(
    `INSERT INTO team_targets (team_id, user_id, period_type, period_start, quotes_target, notes_target, set_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (team_id, COALESCE(user_id, 0), period_type, period_start)
     DO UPDATE SET quotes_target = EXCLUDED.quotes_target, notes_target = EXCLUDED.notes_target, set_by = EXCLUDED.set_by`,
    [teamId, userId, periodType, periodStart, quotes, notes, leaderId],
  );
}

export type MoveResult = 'ok' | 'not_your_team' | 'not_a_member' | 'no_such_team';

/**
 * Moves a member from the leader's team to another coordinator team. Coordinators can never
 * change team themselves — only the leader of the team they're in can move (or remove) them.
 */
export async function moveMember(leaderId: number, fromTeamId: number, userId: number, toTeamId: number): Promise<MoveResult> {
  return withTransaction(async (client) => {
    const from = await client.query(`SELECT 1 FROM teams WHERE id = $1 AND leader_user_id = $2`, [fromTeamId, leaderId]);
    if (from.rowCount === 0) return 'not_your_team';
    const to = await client.query(`SELECT 1 FROM teams WHERE id = $1 AND kind = 'coordinator'`, [toTeamId]);
    if (to.rowCount === 0 || toTeamId === fromTeamId) return 'no_such_team';
    const removed = await client.query(`DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2`, [fromTeamId, userId]);
    if (removed.rowCount === 0) return 'not_a_member';
    await client.query(`INSERT INTO team_memberships (team_id, user_id) VALUES ($1, $2) ON CONFLICT (team_id, user_id) DO NOTHING`, [toTeamId, userId]);
    await client.query(`UPDATE team_join_requests SET status = 'cancelled', decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [userId]);
    return 'ok';
  });
}
