/**
 * Centralized role definitions.
 *
 * This is the single source of truth for the application's user roles. Nothing
 * else in the codebase should hard-code the string `'coordinator'` etc. — import
 * `ROLES` / `Role` from here instead. The database `roles` lookup table is seeded
 * by migration `0001_init.sql` and the frontend mirrors this list in
 * `src/lib/api.ts` (keep all three in sync).
 *
 * Adding a fourth role later: add an entry here, add its capabilities below, add
 * a migration that inserts the row into `roles`, redeploy. No auth rewrite.
 */

export const ROLES = {
  /** Normal operational user: builds treatment plans, works patients, uses Zoho. */
  COORDINATOR: 'coordinator',
  /** Manages a team of coordinators; gets visibility into their activity. */
  TEAM_LEADER: 'team_leader',
  /** Owns the planning/operations side once a patient is confirmed. */
  PLANNING_MANAGER: 'planning_manager',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Every valid role, in a stable order. Used to seed the DB `roles` table. */
export const ROLE_LIST: readonly Role[] = Object.values(ROLES);

/** The role every new self-service signup gets. Elevated roles are assigned out-of-band. */
export const DEFAULT_ROLE: Role = ROLES.COORDINATOR;

/** Roles that must never be self-selected during public signup. */
export const ELEVATED_ROLES: readonly Role[] = [ROLES.TEAM_LEADER, ROLES.PLANNING_MANAGER];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLE_LIST as readonly string[]).includes(value);
}

/**
 * Coarse capability flags per role. This is deliberately small — it is the seam
 * future permissions hang off of, not a full ACL. Keep checks in middleware /
 * route handlers referring to these named capabilities rather than to role
 * strings directly where practical.
 */
export interface RoleCapabilities {
  /** Build/update treatment plans, suggest prices, use Zoho for own work. */
  operationalWork: boolean;
  /** See the activity of coordinators on the role-holder's team(s). */
  teamVisibility: boolean;
  /** See confirmed patients and manage the planning/logistics workflow. */
  planningVisibility: boolean;
}

const CAPABILITIES: Record<Role, RoleCapabilities> = {
  [ROLES.COORDINATOR]: {
    operationalWork: true,
    teamVisibility: false,
    planningVisibility: false,
  },
  [ROLES.TEAM_LEADER]: {
    operationalWork: true,
    teamVisibility: true,
    planningVisibility: false,
  },
  [ROLES.PLANNING_MANAGER]: {
    operationalWork: false,
    teamVisibility: false,
    planningVisibility: true,
  },
};

export function capabilitiesFor(role: string): RoleCapabilities {
  return isRole(role)
    ? CAPABILITIES[role]
    : { operationalWork: false, teamVisibility: false, planningVisibility: false };
}

export function roleCan(role: string, capability: keyof RoleCapabilities): boolean {
  return capabilitiesFor(role)[capability];
}

/**
 * Team "kind" — a team is either a group of coordinators under a team leader, or
 * the planning/operations team under a planning manager. Stored on `teams.kind`.
 */
export const TEAM_KINDS = {
  COORDINATOR: 'coordinator',
  PLANNING: 'planning',
} as const;

export type TeamKind = (typeof TEAM_KINDS)[keyof typeof TEAM_KINDS];

export const TEAM_KIND_LIST: readonly TeamKind[] = Object.values(TEAM_KINDS);

export function isTeamKind(value: unknown): value is TeamKind {
  return typeof value === 'string' && (TEAM_KIND_LIST as readonly string[]).includes(value);
}

/** The role that leads a team of the given kind. */
export function leaderRoleForKind(kind: TeamKind): Role {
  return kind === TEAM_KINDS.PLANNING ? ROLES.PLANNING_MANAGER : ROLES.TEAM_LEADER;
}
