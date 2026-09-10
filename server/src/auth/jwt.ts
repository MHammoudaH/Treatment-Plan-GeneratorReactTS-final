import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { DEFAULT_ROLE, isRole, type Role } from './roles.js';

export interface SessionClaims {
  sub: number; // user id
  email: string;
  role: Role;
}

export function signSession(claims: { sub: number; email: string; role: string }): string {
  const role: Role = isRole(claims.role) ? claims.role : DEFAULT_ROLE;
  return jwt.sign({ sub: claims.sub, email: claims.email, role }, config.session.secret, {
    expiresIn: `${config.session.ttlDays}d`,
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, config.session.secret);
    if (typeof decoded === 'string') return null;
    const { sub, email, role } = decoded as jwt.JwtPayload;
    if (typeof sub !== 'number' || typeof email !== 'string') return null;
    return { sub, email, role: isRole(role) ? role : DEFAULT_ROLE };
  } catch {
    return null;
  }
}
