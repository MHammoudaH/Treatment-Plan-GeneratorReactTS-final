import { describe, expect, it } from 'vitest';
import { DOCTORS, toPdfDoctor } from './doctors';

const LANGUAGES = ['Russian', 'French', 'Spanish', 'Arabic'] as const;

describe('toPdfDoctor', () => {
  it('defaults to English and never translates the name', () => {
    const doctor = DOCTORS[0];
    const pdf = toPdfDoctor(doctor);
    expect(pdf.name).toBe(doctor.name);
    expect(pdf.specialty).toBe(doctor.specialty);
    expect(pdf.bio).toContain(doctor.specialty);
  });

  it('every doctor has a translated specialty + bio for every supported non-English language', () => {
    for (const doctor of DOCTORS) {
      for (const language of LANGUAGES) {
        const pdf = toPdfDoctor(doctor, language);
        expect(pdf.name).toBe(doctor.name); // name is still never translated
        expect(pdf.specialty).toBeTruthy();
        expect(pdf.specialty).not.toBe(doctor.specialty); // actually translated, not an English fallback
        expect(pdf.bio).toBeTruthy();
        expect(pdf.bio).not.toBe(doctor.specialty); // not silently falling back to the raw English specialty
      }
    }
  });

  it('a doctor with no translation for a language falls back to the English bio, never a blank card', () => {
    const noTranslations = { ...DOCTORS[0], translations: undefined };
    const pdf = toPdfDoctor(noTranslations, 'Russian');
    expect(pdf.specialty).toBe(noTranslations.specialty);
    expect(pdf.bio).toBeTruthy();
  });
});
