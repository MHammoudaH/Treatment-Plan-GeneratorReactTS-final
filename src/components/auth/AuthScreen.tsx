import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ApiError } from '../../lib/api';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) await signup({ email, password, name: name.trim() || undefined });
      else await login({ email, password });
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword('');
  }

  return (
    <section className="auth-screen wizard-step">
      <span className="eyebrow">DUTY Clinic</span>
      <h2>{isSignup ? 'Create your account' : 'Sign in'}</h2>
      <p className="step-intro">
        {isSignup
          ? 'Set up a coordinator account to access treatment plans and your Zoho CRM deals.'
          : 'Sign in to continue to the treatment plan generator.'}
      </p>

      <form onSubmit={onSubmit} className="auth-form">
        {isSignup && (
          <>
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </>
        )}

        <label htmlFor="auth-email">Work email</label>
        <input
          id="auth-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@dutyclinic.com"
        />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
        </button>
      </form>

      <div className="auth-switch">
        {isSignup ? (
          <>
            <span>Already have an account?</span>
            <button type="button" className="linklike" onClick={() => switchMode('signin')}>
              Sign in
            </button>
          </>
        ) : (
          <>
            <span>Need an account?</span>
            <button type="button" className="linklike" onClick={() => switchMode('signup')}>
              Sign up
            </button>
          </>
        )}
      </div>
    </section>
  );
}
