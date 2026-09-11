# Database migrations

Numbered SQL migrations, applied in filename order by the tiny runner in
[`../src/lib/migrations.ts`](../src/lib/migrations.ts).

```
NNNN_snake_case.sql        # NNNN = zero-padded sequence, e.g. 0010_add_x.sql
```

## Commands

```bash
cd server
npm run migrate            # apply all pending migrations
npm run migrate:status     # list applied / pending / drift, change nothing
```

In production, `prestart` runs `node dist/migrate.js up` automatically before the
server starts (see `package.json`).

## Rules

- **Never edit a migration once it has been applied anywhere.** The runner stores
  a SHA-256 of each file in `schema_migrations`; a changed file is reported as
  *drift* and blocks `migrate up`. To change the schema, add a new migration.
- Each file runs inside its own transaction and is recorded in
  `schema_migrations (version, filename, checksum, applied_at)` on success.
- The server does **not** migrate on boot. `assertSchemaReady()` only checks, and
  refuses to start if the database is behind.
- `0001_init.sql` reproduces the pre-migration schema (it uses `IF NOT EXISTS` /
  `ON CONFLICT` guards) so it is a safe no-op on a database the old boot-time
  `initDb()` had already created.

## Current set

| File | Adds |
| --- | --- |
| `0001_init.sql` | roles, users, teams, team_memberships, zoho_connection, oauth_states (+ role seed & FK) |
| `0002_foundation_hardening.sql` | `set_updated_at()` trigger fn, `updated_at`/`deleted_at`/`is_active` on users & teams, `teams.leader_user_id` → `ON DELETE RESTRICT` |
| `0003_reference_data.sql` | patient_statuses (seeded), clinics, hotels, procedure_catalog |
| `0004_patients.sql` | patients, patient_assignments + dedup constraints |
| `0005_treatment_plans.sql` | treatment_plans, treatment_visits, treatment_plan_procedures |
| `0006_payments.sql` | payments (simple record — no allocations/ledger) |
| `0007_documents.sql` | documents (metadata only), document_links (polymorphic) |
| `0008_logistics.sql` | flights, hotel_reservations, transfers |
| `0009_activity_log.sql` | activity_log (append-only audit trail) |
| `0010_multi_currency_pricing.sql` | `procedure_catalog.price_usd/eur/aud` (independent per-currency prices); `treatment_visits.calculated_total/override_total/final_total` (generated) + `currency` — schema readiness for the multi-currency + All-on-X + per-visit-override pricing architecture in `src/lib/pricing/engine.ts` (not yet wired to any API — the wizard still prices/PDFs client-side) |
