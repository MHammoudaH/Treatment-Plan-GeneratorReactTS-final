import { useEffect, useState } from 'react';
import { fetchPerformanceBoard, saveTarget, type ApiError, type Period, type PeriodType, type TeamBoard } from '../../lib/api';
import { parseTargetInput, progressLabel, shiftPeriod } from '../../lib/performance';

interface Row {
  key: string;
  teamId: number;
  userId: number | null;
  label: string;
  quotes: number;
  notes: number;
  savedQuotes: number | null;
  savedNotes: number | null;
}

function rowsFor(teams: TeamBoard[], viewerId: number): Row[] {
  return teams
    .filter((team) => team.leaderId === viewerId)
    .flatMap((team) => [
      {
        key: `${team.id}-team`,
        teamId: team.id,
        userId: null,
        label: `${team.name} — whole team`,
        quotes: team.quotes,
        notes: team.notes,
        savedQuotes: team.target.quotes,
        savedNotes: team.target.notes,
      },
      ...team.members.map((m) => ({
        key: `${team.id}-${m.userId}`,
        teamId: team.id,
        userId: m.userId,
        label: m.name,
        quotes: m.quotes,
        notes: m.notes,
        savedQuotes: m.target.quotes,
        savedNotes: m.target.notes,
      })),
    ]);
}

const asText = (n: number | null) => (n === null ? '' : String(n));

/**
 * Team leader: set the monthly or quarterly targets (quotes / follow-up notes) for the whole
 * team and for each member, for this period or any period ahead, and save them all at once.
 */
export function TargetsPanel({ viewerId, refreshKey = 0, onSaved }: { viewerId: number; refreshKey?: number; onSaved: () => void }) {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [date, setDate] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ key: string; period: Period; rows: Row[] } | null>(null);
  const [edits, setEdits] = useState<Record<string, { quotes: string; notes: string }>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const key = `${periodType}|${date ?? 'now'}|${reload}|${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    fetchPerformanceBoard(periodType, date)
      .then((res) => {
        if (cancelled) return;
        setData({ key, period: res.period, rows: rowsFor(res.teams, viewerId) });
        setEdits({});
      })
      .catch((err: ApiError) => !cancelled && setMessage({ kind: 'error', text: err?.message ?? 'Could not load targets.' }));
    return () => {
      cancelled = true;
    };
  }, [periodType, date, key, viewerId]);

  const loading = !data || data.key !== key;
  const period = data?.period;

  const valueOf = (row: Row, field: 'quotes' | 'notes') =>
    edits[row.key]?.[field] ?? asText(field === 'quotes' ? row.savedQuotes : row.savedNotes);

  function edit(row: Row, field: 'quotes' | 'notes', value: string) {
    setMessage(null);
    setEdits((prev) => {
      const current = prev[row.key] ?? { quotes: valueOf(row, 'quotes'), notes: valueOf(row, 'notes') };
      return { ...prev, [row.key]: { ...current, [field]: value } };
    });
  }

  const changed = (data?.rows ?? []).filter((row) => {
    const q = parseTargetInput(valueOf(row, 'quotes'));
    const n = parseTargetInput(valueOf(row, 'notes'));
    return q !== row.savedQuotes || n !== row.savedNotes;
  });
  const invalid = (data?.rows ?? []).some((row) => parseTargetInput(valueOf(row, 'quotes')) === undefined || parseTargetInput(valueOf(row, 'notes')) === undefined);

  async function saveAll() {
    if (!period || invalid || changed.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      for (const row of changed) {
        await saveTarget({
          teamId: row.teamId,
          userId: row.userId,
          period: period.type,
          date: period.start,
          quotes: parseTargetInput(valueOf(row, 'quotes')) ?? null,
          notes: parseTargetInput(valueOf(row, 'notes')) ?? null,
        });
      }
      setMessage({ kind: 'ok', text: `Saved ${changed.length} ${changed.length === 1 ? 'target' : 'targets'} for ${period.label}.` });
      setReload((n) => n + 1);
      onSaved();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as ApiError)?.message ?? 'Could not save the targets.' });
    } finally {
      setBusy(false);
    }
  }

  function switchType(next: PeriodType) {
    if (next === periodType) return;
    setPeriodType(next);
    setDate(period?.start);
  }

  if (data && data.rows.length === 0) return null; // not leading a team

  return (
    <div className="targets-panel">
      <h3>Set targets</h3>
      <p className="hint">
        Choose monthly or quarterly, pick the period (use › to set targets ahead), type the targets and save. Leave a box empty for no target.
      </p>
      <div className="perf-period">
        <div className="bmi-units" role="group" aria-label="Target type">
          <button type="button" className={periodType === 'month' ? '' : 'secondary'} onClick={() => switchType('month')}>
            Monthly target
          </button>
          <button type="button" className={periodType === 'quarter' ? '' : 'secondary'} onClick={() => switchType('quarter')}>
            Quarterly target
          </button>
        </div>
        <div className="perf-period-nav">
          <button type="button" className="secondary" aria-label="Previous target period" disabled={!period} onClick={() => period && setDate(shiftPeriod(period.start, periodType, -1))}>
            ‹
          </button>
          <strong>{period?.label ?? '…'}</strong>
          <button type="button" className="secondary" aria-label="Next target period" disabled={!period} onClick={() => period && setDate(shiftPeriod(period.start, periodType, 1))}>
            ›
          </button>
        </div>
      </div>

      {message && <p className={message.kind === 'ok' ? 'rule-note' : 'error-text'}>{message.text}</p>}
      {loading ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <div className="perf-table-wrap">
            <table className="perf-table targets-table">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Quotes target</th>
                  <th>Notes target</th>
                  <th>Done so far ({period?.label})</th>
                </tr>
              </thead>
              <tbody>
                {data!.rows.map((row) => (
                  <tr key={row.key} className={row.userId === null ? 'mine' : undefined}>
                    <td>
                      <strong>{row.label}</strong>
                    </td>
                    <td>
                      <input
                        aria-label={`${row.label} quotes target`}
                        inputMode="numeric"
                        placeholder="—"
                        value={valueOf(row, 'quotes')}
                        onChange={(e) => edit(row, 'quotes', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${row.label} notes target`}
                        inputMode="numeric"
                        placeholder="—"
                        value={valueOf(row, 'notes')}
                        onChange={(e) => edit(row, 'notes', e.target.value)}
                      />
                    </td>
                    <td>
                      <small>
                        quotes {progressLabel(row.quotes, row.savedQuotes)} · notes {progressLabel(row.notes, row.savedNotes)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data!.rows.length === 1 && <p className="hint">Add members to your team to give each of them a personal target too.</p>}
          {invalid && <p className="error-text">Targets must be whole numbers (0 or more).</p>}
          <div className="wizard-actions">
            <button type="button" disabled={busy || invalid || changed.length === 0} onClick={saveAll}>
              {busy ? 'Saving…' : `Save ${periodType === 'month' ? 'monthly' : 'quarterly'} targets`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
