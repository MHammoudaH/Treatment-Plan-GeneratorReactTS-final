import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool. The connection string comes from `DATABASE_URL`
 * (see `config.ts`). On managed hosts (Render, Heroku, Supabase, …) TLS is
 * required but the chain is not always verifiable from the app container, so
 * `DATABASE_SSL=1` enables SSL with `rejectUnauthorized: false`.
 *
 * Schema changes are handled by numbered SQL migrations in `server/migrations/`
 * (run with `npm run migrate`), NOT here — this module never issues DDL.
 * `assertSchemaReady()` in `lib/migrations.ts` is what the server calls on boot.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: config.databasePoolMax,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

type Params = ReadonlyArray<unknown>;

/** Run a parameterised query and return the full result. */
export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: Params,
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[] | undefined);
}

/** Run a query and return the first row, or `null` if there were none. */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: Params,
): Promise<T | null> {
  const res = await pool.query<T>(text, params as unknown[] | undefined);
  return res.rows[0] ?? null;
}

/** Run `fn` inside a transaction, committing on success and rolling back on throw. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// --- row types --------------------------------------------------------
// Shapes returned by `SELECT *`. `pg` returns `integer` as number, `numeric` as
// string, `timestamptz` as Date, `jsonb` already parsed. Kept in step with the
// migrations in `server/migrations/`.

export interface RoleRow {
  key: string;
  label: string;
  sort_order: number;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  deleted_at: Date | null;
  is_active: boolean;
  phone: string | null;
  job_title: string | null;
}

export interface TeamRow {
  id: number;
  name: string;
  kind: string;
  leader_user_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TeamMembershipRow {
  id: number;
  team_id: number;
  user_id: number;
  created_at: Date;
}

export interface ZohoConnectionRow {
  id: 1;
  refresh_token: string;
  access_token: string | null;
  expires_at: string | number;
  api_domain: string | null;
  scope: string | null;
  connected_by: string | null;
  updated_at: Date;
}

export interface PatientStatusRow {
  key: string;
  label: string;
  sort_order: number;
  is_terminal: boolean;
  triggers_planning: boolean;
}

export interface PatientRow {
  id: number;
  public_id: string;
  full_name: string;
  passport_name: string | null;
  passport_number: string | null;
  nationality: string | null;
  date_of_birth: string | null; // date -> 'YYYY-MM-DD'
  gender: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string | null;
  country_of_residence: string | null;
  status: string;
  confirmed_at: Date | null;
  arrival_date: string | null;
  departure_date: string | null;
  assigned_coordinator_id: number;
  team_id: number;
  zoho_deal_id: string | null;
  zoho_contact_id: string | null;
  source: string | null;
  notes: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PatientAssignmentRow {
  id: number;
  patient_id: number;
  coordinator_id: number;
  team_id: number;
  assigned_by: number;
  assigned_at: Date;
  unassigned_at: Date | null;
  reason: string | null;
}

export interface TreatmentPlanRow {
  id: number;
  public_id: string;
  patient_id: number;
  modality: string;
  title: string | null;
  status: string;
  version: number;
  is_current: boolean;
  currency: string;
  estimated_total: string | null; // numeric
  payment_method: string | null;
  tooth_plan: unknown | null; // jsonb
  notes: string | null;
  created_by: number;
  approved_by: number | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TreatmentVisitRow {
  id: number;
  patient_id: number;
  treatment_plan_id: number | null;
  clinic_id: number | null;
  sequence_no: number;
  title: string | null;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TreatmentPlanProcedureRow {
  id: number;
  treatment_plan_id: number;
  procedure_code: string | null;
  name: string;
  category: string | null;
  quantity: string; // numeric
  unit: string | null;
  unit_price: string; // numeric
  currency: string;
  line_total: string | null; // numeric
  area_ref: unknown | null; // jsonb
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentRow {
  id: number;
  patient_id: number;
  treatment_plan_id: number | null;
  treatment_visit_id: number | null;
  amount: string; // numeric
  currency: string;
  payment_type: string;
  method: string | null;
  status: string;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  recorded_by: number;
  voided_at: Date | null;
  voided_by: number | null;
  void_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentRow {
  id: number;
  public_id: string;
  patient_id: number;
  doc_type: string;
  title: string | null;
  description: string | null;
  storage_provider: string;
  storage_bucket: string | null;
  storage_key: string;
  storage_region: string | null;
  stable_url: string | null;
  file_name: string | null;
  content_type: string | null;
  byte_size: string | null; // bigint
  checksum_sha256: string | null;
  status: string;
  uploaded_by: number;
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface DocumentLinkRow {
  id: number;
  document_id: number;
  entity_type: string;
  entity_id: number;
  link_role: string | null;
  created_by: number;
  created_at: Date;
}

export interface FlightRow {
  id: number;
  patient_id: number;
  treatment_visit_id: number | null;
  direction: string;
  airline: string | null;
  airline_iata: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_at: Date | null;
  arrival_at: Date | null;
  booking_reference: string | null;
  ticket_number: string | null;
  status: string;
  booked_by: number | null;
  updated_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface HotelReservationRow {
  id: number;
  patient_id: number;
  treatment_visit_id: number | null;
  hotel_id: number | null;
  hotel_name: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  room_type: string | null;
  rooms: number;
  guests: number;
  confirmation_number: string | null;
  status: string;
  price: string | null; // numeric
  currency: string | null;
  created_by: number;
  updated_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TransferRow {
  id: number;
  patient_id: number;
  treatment_visit_id: number | null;
  transfer_type: string;
  from_type: string | null;
  from_name: string | null;
  to_type: string | null;
  to_name: string | null;
  related_flight_id: number | null;
  related_hotel_reservation_id: number | null;
  scheduled_at: Date;
  completed_at: Date | null;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_description: string | null;
  vehicle_plate: string | null;
  created_by: number;
  updated_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ActivityLogRow {
  id: number;
  actor_user_id: number | null;
  actor_role: string | null;
  entity_type: string;
  entity_id: number;
  patient_id: number | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  changed_fields: unknown | null; // jsonb
  summary: string | null;
  context: unknown | null; // jsonb
  created_at: Date;
}
