import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function list(name: string): string[] {
  return str(name)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Resolve a possibly-relative path against the server/ folder. */
function resolveFromServer(p: string): string {
  return path.isAbsolute(p) ? p : path.join(serverRoot, p);
}

export const config = {
  serverRoot,
  port: int('PORT', 8787),
  appOrigin: str('APP_ORIGIN', 'http://localhost:5173'),

  session: {
    secret: str('SESSION_SECRET', 'dev-only-change-me'),
    ttlDays: int('SESSION_TTL_DAYS', 7),
  },

  databaseFile: resolveFromServer(str('DATABASE_FILE', './data/app.db')),

  signupAllowedDomains: list('SIGNUP_ALLOWED_DOMAINS'),

  zoho: {
    accountsBase: str('ZOHO_ACCOUNTS_BASE', 'https://accounts.zoho.com').replace(/\/+$/, ''),
    apiBase: str('ZOHO_API_BASE', 'https://www.zohoapis.com').replace(/\/+$/, ''),
    clientId: str('ZOHO_CLIENT_ID'),
    clientSecret: str('ZOHO_CLIENT_SECRET'),
    redirectUri: str('ZOHO_REDIRECT_URI', 'http://localhost:8787/api/zoho/callback'),
    scopes: str('ZOHO_SCOPES', 'ZohoCRM.modules.deals.READ,ZohoCRM.users.READ,ZohoCRM.settings.READ'),
    bootstrapRefreshToken: str('ZOHO_REFRESH_TOKEN'),
  },
} as const;

/** True when the OAuth consent flow can be started (client id + secret present). */
export function zohoOAuthConfigured(): boolean {
  return Boolean(config.zoho.clientId && config.zoho.clientSecret);
}

export function warnOnStartup(): void {
  if (config.session.secret === 'dev-only-change-me') {
    console.warn('[config] SESSION_SECRET is the default value — set a real secret before production.');
  }
  if (!zohoOAuthConfigured() && !config.zoho.bootstrapRefreshToken) {
    console.warn(
      '[config] Zoho is not configured yet. Set ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET in server/.env, ' +
        'then open /api/zoho/connect to authorize. Until then /api/deals returns a "not connected" status.',
    );
  }
  if (!existsSync(path.join(serverRoot, '.env'))) {
    console.warn('[config] No server/.env found — using defaults. Copy server/.env.example to server/.env.');
  }
}
