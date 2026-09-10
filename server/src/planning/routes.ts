/**
 * Planning Manager API — foundation.
 *
 * Gated by `requirePlanningManager`. The planning workflow proper (hotel
 * reservations, airport/clinic transfers, arrival/departure logistics) is NOT
 * built here — these endpoints establish the surface and the role boundary.
 *
 * Intended trigger: a Zoho deal becomes "confirmed" -> DutyAI recognises a
 * confirmed patient -> it appears in `/api/planning/confirmed` -> the planning
 * team arranges logistics. That pipeline is deliberately not implemented yet.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { requirePlanningManager } from '../auth/middleware.js';
import { TEAM_KINDS } from '../auth/roles.js';
import { getMembersForLeader, getTeamsForMember, getTeamsLedBy } from '../team/store.js';

export const planningRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncHandler = (req: Request, res: Response) => Promise<any>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

planningRouter.use(requirePlanningManager);

// GET /api/planning — the planning team(s) this manager is responsible for.
planningRouter.get(
  '/',
  wrap(async (req, res) => {
    const userId = req.currentUser!.id;
    const led = (await getTeamsLedBy(userId)).filter((t) => t.kind === TEAM_KINDS.PLANNING);
    const memberOf = (await getTeamsForMember(userId)).filter((t) => t.kind === TEAM_KINDS.PLANNING);
    const members = await getMembersForLeader(userId);
    res.json({
      planningTeams: led,
      alsoMemberOf: memberOf,
      teamSize: members.length,
    });
  }),
);

// GET /api/planning/patients — patients currently being handled by planning. Stub.
planningRouter.get(
  '/patients',
  wrap(async (_req, res) => {
    res.json({
      implemented: false,
      note: 'Planning patient handling is not built yet. Shape is provisional.',
      items: [] as Array<{
        patientRef: string;
        coordinatorEmail: string;
        arrivalDate: string | null;
        departureDate: string | null;
        hotelStatus: 'pending' | 'booked' | 'n/a';
        transferStatus: 'pending' | 'arranged' | 'n/a';
      }>,
    });
  }),
);

// GET /api/planning/confirmed — confirmed patients waiting to enter planning. Stub.
planningRouter.get(
  '/confirmed',
  wrap(async (_req, res) => {
    res.json({
      implemented: false,
      note: 'Confirmed-patient intake is not wired to Zoho yet. Shape is provisional.',
      items: [] as Array<{
        patientRef: string;
        coordinatorEmail: string;
        confirmedAt: string;
        treatmentSummary: string | null;
        price: number | null;
        currency: string | null;
        zohoDealId: string | null;
      }>,
    });
  }),
);
