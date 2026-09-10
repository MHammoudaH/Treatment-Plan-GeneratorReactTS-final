import { useEffect, useState } from 'react';
import {
  fetchPlanningConfirmed,
  fetchPlanningOverview,
  type ApiError,
  type PlanningOverview,
} from '../../lib/api';

/**
 * Planning Manager landing — foundation only.
 *
 * The planning workflow (hotel reservations, airport/clinic transfers, arrival
 * and departure logistics) is not built yet. This screen confirms the role
 * boundary — the server gates `/api/planning*` on the planning_manager role —
 * and shows where confirmed patients will arrive from.
 */
export function PlanningView() {
  const [overview, setOverview] = useState<PlanningOverview | null>(null);
  const [confirmedNote, setConfirmedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPlanningOverview(), fetchPlanningConfirmed()])
      .then(([o, c]) => {
        if (cancelled) return;
        setOverview(o);
        setConfirmedNote(c.note);
      })
      .catch((err: ApiError) => {
        if (!cancelled) setError(err?.message ?? 'Could not load planning data.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="wizard-step">
      <span className="eyebrow">DUTY Clinic · Planning</span>
      <h2>Planning &amp; operations</h2>
      <p className="step-intro">
        Once a patient is confirmed, planning arranges hotel, transfers and logistics. That workflow
        is not built yet — this is the role foundation.
      </p>

      {error && <p className="auth-error" role="alert">{error}</p>}

      {overview && (
        <div style={{ marginBlock: '1rem' }}>
          <h3>Planning teams you manage ({overview.planningTeams.length})</h3>
          {overview.planningTeams.length === 0 ? (
            <p>
              No planning team is assigned to you yet. An administrator sets this with the{' '}
              <code>npm run team</code> CLI.
            </p>
          ) : (
            <ul>
              {overview.planningTeams.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong> — {overview.teamSize} member(s)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ marginBlock: '1rem' }}>
        <h3>Confirmed patients</h3>
        <p className="muted">{confirmedNote ?? 'Loading…'}</p>
      </div>
    </section>
  );
}
