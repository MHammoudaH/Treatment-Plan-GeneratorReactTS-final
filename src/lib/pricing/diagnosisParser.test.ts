import { describe, expect, it } from 'vitest';
import { parseTreatmentData } from './diagnosisParser';

describe('parseTreatmentData — veneers', () => {
  it('reads a veneers-only plan without inventing implants or crowns', () => {
    expect(parseTreatmentData('10 veneers')).toEqual({ veneers: 10 });
  });

  it('keeps crowns and veneers apart in one message', () => {
    expect(parseTreatmentData('20 zirconia crowns, 8 veneers')).toEqual({ crownMaterial: 'zirconia', crowns: 20, veneers: 8 });
  });

  it('understands veneer vocabulary in other languages', () => {
    expect(parseTreatmentData('6 facettes').veneers).toBe(6);
    expect(parseTreatmentData('ocho carillas').veneers).toBe(8);
    expect(parseTreatmentData('10 виниров').veneers).toBe(10);
    expect(parseTreatmentData('١٢ فينير').veneers).toBe(12);
  });

  it('still reads an implant plan as before', () => {
    expect(parseTreatmentData('6 implants upper, 6 implants lower, 24 crowns')).toEqual({ upperImplants: 6, lowerImplantsMin: 6, lowerImplantsMax: 6, crowns: 24 });
  });
});
