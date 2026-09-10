import { config, zohoOAuthConfigured } from '../config.js';
import { refreshAccessToken } from './oauth.js';
import { getConnection, saveConnection, updateAccessToken } from './tokenStore.js';

const EXPIRY_SKEW_MS = 60 * 1000; // refresh a minute early

export class ZohoNotConnectedError extends Error {
  constructor() {
    super('Zoho CRM is not connected. An admin needs to authorize it at /api/zoho/connect.');
    this.name = 'ZohoNotConnectedError';
  }
}

export class ZohoApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Zoho API responded ${status}`);
    this.name = 'ZohoApiError';
    this.status = status;
    this.body = body;
  }
}

let inflightRefresh: Promise<string> | null = null;

async function getAccessToken(forceRefresh = false): Promise<{ token: string; apiDomain: string }> {
  const conn = await getConnection();
  if (!conn) throw new ZohoNotConnectedError();

  const apiDomain = conn.apiDomain || config.zoho.apiBase;
  const fresh = conn.accessToken && conn.expiresAt - EXPIRY_SKEW_MS > Date.now();
  if (fresh && !forceRefresh) {
    return { token: conn.accessToken!, apiDomain };
  }

  if (!zohoOAuthConfigured()) {
    // We have a refresh token (e.g. from env) but no client id/secret to use it.
    throw new Error('Cannot refresh Zoho access token: ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET are not set.');
  }

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      const data = await refreshAccessToken(conn.refreshToken);
      if (!data.access_token) throw new Error('Zoho refresh did not return an access_token.');
      const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      const newApiDomain = data.api_domain ?? conn.apiDomain ?? config.zoho.apiBase;
      // Persist. If the connection only existed in env so far, this writes the first DB row.
      if (conn.updatedAt === 'env') {
        await saveConnection({
          refreshToken: conn.refreshToken,
          accessToken: data.access_token,
          expiresAt,
          apiDomain: newApiDomain,
          scope: data.scope ?? conn.scope,
          connectedBy: conn.connectedBy,
        });
      } else {
        await updateAccessToken(data.access_token, expiresAt, newApiDomain);
      }
      return data.access_token;
    })().finally(() => {
      inflightRefresh = null;
    });
  }

  const token = await inflightRefresh;
  return { token, apiDomain: (await getConnection())?.apiDomain || config.zoho.apiBase };
}

/**
 * Call a Zoho CRM REST endpoint. `pathOrUrl` may be a path like `/crm/v6/coql`
 * (resolved against the connection's api_domain) or an absolute URL.
 * Transparently refreshes the access token once on a 401.
 */
export async function zohoFetch(
  pathOrUrl: string,
  init: RequestInit = {},
  _retry = false,
): Promise<Response> {
  const { token, apiDomain } = await getAccessToken(_retry);
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${apiDomain}${pathOrUrl}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && !_retry) {
    return zohoFetch(pathOrUrl, init, true);
  }
  return res;
}

/** zohoFetch + JSON parse + non-2xx → ZohoApiError. 204 returns null. */
export async function zohoJson<T = unknown>(pathOrUrl: string, init: RequestInit = {}): Promise<T | null> {
  const res = await zohoFetch(pathOrUrl, init);
  if (res.status === 204) return null;
  const body = (await res.json().catch(() => null)) as T;
  if (!res.ok) throw new ZohoApiError(res.status, body);
  return body;
}
