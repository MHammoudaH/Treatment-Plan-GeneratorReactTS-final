import { lazy, Suspense } from 'react';
import { useQuotation } from '../../context/QuotationContext';
import { countMarks, LOWER_FDI, toothName, UPPER_FDI, type ToothMark } from '../../lib/dental/teeth';

// three.js is heavy — load the 3D viewer (and three) only when this step is opened.
const ImplantMap3D = lazy(() => import('../ImplantMap3D'));

function ToothButton({
  fdi,
  mark,
  onToggle,
}: {
  fdi: number;
  mark: ToothMark | undefined;
  onToggle: (fdi: number) => void;
}) {
  return (
    <button
      type="button"
      className={`tooth${mark ? ` tooth-${mark}` : ''}`}
      title={`${fdi} — ${toothName(fdi)}${mark ? ` (${mark})` : ''}`}
      onClick={() => onToggle(fdi)}
    >
      {fdi}
    </button>
  );
}

function ToothChart({
  plan,
  onToggle,
}: {
  plan: Record<number, ToothMark>;
  onToggle: (fdi: number) => void;
}) {
  return (
    <div className="tooth-chart">
      <div className="tooth-row" aria-label="Upper arch">
        {UPPER_FDI.map((fdi) => (
          <ToothButton key={fdi} fdi={fdi} mark={plan[fdi]} onToggle={onToggle} />
        ))}
      </div>
      <div className="tooth-row" aria-label="Lower arch">
        {LOWER_FDI.map((fdi) => (
          <ToothButton key={fdi} fdi={fdi} mark={plan[fdi]} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

export function StepImplantMap() {
  const { state, dispatch } = useQuotation();
  const { toothPlan, diagnosis } = state;
  const marks = countMarks(toothPlan);
  const parsed = diagnosis.parsed;

  const lowerText = parsed?.lowerImplantsMin
    ? parsed.lowerImplantsMax && parsed.lowerImplantsMax !== parsed.lowerImplantsMin
      ? `${parsed.lowerImplantsMin}–${parsed.lowerImplantsMax}`
      : `${parsed.lowerImplantsMin}`
    : '0';

  return (
    <section className="wizard-step">
      <h2>Implant map</h2>
      <p className="step-intro">
        Click a tooth — on the chart below or directly in the 3D view — to cycle: <strong>implant</strong> →{' '}
        <strong>crown</strong> → <strong>implant-supported crown</strong> → <strong>bridge</strong> → <strong>missing</strong> →
        clear. Both views share the same plan and update live; a snapshot is included in the Premium Proposal PDF. This is a
        visual representation of the treatment plan, not a clinical recommendation.
      </p>

      {parsed && (
        <p className="hint">
          Diagnosis: {parsed.upperImplants ?? 0} upper + {lowerText} lower implant(s), {parsed.crowns ?? 0} crown(s).
        </p>
      )}

      <ToothChart plan={toothPlan} onToggle={(fdi) => dispatch({ type: 'CYCLE_TOOTH', fdi })} />

      <div className="implant-map-counts">
        <span className="tag tag-implant">Implants: {marks.implants}</span>
        <span className="tag tag-crown">Crowns: {marks.crowns}</span>
        <span className="tag tag-bridge">Bridge units: {marks.bridges}</span>
        <span className="tag tag-missing">Missing: {marks.missing}</span>
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SUGGEST_TEETH_FROM_DIAGNOSIS' })}>
          Suggest from diagnosis
        </button>
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'CLEAR_TEETH' })}>
          Clear
        </button>
      </div>

      <Suspense fallback={<div className="implant-map-3d" />}>
        <ImplantMap3D plan={toothPlan} onToggle={(fdi) => dispatch({ type: 'CYCLE_TOOTH', fdi })} />
      </Suspense>

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}>
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'PREFILL_OPTIONS_FROM_DIAGNOSIS' });
            dispatch({ type: 'SET_STEP', step: 3 });
          }}
        >
          Continue to options
        </button>
      </div>
    </section>
  );
}
