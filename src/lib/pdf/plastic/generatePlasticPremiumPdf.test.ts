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
    markupPercent: 0,
    amounts: { surgeryItems: [{ name: RHINOPLASTY.name, amount: 2900 }], hotel: 0, transfer: 0, markup: 0, total: 2900 },
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
      markup: 0,
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
