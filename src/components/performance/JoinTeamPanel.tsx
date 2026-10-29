import { useEffect, useState } from 'react';
import { cancelJoinRequest, fetchMyTeamStatus, requestToJoinTeam, type ApiError, type MyTeamStatus } from '../../lib/api';

/** For a coordinator who isn't in a team yet: pick a team and ask its leader to approve. */
export function JoinTeamPanel({ onChange }: { onChange?: () => void }) {
  const [status, setStatus] = useState<MyTeamStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMyTeamStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch((err: ApiError) => !cancelled && setError(err?.message ?? 'Could not load teams.'));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setReload((n) => n + 1);
      onChange?.();
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!status) return error ? <p className="error-text">{error}</p> : null;

  const myTeam = status.teams.find((t) => status.memberOf.includes(t.id));
  if (myTeam) {
    return (
      <p className="rule-note">
        You're in <strong>{myTeam.name}</strong>
        {myTeam.leaderName ? ` (led by ${myTeam.leaderName})` : ''}. Only your team leader can move you to another team.
      </p>
    );
  }
  if (status.leads.length > 0) return null; // a leader doesn't join a team

  const pendingTeam = status.pendingRequest ? status.teams.find((t) => t.id === status.pendingRequest!.teamId) : undefined;

  return (
    <div className="join-team">
      <h3>Join a team</h3>
      {error && <p className="error-text">{error}</p>}
      {pendingTeam ? (
        <p>
          Your request to join <strong>{pendingTeam.name}</strong> is waiting for {pendingTeam.leaderName ?? 'the team leader'} to approve it.{' '}
          <button type="button" className="link-button" disabled={busy} onClick={() => run(cancelJoinRequest)}>
            Cancel request
          </button>
        </p>
      ) : status.teams.length === 0 ? (
        <p className="hint">There are no teams yet.</p>
      ) : (
        <>
          <p className="hint">
            You're not in a team yet. Choose the team you work in — its leader approves your request. Once you're in, only a team leader can
            move you.
          </p>
          <ul className="join-team-list">
            {status.teams.map((team) => (
              <li key={team.id}>
                <span>
                  <strong>{team.name}</strong>
                  <small>
                    {team.leaderName ? `Led by ${team.leaderName}` : 'No leader yet'} · {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                  </small>
                </span>
                <button type="button" disabled={busy} onClick={() => run(() => requestToJoinTeam(team.id))}>
                  Request to join
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
