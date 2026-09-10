import { Router, type Request, type Response } from 'express';
import { config, zohoOAuthConfigured } from '../config.js';
import { requireAuth } from '../auth/middleware.js';
import { buildAuthorizeUrl, consumeOAuthState, createOAuthState, exchangeCodeForTokens } from './oauth.js';
import { clearConnection, getConnection, saveConnection } from './tokenStore.js';
import { ZohoApiError, ZohoNotConnectedError } from './client.js';
import { getDealsForEmail, listAllZohoUsers } from './deals.js';

export const zohoRouter = Router();

function appRedirect(res: Response, query: Record<string, string>): void {
  const url = new URL(config.appOrigin);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  res.redirect(url.toString());
}

// GET /api/zoho/status
zohoRouter.get('/status', requireAuth, async (_req: Request, res: Response) => {
  const conn = await getConnection();
  res.json({
    configured: zohoOAuthConfigured(),
    connected: Boolean(conn),
    connectedBy: conn?.connectedBy ?? null,
    scope: conn?.scope ?? config.zoho.scopes,
    updatedAt: conn?.updatedAt ?? null,
    accountsBase: config.zoho.accountsBase,
    apiBase: conn?.apiDomain ?? config.zoho.apiBase,
    redirectUri: config.zoho.redirectUri,
  });
});

// GET /api/zoho/connect  — begins the OAuth consent flow (browser navigation).
// The frontend hits this with ?access_token=<jwt> since it is a top-level redirect.
zohoRouter.get('/connect', requireAuth, async (req: Request, res: Response) => {
  if (!zohoOAuthConfigured()) {
    return appRedirect(res, { zoho: 'error', reason: 'not_configured' });
  }
  const state = await createOAuthState(req.user!.sub);
  return res.redirect(buildAuthorizeUrl(state));
});

// GET /api/zoho/callback — Zoho redirects here after the user consents.
zohoRouter.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) return appRedirect(res, { zoho: 'error', reason: String(error) });
  if (!code || !state) return appRedirect(res, { zoho: 'error', reason: 'missing_code' });

  const { ok, userId } = await consumeOAuthState(state);
  if (!ok) return appRedirect(res, { zoho: 'error', reason: 'bad_state' });

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Zoho only returns a refresh token on the first consent for a client+user.
      // `prompt=consent` in buildAuthorizeUrl should force it; if it is still missing,
      // the user must remove the app under Zoho > Connected Apps and retry.
      return appRedirect(res, { zoho: 'error', reason: 'no_refresh_token' });
    }
    const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    await saveConnection({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiresAt,
      apiDomain: tokens.api_domain ?? config.zoho.apiBase,
      scope: tokens.scope ?? config.zoho.scopes,
      connectedBy: userId ? `user:${userId}` : 'unknown',
    });
    return appRedirect(res, { zoho: 'connected' });
  } catch (err) {
    console.error('[zoho] token exchange failed', err);
    return appRedirect(res, { zoho: 'error', reason: 'exchange_failed' });
  }
});

// POST /api/zoho/disconnect
zohoRouter.post('/disconnect', requireAuth, async (_req: Request, res: Response) => {
  await clearConnection();
  res.json({ ok: true });
});

// GET /api/zoho/users — Zoho CRM user directory (useful for a future admin mapping screen).
zohoRouter.get('/users', requireAuth, async (_req: Request, res: Response) => {
  try {
    const users = await listAllZohoUsers();
    res.json({ users });
  } catch (err) {
    handleZohoError(res, err);
  }
});

// GET /api/deals — deals owned by the signed-in user (matched by email to a Zoho user).
export async function dealsHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await getDealsForEmail(req.user!.email);
    res.json({
      email: req.user!.email,
      zohoUser: result.zohoUser,
      count: result.deals.length,
      deals: result.deals,
      ...(result.reason ? { reason: result.reason, message: noZohoUserMessage(req.user!.email) } : {}),
    });
  } catch (err) {
    handleZohoError(res, err);
  }
}

function noZohoUserMessage(email: string): string {
  return `No Zoho CRM user has the email ${email}, so no deals could be matched. Ask an admin to add you as a Zoho user with this email, or map your account manually.`;
}

function handleZohoError(res: Response, err: unknown): void {
  if (err instanceof ZohoNotConnectedError) {
    res.status(409).json({ error: 'zoho_not_connected', message: err.message });
    return;
  }
  if (err instanceof ZohoApiError) {
    res.status(502).json({ error: 'zoho_api_error', status: err.status, body: err.body });
    return;
  }
  console.error('[zoho] unexpected error', err);
  res.status(500).json({ error: 'internal_error', message: (err as Error)?.message ?? 'Unknown error' });
}
