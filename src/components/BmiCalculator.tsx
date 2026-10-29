import { CM_PER_INCH, LB_PER_KG, bmiCategory, calculateBmi, type BmiUnits, type BmiValues } from '../lib/bmi';

/** Patient weight / height / BMI — informational only, does not affect any price. The values
 *  live in the parent so they carry through to the quotation step and the PDF. */
export function BmiCalculator({ value, onChange }: { value: BmiValues; onChange: (next: BmiValues) => void }) {
  const { units, weight, height } = value;
  const bmi = calculateBmi(Number(weight), Number(height), units);
  const metric = units === 'metric';

  function switchUnits(next: BmiUnits) {
    if (next === units) return;
    // Convert what's already typed so switching units doesn't lose it.
    const w = Number(weight);
    const h = Number(height);
    onChange({
      units: next,
      weight: w > 0 ? String(Math.round((next === 'imperial' ? w * LB_PER_KG : w / LB_PER_KG) * 10) / 10) : weight,
      height: h > 0 ? String(Math.round((next === 'imperial' ? h / CM_PER_INCH : h * CM_PER_INCH) * 10) / 10) : height,
    });
  }

  return (
    <div className="bmi-calculator">
      <div className="bmi-header">
        <h4>Weight &amp; BMI</h4>
        <div className="bmi-units" role="group" aria-label="BMI units">
          <button type="button" className={metric ? '' : 'secondary'} onClick={() => switchUnits('metric')}>
            kg / cm
          </button>
          <button type="button" className={metric ? 'secondary' : ''} onClick={() => switchUnits('imperial')}>
            lb / in
          </button>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <label htmlFor="bmi-weight">Weight ({metric ? 'kg' : 'lb'})</label>
          <input id="bmi-weight" type="number" min={0} step={0.1} value={weight} onChange={(e) => onChange({ ...value, weight: e.target.value })} />
        </div>
        <div>
          <label htmlFor="bmi-height">Height ({metric ? 'cm' : 'inches'})</label>
          <input id="bmi-height" type="number" min={0} step={0.1} value={height} onChange={(e) => onChange({ ...value, height: e.target.value })} />
        </div>
      </div>
      <p className="bmi-result">
        {bmi === null ? (
          'Enter weight and height to see the BMI.'
        ) : (
          <>
            BMI <strong>{bmi.toFixed(1)}</strong> — {bmiCategory(bmi)}
          </>
        )}
      </p>
      <small className="hint">Optional — carried to the quotation step (expected weight &amp; BMI) and the PDF. Does not affect pricing.</small>
    </div>
  );
}
