import { useState } from 'react';
import { bmiCategory, calculateBmi, type BmiUnits } from '../lib/bmi';

/** Informational BMI check for bariatric patients — does not affect any price. */
export function BmiCalculator() {
  const [units, setUnits] = useState<BmiUnits>('metric');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const bmi = calculateBmi(Number(weight), Number(height), units);
  const metric = units === 'metric';

  function switchUnits(next: BmiUnits) {
    if (next === units) return;
    // Convert what's already typed so switching units doesn't lose it.
    const w = Number(weight);
    const h = Number(height);
    if (w > 0) setWeight(String(Math.round((next === 'imperial' ? w * 2.20462 : w / 2.20462) * 10) / 10));
    if (h > 0) setHeight(String(Math.round((next === 'imperial' ? h / 2.54 : h * 2.54) * 10) / 10));
    setUnits(next);
  }

  return (
    <div className="bmi-calculator">
      <div className="bmi-header">
        <h4>BMI calculator</h4>
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
          <input id="bmi-weight" type="number" min={0} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bmi-height">Height ({metric ? 'cm' : 'inches'})</label>
          <input id="bmi-height" type="number" min={0} step={0.1} value={height} onChange={(e) => setHeight(e.target.value)} />
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
      <small className="hint">Informational only — does not affect pricing.</small>
    </div>
  );
}
