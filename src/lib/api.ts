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
