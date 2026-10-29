/**
 * Patient follow-up records ("My Patients") — data access.
 *
 *   patient_records          one row per saved patient, owned by one coordinator.
 *   patient_record_entries   append-only timeline: the quote snapshot(s), then notes.
 *
 * Every function takes the signed-in user's id and only ever touches that user's
 * own records — a record id belonging to someone else behaves exactly like one
 * that doesn't exist.
 */
import { query, withTransaction } from '../db.js';

/** What was quoted, exactly as the PDF showed it. Validated in `parseQuoteSnapshot`. */
export interface QuoteSnapshot {
  module: 'dental' | 'plastic';
  pdf: 'simple' | 'premium';
  currency: string;
  language: string;
  options: Array<{ name: string; lines: string[]; total: number }>;
  /** Short remark about how it was quoted, e.g. "Full package price". */
  remark?: string;
}

export const NOTE_TOPICS = ['discussion', 'objection', 'price', 'next_step'] as const;
export type NoteTopic = (typeof NOTE_TOPICS)[number];

export interface PatientRecordSummary {
  id: number;
  patientName: string;
  createdAt: string;
  updatedAt: string;
  noteCount: number;
  latestQuote: QuoteSnapshot | null;
}

export interface TimelineEntry {
  id: number;
  kind: 'quote' | 'note';
  topic: NoteTopic | null;
  body: string | null;
  quote: QuoteSnapshot | null;
  /** A quote entry that kept its editable plan — it can be re-opened with "Open & update". */
  hasPlan: boolean;
  authorName: string;
  createdAt: string;
}

export interface PatientRecord extends Omit<PatientRecordSummary, 'noteCount' | 'latestQuote'> {
  entries: TimelineEntry[];
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

interface EntryRow {
  id: number;
  kind: 'quote' | 'note';
  topic: NoteTopic | null;
  body: string | null;
  quote: QuoteSnapshot | null;
  has_plan: boolean;
  author_name: string;
  created_at: Date;
}

function toEntry(row: EntryRow): TimelineEntry {
  return {
    id: row.id,
    kind: row.kind,
    topic: row.topic,
    body: row.body,
    quote: row.quote,
    hasPlan: row.has_plan,
    authorName: row.author_name,
    createdAt: iso(row.created_at),
  };
}

const ENTRY_COLUMNS = `e.id, e.kind, e.topic, e.body, e.quote, (e.plan IS NOT NULL) AS has_plan, e.created_at,
  COALESCE(NULLIF(u.name, ''), u.email) AS author_name`;

/** The coordinator's live records, most recently active first. */
export async function listRecords(coordinatorId: number): Promise<PatientRecordSummary[]> {
  const { rows } = await query<{
    id: number;
    patient_name: string;
    created_at: Date;
    updated_at: Date;
    note_count: number;
    latest_quote: QuoteSnapshot | null;
  }>(
    `SELECT r.id, r.patient_name, r.created_at, r.updated_at,
            (SELECT count(*)::int FROM patient_record_entries n WHERE n.record_id = r.id AND n.kind = 'note') AS note_count,
            (SELECT q.quote FROM patient_record_entries q WHERE q.record_id = r.id AND q.kind = 'quote'
              ORDER BY q.created_at DESC, q.id DESC LIMIT 1) AS latest_quote
       FROM patient_records r
      WHERE r.coordinator_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.updated_at DESC, r.id DESC`,
    [coordinatorId],
  );
  return rows.map((row) => ({
    id: row.id,
    patientName: row.patient_name,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    noteCount: row.note_count,
    latestQuote: row.latest_quote,
  }));
}

/** One record with its full timeline in order (oldest first), or null if not the caller's. */
export async function getRecord(coordinatorId: number, recordId: number): Promise<PatientRecord | null> {
  const { rows: records } = await query<{ id: number; patient_name: string; created_at: Date; updated_at: Date }>(
    `SELECT id, patient_name, created_at, updated_at FROM patient_records
      WHERE id = $1 AND coordinator_id = $2 AND deleted_at IS NULL`,
    [recordId, coordinatorId],
  );
  const record = records[0];
  if (!record) return null;
  const { rows: entries } = await query<EntryRow>(
    `SELECT ${ENTRY_COLUMNS}
       FROM patient_record_entries e JOIN users u ON u.id = e.author_id
      WHERE e.record_id = $1
      ORDER BY e.created_at, e.id`,
    [recordId],
  );
  return {
    id: record.id,
    patientName: record.patient_name,
    createdAt: iso(record.created_at),
    updatedAt: iso(record.updated_at),
    entries: entries.map(toEntry),
  };
}

/** Creates a record whose timeline starts with `quote`. Returns the new record id. */
export async function createRecordWithQuote(
  coordinatorId: number,
  patientName: string,
  quote: QuoteSnapshot,
  plan: EditablePlan | null,
): Promise<number> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      'INSERT INTO patient_records (coordinator_id, patient_name) VALUES ($1, $2) RETURNING id',
      [coordinatorId, patientName],
    );
    const recordId = rows[0].id;
    await client.query(
      `INSERT INTO patient_record_entries (record_id, author_id, kind, quote, plan) VALUES ($1, $2, 'quote', $3, $4)`,
      [recordId, coordinatorId, JSON.stringify(quote), plan ? JSON.stringify(plan) : null],
    );
    return recordId;
  });
}

