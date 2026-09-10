import type { NextFunction, Request, Response } from 'express';
import { verifySession, type SessionClaims } from './jwt.js';
import { queryOne, type UserRow } from '../db.js';
import { DEFAULT_ROLE, isRole, ROLES, type Role } from './roles.js';

/**
 * The signed-in user's *current* record, read fresh from the database (unlike
 * `req.user`, which is whatever the JWT was signed with and can be stale after a
 * role change). Role checks below use this so a promotion/demotion takes effect
 * without forcing the user to re-login.
 */
export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionClaims;
      currentUser?: CurrentUser;
    }
  }
}

/** Pull a bearer token from the Authorization header (or `?access_token=` for the OAuth redirect). */
function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  const q = req.query.access_token;
  if (typeof q === 'string' && q) return q;
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readToken(req);
  const claims = token ? verifySession(token) : null;
  if (!claims) {
    res.status(401).json({ error: 'unauthorized', message: 'Sign in required.' });
    return;
  }
  req.user = claims;
  next();
}

/** Like requireAuth but never rejects — attaches req.user when a valid token is present. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  const claims = token ? verifySession(token) : null;
  if (claims) req.user = claims;
  next();
}

/**
 * Load `req.currentUser` from the database (requires a valid token). Rejects with
 * 401 if the token is missing/invalid or the account no longer exists. Safe to
 * chain after `requireAuth` or on its own; it is a no-op if already loaded.
 */
export async function loadCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.currentUser) return next();
    const token = readToken(req);
    const claims = token ? verifySession(token) : null;
    if (!claims) {
      res.status(401).json({ error: 'unauthorized', message: 'Sign in required.' });
      return;
    }
    req.user = claims;
    const row = await queryOne<UserRow>(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [claims.sub],
    );
    if (!row) {
      res.status(401).json({ error: 'unauthorized', message: 'Account not found.' });
      return;
    }
    req.currentUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: isRole(row.role) ? row.role : DEFAULT_ROLE,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Gate a route on the signed-in user holding one of `allowed` roles. Enforced
 * server-side against the live DB role — hiding the UI is never enough. With no
 * roles passed it behaves like `loadCurrentUser` (auth required, any role).
 *
 *   router.get('/api/team', requireRole(ROLES.TEAM_LEADER), handler)
 */
export function requireRole(...allowed: Role[]) {
  return async function roleGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = readToken(req);
      const claims = token ? verifySession(token) : null;
      if (!claims) {
        res.status(401).json({ error: 'unauthorized', message: 'Sign in required.' });
        return;
      }
      req.user = claims;

      if (!req.currentUser) {
        const row = await queryOne<UserRow>(
          'SELECT id, email, name, role FROM users WHERE id = $1',
          [claims.sub],
        );
        if (!row) {
          res.status(401).json({ error: 'unauthorized', message: 'Account not found.' });
          return;
        }
        req.currentUser = {
          id: row.id,
          email: row.email,
          name: row.name,
          role: isRole(row.role) ? row.role : DEFAULT_ROLE,
        };
      }

      if (allowed.length > 0 && !allowed.includes(req.currentUser.role)) {
        res.status(403).json({
          error: 'forbidden',
          message: `This action requires the ${allowed.join(' or ')} role.`,
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Convenience guards for the two elevated roles. */
export const requireTeamLeader = requireRole(ROLES.TEAM_LEADER);
export const requirePlanningManager = requireRole(ROLES.PLANNING_MANAGER);
