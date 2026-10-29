import { describe, expect, it } from 'vitest';
import { bmiCategory, calculateBmi } from './bmi';

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
