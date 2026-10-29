/**
 * Thin client for the backend API (see `server/`).
 *
 * All calls go to `/api/...`; in development Vite proxies that to the Express
 * server on :8787 (see `vite.config.ts`). The session token is a JWT kept in
 * localStorage and sent as `Authorization: Bearer <token>`.
 */

const TOKEN_KEY = 'tpg.session.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode / storage disabled — session simply won't persist */
  }
}

export interface ApiError extends Error {
  status: number;
  code?: string;
  body?: unknown;
}

function makeError(status: number, body: unknown): ApiError {
  const b = (body ?? {}) as Record<string, unknown>;
  const message =
    (typeof b.message === 'string' && b.message) ||
    (typeof b.error === 'string' && b.error) ||
    `Request failed (${status})`;
  const err = new Error(message) as ApiError;
  err.status = status;
  if (typeof b.error === 'string') err.code = b.error;
  err.body = body;
  return err;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) throw makeError(res.status, body);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---- roles ---------------------------------------------------------------
// Mirror of server/src/auth/roles.ts — keep the two in sync.

export const ROLES = {
  COORDINATOR: 'coordinator',
  TEAM_LEADER: 'team_leader',
  PLANNING_MANAGER: 'planning_manager',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  coordinator: 'Coordinator',
  team_leader: 'Team Leader',
  planning_manager: 'Planning Manager',
};

export function isRole(value: unknown): value is Role {
  return value === ROLES.COORDINATOR || value === ROLES.TEAM_LEADER || value === ROLES.PLANNING_MANAGER;
}

