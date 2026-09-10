import { config } from '../config.js';
import { db, type ZohoConnectionRow } from '../db.js';

export interface StoredConnection {
  refreshToken: string;
  accessToken: string | null;
  expiresAt: number; // epoch ms
  apiDomain: string | null;
  scope: string | null;
  connectedBy: string | null;
  updatedAt: string;
}

function rowToConnection(row: ZohoConnectionRow): StoredConnection {
  return {
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    expiresAt: row.expires_at,
    apiDomain: row.api_domain,
    scope: row.scope,
    connectedBy: row.connected_by,
    updatedAt: row.updated_at,
  };
}

/** The org-wide Zoho connection, or null if nobody has connected yet. */
export function getConnection(): StoredConnection | null {
  const row = db.prepare('SELECT * FROM zoho_connection WHERE id = 1').get() as ZohoConnectionRow | undefined;
  if (row) return rowToConnection(row);

  // Fall back to a refresh token supplied directly via env (Self Client flow).
  if (config.zoho.bootstrapRefreshToken) {
    return {
      refreshToken: config.zoho.bootstrapRefreshToken,
      accessToken: null,
      expiresAt: 0,
      apiDomain: config.zoho.apiBase,
      scope: config.zoho.scopes,
      connectedBy: 'env:ZOHO_REFRESH_TOKEN',
      updatedAt: 'env',
    };
  }
  return null;
}

export function saveConnection(input: {
  refreshToken: string;
  accessToken?: string | null;
  expiresAt?: number;
  apiDomain?: string | null;
  scope?: string | null;
  connectedBy?: string | null;
}): void {
  db.prepare(
    `INSERT INTO zoho_connection (id, refresh_token, access_token, expires_at, api_domain, scope, connected_by, updated_at)
     VALUES (1, @refreshToken, @accessToken, @expiresAt, @apiDomain, @scope, @connectedBy, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       refresh_token = excluded.refresh_token,
       access_token  = excluded.access_token,
       expires_at    = excluded.expires_at,
       api_domain    = COALESCE(excluded.api_domain, zoho_connection.api_domain),
       scope         = COALESCE(excluded.scope, zoho_connection.scope),
       connected_by  = COALESCE(excluded.connected_by, zoho_connection.connected_by),
       updated_at    = datetime('now')`,
  ).run({
    refreshToken: input.refreshToken,
    accessToken: input.accessToken ?? null,
    expiresAt: input.expiresAt ?? 0,
    apiDomain: input.apiDomain ?? null,
    scope: input.scope ?? null,
    connectedBy: input.connectedBy ?? null,
  });
}

/** Update just the access token / expiry after a refresh, keeping the same refresh token. */
export function updateAccessToken(accessToken: string, expiresAt: number, apiDomain?: string | null): void {
  db.prepare(
    `UPDATE zoho_connection
        SET access_token = ?, expires_at = ?, api_domain = COALESCE(?, api_domain), updated_at = datetime('now')
      WHERE id = 1`,
  ).run(accessToken, expiresAt, apiDomain ?? null);
}

export function clearConnection(): void {
  db.prepare('DELETE FROM zoho_connection WHERE id = 1').run();
}
