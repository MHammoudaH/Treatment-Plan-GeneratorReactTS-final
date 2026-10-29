/** BMI for the Plastic Surgery module — informational only, never used in pricing. */

export type BmiUnits = 'metric' | 'imperial';

export const LB_PER_KG = 2.20462;
export const CM_PER_INCH = 2.54;

/** Weight / height as the coordinator typed them. */
export interface BmiValues {
  units: BmiUnits;
  /** As typed, in `units` (kg or lb). */
  weight: string;
  /** As typed, in `units` (cm or inches). */
  height: string;
}

export const EMPTY_BMI: BmiValues = { units: 'metric', weight: '', height: '' };

/** BMI from weight + height in `units` (kg + cm, or lb + inches), rounded to one decimal.
 *  Null until both values are positive. */
export function calculateBmi(weight: number, height: number, units: BmiUnits): number | null {
  if (!(weight > 0) || !(height > 0)) return null;
  const bmi = units === 'metric' ? weight / (height / 100) ** 2 : (703 * weight) / height ** 2;
  return Math.round(bmi * 10) / 10;
}

/** WHO adult BMI category. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obesity class I';
  if (bmi < 40) return 'Obesity class II';
  return 'Obesity class III';
}

/**
 * Typical average weight loss per bariatric procedure, used for the "expected weight" estimate.
 * `excess`: % of EXCESS weight lost (weight above a BMI of 25) — the usual measure for surgery.
 * `total`: % of TOTAL body weight lost — the usual measure for balloons / Botox.
 * These are averages from published results, not a promise; the coordinator can override them.
 */
export const BARIATRIC_OUTCOMES: Record<string, { kind: 'excess' | 'total'; percent: number; monthsFrom: number; monthsTo: number }> = {
  'gastric-sleeve': { kind: 'excess', percent: 60, monthsFrom: 12, monthsTo: 18 },
  'gastric-bypass': { kind: 'excess', percent: 70, monthsFrom: 12, monthsTo: 18 },
  'gastric-mini-bypass': { kind: 'excess', percent: 70, monthsFrom: 12, monthsTo: 18 },
  'gastric-bypass-sadis': { kind: 'excess', percent: 80, monthsFrom: 12, monthsTo: 24 },
  'gastric-plication': { kind: 'excess', percent: 50, monthsFrom: 12, monthsTo: 18 },
  'bari-clip': { kind: 'excess', percent: 50, monthsFrom: 12, monthsTo: 18 },
  'gastric-band': { kind: 'excess', percent: 45, monthsFrom: 18, monthsTo: 24 },
  'gastric-balloon': { kind: 'total', percent: 12, monthsFrom: 6, monthsTo: 12 },
  'elipse-balloon': { kind: 'total', percent: 10, monthsFrom: 4, monthsTo: 4 },
  'gastric-botox': { kind: 'total', percent: 7, monthsFrom: 4, monthsTo: 6 },
};

export interface ExpectedWeight {
  weightKg: number;
  bmi: number;
  /** The selected procedure the estimate is based on. */
  procedureId: string;
  monthsFrom: number;
  monthsTo: number;
}

/** Expected weight (kg) after the strongest of the selected bariatric procedures — null when
 *  none of `procedureIds` is a bariatric procedure (body contouring doesn't change weight much). */
export function expectedWeight(currentKg: number, heightCm: number, procedureIds: string[]): ExpectedWeight | null {
  if (!(currentKg > 0) || !(heightCm > 0)) return null;
  const healthyCeilingKg = 25 * (heightCm / 100) ** 2;
  let best: ExpectedWeight | null = null;
  for (const id of procedureIds) {
    const outcome = BARIATRIC_OUTCOMES[id];
    if (!outcome) continue;
    const lossKg =
      outcome.kind === 'excess' ? (Math.max(0, currentKg - healthyCeilingKg) * outcome.percent) / 100 : (currentKg * outcome.percent) / 100;
    const weightKg = Math.round((currentKg - lossKg) * 10) / 10;
    if (best === null || weightKg < best.weightKg) {
      best = { weightKg, bmi: calculateBmi(weightKg, heightCm, 'metric')!, procedureId: id, monthsFrom: outcome.monthsFrom, monthsTo: outcome.monthsTo };
    }
  }
  return best;
}

/** Feet offered in the imperial height dropdown — with 0-11 inches, 3'0" to 7'11". */
export const HEIGHT_FEET = [3, 4, 5, 6, 7] as const;

/** Whole inches → { feet, inches }, e.g. 66 → { feet: 5, inches: 6 }. */
export function splitFeetInches(totalInches: number): { feet: number; inches: number } {
  const whole = Math.round(totalInches);
  return { feet: Math.floor(whole / 12), inches: whole % 12 };
}

/** Whole inches written the US way, e.g. 66 → 5'6". */
export function formatFeetInches(totalInches: number): string {
  const { feet, inches } = splitFeetInches(totalInches);
  return `${feet}'${inches}"`;
}

/** Weight in kg from a value typed in `units`. */
export function toKg(weight: number, units: BmiUnits): number {
  return units === 'metric' ? weight : weight / LB_PER_KG;
}

/** Height in cm from a value typed in `units`. */
export function toCm(height: number, units: BmiUnits): number {
  return units === 'metric' ? height : height * CM_PER_INCH;
}

/** A kg weight shown in `units`, rounded to one decimal. */
export function fromKg(kg: number, units: BmiUnits): number {
  return Math.round((units === 'metric' ? kg : kg * LB_PER_KG) * 10) / 10;
}
