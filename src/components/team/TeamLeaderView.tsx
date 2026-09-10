import { useEffect, useState } from 'react';
import {
  fetchMyTeams,
  fetchTeamMembers,
  ROLE_LABELS,
  type ApiError,
  type Team,
  type TeamMember,
} from '../../lib/api';

/**
 * Team Leader landing — foundation only.
 *
 * Confirms the role wiring end to end (the server gates `/api/team*` on the
 * team_leader role) and shows the team roster. The activity feed, patient
 * assignment, price monitoring and confirmation tracking are future work.
 */
export function TeamLeaderView({ onOpenCoordinator }: { onOpenCoordinator: () => void }) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMyTeams(), fetchTeamMembers()])
      .then(([t, m]) => {
        if (cancelled) return;
        setTeams(t.teams);
        setMembers(m.members);
      })
      .catch((err: ApiError) => {
        if (!cancelled) setError(err?.message ?? 'Could not load team data.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="wizard-step">
      <span className="eyebrow">DUTY Clinic · Team Leader</span>
      <h2>Your team</h2>
      <p className="step-intro">
        Team visibility is being built. For now this confirms your team membership and roster; the
        coordinator activity feed, plan status and confirmation tracking come next.
      </p>

      {error && <p className="auth-error" role="alert">{error}</p>}

      {teams && (
        <div style={{ marginBlock: '1rem' }}>
          <h3>Teams you manage ({teams.length})</h3>
          {teams.length === 0 ? (
            <p>No team is assigned to you yet. An administrator sets this with the <code>npm run team</code> CLI.</p>
          ) : (
            <ul>
              {teams.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong> <span className="muted">({t.kind})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {members && (
        <div style={{ marginBlock: '1rem' }}>
          <h3>Coordinators ({members.length})</h3>
          {members.length === 0 ? (
            <p>No coordinators are assigned to your team(s) yet.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name || '—'}</td>
                    <td>{m.email}</td>
                    <td>{ROLE_LABELS[m.role] ?? m.role}</td>
                    <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!teams && !members && !error && <p>Loading…</p>}

      <button type="button" className="secondary" onClick={onOpenCoordinator} style={{ marginTop: '1rem' }}>
        Open coordinator tools
      </button>
    </section>
  );
}
