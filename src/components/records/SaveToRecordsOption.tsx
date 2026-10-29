import type { RecordSaveState, RecordSaveStatus } from '../../lib/recordSaver';

/** The "Save this patient to my records" checkbox shown next to the Generate PDF buttons. */
export function SaveToRecordsOption({
  state,
  onChange,
  status,
}: {
  state: RecordSaveState;
  onChange: (next: RecordSaveState) => void;
  status: RecordSaveStatus;
}) {
  return (
    <div className="save-to-records">
      <label className="inline-check">
        <input type="checkbox" checked={state.enabled} onChange={(e) => onChange({ ...state, enabled: e.target.checked })} /> Save this patient to my
        records
      </label>
      <small className="hint">
        {status.kind === 'saving'
          ? 'Saving…'
          : status.kind === 'saved' || status.kind === 'error'
            ? status.message
            : 'When ticked, generating a PDF saves the patient name, the quoted plan and price, and the date to My Patients.'}
      </small>
    </div>
  );
}
