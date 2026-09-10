# Backend API — auth + roles + Zoho CRM

Express + TypeScript service that gives the React app:

1. **App accounts** — email/password sign-up & sign-in, scrypt-hashed passwords, JWT sessions.
2. **Roles & teams** — `coordinator` (default), `team_leader`, `planning_manager`; teams and
   team membership; server-side role authorization. See [Roles & teams](#roles--teams).
3. **Zoho CRM integration** — a server-side OAuth2 connection to Zoho, and a `/api/deals`
   endpoint that returns the deals **owned by the signed-in user** (matched by email to a
   Zoho CRM user).

Data lives in **PostgreSQL** (`DATABASE_URL`).

---

## Quick start

```bash
cd server
cp .env.example .env          # then edit .env (see below)
npm install                    # if prompted, approve the esbuild build script

# You need a PostgreSQL instance. Quickest local option:
docker run -d --name tpg-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=treatment_plan \
  -p 5432:5432 postgres:16
# ...which matches the default DATABASE_URL in .env.example.

npm run migrate                 # create/update the schema (numbered SQL migrations)
npm run dev                     # http://localhost:8787
```

The server does **not** touch the schema on startup — it only checks the database
is migrated and refuses to boot otherwise. See [Database & migrations](#database--migrations).

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
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/treatment_plan` |
| `DATABASE_SSL` | `1` to enable TLS (needed on Render/Heroku/Supabase/Neon) | `0` |
| `DATABASE_POOL_MAX` | Max pooled connections | `10` |
| `SIGNUP_ALLOWED_DOMAINS` | Comma-separated email-domain allowlist for sign-up (empty = open) | _(empty)_ |
| `ZOHO_ACCOUNTS_BASE` | Zoho accounts host for your data center | `https://accounts.zoho.com` |
| `ZOHO_API_BASE` | Zoho API host for your data center | `https://www.zohoapis.com` |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` | OAuth client from the Zoho API console | _(empty)_ |
| `ZOHO_REDIRECT_URI` | Must match the client's Authorized Redirect URI exactly | `http://localhost:8787/api/zoho/callback` |
| `ZOHO_SCOPES` | Scopes requested at consent | `ZohoCRM.modules.deals.READ,ZohoCRM.users.READ,ZohoCRM.settings.READ` |
| `ZOHO_REFRESH_TOKEN` | Optional — a pre-issued refresh token; skips the browser consent flow | _(empty)_ |

Never commit a real `DATABASE_URL` or any Zoho secret — `.env` is git-ignored; on
Render they are set in the dashboard (`sync: false` in `render.yaml`).

---

## Database & migrations

PostgreSQL, schema managed by **numbered SQL migrations** in
[`migrations/`](migrations/) — see [`migrations/README.md`](migrations/README.md).

```bash
npm run migrate           # apply all pending migrations
npm run migrate:status     # applied / pending / drift — changes nothing
```

- Each migration runs once, in its own transaction, recorded in `schema_migrations`
  with a checksum. **Never edit an applied migration — add a new one.**
- `db.ts` issues no DDL. The server calls `assertSchemaReady()` on boot and exits
  if the database is behind. In production `prestart` runs the migrations before
  `npm start`.
- `0001_init.sql` is the pre-migration baseline (roles/users/teams/…); `0002`–`0009`
  add the operational model (foundation hardening, reference data, patients,
  treatment plans, payments, documents, logistics, activity log).
- Requires PostgreSQL **13+** (uses `gen_random_uuid()` from core, identity and
  stored-generated columns). Render provisions PostgreSQL 16.

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

## Roles & teams

Three roles, defined once in [`src/auth/roles.ts`](src/auth/roles.ts) (the frontend mirrors
the list in `src/lib/api.ts`). Nothing else hard-codes role strings.

| Role | Capabilities (today) |
| --- | --- |
| `coordinator` | Own operational work: build treatment plans, suggest prices, use Zoho. **Unchanged.** |
| `team_leader` | Own operational work **+** visibility into the coordinators on the team(s) they lead. |
| `planning_manager` | Planning/operations visibility (hotel, transfers, logistics — workflow not built yet). |

**Data model** (migration `0001_init.sql`):

- `roles` — lookup table seeded from `ROLE_LIST`; `users.role` is a foreign key into it.
- `teams` — `id`, `name`, `kind` (`coordinator` | `planning`), `leader_user_id` → `users.id`.
- `team_memberships` — `team_id` × `user_id`, unique per pair, indexed both ways.

`Team Leader → Team → Coordinators` and `Planning Manager → Planning Team` are expressed with
foreign keys; the confirmed-patient → planning workflow is intentionally **not** built yet.

**Authorization** is server-side (`src/auth/middleware.ts`), never UI-only:

- `requireRole(...roles)` — 401 if unauthenticated, 403 if the live DB role isn't allowed.
  Re-reads the role from the DB so a promotion/demotion applies without re-login.
- `requireTeamLeader`, `requirePlanningManager` — the two convenience guards.
- `loadCurrentUser` — attaches `req.currentUser` (fresh id/email/name/role) without gating.

**Assigning elevated roles.** Signup always creates a `coordinator` — the role is never read
from the request body. Grant elevated roles with the CLI (run against the same `DATABASE_URL`):

```bash
cd server
npm run role -- --list                                  # show all users + roles
npm run role -- lead@dutyclinic.com team_leader
npm run role -- ops@dutyclinic.com  planning_manager

npm run team -- create "North Team" coordinator lead@dutyclinic.com
npm run team -- add    "North Team" coord@dutyclinic.com
npm run team -- create "Planning"   planning     ops@dutyclinic.com
npm run team -- list
npm run team -- members "North Team"
```

---

## API

### Auth
| Method & path | Body | Returns |
| --- | --- | --- |
| `POST /api/auth/signup` | `{ email, password, name? }` | `{ token, user }` — always role `coordinator` |
| `POST /api/auth/login` | `{ email, password }` | `{ token, user }` |
| `GET /api/auth/me` | _(Bearer token)_ | `{ user }` |
| `POST /api/auth/logout` | — | `{ ok: true }` (stateless; client drops the token) |

Send the token as `Authorization: Bearer <token>` on every protected call.

### Team Leader — foundation (all require role `team_leader`)
| Method & path | Notes |
| --- | --- |
| `GET /api/team` | `{ teams }` — teams the caller leads. |
| `GET /api/team/members` | `{ members }` across those teams; `?teamId=` narrows to one you lead. |
| `GET /api/team/activity` | Typed **stub** (`implemented: false`) — coordinator activity feed, not built yet. |

### Planning Manager — foundation (all require role `planning_manager`)
| Method & path | Notes |
| --- | --- |
| `GET /api/planning` | `{ planningTeams, alsoMemberOf, teamSize }`. |
| `GET /api/planning/patients` | Typed **stub** — planning patient handling, not built yet. |
| `GET /api/planning/confirmed` | Typed **stub** — confirmed-patient intake from Zoho, not wired yet. |

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
server/
  migrations/           numbered SQL migrations (0001_init.sql … 0009_activity_log.sql) + README
  src/
  config.ts            env loading + validation
  db.ts                pg Pool + query/queryOne/withTransaction + row types (NO DDL)
  migrate.ts            migration CLI (`npm run migrate`)
  index.ts             Express app wiring + async boot (assertSchemaReady, graceful shutdown)
  lib/
    migrations.ts       migration runner: load files, apply pending, assertSchemaReady
  domain/
    status.ts           centralized status vocabularies (mirrors the CHECK constraints)
  auth/
    roles.ts           THE role definition — ROLES, capabilities, team kinds
    passwords.ts       scrypt hash/verify (no native bcrypt build)
    jwt.ts             session token sign/verify
    middleware.ts      requireAuth / optionalAuth / requireRole / requireTeamLeader / requirePlanningManager
    users.ts           findUserByEmail / setUserRole helpers
    routes.ts          /api/auth/*
  team/
    store.ts           teams + membership queries
    routes.ts          /api/team/*  (requireTeamLeader)
  planning/
    routes.ts          /api/planning/*  (requirePlanningManager)
  scripts/
    set-role.ts        `npm run role`
    manage-team.ts     `npm run team`
  zoho/
    oauth.ts           consent URL, code exchange, refresh, CSRF state
    tokenStore.ts      the single org-wide Zoho connection row
    client.ts          authorized fetch wrapper with auto-refresh
    deals.ts           email → Zoho user → deals (COQL)
    routes.ts          /api/zoho/* and the /api/deals handler
```

## Production build

```bash
npm run build     # tsc -> dist/  (also compiles dist/migrate.js)
npm start          # `prestart` runs `node dist/migrate.js up`, then node dist/index.js
```

Set `DATABASE_URL` (and `DATABASE_SSL=1` on managed hosts). `render.yaml` at the repo root
provisions a Postgres instance and wires it to this service; `npm start` there applies
pending migrations via `prestart` before the API comes up.
