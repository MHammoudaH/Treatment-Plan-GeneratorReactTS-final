import { describe, expect, it } from 'vitest';
import { generatePremiumQuotationHtml } from './generatePremiumQuotationPdf';
import { calculateOption, createOptionInput } from '../../pricing/engine';
import type { QuotationPdfData } from '../types';

function baseData(overrides: Partial<QuotationPdfData> = {}): QuotationPdfData {
  const option = createOptionInput('opt-1', 'Option 1');
  option.implant = { itemId: null, count: 2, markupPercent: 0, finalUnitPriceOverride: 500 };
  option.visit1 = { ...option.visit1 };
  const calculated = calculateOption(option, 'USD', 1);

  return {
    generatedAt: new Date('2026-01-01').toISOString(),
    patient: { name: 'Test Patient', arabicName: 'Test Patient', country: 'US', language: 'English', diagnosis: '', treatmentData: null },
    payment: { method: 'visit-payments', installmentEligible: false, financing: null },
    options: [calculated],
    ...overrides,
  };
}

const SNAPSHOT = 'data:image/png;base64,SNAPSHOT';
const PHOTO_A = 'data:image/jpeg;base64,PHOTOA';
const PHOTO_B = 'data:image/jpeg;base64,PHOTOB';

// The class names below (`.patient-photo-gallery`, `.notes-block`, …) always appear once in
// the document's static <style> block regardless of what's rendered — assertions must look
// for the actual opening tag (an element that USES the class), never the bare class name,
// or a "this must NOT appear" check would false-fail against the stylesheet itself.
const GALLERY_TAG = 'class="patient-photo-gallery"'; // the div also carries an inline sizing style
const NOTES_TAG = '<div class="notes-block">';
const SNAPSHOT_IMG = `<img class="implant-map-img" src="${SNAPSHOT}"`;

describe('generatePremiumQuotationHtml — implant map / photos', () => {
  it('no photos: the 3D snapshot alone (unchanged existing behaviour)', () => {
    const html = generatePremiumQuotationHtml(baseData({ implantMap: { image: SNAPSHOT, implants: 2, crowns: 0 } }));
    expect(html).toContain(SNAPSHOT_IMG);
    expect(html).not.toContain(GALLERY_TAG);
  });

  it('photos uploaded, toggle OFF: snapshot AND photos both present', () => {
    const html = generatePremiumQuotationHtml(
      baseData({
        implantMap: { image: SNAPSHOT, implants: 2, crowns: 0 },
        patientPhotos: [PHOTO_A, PHOTO_B],
        replaceImplantMapWithPhotos: false,
      }),
    );
    expect(html).toContain(SNAPSHOT_IMG);
    expect(html).toContain(GALLERY_TAG);
    expect(html).toContain(PHOTO_A);
    expect(html).toContain(PHOTO_B);
  });

  it('photos uploaded, toggle ON: photos REPLACE the snapshot, but the legend/counts remain', () => {
    const html = generatePremiumQuotationHtml(
      baseData({
        implantMap: { image: SNAPSHOT, implants: 2, crowns: 0 },
        patientPhotos: [PHOTO_A],
        replaceImplantMapWithPhotos: true,
      }),
    );
    expect(html).not.toContain(SNAPSHOT_IMG);
    expect(html).not.toContain(SNAPSHOT); // the snapshot data URL doesn't appear anywhere
    expect(html).toContain(GALLERY_TAG);
    expect(html).toContain(PHOTO_A);
    expect(html).toContain('implant-legend">'); // counts still shown even though the image is swapped
  });

  it('photos uploaded but no 3D snapshot at all: the page still renders with just the photos', () => {
    const html = generatePremiumQuotationHtml(baseData({ patientPhotos: [PHOTO_A] }));
    expect(html).toContain(GALLERY_TAG);
    expect(html).toContain(PHOTO_A);
    expect(html).not.toContain('implant-legend">'); // no implantMap data -> no counts to show
  });

  it('neither snapshot nor photos: no Implant Map page at all', () => {
    const html = generatePremiumQuotationHtml(baseData());
    expect(html).not.toContain(GALLERY_TAG);
    expect(html).not.toContain(SNAPSHOT_IMG);
  });

  it('photos with no 3D snapshot (the app\'s only path today, the 3D map step was removed): the page reads "Photos", not "Implant Map"', () => {
    const html = generatePremiumQuotationHtml(baseData({ patientPhotos: [PHOTO_A] }));
    expect(html).toContain('<h2>Photos</h2>');
    expect(html).toContain('Before &amp; after, X-ray, intraoral or scan photos provided for your treatment.');
    expect(html).not.toContain('<h2>Implant Map</h2>');
    expect(html).not.toContain('Planned implant and crown positions');
  });

  it('a real 3D snapshot (still supported for shape/back-compat) keeps the "Implant Map" title', () => {
    const html = generatePremiumQuotationHtml(baseData({ implantMap: { image: SNAPSHOT, implants: 2, crowns: 0 } }));
    expect(html).toContain('<h2>Implant Map</h2>');
    expect(html).not.toContain('<h2>Photos</h2>');
  });
});

