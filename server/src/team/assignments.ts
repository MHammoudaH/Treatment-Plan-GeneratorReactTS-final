/**
 * Email pre-assignments (`team_email_assignments`, migration 0012).
 *
 * An admin seeds "this email leads team T" / "this email is a member of team T"
 * (in a migration or with `npm run team -- assign`) before the person has an
 * account. The first time that email signs up or logs in, the assignment is
 * applied — promoted to team_leader and set as the team's leader, or added as a
 * member — and stamped `applied_at` so it never runs twice.
 *
 * This is the only path besides the CLI that can grant team_leader, and it is
 * driven purely by admin-seeded rows: nothing in a request body can create one.
 */
import { withTransaction } from '../db.js';
import { ROLES } from '../auth/roles.js';

/** Applies any pending assignments for this user. Returns true when something changed. */
export async function applyEmailAssignments(userId: number, email: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: number; team_id: number; as_leader: boolean }>(
      `SELECT id, team_id, as_leader FROM team_email_assignments
        WHERE email = $1 AND applied_at IS NULL
        ORDER BY id FOR UPDATE`,
      [email.trim().toLowerCase()],
    );
    if (rows.length === 0) return false;

    for (const row of rows) {
      if (row.as_leader) {
        // Promote a coordinator; never demote a planning manager.
        await client.query(`UPDATE users SET role = $1 WHERE id = $2 AND role = $3`, [ROLES.TEAM_LEADER, userId, ROLES.COORDINATOR]);
        await client.query('UPDATE teams SET leader_user_id = $1 WHERE id = $2', [userId, row.team_id]);
      } else {
        await client.query(
          `INSERT INTO team_memberships (team_id, user_id) VALUES ($1, $2) ON CONFLICT (team_id, user_id) DO NOTHING`,
          [row.team_id, userId],
        );
        // Placed in a team directly — any open join request is now moot.
        await client.query(`UPDATE team_join_requests SET status = 'cancelled', decided_at = now() WHERE user_id = $1 AND status = 'pending'`, [
          userId,
        ]);
      }
      await client.query('UPDATE team_email_assignments SET applied_at = now() WHERE id = $1', [row.id]);
    }
    return true;
  });
}
