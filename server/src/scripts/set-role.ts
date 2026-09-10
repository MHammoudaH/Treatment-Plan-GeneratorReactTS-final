/**
 * Assign a role to an existing user.
 *
 *   npm run role -- <email> <role>
 *   npm run role -- --list          # show every user and their role
 *
 * Roles: coordinator | team_leader | planning_manager
 *
 * This is the controlled mechanism for granting elevated roles during this
 * phase — signup always creates a plain coordinator. Run it against the same
 * DATABASE_URL the server uses.
 */
import { pool, query } from '../db.js';
import { assertSchemaReady } from '../lib/migrations.js';
import { ROLE_LIST } from '../auth/roles.js';
import { findUserByEmail, setUserRole } from '../auth/users.js';

async function listUsers(): Promise<void> {
  const { rows } = await query<{ id: number; email: string; name: string; role: string }>(
    'SELECT id, email, name, role FROM users ORDER BY role, lower(email)',
  );
  if (rows.length === 0) {
    console.log('(no users yet)');
    return;
  }
  const width = Math.max(...rows.map((r) => r.email.length));
  for (const r of rows) {
    console.log(`  ${r.email.padEnd(width)}  ${r.role.padEnd(16)}  ${r.name || ''}`.trimEnd());
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  await assertSchemaReady(pool);

  if (args[0] === '--list' || args[0] === '-l') {
    await listUsers();
    return;
  }

  const [email, role] = args;
  if (!email || !role) {
    console.error('Usage: npm run role -- <email> <role>');
    console.error(`       npm run role -- --list`);
    console.error(`Roles: ${ROLE_LIST.join(' | ')}`);
    process.exitCode = 1;
    return;
  }

  const existing = await findUserByEmail(email);
  if (!existing) {
    console.error(`No user with email "${email}". They must sign up first.`);
    process.exitCode = 1;
    return;
  }

  const updated = await setUserRole(email, role);
  if (!updated) {
    console.error(`Failed to update "${email}".`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK — ${updated.email} is now "${updated.role}" (was "${existing.role}").`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