describe('generatePremiumQuotationHtml — financing', () => {
  it('prints the pre-computed breakdown as-is — never recomputes/re-derives it from the treatment total', () => {
    // Deliberately mismatched with the option's own $1,000 total (2 x $500 implants, see
    // baseData) — the point is that the renderer must print exactly these numbers regardless
    // of what the option total is, proving it isn't secretly recalculating `total * 1.20`
    // itself (the bug this whole feature fixes).
    const html = generatePremiumQuotationHtml(
      baseData({
        payment: {
          method: 'installments',
          installmentEligible: true,
          financing: { markupPercent: 20, installmentBase: 3900, installmentAmount: 4680, financedPackage: 10780, cashRemaining: 6100, cashPerVisit: 6100, maximumTermMonths: 24 },
        },
      }),
    );
    expect(html).toContain('$10,780'); // financedPackage
    expect(html).toContain('$4,680'); // installmentAmount (3900 + 20%)
    expect(html).toContain('$6,100'); // cashRemaining / cashPerVisit
    expect(html).not.toContain('$12,000'); // what the old (buggy) "whole total * 1.20" would print for a $10,000 base
  });

  it('omits the financing box entirely when not eligible', () => {
    const html = generatePremiumQuotationHtml(baseData({ payment: { method: 'visit-payments', installmentEligible: false, financing: null } }));
    expect(html).not.toContain('<div class="finance-box">');
  });
});

describe('generatePremiumQuotationHtml — unpriced procedures never print €0/$0', () => {
  it('a procedure with no configured price (e.g. an unpriced Plastic/Bariatric catalog entry) prints "Price to be confirmed", never $0', () => {
    const option = createOptionInput('opt-1', 'Option 1');
    // 'arm_lifting' has no predefined price in any currency and no coordinator override here.
    option.procedures = [{ procedureId: 'arm_lifting', quantity: 1, finalUnitPriceOverride: null }];
    const calculated = calculateOption(option, 'USD', 1);
    expect(calculated.treatment.procedures[0].priceConfigured).toBe(false);

    const html = generatePremiumQuotationHtml(baseData({ options: [calculated] }));
    expect(html).toContain('Arm Lifting');
    expect(html).toContain('Price to be confirmed');
    expect(html).not.toMatch(/Arm Lifting[\s\S]{0,200}\$0(?!\d)/);
  });

  it('a coordinator-priced procedure prints the actual entered price, not the TBD label', () => {
    const option = createOptionInput('opt-1', 'Option 1');
    option.procedures = [{ procedureId: 'arm_lifting', quantity: 1, finalUnitPriceOverride: 2200 }];
    const calculated = calculateOption(option, 'USD', 1);
    expect(calculated.treatment.procedures[0].priceConfigured).toBe(true);

    const html = generatePremiumQuotationHtml(baseData({ options: [calculated] }));
    expect(html).toContain('$2,200');
    expect(html).not.toContain('Price to be confirmed');
  });

  it('a catalog-priced procedure (Gastric Sleeve, EUR) prints its EUR price with no override needed', () => {
    const option = createOptionInput('opt-1', 'Option 1');
    option.procedures = [{ procedureId: 'gastric_sleeve', quantity: 1, finalUnitPriceOverride: null }];
    const calculated = calculateOption(option, 'EUR', 1);
    expect(calculated.treatment.procedures[0].priceConfigured).toBe(true);
    expect(calculated.treatment.procedures[0].total).toBe(2700);

    const html = generatePremiumQuotationHtml(
      baseData({ options: [calculated], display: { currency: 'EUR', usdToCurrencyRate: 1, showProductPrices: true, showHotelPrices: true } }),
    );
    expect(html).toContain('Gastric Sleeve');
    expect(html).toContain('€2,700');
  });
});

