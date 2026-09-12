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
const GALLERY_TAG = '<div class="patient-photo-gallery">';
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
