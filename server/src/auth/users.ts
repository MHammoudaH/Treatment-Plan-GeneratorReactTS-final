import { queryOne, type UserRow } from '../db.js';
import { isRole, type Role } from './roles.js';

/** Look up a user by email (case-insensitive). */
export function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE lower(email) = $1', [email.trim().toLowerCase()]);
}

export function findUserById(id: number): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
}

/**
 * Set a user's role. Validates against the centralized role list and relies on
 * the `users.role -> roles(key)` foreign key as a second line of defence.
 * Returns the updated row, or null if no user matched.
 */
export async function setUserRole(email: string, role: string): Promise<UserRow | null> {
  if (!isRole(role)) {
    throw new Error(`Unknown role "${role}". Valid roles: coordinator, team_leader, planning_manager.`);
  }
  return queryOne<UserRow>(
    'UPDATE users SET role = $1 WHERE lower(email) = $2 RETURNING *',
    [role as Role, email.trim().toLowerCase()],
  );
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function countUsers(): Promise<number> {
  const row = await queryOne<{ count: string }>('SELECT count(*)::text AS count FROM users');
  return Number(row?.count ?? 0);
}
