import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AddMembersPanel } from '../performance/AddMembersPanel';
import { JoinRequestsPanel } from '../performance/JoinRequestsPanel';
import { PerformanceBoard } from '../performance/PerformanceBoard';
import { TargetsPanel } from '../performance/TargetsPanel';

/**
 * Team Leader landing: approve join requests, set monthly / quarterly targets for each member
 * and the whole team, follow every member's performance and how the team ranks against the
 * other teams. "Open coordinator tools" gives the leader the normal quoting tools.
 */
export function TeamLeaderView({ onOpenCoordinator }: { onOpenCoordinator: () => void }) {
  const { user } = useAuth();
  // Bumped whenever the team changes (request approved, members added), so every panel reloads.
  const [boardKey, setBoardKey] = useState(0);

  return (
    <section className="wizard-step">
      <span className="eyebrow">DUTY Clinic · Team Leader</span>
      <h2>Your team</h2>
      <p className="step-intro">
        Add your team members from the list (or approve their requests), set targets for each member and for the whole team, and follow the leaderboards. Use the coordinator tools to
        build quotations yourself.
      </p>
      <div className="wizard-actions">
        <button type="button" onClick={onOpenCoordinator}>
          Open coordinator tools
        </button>
      </div>

      <JoinRequestsPanel key={`requests-${boardKey}`} onDecided={() => setBoardKey((n) => n + 1)} />
      <AddMembersPanel refreshKey={boardKey} onAdded={() => setBoardKey((n) => n + 1)} />
      {user && <TargetsPanel viewerId={user.id} refreshKey={boardKey} onSaved={() => setBoardKey((n) => n + 1)} />}
      {user && <PerformanceBoard key={boardKey} leaderMode viewerId={user.id} />}
    </section>
  );
}
