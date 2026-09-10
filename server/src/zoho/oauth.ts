import { randomBytes } from 'node:crypto';
import { config, zohoOAuthConfigured } from '../config.js';
import { db } from '../db.js';

const STATE_TTL_MS = 10 * 60 * 1000;

export interface ZohoTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number; // seconds
  api_domain?: string;
  token_type?: string;
  scope?: string;
  error?: string;
}

/** Create + persist a one-time `state` value for the consent round-trip. */
export function createOAuthState(userId: number | null): string {
  const state = randomBytes(24).toString('base64url');
  db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(Date.now() - STATE_TTL_MS);
  db.prepare('INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)').run(state, userId, Date.now());
  return state;
}

export function consumeOAuthState(state: string): { ok: boolean; userId: number | null } {
  const row = db.prepare('SELECT user_id, created_at FROM oauth_states WHERE state = ?').get(state) as
    | { user_id: number | null; created_at: number }
    | undefined;
  if (row) db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
  if (!row || Date.now() - row.created_at > STATE_TTL_MS) return { ok: false, userId: null };
  return { ok: true, userId: row.user_id };
}

/** Build the Zoho consent URL the browser is redirected to. */
export function buildAuthorizeUrl(state: string): string {
  if (!zohoOAuthConfigured()) {
    throw new Error('Zoho OAuth is not configured (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET missing).');
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.zoho.clientId,
    scope: config.zoho.scopes,
    redirect_uri: config.zoho.redirectUri,
    access_type: 'offline', // ask for a refresh token
    prompt: 'consent', // force the refresh token even on re-auth
    state,
  });
  return `${config.zoho.accountsBase}/oauth/v2/auth?${params.toString()}`;
}

async function postToken(params: Record<string, string>): Promise<ZohoTokenResponse> {
  const res = await fetch(`${config.zoho.accountsBase}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as ZohoTokenResponse;
  if (!res.ok || data.error) {
    throw new Error(`Zoho token endpoint error: ${data.error ?? res.status} ${res.statusText}`);
  }
  return data;
}

/** Exchange an authorization code for access + refresh tokens. */
export function exchangeCodeForTokens(code: string): Promise<ZohoTokenResponse> {
  return postToken({
    grant_type: 'authorization_code',
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
    redirect_uri: config.zoho.redirectUri,
    code,
  });
}

/** Use a refresh token to mint a fresh access token. */
export function refreshAccessToken(refreshToken: string): Promise<ZohoTokenResponse> {
  return postToken({
    grant_type: 'refresh_token',
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
    refresh_token: refreshToken,
  });
}
