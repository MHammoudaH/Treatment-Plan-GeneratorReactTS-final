import { useState } from 'react';
import { useQuotation } from '../../context/QuotationContext';
import { parseTreatmentData } from '../../lib/pricing/diagnosisParser';

export function Step2Diagnosis() {
  const { state, dispatch } = useQuotation();
  const [draft, setDraft] = useState(state.diagnosis.rawText);

  function handleParse() {
    const text = draft.trim();
    if (!text) return;
    const parsed = parseTreatmentData(text);
    dispatch({ type: 'SET_DIAGNOSIS', diagnosis: { rawText: text, editedText: text, parsed, confirmed: false } });
  }

  const { parsed, editedText, confirmed } = state.diagnosis;

  return (
    <section className="wizard-step">
      <h2>Diagnosis</h2>
      <p className="step-intro">Paste the WhatsApp diagnosis text from the clinic. DutyAI will detect implant/crown quantities automatically.</p>

      <label>Diagnosis (paste from WhatsApp)</label>
      <textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. 4 implants for the upper jaw, 6-8 implants for the lower jaw, +12 zirconia crowns" />

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 0 })}>
          Back
        </button>
        <button type="button" onClick={handleParse}>
          Parse diagnosis
        </button>
      </div>

      {parsed && (
        <div className="parsed-summary">
          <h3>Detected treatment plan</h3>
          <ul>
            {parsed.upperImplants ? <li>{parsed.upperImplants} implant(s) — upper jaw</li> : null}
            {parsed.lowerImplantsMin ? (
              <li>
                {parsed.lowerImplantsMin === parsed.lowerImplantsMax ? parsed.lowerImplantsMin : `${parsed.lowerImplantsMin}–${parsed.lowerImplantsMax}`} implant(s) — lower jaw
              </li>
            ) : null}
            {parsed.crowns ? (
              <li>
                {parsed.crowns} crown(s){parsed.crownMaterial ? ` (${parsed.crownMaterial})` : ''}
              </li>
            ) : null}
            {parsed.upperImplants || parsed.lowerImplantsMin ? (
              <li>
                <strong>{(parsed.upperImplants ?? 0) + (parsed.lowerImplantsMin ?? 0)} implant(s)</strong> and{' '}
                <strong>{parsed.crowns ?? 0} crown(s)</strong> will pre-fill Option 1
              </li>
            ) : null}
            {!parsed.upperImplants && !parsed.lowerImplantsMin && !parsed.crowns ? <li>No quantities detected — you can still add options manually on the next step.</li> : null}
          </ul>
          <small className="hint">
            Reads pasted text in any language (English, Arabic, Russian, French, Spanish, …) and Western or Arabic-Indic
            digits. A lower-jaw range pre-fills with its lower number — adjust every count on the options step.
          </small>

          <label>Confirmed diagnosis text (editable)</label>
          <textarea rows={4} value={editedText} onChange={(e) => dispatch({ type: 'SET_DIAGNOSIS', diagnosis: { editedText: e.target.value } })} />

          <label className="inline-check">
            <input type="checkbox" checked={confirmed} onChange={(e) => dispatch({ type: 'SET_DIAGNOSIS', diagnosis: { confirmed: e.target.checked } })} />
            I confirm this diagnosis is correct
          </label>

          <div className="wizard-actions">
            <button
              type="button"
              disabled={!confirmed || !editedText.trim()}
              onClick={() => {
                dispatch({ type: 'PREFILL_OPTIONS_FROM_DIAGNOSIS' });
                dispatch({ type: 'SET_STEP', step: 2 });
              }}
            >
              Continue to quotation options
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