// ---- typed endpoints -------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function signup(input: { email: string; password: string; name?: string }): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setToken(data.token);
  return data.user;
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setToken(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export function logout(): void {
  setToken(null);
}

export interface ZohoStatus {
  configured: boolean;
  connected: boolean;
  connectedBy: string | null;
  scope: string;
  updatedAt: string | null;
  accountsBase: string;
  apiBase: string;
  redirectUri: string;
}

export function fetchZohoStatus(): Promise<ZohoStatus> {
  return apiFetch<ZohoStatus>('/zoho/status');
}

export function disconnectZoho(): Promise<{ ok: boolean }> {
  return apiFetch('/zoho/disconnect', { method: 'POST' });
}

/** Full URL for the OAuth consent flow — a top-level browser navigation, so the
 *  session token rides along as a query param (the server also accepts it there). */
export function zohoConnectUrl(): string {
  const token = getToken();
  return `/api/zoho/connect${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
}

export interface Deal {
  id: string;
  name: string;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  closingDate: string | null;
  pipeline: string | null;
  accountName: string | null;
  contactName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
}

export interface DealsResponse {
  email: string;
  zohoUser: { id: string; email: string; fullName: string } | null;
  count: number;
  deals: Deal[];
  reason?: string;
  message?: string;
}

export function fetchDeals(): Promise<DealsResponse> {
  return apiFetch<DealsResponse>('/deals');
}

// ---- team leader (foundation) -------------------------------------------

export interface Team {
  id: number;
  name: string;
  kind: 'coordinator' | 'planning' | string;
  leaderUserId: number | null;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: Role;
  joinedAt: string;
}

export function fetchMyTeams(): Promise<{ teams: Team[] }> {
  return apiFetch<{ teams: Team[] }>('/team');
}

export function fetchTeamMembers(teamId?: number): Promise<{ teamId?: number; members: TeamMember[] }> {
  return apiFetch(`/team/members${teamId ? `?teamId=${teamId}` : ''}`);
}

export interface TeamActivityResponse {
  implemented: boolean;
  note: string;
  teamSize: number;
  items: unknown[];
}

export function fetchTeamActivity(): Promise<TeamActivityResponse> {
  return apiFetch<TeamActivityResponse>('/team/activity');
}

// ---- planning manager (foundation) -----------------------------------------

export interface PlanningOverview {
  planningTeams: Team[];
  alsoMemberOf: Team[];
  teamSize: number;
}

export function fetchPlanningOverview(): Promise<PlanningOverview> {
  return apiFetch<PlanningOverview>('/planning');
}

export interface PlanningListResponse {
  implemented: boolean;
  note: string;
  items: unknown[];
}

export function fetchPlanningConfirmed(): Promise<PlanningListResponse> {
  return apiFetch<PlanningListResponse>('/planning/confirmed');
}

export function fetchPlanningPatients(): Promise<PlanningListResponse> {
  return apiFetch<PlanningListResponse>('/planning/patients');
}

// ---- patient follow-up records ("My Patients") -------------------------------
// Mirror of server/src/records/store.ts — keep the two in sync.

/** What was quoted, exactly as the PDF showed it. */
export interface QuoteSnapshot {
  module: 'dental' | 'plastic';
  pdf: 'simple' | 'premium';
  currency: string;
  language: string;
  options: Array<{ name: string; lines: string[]; total: number }>;
  /** Short remark about how it was quoted, e.g. "Full package price". */
  remark?: string;
}

export type NoteTopic = 'discussion' | 'objection' | 'price' | 'next_step';

export const NOTE_TOPIC_LABELS: Record<NoteTopic, string> = {
  discussion: 'Discussion',
  objection: 'Objection',
  price: 'Price negotiated',
  next_step: 'Next step',
};

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
  authorName: string;
  createdAt: string;
}

export interface PatientRecord {
  id: number;
  patientName: string;
  createdAt: string;
  updatedAt: string;
  entries: TimelineEntry[];
}

export function fetchPatientRecords(): Promise<{ records: PatientRecordSummary[] }> {
  return apiFetch('/patient-records');
}

export function fetchPatientRecord(id: number): Promise<{ record: PatientRecord }> {
  return apiFetch(`/patient-records/${id}`);
}

export function createPatientRecord(patientName: string, quote: QuoteSnapshot): Promise<{ id: number }> {
  return apiFetch('/patient-records', { method: 'POST', body: JSON.stringify({ patientName, quote }) });
}

export function addPatientQuote(id: number, quote: QuoteSnapshot): Promise<{ entry: TimelineEntry }> {
  return apiFetch(`/patient-records/${id}/quotes`, { method: 'POST', body: JSON.stringify({ quote }) });
}

export function addPatientNote(id: number, body: string, topic: NoteTopic | null): Promise<{ entry: TimelineEntry }> {
  return apiFetch(`/patient-records/${id}/notes`, { method: 'POST', body: JSON.stringify({ body, topic }) });
}

// ---- team performance (leaderboards, targets, join requests) ----------------------
// Mirror of server/src/performance/ — keep in sync.

export type PeriodType = 'month' | 'quarter';

export interface Period {
  type: PeriodType;
  start: string;
  end: string;
  label: string;
}

export interface Target {
  quotes: number | null;
  notes: number | null;
}

export interface MemberStats {
  userId: number;
  name: string;
  email: string;
  quotes: number;
  notes: number;
  target: Target;
}

export interface TeamBoard {
  id: number;
  name: string;
  leaderId: number | null;
  leaderName: string | null;
  memberCount: number;
  quotes: number;
  notes: number;
  quotesPerMember: number;
  target: Target;
  isMine: boolean;
  members: MemberStats[];
}

export interface MyTeamStatus {
  teams: Array<{ id: number; name: string; leaderName: string | null; memberCount: number }>;
  memberOf: number[];
  leads: number[];
  pendingRequest: { id: number; teamId: number; createdAt: string } | null;
}

export interface PendingJoinRequest {
  id: number;
  teamId: number;
  teamName: string;
  userId: number;
  name: string;
  email: string;
  createdAt: string;
}

export function fetchPerformanceBoard(period: PeriodType, date?: string): Promise<{ period: Period; teams: TeamBoard[] }> {
  return apiFetch(`/performance/board?period=${period}${date ? `&date=${date}` : ''}`);
}

export function fetchMyTeamStatus(): Promise<MyTeamStatus> {
  return apiFetch('/performance/teams');
}

export function requestToJoinTeam(teamId: number): Promise<{ ok: true }> {
  return apiFetch(`/performance/teams/${teamId}/join`, { method: 'POST' });
}

export function cancelJoinRequest(): Promise<{ ok: true }> {
  return apiFetch('/performance/join-request/cancel', { method: 'POST' });
}

export function fetchJoinRequests(): Promise<{ requests: PendingJoinRequest[] }> {
  return apiFetch('/performance/requests');
}

export function decideJoinRequest(id: number, decision: 'approve' | 'decline'): Promise<{ ok: true }> {
  return apiFetch(`/performance/requests/${id}`, { method: 'POST', body: JSON.stringify({ decision }) });
}

export function saveTarget(input: {
  teamId: number;
  userId: number | null;
  period: PeriodType;
  date: string;
  quotes: number | null;
  notes: number | null;
}): Promise<{ ok: true }> {
  return apiFetch('/performance/targets', { method: 'PUT', body: JSON.stringify(input) });
}

export function removeTeamMember(teamId: number, userId: number): Promise<{ ok: true }> {
  return apiFetch(`/performance/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
}

export function moveTeamMember(teamId: number, userId: number, toTeamId: number): Promise<{ ok: true }> {
  return apiFetch(`/performance/teams/${teamId}/members/${userId}/move`, { method: 'POST', body: JSON.stringify({ toTeamId }) });
}
