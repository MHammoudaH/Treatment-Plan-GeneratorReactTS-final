import { describe, expect, it } from 'vitest';
import { PRICING } from '../data/pricing';
import { PLASTIC_SURGERIES } from '../data/plasticSurgery';
import { createInitialState } from '../types/wizard';
import { buildQuotationPdfData } from './pricing/buildQuotationPdfData';
import { createOptionInput, emptyVisitInput } from './pricing/engine';
import { dentalQuoteSnapshot, plasticQuoteSnapshot } from './patientRecords';
import { rebuildPlanFromQuote } from './rebuildPlan';
import { wizardStateFromPlan, type DentalPlan, type PlasticPlan } from './editablePlan';
import type { PlasticPremiumInput } from './pdf/plastic/generatePlasticPremiumPdf';

function quotedDental() {
  const state = createInitialState();
  state.patient = { ...state.patient, name: 'Old Patient', language: 'French' };
  state.display = { ...state.display, currency: 'EUR', fxRate: 0.9 };
  const hotel = PRICING.hotels[0];
  const procedure = PRICING.procedures.find((p) => p.unit)!;
  state.options = [
    {
      ...createOptionInput('opt-1', 'German Implant System'),
      visits: 2,
      implant: { itemId: 'medigma', count: 4, markupPercent: 20, finalUnitPriceOverride: null },
      crown: { itemId: PRICING.crowns[0].id, count: 6, markupPercent: 0, finalUnitPriceOverride: 180 },
      procedures: [{ procedureId: procedure.id, quantity: 2, finalUnitPriceOverride: null }],
      visit1: { ...emptyVisitInput(), hotel: { hotelId: hotel.id, roomType: 'single', nights: 5, nightlyPriceOverride: null } },
      visit2: { ...emptyVisitInput(), hotel: { hotelId: hotel.id, roomType: 'single', nights: 3, nightlyPriceOverride: null } },
      flightTicket: { amount: 450 },
    },
    { ...createOptionInput('opt-2', 'Veneers only'), visits: 1, visit2: null, veneer: { itemId: PRICING.veneers[0].id, count: 8, markupPercent: 0, finalUnitPriceOverride: 140 } },
  ];
  return state;
}

describe('rebuildPlanFromQuote — dental', () => {
  const original = buildQuotationPdfData(quotedDental());
  const quote = dentalQuoteSnapshot(original, 'premium');
  const plan = rebuildPlanFromQuote(quote, 'Old Patient') as DentalPlan;
  const reopened = wizardStateFromPlan({ recordId: 3, patientName: 'Old Patient', quote, plan });
  const again = buildQuotationPdfData(reopened);

  it('restores every option with its products, counts, procedures, visits, hotels and flight', () => {
    expect(plan.rebuilt).toBe(true);
    const [o1, o2] = plan.options;
    expect(o1.name).toBe('German Implant System');
    expect(o1.implant).toMatchObject({ itemId: 'medigma', count: 4 });
    expect(o1.crown).toMatchObject({ itemId: PRICING.crowns[0].id, count: 6, finalUnitPriceOverride: 180 });
    expect(o1.procedures).toHaveLength(1);
    expect(o1.procedures[0].quantity).toBe(2);
    expect(o1.visits).toBe(2);
    expect(o1.visit1.hotel).toMatchObject({ hotelId: PRICING.hotels[0].id, nights: 5 });
    expect(o1.visit2?.hotel).toMatchObject({ hotelId: PRICING.hotels[0].id, nights: 3 });
    expect(o1.flightTicket.amount).toBe(450);
    expect(o2.visits).toBe(1);
    expect(o2.veneer).toMatchObject({ itemId: PRICING.veneers[0].id, count: 8 });
  });

  it('every treatment line comes back at exactly the quoted price', () => {
    for (let i = 0; i < original.options.length; i++) {
      const a = original.options[i].treatment;
      const b = again.options[i].treatment;
      for (const key of ['implants', 'crowns', 'veneers'] as const) expect(b[key].total).toBeCloseTo(a[key].total, 2);
      expect(b.procedures.map((p) => p.total)).toEqual(a.procedures.map((p) => p.total));
    }
  });

  it('opens with patient, language and currency; live rate allowed (rate was never saved)', () => {
    expect(reopened.patient.name).toBe('Old Patient');
    expect(reopened.patient.language).toBe('French');
    expect(reopened.display.currency).toBe('EUR');
    expect(reopened.display.fxRateEdited).toBe(false);
    expect(reopened.rebuiltFromSummary).toBe(true);
    expect(reopened.recordSave.record).toMatchObject({ id: 3, pinned: true });
  });
});

describe('rebuildPlanFromQuote — plastic', () => {
  const rhino = PLASTIC_SURGERIES.find((p) => p.id === 'rhinoplasty')!;
  const unpriced = PLASTIC_SURGERIES.find((p) => p.priceEur === null && p.available !== false)!;
  const hotel = PRICING.hotels[0];
  const input: PlasticPremiumInput = {
    items: [rhino, unpriced],
    patientName: 'Old Plastic',
    language: 'Spanish',
    currency: 'GBP',
    doctorName: '',
    travelDate: '',
    coordinatorNote: '',
    hotelName: hotel.name,
    hotelNights: 7,
    transferIncluded: true,
    packagePrice: true,
    amounts: { surgeryItems: [{ name: rhino.name, amount: 2494 }, { name: unpriced.name, amount: 1800 }], hotel: 410.5, transfer: 110, total: 4814.5 },
    gallery: [],
  };
  const plan = rebuildPlanFromQuote(plasticQuoteSnapshot(input), 'Old Plastic') as PlasticPlan;

  it('restores procedures, hotel + nights + price, transfer, currency, language, package price', () => {
    expect(plan.itemIds).toEqual([rhino.id, unpriced.id]);
    expect(plan.priceOverrides).toEqual({ [unpriced.id]: '1800' });
    expect(plan).toMatchObject({ hotelId: hotel.id, hotelNights: 7, nightsEdited: true, hotelPriceOverride: '410.5' });
    expect(plan).toMatchObject({ transferIncluded: true, currency: 'GBP', language: 'Spanish', packagePrice: true, patientName: 'Old Plastic' });
  });

  it('no transfer / no hotel when the quote had none', () => {
    const plain = rebuildPlanFromQuote(plasticQuoteSnapshot({ ...input, hotelName: null, hotelNights: 0, transferIncluded: false, packagePrice: false }), 'x') as PlasticPlan;
    expect(plain).toMatchObject({ hotelId: '', hotelNights: 0, transferIncluded: false, packagePrice: false });
  });

  it('null when nothing in the summary matches the catalog', () => {
    expect(rebuildPlanFromQuote({ module: 'plastic', pdf: 'premium', currency: 'EUR', language: 'English', options: [{ name: 'X', lines: ['Unknown thing: €5'], total: 5 }] }, 'x')).toBeNull();
  });
});
