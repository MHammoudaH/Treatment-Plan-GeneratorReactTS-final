import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthScreen } from './AuthScreen';

/**
 * Renders the app only for signed-in users; otherwise shows the sign-in / sign-up
 * screen. Wrap the whole application in this.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <div className="auth-loading">Loading…</div>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="app-shell">
        <header className="app-header">
          <img src="/assets/logo/Logo-main.png" alt="Duty Clinic" className="app-logo" />
          <div>
            <h1>DutyAI Treatment Plan Generator</h1>
            <p>Coordinator quotation &amp; treatment plan builder</p>
          </div>
        </header>
        <AuthScreen />
      </div>
    );
  }

  return <>{children}</>;
}
