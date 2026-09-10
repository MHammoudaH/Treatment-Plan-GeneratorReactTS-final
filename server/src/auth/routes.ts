import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { db, type UserRow } from '../db.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { signSession } from './jwt.js';
import { requireAuth } from './middleware.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at };
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function domainAllowed(email: string): boolean {
  if (config.signupAllowedDomains.length === 0) return true;
  const domain = email.split('@')[1] ?? '';
  return config.signupAllowedDomains.includes(domain);
}

// POST /api/auth/signup  { email, password, name? }
authRouter.post('/signup', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters.' });
  }
  if (!domainAllowed(email)) {
    return res.status(403).json({ error: 'domain_not_allowed', message: 'Sign-up is restricted to approved email domains.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists.' });
  }

  const password_hash = await hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(email, name, password_hash);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as UserRow;

  const token = signSession({ sub: row.id, email: row.email, role: row.role });
  return res.status(201).json({ token, user: publicUser(row) });
});

// POST /api/auth/login  { email, password }
authRouter.post('/login', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  // Always run a verify to keep timing roughly constant whether or not the user exists.
  const ok = row ? await verifyPassword(password, row.password_hash) : await verifyPassword(password, 'scrypt$00$00');
  if (!row || !ok) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is incorrect.' });
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(row.id);
  const token = signSession({ sub: row.id, email: row.email, role: row.role });
  return res.json({ token, user: publicUser(row) });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.sub) as UserRow | undefined;
  if (!row) return res.status(401).json({ error: 'unauthorized' });
  return res.json({ user: publicUser(row) });
});

// POST /api/auth/logout — stateless JWT, so this is a client-side token drop.
// Provided for symmetry / future refresh-token revocation.
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ ok: true });
});
