import { useEffect, useState } from 'react';
import { fetchPerformanceBoard, type Period, type TeamBoard } from '../../lib/api';
import { progressLabel, rankBadge } from '../../lib/performance';

/** Compact "this month" card on the coordinator's landing page: my numbers, my team's, our ranks. */
export function MyTargetStrip({ viewerId, onOpen }: { viewerId: number; onOpen: () => void }) {
  const [data, setData] = useState<{ period: Period; teams: TeamBoard[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPerformanceBoard('month')
      .then((res) => !cancelled && setData(res))
      .catch(() => {}); // the full page shows errors; the strip just stays hidden
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const teamIndex = data.teams.findIndex((t) => t.isMine && t.members.some((m) => m.userId === viewerId));
  const team = data.teams[teamIndex];

  return (
    <button type="button" className="my-target-strip" onClick={onOpen}>
      {team ? (
        (() => {
          const meIndex = team.members.findIndex((m) => m.userId === viewerId);
          const me = team.members[meIndex];
          return (
            <>
              <span className="eyebrow">{data.period.label}</span>
              <span>
                <strong>You</strong> {rankBadge(meIndex)} · quotes {progressLabel(me.quotes, me.target.quotes)} · notes {progressLabel(me.notes, me.target.notes)}
              </span>
              <span>
                <strong>{team.name}</strong> {rankBadge(teamIndex)} · quotes {progressLabel(team.quotes, team.target.quotes)} · notes{' '}
                {progressLabel(team.notes, team.target.notes)}
              </span>
              <small>Open team performance →</small>
            </>
          );
        })()
      ) : (
        <>
          <span className="eyebrow">Team performance</span>
          <span>You're not in a team yet — open to request to join one.</span>
        </>
      )}
    </button>
  );
}
