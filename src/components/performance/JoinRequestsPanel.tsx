import { useEffect, useState } from 'react';
import { decideJoinRequest, fetchJoinRequests, type ApiError, type PendingJoinRequest } from '../../lib/api';

/** Team leader: coordinators asking to join one of my teams — approve or decline. */
export function JoinRequestsPanel({ onDecided }: { onDecided: () => void }) {
  const [requests, setRequests] = useState<PendingJoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJoinRequests()
      .then(({ requests }) => !cancelled && setRequests(requests))
      .catch((err: ApiError) => !cancelled && setError(err?.message ?? 'Could not load join requests.'));
    return () => {
      cancelled = true;
    };
  }, []);

  async function decide(request: PendingJoinRequest, decision: 'approve' | 'decline') {
    setBusyId(request.id);
    setError(null);
    try {
      await decideJoinRequest(request.id, decision);
      setRequests((prev) => (prev ?? []).filter((r) => r.id !== request.id));
      onDecided();
    } catch (err) {
      const e = err as ApiError;
      // Placed in a team meanwhile: the server closed the request, so drop it from the list.
      if (e?.code === 'already_member') setRequests((prev) => (prev ?? []).filter((r) => r.id !== request.id));
      setError(e?.message ?? 'Could not save your decision.');
    } finally {
      setBusyId(null);
    }
  }

  if (!requests || (requests.length === 0 && !error)) return null;

  return (
    <div className="join-requests">
      <h3>Join requests ({requests.length})</h3>
      {error && <p className="error-text">{error}</p>}
      <ul className="join-team-list">
        {requests.map((r) => (
          <li key={r.id}>
            <span>
              <strong>{r.name}</strong>
              <small>
                {r.email} · wants to join {r.teamName} · {new Date(r.createdAt).toLocaleDateString('en-GB')}
              </small>
            </span>
            <span className="join-actions">
              <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'approve')}>
                Approve
              </button>
              <button type="button" className="secondary" disabled={busyId === r.id} onClick={() => decide(r, 'decline')}>
                Decline
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
