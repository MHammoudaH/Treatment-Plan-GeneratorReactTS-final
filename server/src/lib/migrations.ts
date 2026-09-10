/**
 * Tiny PostgreSQL migration runner.
 *
 * Migrations are plain numbered SQL files in `server/migrations/` named
 * `NNNN_snake_case.sql`. They are applied in filename order, each inside its own
 * transaction, and recorded in the `schema_migrations` table. A checksum of each
 * file is stored so an accidental edit to an already-applied migration is caught
 * instead of silently ignored.
 *
 * Rules:
 *  - Never edit a migration that has been applied anywhere. Add a new one.
 *  - The server never runs migrations itself; it only *checks* (see
 *    `assertSchemaReady`) and refuses to start against an out-of-date database.
 *  - `npm run migrate` (dev) / `node dist/migrate.js up` (prod, via `prestart`)
 *    is the only thing that changes the schema.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type pg from 'pg';
import { config } from '../config.js';

export const MIGRATIONS_DIR = path.join(config.serverRoot, 'migrations');

const FILE_RE = /^(\d{4})_[a-z0-9_]+\.sql$/;

export interface MigrationFile {
  version: string;
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  filename: string;
  checksum: string;
  applied_at: Date;
}

export interface SchemaState {
  applied: AppliedMigration[];
  pending: MigrationFile[];
  /** Applied migrations whose file content no longer matches what was applied. */
  drift: Array<{ version: string; filename: string }>;
}

/** Anything with a `.query()` — a Pool or a PoolClient. */
type Queryable = Pick<pg.Pool, 'query'>;

/**
 * Readable one-liner for a thrown value. Node's `AggregateError` (raised e.g.
 * when every address for a host refuses the connection) has an empty `.message`,
 * so unwrap it.
 */
export function describeDbError(err: unknown): string {
  if (err instanceof AggregateError) {
    const parts = err.errors.map((e) => (e instanceof Error ? e.message || e.name : String(e)));
    return parts.filter(Boolean).join('; ') || 'AggregateError (connection failed)';
  }
  if (err instanceof Error) return err.message || err.name || String(err);
  return String(err);
}

/** Read and hash every migration file on disk, sorted by version. */
export function loadMigrationFiles(): MigrationFile[] {
  let entries: string[];
  try {
    entries = readdirSync(MIGRATIONS_DIR);
  } catch {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  const files = entries.filter((n) => FILE_RE.test(n)).sort();
  if (files.length === 0) {
    throw new Error(`No migration files (NNNN_name.sql) in ${MIGRATIONS_DIR}`);
  }
  return files.map((filename) => {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    return {
      version: filename.slice(0, 4),
      filename,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    };
  });
}

export async function ensureMigrationsTable(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      filename   text NOT NULL,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function getAppliedMigrations(db: Queryable): Promise<AppliedMigration[]> {
  const { rows } = await db.query<AppliedMigration>(
    'SELECT version, filename, checksum, applied_at FROM schema_migrations ORDER BY version',
  );
  return rows;
}

/** Full picture: what's applied, what's pending, and any checksum drift. */
export async function inspectSchema(db: Queryable): Promise<SchemaState> {
  await ensureMigrationsTable(db);
  const files = loadMigrationFiles();
  const applied = await getAppliedMigrations(db);
  const appliedByVersion = new Map(applied.map((a) => [a.version, a]));
  const pending = files.filter((f) => !appliedByVersion.has(f.version));
  const drift = files
    .filter((f) => {
      const a = appliedByVersion.get(f.version);
      return a !== undefined && a.checksum !== f.checksum;
    })
    .map((f) => ({ version: f.version, filename: f.filename }));
  return { applied, pending, drift };
}

/** Apply every pending migration, each in its own transaction. Returns filenames applied. */
export async function runPendingMigrations(pool: pg.Pool): Promise<string[]> {
  const { pending, drift } = await inspectSchema(pool);
  if (drift.length > 0) {
    throw new Error(
      `Refusing to migrate: applied migration file(s) changed on disk — ` +
        `${drift.map((d) => d.filename).join(', ')}. Never edit an applied migration; add a new one.`,
    );
  }
  const done: string[] = [];
  for (const m of pending) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)',
        [m.version, m.filename, m.checksum],
      );
      await client.query('COMMIT');
      done.push(m.filename);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${m.filename} failed and was rolled back: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  return done;
}

/**
 * Throw unless every migration file on disk has been applied to the database.
 * Does NOT modify the schema — this is what the server calls on boot so it can
 * fail fast (and clearly) instead of running against a stale schema.
 */
export async function assertSchemaReady(pool: pg.Pool): Promise<void> {
  const files = loadMigrationFiles();
  let applied: AppliedMigration[];
  try {
    applied = await getAppliedMigrations(pool);
  } catch (err) {
    throw new Error(
      'Database is not migrated (no schema_migrations table) or is unreachable. ' +
        'Run "npm run migrate" locally, or ensure the deploy runs migrations. ' +
        `[${describeDbError(err)}]`,
    );
  }
  const appliedVersions = new Set(applied.map((a) => a.version));
  const pending = files.filter((f) => !appliedVersions.has(f.version));
  if (pending.length > 0) {
    throw new Error(
      `Database schema is behind by ${pending.length} migration(s): ` +
        `${pending.map((p) => p.filename).join(', ')}. Run "npm run migrate".`,
    );
  }
}
