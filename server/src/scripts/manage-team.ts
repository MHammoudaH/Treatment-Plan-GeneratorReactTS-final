/**
 * Create teams and manage membership from the command line.
 *
 *   npm run team -- list
 *   npm run team -- create "<name>" <kind> [leaderEmail]
 *   npm run team -- set-leader "<name>" <leaderEmail>
 *   npm run team -- add "<name>" <memberEmail>
 *   npm run team -- remove "<name>" <memberEmail>
 *   npm run team -- members "<name>"
 *
 * kind: coordinator | planning
 *
 * Notes:
 *  - A "coordinator" team is led by a team_leader; a "planning" team by a
 *    planning_manager. The CLI warns (does not block) on a role mismatch so you
 *    can set the leader before promoting them with `npm run role`.
 *  - Run against the same DATABASE_URL as the server.
 */
import { pool } from '../db.js';
import { assertSchemaReady } from '../lib/migrations.js';
import { isTeamKind, leaderRoleForKind, TEAM_KIND_LIST, type TeamKind } from '../auth/roles.js';
import { findUserByEmail } from '../auth/users.js';
import {
  addTeamMember,
  createTeam,
  findTeamByName,
  getTeamMembers,
  listTeams,
  removeTeamMember,
  setTeamLeader,
} from '../team/store.js';

function usage(): void {
  console.error(
    [
      'Usage:',
      '  npm run team -- list',
      '  npm run team -- create "<name>" <kind> [leaderEmail]',
      '  npm run team -- set-leader "<name>" <leaderEmail>',
      '  npm run team -- add "<name>" <memberEmail>',
      '  npm run team -- remove "<name>" <memberEmail>',
      '  npm run team -- members "<name>"',
      `kind: ${TEAM_KIND_LIST.join(' | ')}`,
    ].join('\n'),
  );
}

async function requireTeam(name: string) {
  const team = await findTeamByName(name);
  if (!team) {
    console.error(`No team named "${name}". Create it with:  npm run team -- create "${name}" coordinator`);
    process.exit(1);
  }
  return team;
}

async function requireUser(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user with email "${email}". They must sign up first.`);
    process.exit(1);
  }
  return user;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  await assertSchemaReady(pool);

  switch (cmd) {
    case 'list': {
      const teams = await listTeams();
      if (teams.length === 0) {
        console.log('(no teams yet)');
        break;
      }
      for (const t of teams) {
        const members = await getTeamMembers(t.id);
        const leader = t.leaderUserId ? ` leader#${t.leaderUserId}` : ' (no leader)';
        console.log(`  [${t.kind}] ${t.name} — ${members.length} member(s)${leader}`);
      }
      break;
    }

    case 'create': {
      const [name, kind, leaderEmail] = rest;
      if (!name || !kind) return usage();
      if (!isTeamKind(kind)) {
        console.error(`Unknown kind "${kind}". Use: ${TEAM_KIND_LIST.join(' | ')}`);
        process.exitCode = 1;
        return;
      }
      if (await findTeamByName(name)) {
        console.error(`A team named "${name}" already exists.`);
        process.exitCode = 1;
        return;
      }
      let leaderUserId: number | null = null;
      if (leaderEmail) {
        const leader = await requireUser(leaderEmail);
        leaderUserId = leader.id;
        warnRoleMismatch(leader.role, kind);
      }
      const team = await createTeam({ name, kind: kind as TeamKind, leaderUserId });
      console.log(`OK — created team "${team.name}" (${team.kind}), id ${team.id}.`);
      break;
    }

    case 'set-leader': {
      const [name, leaderEmail] = rest;
      if (!name || !leaderEmail) return usage();
      const team = await requireTeam(name);
      const leader = await requireUser(leaderEmail);
      warnRoleMismatch(leader.role, team.kind);
      await setTeamLeader(team.id, leader.id);
      console.log(`OK — ${leader.email} now leads "${team.name}".`);
      break;
    }

    case 'add': {
      const [name, memberEmail] = rest;
      if (!name || !memberEmail) return usage();
      const team = await requireTeam(name);
      const member = await requireUser(memberEmail);
      await addTeamMember(team.id, member.id);
      console.log(`OK — ${member.email} is on "${team.name}".`);
      break;
    }

    case 'remove': {
      const [name, memberEmail] = rest;
      if (!name || !memberEmail) return usage();
      const team = await requireTeam(name);
      const member = await requireUser(memberEmail);
      await removeTeamMember(team.id, member.id);
      console.log(`OK — removed ${member.email} from "${team.name}".`);
      break;
    }

    case 'members': {
      const [name] = rest;
      if (!name) return usage();
      const team = await requireTeam(name);
      const members = await getTeamMembers(team.id);
      if (members.length === 0) {
        console.log(`"${team.name}" has no members.`);
        break;
      }
      for (const m of members) console.log(`  ${m.email}  (${m.role})  ${m.name || ''}`.trimEnd());
      break;
    }

    default:
      usage();
      process.exitCode = 1;
  }
}

function warnRoleMismatch(role: string, kind: string): void {
  const expected = leaderRoleForKind(kind as TeamKind);
  if (role !== expected) {
    console.warn(
      `  ! leader's role is "${role}" but a ${kind} team is normally led by "${expected}". ` +
        `Promote them with:  npm run role -- <email> ${expected}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
