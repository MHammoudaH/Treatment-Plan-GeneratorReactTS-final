import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { JoinRequestsPanel } from '../performance/JoinRequestsPanel';
import { PerformanceBoard } from '../performance/PerformanceBoard';

/**
 * Team Leader landing: approve join requests, set monthly / quarterly targets for each member
 * and the whole team, follow every member's performance and how the team ranks against the
 * other teams. "Open coordinator tools" gives the leader the normal quoting tools.
 */
export function TeamLeaderView({ onOpenCoordinator }: { onOpenCoordinator: () => void }) {
  const { user } = useAuth();
  // Bumped after approving someone, so the leaderboard shows the new member.
  const [boardKey, setBoardKey] = useState(0);

  return (
    <section className="wizard-step">
      <span className="eyebrow">DUTY Clinic · Team Leader</span>
      <h2>Your team</h2>
      <p className="step-intro">
        Approve new members, set targets for each member and for the whole team, and follow the leaderboards. Use the coordinator tools to
        build quotations yourself.
      </p>
      <div className="wizard-actions">
        <button type="button" onClick={onOpenCoordinator}>
          Open coordinator tools
        </button>
      </div>

      <JoinRequestsPanel onDecided={() => setBoardKey((n) => n + 1)} />
      {user && <PerformanceBoard key={boardKey} leaderMode viewerId={user.id} />}
    </section>
  );
}
