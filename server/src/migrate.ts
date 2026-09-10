/**
 * PostgreSQL migration CLI.
 *
 *   npm run migrate           # apply all pending migrations (alias: `up`)
 *   npm run migrate:status    # show applied / pending / drift, apply nothing
 *
 * In production `prestart` runs `node dist/migrate.js up` before the server boots.
 */
import { config } from './config.js';
import { pool } from './db.js';
import { MIGRATIONS_DIR, describeDbError, inspectSchema, runPendingMigrations } from './lib/migrations.js';

function maskedDbUrl(): string {
  return config.databaseUrl.replace(/(:\/\/)[^@/]*@/, '$1***@');
}

async function status(): Promise<void> {
  console.log(`migrations dir : ${MIGRATIONS_DIR}`);
  console.log(`database       : ${maskedDbUrl()}`);
  const { applied, pending, drift } = await inspectSchema(pool);
  console.log(`\napplied (${applied.length}):`);
  for (const a of applied) {
    console.log(`  ${a.version}  ${a.filename}  @ ${a.applied_at.toISOString()}`);
  }
  console.log(`\npending (${pending.length}):`);
  for (const p of pending) console.log(`  ${p.version}  ${p.filename}`);
  if (drift.length > 0) {
    console.log(`\n! drift (${drift.length}) — applied files changed on disk:`);
    for (const d of drift) console.log(`  ${d.version}  ${d.filename}`);
    process.exitCode = 1;
  }
}

async function up(): Promise<void> {
  const done = await runPendingMigrations(pool);
  if (done.length === 0) console.log('[migrate] database is up to date');
  else console.log(`[migrate] applied ${done.length} migration(s):\n  ${done.join('\n  ')}`);
}

const cmd = process.argv[2] ?? 'up';
const run = cmd === 'status' ? status : up;

run()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(`[migrate] ${describeDbError(err)}`);
    await pool.end().catch(() => {});
    process.exit(1);
  });
