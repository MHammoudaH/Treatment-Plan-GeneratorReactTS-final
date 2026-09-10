import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface SessionClaims {
  sub: number; // user id
  email: string;
  role: string;
}

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, config.session.secret, {
    expiresIn: `${config.session.ttlDays}d`,
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, config.session.secret);
    if (typeof decoded === 'string') return null;
    const { sub, email, role } = decoded as jwt.JwtPayload;
    if (typeof sub !== 'number' || typeof email !== 'string') return null;
    return { sub, email, role: typeof role === 'string' ? role : 'coordinator' };
  } catch {
    return null;
  }
}
