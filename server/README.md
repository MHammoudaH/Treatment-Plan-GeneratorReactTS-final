# Backend API — auth + Zoho CRM

Express + TypeScript service that gives the React app two things:

1. **App accounts** — email/password sign-up & sign-in, scrypt-hashed passwords, JWT sessions.
2. **Zoho CRM integration** — a server-side OAuth2 connection to Zoho, and a `/api/deals`
   endpoint that returns the deals **owned by the signed-in user** (matched by email to a
   Zoho CRM user).

Data lives in a local SQLite file (`server/data/app.db`, git-ignored).

---

## Quick start

```bash
cd server
cp .env.example .env          # then edit .env (see below)
npm install                    # if prompted, approve better-sqlite3 + esbuild build scripts
npm run dev                     # http://localhost:8787
```

From the repo root you can also run `npm run server` (dev) after `npm run server:install`.

Run the frontend in another terminal (`npm run dev` at the repo root). Vite proxies
`/api/*` to `http://localhost:8787`, so nothing else needs configuring for local dev.

---

## Configuration (`server/.env`)

| Var | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `8787` |
| `APP_ORIGIN` | Frontend origin (CORS + where the Zoho callback bounces back to) | `http://localhost:5173` |
| `SESSION_SECRET` | JWT signing secret — **set a real random value** | `dev-only-change-me` |
| `SESSION_TTL_DAYS` | Session lifetime | `7` |
| `DATABASE_FILE` | SQLite path (relative to `server/`) | `./data/app.db` |
| `SIGNUP_ALLOWED_DOMAINS` | Comma-separated email-domain allowlist for sign-up (empty = open) | _(empty)_ |
| `ZOHO_ACCOUNTS_BASE` | Zoho accounts host for your data center | `https://accounts.zoho.com` |
| `ZOHO_API_BASE` | Zoho API host for your data center | `https://www.zohoapis.com` |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` | OAuth client from the Zoho API console | _(empty)_ |
| `ZOHO_REDIRECT_URI` | Must match the client's Authorized Redirect URI exactly | `http://localhost:8787/api/zoho/callback` |
| `ZOHO_SCOPES` | Scopes requested at consent | `ZohoCRM.modules.deals.READ,ZohoCRM.users.READ,ZohoCRM.settings.READ` |
| `ZOHO_REFRESH_TOKEN` | Optional — a pre-issued refresh token; skips the browser consent flow | _(empty)_ |

### Getting the Zoho OAuth key

1. Go to <https://api-console.zoho.com/> and create a **Server-based Applications** client.
2. Set **Authorized Redirect URIs** to exactly your `ZOHO_REDIRECT_URI`
   (`http://localhost:8787/api/zoho/callback` for local dev).
3. Copy the **Client ID** and **Client Secret** into `server/.env`.
4. Restart the server.
5. In the app, open **My deals → Connect Zoho CRM**. You'll be sent to Zoho to approve the
   scopes; Zoho redirects back and the server stores the **refresh token** in the DB. The
   access token is refreshed automatically from then on.

If your CRM is on a non-US data center, change `ZOHO_ACCOUNTS_BASE` / `ZOHO_API_BASE`
(EU: `.eu`, India: `.in`, Australia: `.com.au`).

> Prefer no browser step? Generate a refresh token with a Zoho **Self Client** using the
> same scopes and put it in `ZOHO_REFRESH_TOKEN` — the server picks it up on boot.

---

## API

### Auth
| Method & path | Body | Returns |
| --- | --- | --- |
| `POST /api/auth/signup` | `{ email, password, name? }` | `{ token, user }` |
| `POST /api/auth/login` | `{ email, password }` | `{ token, user }` |
| `GET /api/auth/me` | _(Bearer token)_ | `{ user }` |
| `POST /api/auth/logout` | — | `{ ok: true }` (stateless; client drops the token) |

Send the token as `Authorization: Bearer <token>` on every protected call.

### Zoho
| Method & path | Notes |
| --- | --- |
| `GET /api/zoho/status` | `{ configured, connected, connectedBy, apiBase, ... }` |
| `GET /api/zoho/connect` | Starts OAuth consent. Top-level redirect, so it also accepts `?access_token=<jwt>`. |
| `GET /api/zoho/callback` | Zoho redirects here; stores the refresh token, then bounces to `APP_ORIGIN?zoho=connected`. |
| `POST /api/zoho/disconnect` | Deletes the stored connection. |
| `GET /api/zoho/users` | Zoho CRM user directory (for a future admin mapping screen). |
| `GET /api/deals` | Deals owned by the signed-in user. `{ email, zohoUser, count, deals[] }`, or `{ reason: "no_zoho_user" }` when no Zoho user has that email. `409 zoho_not_connected` if Zoho isn't linked yet. |

**Deal scoping:** the server looks up the Zoho user whose email equals the signed-in
user's email, then runs a COQL query for `Deals WHERE Owner = <that user id>` (paginated).
To change this to a custom field or an explicit admin mapping, edit
`src/zoho/deals.ts`.

---

## Layout

```
server/src/
  config.ts            env loading + validation
  db.ts                SQLite connection + schema (users, zoho_connection, oauth_states)
  index.ts             Express app wiring
  auth/
    passwords.ts       scrypt hash/verify (no native bcrypt build)
    jwt.ts             session token sign/verify
    middleware.ts      requireAuth / optionalAuth
    routes.ts          /api/auth/*
  zoho/
    oauth.ts           consent URL, code exchange, refresh, CSRF state
    tokenStore.ts      the single org-wide Zoho connection row
    client.ts          authorized fetch wrapper with auto-refresh
    deals.ts           email → Zoho user → deals (COQL)
    routes.ts          /api/zoho/* and the /api/deals handler
```

## Production build

```bash
npm run build     # tsc -> dist/
npm start          # node dist/index.js
```
