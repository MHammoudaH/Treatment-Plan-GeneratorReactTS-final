import { describe, expect, it } from 'vitest';
import { bmiCategory, calculateBmi, expectedWeight, fromKg, toCm, toKg } from './bmi';

describe('calculateBmi', () => {
  it('metric: kg and cm', () => {
    expect(calculateBmi(70, 175, 'metric')).toBe(22.9);
    expect(calculateBmi(120, 170, 'metric')).toBe(41.5);
  });

  it('imperial: lb and inches (703 × lb / in²)', () => {
    expect(calculateBmi(150, 65, 'imperial')).toBe(25);
  });

  it('is null until both values are positive', () => {
    expect(calculateBmi(0, 175, 'metric')).toBeNull();
    expect(calculateBmi(70, 0, 'metric')).toBeNull();
    expect(calculateBmi(NaN, 175, 'imperial')).toBeNull();
  });
});

describe('bmiCategory', () => {
  it('uses the WHO bands', () => {
    expect(bmiCategory(18.4)).toBe('Underweight');
    expect(bmiCategory(22.9)).toBe('Normal weight');
    expect(bmiCategory(27)).toBe('Overweight');
    expect(bmiCategory(32)).toBe('Obesity class I');
    expect(bmiCategory(37)).toBe('Obesity class II');
    expect(bmiCategory(41.5)).toBe('Obesity class III');
  });
});

describe('expectedWeight', () => {
  // 120 kg, 175 cm: healthy ceiling (BMI 25) = 76.6 kg, so 43.4 kg of excess weight.
  it('surgery: loses its share of the EXCESS weight', () => {
    const sleeve = expectedWeight(120, 175, ['gastric-sleeve'])!;
    expect(sleeve.weightKg).toBe(93.9); // 60% of 43.4 kg lost
    expect(sleeve.monthsFrom).toBe(12);
  });

  it('balloons / Botox: lose a share of TOTAL body weight', () => {
    expect(expectedWeight(120, 175, ['gastric-balloon'])!.weightKg).toBe(105.6); // 12% of 120 kg
  });

  it('several procedures: the strongest estimate wins, with its BMI', () => {
    const result = expectedWeight(120, 175, ['rhinoplasty', 'gastric-sleeve', 'gastric-bypass'])!;
    expect(result.procedureId).toBe('gastric-bypass');
    expect(result.weightKg).toBe(89.6);
    expect(result.bmi).toBe(29.3);
  });

  it('null for body-contouring only, or missing measurements', () => {
    expect(expectedWeight(120, 175, ['rhinoplasty', 'liposuction'])).toBeNull();
    expect(expectedWeight(0, 175, ['gastric-sleeve'])).toBeNull();
  });

  it('unit helpers round-trip pounds and inches', () => {
    expect(fromKg(toKg(220, 'imperial'), 'imperial')).toBe(220);
    expect(toCm(70, 'imperial')).toBeCloseTo(177.8);
  });
});
