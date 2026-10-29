/**
 * "My Patients" API — a coordinator's own patient follow-up records.
 *
 * Any signed-in user may use it (team leaders also build quotes via "coordinator
 * tools"); every query is scoped to `req.currentUser.id`, so a record that isn't
 * yours is a plain 404.
 *
 *   GET  /api/patient-records              my records, most recently active first
 *   POST /api/patient-records              { patientName, quote, plan? } → new record
 *   GET  /api/patient-records/:id          record + full timeline (oldest first)
 *   POST /api/patient-records/:id/quotes   { quote, plan? } → append a re-issued / updated quote
 *   GET  /api/patient-records/:id/entries/:entryId/plan   the editable plan behind a quote
 *   POST /api/patient-records/:id/notes    { body, topic? } → append a note
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { loadCurrentUser } from '../auth/middleware.js';
import {
  NOTE_TOPICS,
  addEntry,
  createRecordWithQuote,
  getPlan,
  getRecord,
  listRecords,
  parseEditablePlan,
  parseQuoteSnapshot,
  type NoteTopic,
} from './store.js';

export const recordsRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncHandler = (req: Request, res: Response) => Promise<any>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

recordsRouter.use(loadCurrentUser);

function recordId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const NOT_FOUND = { error: 'not_found', message: 'Patient record not found.' };
const INVALID_PLAN = { error: 'invalid_plan', message: 'The saved plan is malformed or too large.' };

recordsRouter.get(
  '/',
  wrap(async (req, res) => {
    res.json({ records: await listRecords(req.currentUser!.id) });
  }),
);

recordsRouter.post(
  '/',
  wrap(async (req, res) => {
    const patientName = typeof req.body?.patientName === 'string' ? req.body.patientName.trim() : '';
    if (!patientName || patientName.length > 200) {
      return res.status(400).json({ error: 'invalid_patient_name', message: 'Patient name is required (max 200 characters).' });
    }
    const quote = parseQuoteSnapshot(req.body?.quote);
    if (!quote) return res.status(400).json({ error: 'invalid_quote', message: 'The quote details are missing or malformed.' });
    const plan = parseEditablePlan(req.body?.plan, quote.module);
    if (plan === 'invalid') return res.status(400).json(INVALID_PLAN);
    const id = await createRecordWithQuote(req.currentUser!.id, patientName, quote, plan);
    return res.status(201).json({ id });
  }),
);

recordsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const id = recordId(req);
    const record = id ? await getRecord(req.currentUser!.id, id) : null;
    if (!record) return res.status(404).json(NOT_FOUND);
    return res.json({ record });
  }),
);

recordsRouter.post(
  '/:id/quotes',
  wrap(async (req, res) => {
    const id = recordId(req);
    const quote = parseQuoteSnapshot(req.body?.quote);
    if (!quote) return res.status(400).json({ error: 'invalid_quote', message: 'The quote details are missing or malformed.' });
    const plan = parseEditablePlan(req.body?.plan, quote.module);
    if (plan === 'invalid') return res.status(400).json(INVALID_PLAN);
    const entry = id ? await addEntry(req.currentUser!.id, id, { kind: 'quote', quote, plan }) : null;
    if (!entry) return res.status(404).json(NOT_FOUND);
    return res.status(201).json({ entry });
  }),
);

recordsRouter.post(
  '/:id/notes',
  wrap(async (req, res) => {
    const id = recordId(req);
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 10000) {
      return res.status(400).json({ error: 'invalid_note', message: 'Note text is required (max 10,000 characters).' });
    }
    const rawTopic = req.body?.topic;
    if (rawTopic != null && rawTopic !== '' && !NOTE_TOPICS.includes(rawTopic)) {
      return res.status(400).json({ error: 'invalid_topic', message: `Topic must be one of: ${NOTE_TOPICS.join(', ')}.` });
    }
    const topic: NoteTopic | null = rawTopic ? (rawTopic as NoteTopic) : null;
    const entry = id ? await addEntry(req.currentUser!.id, id, { kind: 'note', body, topic }) : null;
    if (!entry) return res.status(404).json(NOT_FOUND);
    return res.status(201).json({ entry });
  }),
);

recordsRouter.get(
  '/:id/entries/:entryId/plan',
  wrap(async (req, res) => {
    const id = recordId(req);
    const entryId = Number(req.params.entryId);
    const found = id && Number.isInteger(entryId) && entryId > 0 ? await getPlan(req.currentUser!.id, id, entryId) : null;
    if (!found) return res.status(404).json({ error: 'not_found', message: 'No editable plan was saved with this quote.' });
    return res.json(found);
  }),
);
