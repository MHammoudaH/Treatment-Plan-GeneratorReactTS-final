import type { NextFunction, Request, Response } from 'express';
import { verifySession, type SessionClaims } from './jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionClaims;
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
