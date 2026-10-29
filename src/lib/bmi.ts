/** BMI for the Plastic Surgery module's Bariatric section — informational only, never used in
 *  pricing. */

export type BmiUnits = 'metric' | 'imperial';

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