describe('generatePremiumQuotationHtml — showHotelPrices hides transfer/prosthesis prices too', () => {
  function optionWithServices() {
    const option = createOptionInput('opt-1', 'Option 1');
    option.implant = { itemId: null, count: 2, markupPercent: 0, finalUnitPriceOverride: 500 };
    option.visit1 = {
      ...option.visit1,
      transfer: { selectedUsd: 150, finalPriceOverride: null },
      prosthesis: { selectedUsd: 200, finalPriceOverride: null },
    };
    return calculateOption(option, 'USD', 1);
  }

  it('showHotelPrices=false: a priced VIP transfer and prosthesis print "Included", never their amount', () => {
    const html = generatePremiumQuotationHtml(
      baseData({
        options: [optionWithServices()],
        display: { currency: 'USD', usdToCurrencyRate: 1, showProductPrices: true, showHotelPrices: false },
      }),
    );
    expect(html).not.toContain('$150');
    expect(html).not.toContain('$200');
    expect((html.match(/>Included</g) ?? []).length).toBeGreaterThanOrEqual(2); // transfer + prosthesis (translator always says Included too)
  });

  it('showHotelPrices=true (default): the same priced transfer and prosthesis print their real amounts', () => {
    const html = generatePremiumQuotationHtml(baseData({ options: [optionWithServices()] }));
    expect(html).toContain('$150');
    expect(html).toContain('$200');
  });

  it('a genuinely free ($0) service still prints "Included" regardless of the toggle', () => {
    const option = createOptionInput('opt-1', 'Option 1');
    option.implant = { itemId: null, count: 2, markupPercent: 0, finalUnitPriceOverride: 500 };
    // Default visit1 transfer/prosthesis are already selectedUsd: 0 / unset — free.
    const calculated = calculateOption(option, 'USD', 1);
    const html = generatePremiumQuotationHtml(
      baseData({ options: [calculated], display: { currency: 'USD', usdToCurrencyRate: 1, showProductPrices: true, showHotelPrices: true } }),
    );
    expect(html).toContain('>Included<');
  });
});

describe('generatePremiumQuotationHtml — notes', () => {
  it('renders the notes page when notes is non-empty', () => {
    const html = generatePremiumQuotationHtml(baseData({ notes: 'Patient prefers morning appointments.' }));
    expect(html).toContain(NOTES_TAG);
    expect(html).toContain('Patient prefers morning appointments.');
  });

  it('omits the notes page entirely when notes is empty/whitespace/absent', () => {
    for (const notes of [undefined, '', '   ']) {
      const html = generatePremiumQuotationHtml(baseData({ notes }));
      expect(html).not.toContain(NOTES_TAG);
    }
  });

  it('escapes notes content (never raw HTML injection)', () => {
    const html = generatePremiumQuotationHtml(baseData({ notes: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
