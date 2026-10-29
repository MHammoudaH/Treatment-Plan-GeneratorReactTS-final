import { useEffect, useMemo, useState } from 'react';
import {
  addTeamMembers,
  fetchAvailableCoordinators,
  fetchMyTeamStatus,
  type ApiError,
  type AvailableCoordinator,
  type MyTeamStatus,
} from '../../lib/api';

/** Team leader: pick coordinators who aren't in a team yet and add them to my team directly. */
/** `refreshKey` changes whenever the team changes elsewhere (e.g. a request approved), to reload the list. */
export function AddMembersPanel({ onAdded, refreshKey = 0 }: { onAdded: () => void; refreshKey?: number }) {
  const [available, setAvailable] = useState<AvailableCoordinator[] | null>(null);
  const [status, setStatus] = useState<MyTeamStatus | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAvailableCoordinators(), fetchMyTeamStatus()])
      .then(([a, s]) => {
        if (cancelled) return;
        setAvailable(a.coordinators);
        setStatus(s);
      })
      .catch((err: ApiError) => !cancelled && setMessage({ kind: 'error', text: err?.message ?? 'Could not load coordinators.' }));
    return () => {
      cancelled = true;
    };
  }, [reload, refreshKey]);

  const myTeams = useMemo(() => (status ? status.teams.filter((t) => status.leads.includes(t.id)) : []), [status]);
  const targetTeam = myTeams.find((t) => t.id === teamId) ?? myTeams[0];
  const teamName = (id: number | null) => status?.teams.find((t) => t.id === id)?.name ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (available ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [available, search]);

  function toggle(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function add() {
    if (!targetTeam || selected.size === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const { added, skipped } = await addTeamMembers(targetTeam.id, [...selected]);
      const parts = [`Added ${added.length} ${added.length === 1 ? 'person' : 'people'} to ${targetTeam.name}.`];
      if (skipped.length) parts.push(`${skipped.length} skipped — already placed in a team meanwhile.`);
      setMessage({ kind: 'ok', text: parts.join(' ') });
      setSelected(new Set());
      setReload((n) => n + 1);
      onAdded();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as ApiError)?.message ?? 'Could not add members.' });
    } finally {
      setBusy(false);
    }
  }

  if (!status || myTeams.length === 0) return null;

  return (
    <div className="add-members">
      <h3>Add team members</h3>
      <p className="hint">Coordinators who aren't in a team yet. Tick the people who work with you and add them — no request needed.</p>
      {message && <p className={message.kind === 'ok' ? 'rule-note' : 'error-text'}>{message.text}</p>}

      {available === null ? (
        <p className="hint">Loading…</p>
      ) : available.length === 0 ? (
        <p className="hint">Every coordinator is already in a team.</p>
      ) : (
        <>
          <div className="add-members-toolbar">
            <input type="search" aria-label="Search coordinators" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {myTeams.length > 1 && (
              <select aria-label="Add to team" value={targetTeam?.id ?? ''} onChange={(e) => setTeamId(Number(e.target.value))}>
                {myTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <ul className="add-members-list">
            {visible.map((c) => (
              <li key={c.userId}>
                <label>
                  <input type="checkbox" checked={selected.has(c.userId)} onChange={() => toggle(c.userId)} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {c.email}
                      {c.requestedTeamId !== null && ` · asked to join ${teamName(c.requestedTeamId) ?? 'a team'}`}
                    </small>
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="hint">No coordinators match your search.</li>}
          </ul>
          <div className="wizard-actions">
            <button type="button" disabled={busy || selected.size === 0 || !targetTeam} onClick={add}>
              {busy ? 'Adding…' : `Add ${selected.size || ''} selected to ${targetTeam?.name ?? 'my team'}`.replace('  ', ' ')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
