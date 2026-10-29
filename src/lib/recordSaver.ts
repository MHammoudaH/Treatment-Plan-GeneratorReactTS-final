import { useState } from 'react';
import { addPatientQuote, createPatientRecord, type ApiError, type QuoteSnapshot } from './api';
import { sameQuote } from './patientRecords';
import type { EditablePlan } from './editablePlan';

/** Kept by the caller (wizard context / plastic module) so it survives step changes. */
export interface RecordSaveState {
  /** The "Save this patient to my records" checkbox. */
  enabled: boolean;
  /** The record this quotation session already saved to, if any. */
  /** `pinned`: opened from My Patients with "Open & update" — always saves back to this record,
   *  even if the patient's name is corrected. */
  record: { id: number; patientName: string; lastQuote: QuoteSnapshot; pinned?: boolean } | null;
}

export const INITIAL_RECORD_SAVE: RecordSaveState = { enabled: false, record: null };

export type RecordSaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; message: string } | { kind: 'error'; message: string };

/**
 * Saves the quote once a PDF has been generated, when the checkbox is ticked. The first PDF
 * creates the patient record; generating again for the same patient in the same session adds
 * the new quote to that record's timeline (nothing is added when the quote is unchanged, e.g.
 * printing the Simple and then the Premium PDF of the same plan).
 */
export function useRecordSaver(state: RecordSaveState, setState: (next: RecordSaveState) => void) {
  const [status, setStatus] = useState<RecordSaveStatus>({ kind: 'idle' });

  async function save(patientName: string, quote: QuoteSnapshot, plan?: EditablePlan): Promise<void> {
    const name = patientName.trim();
    if (!state.enabled || !name) return;
    const existing = state.record && (state.record.pinned || state.record.patientName === name) ? state.record : null;
    if (existing && sameQuote(existing.lastQuote, quote)) {
      setStatus({ kind: 'saved', message: `No changes — this quote is already in ${existing.patientName}'s record in My Patients.` });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      if (existing) {
        await addPatientQuote(existing.id, quote, plan);
        setState({ ...state, record: { ...existing, lastQuote: quote } });
        setStatus({ kind: 'saved', message: `Updated quote added to ${existing.patientName}'s timeline in My Patients.` });
      } else {
        const { id } = await createPatientRecord(name, quote, plan);
        setState({ ...state, record: { id, patientName: name, lastQuote: quote } });
        setStatus({ kind: 'saved', message: `${name} saved to My Patients.` });
      }
    } catch (err) {
      setStatus({ kind: 'error', message: `Couldn't save to My Patients: ${(err as ApiError)?.message ?? 'unknown error'}. The PDF was still generated.` });
    }
  }

  return { status, save };
}