export type NewEntry =
  | { kind: 'quote'; quote: QuoteSnapshot; plan: EditablePlan | null }
  | { kind: 'note'; body: string; topic: NoteTopic | null };

/** Appends to the caller's record's timeline. Null when the record isn't the caller's. */
export async function addEntry(coordinatorId: number, recordId: number, entry: NewEntry): Promise<TimelineEntry | null> {
  return withTransaction(async (client) => {
    const owned = await client.query(
      `SELECT id FROM patient_records WHERE id = $1 AND coordinator_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [recordId, coordinatorId],
    );
    if (owned.rowCount === 0) return null;
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO patient_record_entries (record_id, author_id, kind, topic, body, quote, plan)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        recordId,
        coordinatorId,
        entry.kind,
        entry.kind === 'note' ? entry.topic : null,
        entry.kind === 'note' ? entry.body : null,
        entry.kind === 'quote' ? JSON.stringify(entry.quote) : null,
        entry.kind === 'quote' && entry.plan ? JSON.stringify(entry.plan) : null,
      ],
    );
    // Touch the record so it rises to the top of "My Patients" (the trigger sets the time).
    await client.query('UPDATE patient_records SET updated_at = now() WHERE id = $1', [recordId]);
    const { rows: full } = await client.query<EntryRow>(
      `SELECT ${ENTRY_COLUMNS} FROM patient_record_entries e JOIN users u ON u.id = e.author_id WHERE e.id = $1`,
      [rows[0].id],
    );
    return toEntry(full[0]);
  });
}

/** The editable plan behind one of the caller's quote entries, or null if not theirs / none kept. */
export async function getPlan(
  coordinatorId: number,
  recordId: number,
  entryId: number,
): Promise<{ patientName: string; quote: QuoteSnapshot; plan: EditablePlan } | null> {
  const { rows } = await query<{ patient_name: string; quote: QuoteSnapshot; plan: EditablePlan }>(
    `SELECT r.patient_name, e.quote, e.plan
       FROM patient_record_entries e JOIN patient_records r ON r.id = e.record_id
      WHERE e.id = $1 AND r.id = $2 AND r.coordinator_id = $3 AND r.deleted_at IS NULL
        AND e.kind = 'quote' AND e.plan IS NOT NULL`,
    [entryId, recordId, coordinatorId],
  );
  const row = rows[0];
  return row ? { patientName: row.patient_name, quote: row.quote, plan: row.plan } : null;
}

// ---- validation --------------------------------------------------------------

/** The wizard / module state a quote was generated from. Opaque to the server beyond its
 *  module tag — the frontend owns its shape (see src/lib/editablePlan.ts). */
export type EditablePlan = { module: 'dental' | 'plastic'; version: number } & Record<string, unknown>;

const MAX_PLAN_CHARS = 300_000;

/** undefined/null → no plan (null); a valid plan matching the quote's module; otherwise 'invalid'. */
export function parseEditablePlan(value: unknown, module: QuoteSnapshot['module']): EditablePlan | null | 'invalid' {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return 'invalid';
  const plan = value as Record<string, unknown>;
  if (plan.module !== module || typeof plan.version !== 'number') return 'invalid';
  if (JSON.stringify(plan).length > MAX_PLAN_CHARS) return 'invalid';
  return plan as EditablePlan;
}

const MAX_OPTIONS = 10;
const MAX_LINES = 60;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

/** A clean `QuoteSnapshot` from an untrusted request body, or null if it's malformed. */
export function parseQuoteSnapshot(value: unknown): QuoteSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.module !== 'dental' && v.module !== 'plastic') return null;
  if (v.pdf !== 'simple' && v.pdf !== 'premium') return null;
  if (typeof v.currency !== 'string' || !/^[A-Z]{3}$/.test(v.currency)) return null;
  const language = text(v.language, 40);
  if (!language) return null;
  if (!Array.isArray(v.options) || v.options.length === 0 || v.options.length > MAX_OPTIONS) return null;

  const options: QuoteSnapshot['options'] = [];
  for (const raw of v.options) {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const name = text(o.name, 200);
    const total = Number(o.total);
    if (!name || !Number.isFinite(total) || total < 0) return null;
    if (!Array.isArray(o.lines) || o.lines.length > MAX_LINES) return null;
    const lines: string[] = [];
    for (const line of o.lines) {
      const clean = text(line, 300);
      if (!clean) return null;
      lines.push(clean);
    }
    options.push({ name, lines, total });
  }

  const snapshot: QuoteSnapshot = { module: v.module, pdf: v.pdf, currency: v.currency, language, options };
  if (v.remark !== undefined) {
    const remark = text(v.remark, 300);
    if (!remark) return null;
    snapshot.remark = remark;
  }
  return snapshot;
}
