import { describe, expect, it } from 'vitest';
import { createInitialState } from '../types/wizard';
import { buildQuotationPdfData } from './pricing/buildQuotationPdfData';
import { createOptionInput, emptyVisitInput } from './pricing/engine';
import { dentalQuoteSnapshot, formatSnapshotMoney, plasticQuoteSnapshot, sameQuote } from './patientRecords';
import type { PlasticPremiumInput } from './pdf/plastic/generatePlasticPremiumPdf';

function dentalState() {
  const state = createInitialState();
  state.patient.name = 'John Smith';
  state.display = { ...state.display, currency: 'EUR', fxRate: 0.9 };
  state.options = [
    {
      ...createOptionInput('opt-1', 'German Implant System'),
      visits: 1,
      implant: { itemId: 'medigma', count: 2, markupPercent: 0, finalUnitPriceOverride: 300 },
      crown: { itemId: null, count: 0, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    },
  ];
  return state;
}

describe('dentalQuoteSnapshot', () => {
  it('keeps each option with its plan lines and total, in the quoted currency', () => {
    const data = buildQuotationPdfData(dentalState());
    const snapshot = dentalQuoteSnapshot(data, 'premium');
    expect(snapshot.module).toBe('dental');
    expect(snapshot.pdf).toBe('premium');
    expect(snapshot.currency).toBe('EUR');
    expect(snapshot.options).toHaveLength(1);
    expect(snapshot.options[0].name).toBe('German Implant System');
    expect(snapshot.options[0].lines[0]).toMatch(/^2 × Implant — .+: €600$/);
    expect(snapshot.options[0].total).toBe(data.options[0].totals.total);
  });

  it('skips zero-quantity lines (no crowns quoted → no crown line)', () => {
    const snapshot = dentalQuoteSnapshot(buildQuotationPdfData(dentalState()), 'simple');
    expect(snapshot.options[0].lines.some((l) => l.includes('Crown'))).toBe(false);
  });
});

describe('plasticQuoteSnapshot', () => {
  const input: PlasticPremiumInput = {
    items: [
      { id: 'rhinoplasty', name: 'Rhinoplasty', category: 'Face', priceEur: 2900, stay: '7 nights', hospitalStay: '1 night' },
      { id: 'liposuction', name: 'Liposuction', category: 'Body', priceEur: 2500, stay: '7 nights', hospitalStay: '1 night' },
    ],
    patientName: 'Jane Doe',
    language: 'French',
    currency: 'GBP',
    doctorName: '',
    travelDate: '',
    coordinatorNote: '',
    hotelName: 'Hotel A',
    hotelNights: 7,
    transferIncluded: true,
    packagePrice: true,
    amounts: { surgeryItems: [{ name: 'Rhinoplasty', amount: 2494 }, { name: 'Liposuction', amount: 2150 }], hotel: 400, transfer: 110, total: 5154 },
    gallery: [],
  };

  it('one combined option with every procedure, hotel and transfer line', () => {
    const snapshot = plasticQuoteSnapshot(input);
    expect(snapshot).toMatchObject({ module: 'plastic', pdf: 'premium', currency: 'GBP', language: 'French' });
    expect(snapshot.options[0].name).toBe('Rhinoplasty + Liposuction');
    expect(snapshot.options[0].lines).toEqual([
      'Rhinoplasty: £2,494',
      'Liposuction: £2,150',
      'Hotel — Hotel A, 7 nights: £400',
      'Airport transfer: £110',
    ]);
    expect(snapshot.options[0].total).toBe(5154);
    expect(snapshot.remark).toMatch(/Full package price/);
  });

  it('no remark when it was not a package price', () => {
    expect(plasticQuoteSnapshot({ ...input, packagePrice: false }).remark).toBeUndefined();
  });
});

describe('sameQuote / formatSnapshotMoney', () => {
  it('the same plan printed as Simple and Premium counts as the same quote; a price change does not', () => {
    const data = buildQuotationPdfData(dentalState());
    const simple = dentalQuoteSnapshot(data, 'simple');
    expect(sameQuote(simple, dentalQuoteSnapshot(data, 'premium'))).toBe(true);
    expect(sameQuote(simple, { ...simple, options: [{ ...simple.options[0], total: 1 }] })).toBe(false);
  });

  it('formats with the currency symbol', () => {
    expect(formatSnapshotMoney(1234.5, 'AUD')).toBe('A$1,234.5');
    expect(formatSnapshotMoney(10, 'CHF')).toBe('CHF 10');
  });
});
