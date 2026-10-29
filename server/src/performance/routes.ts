/**
 * Team performance API (migration 0012).
 *
 * Any signed-in user:
 *   GET  /api/performance/board?period=month|quarter&date=YYYY-MM-DD   leaderboards
 *   GET  /api/performance/teams                                         teams + my membership / request
 *   POST /api/performance/teams/:id/join                                request to join a team
 *   POST /api/performance/join-request/cancel                           withdraw my open request
 *
 * Team leaders only (their own teams — checked on every call):
 *   GET    /api/performance/requests                     open join requests for my teams
 *   POST   /api/performance/requests/:id                 { decision: 'approve' | 'decline' }
 *   PUT    /api/performance/targets                      { teamId, userId|null, period, date, quotes, notes }
 *   DELETE /api/performance/teams/:teamId/members/:userId
 *   POST   /api/performance/teams/:teamId/members/:userId/move   { toTeamId }
 *
 * A coordinator can never leave or switch team themselves: there is deliberately no endpoint
 * for it. Only the leader of the team they're in can move or remove them.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { loadCurrentUser, requireTeamLeader } from '../auth/middleware.js';
import { removeTeamMember } from '../team/store.js';
import { isPeriodType, periodFor } from './periods.js';
import {
  cancelJoinRequest,
  decideRequest,
  getBoard,
  getMyTeamStatus,
  getPendingRequests,
  isTeamMember,
  leadsTeam,
  moveMember,
  requestToJoin,
  setTarget,
} from './store.js';

export const performanceRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncHandler = (req: Request, res: Response) => Promise<any>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

performanceRouter.use(loadCurrentUser);

const positiveInt = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** A target value: '' / null → no target; otherwise a whole number 0-100000. Undefined = invalid. */
const targetValue = (value: unknown): number | null | undefined => {
  if (value === null || value === '' || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : undefined;
};

performanceRouter.get(
  '/board',
  wrap(async (req, res) => {
    const type = req.query.period ?? 'month';
    if (!isPeriodType(type)) return res.status(400).json({ error: 'invalid_period', message: 'period must be month or quarter.' });
    const period = periodFor(type, typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined);
    if (!period) return res.status(400).json({ error: 'invalid_date', message: 'date must be YYYY-MM-DD.' });
    return res.json({ period, teams: await getBoard(req.currentUser!.id, period) });
  }),
);

performanceRouter.get(
  '/teams',
  wrap(async (req, res) => {
    res.json(await getMyTeamStatus(req.currentUser!.id));
  }),
);

performanceRouter.post(
  '/teams/:id/join',
  wrap(async (req, res) => {
    const teamId = positiveInt(req.params.id);
    const result = teamId ? await requestToJoin(req.currentUser!.id, teamId) : 'no_such_team';
    if (result === 'no_such_team') return res.status(404).json({ error: 'not_found', message: 'Team not found.' });
    if (result === 'already_member') return res.status(409).json({ error: 'already_member', message: 'You are already in a team.' });
    if (result === 'is_leader') return res.status(409).json({ error: 'is_leader', message: 'You lead this team.' });
    return res.status(201).json({ ok: true });
  }),
);

performanceRouter.post(
  '/join-request/cancel',
  wrap(async (req, res) => {
    await cancelJoinRequest(req.currentUser!.id);
    res.json({ ok: true });
  }),
);

// ---- team leaders ------------------------------------------------------------

performanceRouter.get(
  '/requests',
  requireTeamLeader,
  wrap(async (req, res) => {
    res.json({ requests: await getPendingRequests(req.currentUser!.id) });
  }),
);

performanceRouter.post(
  '/requests/:id',
  requireTeamLeader,
  wrap(async (req, res) => {
    const id = positiveInt(req.params.id);
    const decision = req.body?.decision;
    if (decision !== 'approve' && decision !== 'decline') {
      return res.status(400).json({ error: 'invalid_decision', message: "decision must be 'approve' or 'decline'." });
    }
    const ok = id ? await decideRequest(req.currentUser!.id, id, decision === 'approve') : false;
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'No open request with that id for your teams.' });
    if (ok === 'already_member') {
      return res.status(409).json({ error: 'already_member', message: 'This person has already been placed in another team, so the request was closed.' });
    }
    return res.json({ ok: true });
  }),
);

performanceRouter.put(
  '/targets',
  requireTeamLeader,
  wrap(async (req, res) => {
    const leaderId = req.currentUser!.id;
    const teamId = positiveInt(req.body?.teamId);
    if (!teamId || !(await leadsTeam(leaderId, teamId))) return res.status(403).json({ error: 'forbidden', message: 'Not your team.' });

    const userId = req.body?.userId == null ? null : positiveInt(req.body.userId);
    if (req.body?.userId != null && (!userId || !(await isTeamMember(teamId, userId)))) {
      return res.status(400).json({ error: 'not_a_member', message: 'That person is not in this team.' });
    }
    const type = req.body?.period;
    const period = isPeriodType(type) && typeof req.body?.date === 'string' ? periodFor(type, req.body.date) : null;
    if (!period) return res.status(400).json({ error: 'invalid_period', message: 'period (month|quarter) and date (YYYY-MM-DD) are required.' });

    const quotes = targetValue(req.body?.quotes);
    const notes = targetValue(req.body?.notes);
    if (quotes === undefined || notes === undefined) {
      return res.status(400).json({ error: 'invalid_target', message: 'Targets must be whole numbers (0 or more), or empty.' });
    }
    await setTarget({ leaderId, teamId, userId, periodType: period.type, periodStart: period.start, quotes, notes });
    return res.json({ ok: true, period });
  }),
);

performanceRouter.delete(
  '/teams/:teamId/members/:userId',
  requireTeamLeader,
  wrap(async (req, res) => {
    const teamId = positiveInt(req.params.teamId);
    const userId = positiveInt(req.params.userId);
    if (!teamId || !userId || !(await leadsTeam(req.currentUser!.id, teamId))) {
      return res.status(403).json({ error: 'forbidden', message: 'Not your team.' });
    }
    await removeTeamMember(teamId, userId);
    return res.json({ ok: true });
  }),
);

performanceRouter.post(
  '/teams/:teamId/members/:userId/move',
  requireTeamLeader,
  wrap(async (req, res) => {
    const teamId = positiveInt(req.params.teamId);
    const userId = positiveInt(req.params.userId);
    const toTeamId = positiveInt(req.body?.toTeamId);
    if (!teamId || !userId) return res.status(403).json({ error: 'forbidden', message: 'Not your team.' });
    if (!toTeamId) return res.status(400).json({ error: 'invalid_team', message: 'toTeamId is required.' });
    const result = await moveMember(req.currentUser!.id, teamId, userId, toTeamId);
    if (result === 'not_your_team') return res.status(403).json({ error: 'forbidden', message: 'Not your team.' });
    if (result === 'no_such_team') return res.status(400).json({ error: 'invalid_team', message: 'Choose a different, existing team.' });
    if (result === 'not_a_member') return res.status(404).json({ error: 'not_found', message: 'That person is not in your team.' });
    return res.json({ ok: true });
  }),
);
