import { useEffect, useState } from 'react';
import {
  fetchPerformanceBoard,
  moveTeamMember,
  removeTeamMember,
  type ApiError,
  type Period,
  type PeriodType,
  type TeamBoard,
} from '../../lib/api';
import { progressLabel, progressPercent, rankBadge, shiftPeriod } from '../../lib/performance';

function Progress({ value, target }: { value: number; target: number | null }) {
  const pct = progressPercent(value, target);
  return (
    <div className="perf-progress">
      <span>{progressLabel(value, target)}</span>
      {pct !== null && (
        <div className={`perf-bar${pct >= 100 ? ' done' : ''}`}>
          <i style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

/**
 * Leaderboards for one month or quarter: every team ranked against the others, and — for the
 * viewer's own team(s) — each member ranked against their teammates, with progress to target.
 * `leaderMode` adds moving / removing members of the teams the viewer leads (targets are set in
 * `TargetsPanel`).
 */
export function PerformanceBoard({ leaderMode = false, viewerId }: { leaderMode?: boolean; viewerId: number }) {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [date, setDate] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ key: string; period: Period; teams: TeamBoard[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${periodType}|${date ?? 'now'}|${reload}`;

  useEffect(() => {
    let cancelled = false;
    fetchPerformanceBoard(periodType, date)
      .then((res) => {
        if (cancelled) return;
        setData({ key, ...res });
        setError(null);
      })
      .catch((err: ApiError) => !cancelled && setError(err?.message ?? 'Could not load the leaderboard.'));
    return () => {
      cancelled = true;
    };
  }, [periodType, date, key]);

  const loading = !data || data.key !== key;
  const period = data?.period;

  function changePeriodType(next: PeriodType) {
    setPeriodType(next);
    setDate(period?.start); // stay around the period being viewed
  }

  async function remove(team: TeamBoard, userId: number, name: string) {
    if (!window.confirm(`Remove ${name} from ${team.name}? Their quotes and notes stay in their own records.`)) return;
    try {
      await removeTeamMember(team.id, userId);
      setReload((n) => n + 1);
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not remove the member.');
    }
  }

  async function move(team: TeamBoard, userId: number, name: string, toTeamId: number) {
    const to = data?.teams.find((t) => t.id === toTeamId);
    if (!to || !window.confirm(`Move ${name} from ${team.name} to ${to.name}?`)) return;
    try {
      await moveTeamMember(team.id, userId, toTeamId);
      setReload((n) => n + 1);
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not move the member.');
    }
  }

  const myTeams = data?.teams.filter((t) => t.isMine) ?? [];

  return (
    <div className="perf-board">
      <div className="perf-period">
        <div className="bmi-units" role="group" aria-label="Target period">
          <button type="button" className={periodType === 'month' ? '' : 'secondary'} onClick={() => changePeriodType('month')}>
            Monthly
          </button>
          <button type="button" className={periodType === 'quarter' ? '' : 'secondary'} onClick={() => changePeriodType('quarter')}>
            Quarterly
          </button>
        </div>
        <div className="perf-period-nav">
          <button type="button" className="secondary" aria-label="Previous period" disabled={!period} onClick={() => period && setDate(shiftPeriod(period.start, periodType, -1))}>
            ‹
          </button>
          <strong>{period?.label ?? '…'}</strong>
          <button type="button" className="secondary" aria-label="Next period" disabled={!period} onClick={() => period && setDate(shiftPeriod(period.start, periodType, 1))}>
            ›
          </button>
        </div>
      </div>
      <p className="hint">
        Quotes = quotations saved to My Patients (tick "Save this patient to my records" when generating a PDF). Notes = follow-up notes added in My Patients.
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && !error && <p className="hint">Loading…</p>}

      {data && !loading && (
        <>
          <h3>Team ranking</h3>
          {data.teams.length === 0 ? (
            <p className="rule-note">No teams yet.</p>
          ) : (
            <div className="perf-table-wrap">
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Quotes</th>
                    <th>Notes</th>
                    <th>Quotes / member</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((team, i) => (
                    <tr key={team.id} className={team.isMine ? 'mine' : undefined}>
                      <td>{rankBadge(i)}</td>
                      <td>
                        <strong>{team.name}</strong>
                        <small>
                          {team.leaderName ? `Led by ${team.leaderName}` : 'No leader'} · {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                        </small>
                      </td>
                      <td>
                        <Progress value={team.quotes} target={team.target.quotes} />
                      </td>
                      <td>
                        <Progress value={team.notes} target={team.target.notes} />
                      </td>
                      <td>{team.quotesPerMember}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.teams.length > 1 && <p className="hint">Teams are ranked by quotes per member, so a smaller team can still win.</p>}

          {myTeams.map((team) => {
            const canEdit = leaderMode && team.leaderId === viewerId;
            return (
              <div key={team.id} className="perf-team">
                <h3>{team.name} — member leaderboard</h3>
                {team.members.length === 0 ? (
                  <p className="rule-note">No members yet.</p>
                ) : (
                  <div className="perf-table-wrap">
                    <table className="perf-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Member</th>
                          <th>Quotes</th>
                          <th>Notes</th>
                          {canEdit && <th />}
                        </tr>
                      </thead>
                      <tbody>
                        {team.members.map((m, i) => (
                          <tr key={m.userId} className={m.userId === viewerId ? 'mine' : undefined}>
                            <td>{rankBadge(i)}</td>
                            <td>
                              <strong>{m.name}</strong>
                              {m.userId === viewerId && <small>You</small>}
                            </td>
                            <td>
                              <Progress value={m.quotes} target={m.target.quotes} />
                            </td>
                            <td>
                              <Progress value={m.notes} target={m.target.notes} />
                            </td>
                            {canEdit && (
                              <td>
                                <div className="perf-member-actions">
                                  {data.teams.length > 1 && (
                                    <select
                                      aria-label={`Move ${m.name} to another team`}
                                      value=""
                                      onChange={(e) => e.target.value && move(team, m.userId, m.name, Number(e.target.value))}
                                    >
                                      <option value="">Move to…</option>
                                      {data.teams
                                        .filter((t) => t.id !== team.id)
                                        .map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.name}
                                          </option>
                                        ))}
                                    </select>
                                  )}
                                  <button type="button" className="secondary" onClick={() => remove(team, m.userId, m.name)}>
                                    Remove
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
