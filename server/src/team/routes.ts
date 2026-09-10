/**
 * Team Leader API — foundation.
 *
 * Every route here is gated by `requireTeamLeader` (server-side role check against
 * the live DB). The read endpoints are real; `/activity` is a typed placeholder
 * so the frontend contract exists before the coordinator-activity feed is built.
 *
 * Future (not built yet): which coordinator is on which patient, treatments sent,
 * plan status, suggested prices, confirmation status, linked Zoho deal info.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireTeamLeader } from '../auth/middleware.js';
import { getMembersForLeader, getTeamMembers, getTeamsLedBy } from './store.js';

export const teamRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncHandler = (req: Request, res: Response) => Promise<any>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

teamRouter.use(requireTeamLeader);

// GET /api/team — the team(s) the signed-in team leader manages.
teamRouter.get(
  '/',
  wrap(async (req, res) => {
    const teams = await getTeamsLedBy(req.currentUser!.id);
    res.json({ teams });
  }),
);

// GET /api/team/members — members across the leader's teams. `?teamId=` narrows to one.
teamRouter.get(
  '/members',
  wrap(async (req, res) => {
    const teamIdRaw = req.query.teamId;
    if (typeof teamIdRaw === 'string' && teamIdRaw) {
      const teamId = Number(teamIdRaw);
      const led = await getTeamsLedBy(req.currentUser!.id);
      if (!Number.isInteger(teamId) || !led.some((t) => t.id === teamId)) {
        return res.status(403).json({ error: 'forbidden', message: 'Not your team.' });
      }
      const members = await getTeamMembers(teamId);
      return res.json({ teamId, members });
    }
    const members = await getMembersForLeader(req.currentUser!.id);
    return res.json({ members });
  }),
);

// GET /api/team/activity — coordinator activity feed. Foundation stub.
teamRouter.get(
  '/activity',
  wrap(async (req, res) => {
    const members = await getMembersForLeader(req.currentUser!.id);
    res.json({
      implemented: false,
      note: 'Coordinator activity feed is not built yet. This endpoint returns the shape it will use.',
      teamSize: members.length,
      items: [] as Array<{
        coordinatorId: number;
        coordinatorEmail: string;
        patientRef: string | null;
        planStatus: string | null;
        suggestedPrice: number | null;
        confirmed: boolean;
        zohoDealId: string | null;
        updatedAt: string;
      }>,
    });
  }),
);
