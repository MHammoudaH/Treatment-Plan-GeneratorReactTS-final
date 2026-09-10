import { config } from '../config.js';
import { query, queryOne, type ZohoConnectionRow } from '../db.js';

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
    expiresAt: Number(row.expires_at) || 0,
    apiDomain: row.api_domain,
    scope: row.scope,
    connectedBy: row.connected_by,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** The org-wide Zoho connection, or null if nobody has connected yet. */
export async function getConnection(): Promise<StoredConnection | null> {
  const row = await queryOne<ZohoConnectionRow>('SELECT * FROM zoho_connection WHERE id = 1');
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

export async function saveConnection(input: {
  refreshToken: string;
  accessToken?: string | null;
  expiresAt?: number;
  apiDomain?: string | null;
  scope?: string | null;
  connectedBy?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO zoho_connection (id, refresh_token, access_token, expires_at, api_domain, scope, connected_by, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id) DO UPDATE SET
       refresh_token = EXCLUDED.refresh_token,
       access_token  = EXCLUDED.access_token,
       expires_at    = EXCLUDED.expires_at,
       api_domain    = COALESCE(EXCLUDED.api_domain, zoho_connection.api_domain),
       scope         = COALESCE(EXCLUDED.scope, zoho_connection.scope),
       connected_by  = COALESCE(EXCLUDED.connected_by, zoho_connection.connected_by),
       updated_at    = now()`,
    [
      input.refreshToken,
      input.accessToken ?? null,
      input.expiresAt ?? 0,
      input.apiDomain ?? null,
      input.scope ?? null,
      input.connectedBy ?? null,
    ],
  );
}

/** Update just the access token / expiry after a refresh, keeping the same refresh token. */
export async function updateAccessToken(
  accessToken: string,
  expiresAt: number,
  apiDomain?: string | null,
): Promise<void> {
  await query(
    `UPDATE zoho_connection
        SET access_token = $1, expires_at = $2, api_domain = COALESCE($3, api_domain), updated_at = now()
      WHERE id = 1`,
    [accessToken, expiresAt, apiDomain ?? null],
  );
}

export async function clearConnection(): Promise<void> {
  await query('DELETE FROM zoho_connection WHERE id = 1');
}
