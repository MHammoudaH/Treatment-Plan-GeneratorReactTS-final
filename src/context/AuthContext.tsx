import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  type AuthUser,
} from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');

  // On mount, if we have a stored token, verify it against the backend.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    fetchMe()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        apiLogout();
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const u = await apiLogin(input);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const signup = useCallback(async (input: { email: string; password: string; name?: string }) => {
    const u = await apiSignup(input);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, signup, logout }),
    [user, status, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
