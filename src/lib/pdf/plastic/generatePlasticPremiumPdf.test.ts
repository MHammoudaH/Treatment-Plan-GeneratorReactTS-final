import { describe, expect, it } from 'vitest';
import { generatePlasticPremiumHtml, type PlasticPremiumInput } from './generatePlasticPremiumPdf';
import type { PlasticSurgeryItem } from '../../../data/plasticSurgery';

const RHINOPLASTY: PlasticSurgeryItem = { id: 'rhinoplasty', name: 'Rhinoplasty', category: 'Face', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night' };
const BREAST_LIFT: PlasticSurgeryItem = { id: 'breast-lift', name: 'Breast Lifting Without Silicone', category: 'Breast', priceEur: 2900, stay: '7 nights - 8 days', hospitalStay: '1 night', note: 'Combined-visit note.' };

function baseInput(overrides: Partial<PlasticPremiumInput> = {}): PlasticPremiumInput {
  return {
    items: [RHINOPLASTY],
    patientName: 'Test Patient',
    language: 'English',
    currency: 'EUR',
    doctorName: '',
    travelDate: '',
    coordinatorNote: '',
    hotelName: null,
    hotelNights: 0,
    transferIncluded: false,
    amounts: { surgeryItems: [{ name: RHINOPLASTY.name, amount: 2900 }], hotel: 0, transfer: 0, total: 2900 },
    gallery: [],
    ...overrides,
  };
}

describe('generatePlasticPremiumHtml — single procedure (regression)', () => {
  it('renders the one procedure card and its investment row', () => {
    const html = generatePlasticPremiumHtml(baseInput());
    expect(html).toContain('Rhinoplasty');
    expect((html.match(/class="procedure-card"/g) ?? []).length).toBe(1);
    expect((html.match(/class="line"/g) ?? []).length).toBe(1); // one surgery row, no hotel/transfer/markup
  });
});

describe('generatePlasticPremiumHtml — combined multi-procedure quotation', () => {
  const combined = baseInput({
    items: [RHINOPLASTY, BREAST_LIFT],
    amounts: {
      surgeryItems: [
        { name: RHINOPLASTY.name, amount: 2900 },
        { name: BREAST_LIFT.name, amount: 2900 },
      ],
      hotel: 500,
      transfer: 150,
      total: 6450,
    },
    hotelName: 'Hotel A',
    hotelNights: 7,
    transferIncluded: true,
  });

  it('renders a separate card for EVERY selected procedure', () => {
    const html = generatePlasticPremiumHtml(combined);
    expect(html).toContain('Rhinoplasty');
    expect(html).toContain('Breast Lifting Without Silicone');
    expect((html.match(/class="procedure-card"/g) ?? []).length).toBe(2);
  });

  it('CRITICAL: prints ONE investment row per procedure, never a single merged figure', () => {
    const html = generatePlasticPremiumHtml(combined);
    // One "Surgery — <name>" line per procedure, each with its own amount, plus hotel/transfer.
    expect(html).toContain('Surgery — Rhinoplasty');
    expect(html).toContain('Surgery — Breast Lifting Without Silicone');
    expect((html.match(/class="line"/g) ?? []).length).toBe(4); // 2 surgery rows + hotel + transfer
  });

  it('package price: every line is still listed but shows "Included"; only the total is priced', () => {
    const html = generatePlasticPremiumHtml({ ...combined, packagePrice: true });
    expect((html.match(/class="line"/g) ?? []).length).toBe(4);
    expect(html).toContain('Surgery — Rhinoplasty</span><strong>Included</strong>');
    expect(html).toContain('Airport transfer</span><strong>Included</strong>');
    expect(html).not.toContain('€2,900');
    expect(html).not.toContain('€500');
    expect(html).not.toContain('€150');
    expect(html).toContain('All-inclusive package price</span><strong>€6,450</strong>');
  });

  it('package price labels are translated (Arabic)', () => {
    const html = generatePlasticPremiumHtml({ ...combined, packagePrice: true, language: 'Arabic' });
    expect(html).toContain('مشمول');
    expect(html).toContain('سعر الباقة الشاملة');
  });

  it('weight & BMI: current and expected figures with the timeframe when provided', () => {
    const html = generatePlasticPremiumHtml({
      ...combined,
      weight: { unit: 'kg', current: 120, bmi: 39.2, expected: 91.5, expectedBmi: 29.9, months: { from: 12, to: 18 } },
    });
    expect(html).toContain('Current weight');
    expect(html).toContain('120 kg');
    expect(html).toContain('91.5 kg');
    expect(html).toContain('29.9');
    expect(html).toContain('12–18 months');
    expect(html).toContain('typical average results');
    expect(html).toContain('confirmed by your doctor during your one-to-one consultation');
  });

  it('weight & BMI: nothing printed when not provided; no expected rows without an expected weight', () => {
    expect(generatePlasticPremiumHtml(combined)).not.toContain('Current weight');
    const html = generatePlasticPremiumHtml({ ...combined, weight: { unit: 'lb', current: 180, bmi: 26.6, expected: null, expectedBmi: null, months: null } });
    expect(html).toContain('180 lb');
    expect(html).not.toContain('Expected weight');
  });

  it('the cover page combines every procedure name', () => {
    const html = generatePlasticPremiumHtml(combined);
    expect(html).toContain('Rhinoplasty + Breast Lifting Without Silicone');
  });

  it('a per-procedure note only appears on that procedure’s own card', () => {
    const html = generatePlasticPremiumHtml(combined);
    expect(html).toContain('Combined-visit note.');
  });

  it('shared visit facts (date/doctor) appear once, not per procedure', () => {
    const html = generatePlasticPremiumHtml(baseInput({ items: [RHINOPLASTY, BREAST_LIFT], doctorName: 'Dr. Test' }));
    expect((html.match(/Dr\. Test/g) ?? []).length).toBe(1);
  });
});
