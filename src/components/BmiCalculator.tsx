import {
  CM_PER_INCH,
  HEIGHT_FEET,
  LB_PER_KG,
  bmiCategory,
  calculateBmi,
  formatFeetInches,
  splitFeetInches,
  type BmiUnits,
  type BmiValues,
} from '../lib/bmi';

/** Patient weight / height / BMI — informational only, does not affect any price. The values
 *  live in the parent so they carry through to the quotation step and the PDF. */
export function BmiCalculator({ value, onChange }: { value: BmiValues; onChange: (next: BmiValues) => void }) {
  const { units, weight, height } = value;
  const bmi = calculateBmi(Number(weight), Number(height), units);
  const metric = units === 'metric';
  // Imperial height is stored as total inches and picked as feet + inches (5'6" = 66).
  const totalInches = Number(height);
  const feetInches = !metric && totalInches > 0 ? splitFeetInches(totalInches) : null;

  function setFeetInches(feet: number | null, inches: number) {
    onChange({ ...value, height: feet === null ? '' : String(feet * 12 + inches) });
  }

  function switchUnits(next: BmiUnits) {
    if (next === units) return;
    // Convert what's already typed so switching units doesn't lose it.
    const w = Number(weight);
    const h = Number(height);
    onChange({
      units: next,
      weight: w > 0 ? String(Math.round((next === 'imperial' ? w * LB_PER_KG : w / LB_PER_KG) * 10) / 10) : weight,
      // Whole inches for the feet/inches dropdowns; one decimal of a cm going back.
      height: h > 0 ? String(next === 'imperial' ? Math.round(h / CM_PER_INCH) : Math.round(h * CM_PER_INCH * 10) / 10) : height,
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
          <input
            id="bmi-weight"
            type="number"
            min={0}
            step={0.1}
            value={weight}
            placeholder={metric ? 'e.g. 72' : 'e.g. 160'}
            onChange={(e) => onChange({ ...value, weight: e.target.value })}
          />
        </div>
        <div>
          {metric ? (
            <>
              <label htmlFor="bmi-height">Height (cm)</label>
              <input
                id="bmi-height"
                type="number"
                min={0}
                step={0.1}
                value={height}
                placeholder="e.g. 168"
                onChange={(e) => onChange({ ...value, height: e.target.value })}
              />
            </>
          ) : (
            <>
              <label htmlFor="bmi-height-feet">Height (feet / inches)</label>
              <div className="bmi-feet-inches">
                <select
                  id="bmi-height-feet"
                  aria-label="Height, feet"
                  value={feetInches ? String(feetInches.feet) : ''}
                  onChange={(e) => setFeetInches(e.target.value === '' ? null : Number(e.target.value), feetInches?.inches ?? 0)}
                >
                  <option value="">ft</option>
                  {HEIGHT_FEET.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft} ft
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Height, inches"
                  value={feetInches ? String(feetInches.inches) : '0'}
                  disabled={!feetInches}
                  onChange={(e) => setFeetInches(feetInches?.feet ?? null, Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, inch) => (
                    <option key={inch} value={inch}>
                      {inch} in
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="bmi-result">
        {bmi === null ? (
          'Enter weight and height to see the BMI.'
        ) : (
          <>
            {!metric && `${Number(weight)} lb · ${formatFeetInches(totalInches)} — `}BMI <strong>{bmi.toFixed(1)}</strong> — {bmiCategory(bmi)}
          </>
        )}
      </p>
      <small className="hint">Optional — carried to the quotation step (expected weight &amp; BMI) and the PDF. Does not affect pricing.</small>
    </div>
  );
}
