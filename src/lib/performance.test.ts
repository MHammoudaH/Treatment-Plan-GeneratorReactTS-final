import { describe, expect, it } from 'vitest';
import { parseTargetInput, progressLabel, progressPercent, shiftPeriod } from './performance';

describe('shiftPeriod', () => {
  it('moves by months, across year ends', () => {
    expect(shiftPeriod('2026-10-01', 'month', 1)).toBe('2026-11-01');
    expect(shiftPeriod('2026-12-01', 'month', 1)).toBe('2027-01-01');
    expect(shiftPeriod('2026-01-01', 'month', -1)).toBe('2025-12-01');
  });

  it('moves by quarters', () => {
    expect(shiftPeriod('2026-10-01', 'quarter', 1)).toBe('2027-01-01');
    expect(shiftPeriod('2026-01-01', 'quarter', -1)).toBe('2025-10-01');
  });
});

describe('progress', () => {
  it('percent of target, null without a target', () => {
    expect(progressPercent(12, 20)).toBe(60);
    expect(progressPercent(25, 20)).toBe(125);
    expect(progressPercent(3, null)).toBeNull();
    expect(progressPercent(0, 0)).toBe(100);
  });

  it('label', () => {
    expect(progressLabel(12, 20)).toBe('12 / 20 · 60%');
    expect(progressLabel(7, null)).toBe('7');
  });
});

describe('parseTargetInput', () => {
  it('empty clears, whole numbers pass, anything else is invalid', () => {
    expect(parseTargetInput('')).toBeNull();
    expect(parseTargetInput(' 30 ')).toBe(30);
    expect(parseTargetInput('0')).toBe(0);
    expect(parseTargetInput('2.5')).toBeUndefined();
    expect(parseTargetInput('-1')).toBeUndefined();
    expect(parseTargetInput('abc')).toBeUndefined();
  });
});
