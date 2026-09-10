/**
 * Centralized status vocabularies for the operational model.
 *
 * These arrays are the single source of truth for the `CHECK (... IN (...))`
 * constraints in the SQL migrations — keep them in sync with
 * `server/migrations/*.sql`. Application code should import from here rather than
 * hard-coding status strings (same pattern as `auth/roles.ts`).
 *
 * This file is intentionally just constants + tiny guards — no workflow engine.
 */

function makeGuard<T extends string>(values: readonly T[]) {
  const set = new Set<string>(values);
  return (v: unknown): v is T => typeof v === 'string' && set.has(v);
}

// --- patients ------------------------------------------------------------
// Mirrors the seeded `patient_statuses` lookup table (migration 0003).
export const PATIENT_STATUSES = [
  'lead',
  'quoted',
  'confirmed',
  'scheduled',
  'arrived',
  'in_treatment',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
export const isPatientStatus = makeGuard(PATIENT_STATUSES);
/** Statuses at/after which the planning workflow is relevant. */
export const PLANNING_ACTIVE_STATUSES: readonly PatientStatus[] = [
  'confirmed',
  'scheduled',
  'arrived',
  'in_treatment',
];

// --- treatment plans / visits -----------------------------------------
export const TREATMENT_MODALITIES = ['dental', 'plastic_surgery'] as const;
export type TreatmentModality = (typeof TREATMENT_MODALITIES)[number];
export const isTreatmentModality = makeGuard(TREATMENT_MODALITIES);

export const TREATMENT_PLAN_STATUSES = [
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TreatmentPlanStatus = (typeof TREATMENT_PLAN_STATUSES)[number];
export const isTreatmentPlanStatus = makeGuard(TREATMENT_PLAN_STATUSES);

export const TREATMENT_VISIT_STATUSES = [
  'planned',
  'scheduled',
  'in_progress',
  'done',
  'cancelled',
] as const;
export type TreatmentVisitStatus = (typeof TREATMENT_VISIT_STATUSES)[number];
export const isTreatmentVisitStatus = makeGuard(TREATMENT_VISIT_STATUSES);

export const PLAN_PAYMENT_METHODS = ['visit_payments', 'installments'] as const;
export type PlanPaymentMethod = (typeof PLAN_PAYMENT_METHODS)[number];

// --- payments ---------------------------------------------------------
export const PAYMENT_TYPES = ['deposit', 'balance', 'installment', 'refund', 'other'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export const isPaymentType = makeGuard(PAYMENT_TYPES);

export const PAYMENT_METHODS = [
  'bank_transfer',
  'credit_card',
  'cash',
  'stripe',
  'paypal',
  'wise',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = makeGuard(PAYMENT_METHODS);

export const PAYMENT_STATUSES = ['pending', 'received', 'failed', 'cancelled', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const isPaymentStatus = makeGuard(PAYMENT_STATUSES);

// --- documents ------------------------------------------------------------
export const DOCUMENT_TYPES = [
  'ct_scan',
  'xray',
  'panoramic',
  'photo',
  'passport',
  'visa',
  'id_card',
  'flight_ticket',
  'hotel_voucher',
  'payment_proof',
  'invoice',
  'consent_form',
  'medical_report',
  'prescription',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const isDocumentType = makeGuard(DOCUMENT_TYPES);

export const STORAGE_PROVIDERS = [
  's3',
  'gcs',
  'azure_blob',
  'r2',
  'local',
  'zoho_workdrive',
  'other',
] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export const DOCUMENT_STATUSES = ['pending', 'available', 'quarantined', 'deleted'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_LINK_ENTITIES = [
  'patient',
  'treatment_plan',
  'treatment_visit',
  'payment',
  'flight',
  'hotel_reservation',
  'transfer',
] as const;
export type DocumentLinkEntity = (typeof DOCUMENT_LINK_ENTITIES)[number];
export const isDocumentLinkEntity = makeGuard(DOCUMENT_LINK_ENTITIES);

// --- logistics ------------------------------------------------------------
export const FLIGHT_DIRECTIONS = ['inbound', 'outbound', 'internal'] as const;
export type FlightDirection = (typeof FLIGHT_DIRECTIONS)[number];

export const FLIGHT_STATUSES = [
  'planned',
  'booked',
  'ticketed',
  'changed',
  'cancelled',
  'completed',
  'no_show',
] as const;
export type FlightStatus = (typeof FLIGHT_STATUSES)[number];
export const isFlightStatus = makeGuard(FLIGHT_STATUSES);

export const HOTEL_RESERVATION_STATUSES = [
  'requested',
  'pending',
  'booked',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;
export type HotelReservationStatus = (typeof HOTEL_RESERVATION_STATUSES)[number];
export const isHotelReservationStatus = makeGuard(HOTEL_RESERVATION_STATUSES);

export const TRANSFER_TYPES = [
  'airport_pickup',
  'airport_dropoff',
  'hotel_to_clinic',
  'clinic_to_hotel',
  'inter_hotel',
  'other',
] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];
export const isTransferType = makeGuard(TRANSFER_TYPES);

export const TRANSFER_STATUSES = [
  'requested',
  'scheduled',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];
export const isTransferStatus = makeGuard(TRANSFER_STATUSES);

export const LOCATION_TYPES = ['airport', 'hotel', 'clinic', 'other'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

// --- activity log ---------------------------------------------------------
/** Not a CHECK constraint (the column is free-form text) — a convention list. */
export const ACTIVITY_ACTIONS = [
  'create',
  'update',
  'delete',
  'restore',
  'status_change',
  'assign',
  'unassign',
  'role_change',
  'team_change',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
