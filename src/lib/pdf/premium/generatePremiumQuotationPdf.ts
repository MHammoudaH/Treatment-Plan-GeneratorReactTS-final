/**
 * Premium Proposal PDF — a branded, multi-page treatment proposal (cover page, treatment
 * summary, one page per option, investment/payment page, dental-team page, clinic gallery,
 * closing page).
 *
 * Ported from, and consolidates:
 *  - `premium-generator.js`     (`generatePremiumQuotationHtml()` / `generatePremiumQuotationPdf()`)
 *  - `coordinator-updates.js`'s second IIFE ("DutyAI PDF control fix"), which is the function
 *    that actually ran in production: it replaced `window.generatePremiumQuotationPdf` to
 *    (a) run a `$` → currency-symbol regex over the whole rendered HTML for EUR display, and
 *    (b) DOM-walk the rendered document to blank out product/hotel prices. Both capabilities
 *    are implemented here as first-class, typed inputs instead — `data.display.currency` /
 *    `usdToCurrencyRate` render the correct amount the first time, and `showProductPrices` /
 *    `showHotelPrices` are checked while building each row.
 *
 * Every user-visible string comes from `PREMIUM_LABELS` (all five languages, no hardcoded
 * English). Arabic additionally switches the document to a right-to-left layout.
 *
 * Must run in a browser context: it calls `window.open`, `document.write` and
 * `window.print()`. Call it directly from a button's `onClick` handler.
 */
import type { QuotationDisplayOptions, QuotationLanguage, QuotationOption, QuotationPdfData, QuotationVisit } from '../types';
import { getPremiumLabels, type PremiumLabels } from './labels';
import { withOrigin } from '../originLabels';

/**
 * Minimal doctor profile for the "Your Dental Team" page. The real doctors data module lives
 * elsewhere in the app; this is only the shape the Premium Proposal renderer needs.
 */
export interface Doctor {
  name: string;
  /** Shown under the name in accent color. Falls back to the localized "Dentistry" when omitted. */
  specialty?: string;
  /** Public URL/path of the doctor's photo. */
  photoUrl?: string;
  /** Free-text biography line (kept as supplied — not translated). Preferred over `expertise`. */
  bio?: string;
  /** Highlighted expertise/treatment tags; rendered as a "•"-joined line (capped to 4) when `bio` isn't supplied. */
  expertise?: string[];
}

const DEFAULT_DISPLAY: QuotationDisplayOptions = {
  currency: 'USD',
  usdToCurrencyRate: 1,
  showProductPrices: true,
  showHotelPrices: true,
};

/** Clinic photos for the "Your Istanbul Experience" gallery page. Served from `/public`;
 *  spaces and parentheses in the filenames must stay percent-encoded. The first entry is
 *  rendered as the full-width hero. */
const CLINIC_IMAGES = [
  '/assets/clinic/Gemini_Generated_Image_eloxpveloxpvelox.png',
  '/assets/clinic/clinic%20waiting.png',
  '/assets/clinic/unnamed%20(4)%20(1).webp',
];

function resolveDisplay(display: QuotationDisplayOptions | undefined): QuotationDisplayOptions {
  return display ?? DEFAULT_DISPLAY;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Isolates a Latin run (money, digits, dates, Latin brand text) so it renders correctly
 *  inside an RTL Arabic document. A no-op for the left-to-right languages. */
function bidi(value: string | number, rtl: boolean): string {
  return rtl ? `<bdi>${value}</bdi>` : String(value);
}

/**
 * Legacy source: `premiumMoney()` — optional USD equivalent folded in. `value` is ALREADY
 * expressed in `display.currency` (every figure in a `QuotationOption` comes straight out of
 * `calculateOption()`, see `src/lib/pricing/engine.ts`) — no USD conversion happens here.
 */
function money(value: number, display: QuotationDisplayOptions): string {
  const amount = Number(value) || 0;
  const symbol = display.currency === 'EUR' ? '€' : display.currency === 'AUD' ? 'A$' : '$';
  const main = `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
  if (display.currency === 'USD' || !display.showUsdEquivalent) return main;
  // Reference-only USD equivalent — the inverse of the isolated fxRate, never the source of
  // the amount above. See QuotationDisplayOptions.usdToCurrencyRate.
  const rate = display.usdToCurrencyRate || 1;
  const usdEquivalent = amount / rate;
  const usd = usdEquivalent.toLocaleString('en-US', {
    minimumFractionDigits: usdEquivalent % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${main} (≈ $${usd})`;
}

/** Legacy source: `premiumDate()` — Gregorian, `en-GB` formatting for every language. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
}

/** Legacy source: `premiumTreatmentSummary()` — now fully localized via `labels.summary`. */
function treatmentSummaryItems(data: QuotationPdfData, labels: PremiumLabels): string {
  const d = data.patient.treatmentData;
  if (!d) return `<li>${esc(data.patient.diagnosis || '')}</li>`;

  const lines: string[] = [];

  if (d.upperImplants) {
    lines.push(labels.summary.upperImplants(d.upperImplants));
  }

  if (d.lowerImplantsMin) {
    const isRange = !!d.lowerImplantsMax && d.lowerImplantsMax !== d.lowerImplantsMin;
    const range = isRange ? `${d.lowerImplantsMin}–${d.lowerImplantsMax}` : `${d.lowerImplantsMin}`;
    lines.push(labels.summary.lowerImplants(range, isRange));
  }

  if (d.crowns) {
    lines.push(labels.summary.crowns(d.crowns, d.crownMaterial === 'zirconia'));
  }

  if (!lines.length && data.patient.diagnosis) lines.push(data.patient.diagnosis);

  return lines.map((line) => `<li>${esc(line)}</li>`).join('');
}

/** Maps an engine service name ("VIP transfer" / "Dental prosthesis" / "Translator") to its
 *  localized label by substring, mirroring the Simple PDF's Arabic renderer. */
function serviceLabel(name: string, labels: PremiumLabels): string {
  const key = name.toLowerCase();
  if (key.includes('vip') || key.includes('transfer')) return labels.transfer;
  if (key.includes('prosthes')) return labels.prosthesis;
  if (key.includes('translat')) return labels.translator;
  return name;
}

/** Legacy source: `premiumTreatmentRows()`. `showProductPrices=false` prints the localized
 *  "Included" instead of the price. */
function treatmentRowsHtml(
  option: QuotationOption,
  display: QuotationDisplayOptions,
  labels: PremiumLabels,
  rtl: boolean,
  language: QuotationLanguage,
): string {
  const rows: string[] = [];
  const { implants, crowns, bridge, procedures } = option.treatment;
  const totalText = (value: number) =>
    display.showProductPrices ? bidi(esc(money(value, display)), rtl) : esc(labels.included);

  if (implants.quantity) {
    const implantName = withOrigin(implants.name, implants.origin, language);
    rows.push(
      `<div class="treatment-row"><div><strong>${esc(labels.dentalImplants)}</strong><span>${esc(implantName)}</span></div><strong>${bidi(implants.quantity, rtl)}</strong><strong>${totalText(implants.total)}</strong></div>`,
    );
  }

  if (crowns.quantity) {
    rows.push(
      `<div class="treatment-row"><div><strong>${esc(labels.dentalCrowns)}</strong><span>${esc(crowns.name || '')}</span></div><strong>${bidi(crowns.quantity, rtl)}</strong><strong>${totalText(crowns.total)}</strong></div>`,
    );
  }

  if (bridge.quantity) {
    rows.push(
      `<div class="treatment-row"><div><strong>${esc(labels.dentalBridge)}</strong><span>${esc(bridge.name || '')}</span></div><strong>${bidi(bridge.quantity, rtl)}</strong><strong>${totalText(bridge.total)}</strong></div>`,
    );
  }

  for (const procedure of procedures) {
    // A procedure with no configured price (no catalog price for this currency AND no
    // coordinator override — e.g. an unpriced Plastic/Bariatric entry) must never print as
    // $0/€0, regardless of `showProductPrices` — there is nothing to hide, it was never set.
    const procedureTotalText = procedure.priceConfigured ? totalText(procedure.total) : esc(labels.priceTbd);
    rows.push(
      `<div class="treatment-row"><div><strong>${esc(procedure.name)}</strong><span>${procedure.unit ? `${bidi(procedure.quantity, rtl)} ${esc(procedure.unit)}` : ''}</span></div><strong>${bidi(procedure.quantity, rtl)}</strong><strong>${procedureTotalText}</strong></div>`,
    );
  }

  return rows.join('');
}

/** Legacy source: `premiumVisitCard()`. `showHotelPrices=false` prints the localized
 *  "Included" for the hotel line only. */
function visitCardHtml(
  visit: QuotationVisit | null,
  label: string,
  display: QuotationDisplayOptions,
  labels: PremiumLabels,
  rtl: boolean,
): string {
  if (!visit) return '';

  const { hotel, services } = visit;
  const m = (v: number) => bidi(esc(money(v, display)), rtl);
  const serviceRows: string[] = [];
  if (services.transfer) {
    serviceRows.push(
      `<div><span>${esc(serviceLabel(services.transfer.name, labels))}</span><strong>${services.transfer.total ? m(services.transfer.total) : esc(labels.included)}</strong></div>`,
    );
  }
  if (services.prosthesis) {
    serviceRows.push(
      `<div><span>${esc(serviceLabel(services.prosthesis.name, labels))}</span><strong>${services.prosthesis.total ? m(services.prosthesis.total) : esc(labels.included)}</strong></div>`,
    );
  }
  if (services.translator) {
    serviceRows.push(`<div><span>${esc(labels.translator)}</span><strong>${esc(labels.included)}</strong></div>`);
  }

  const hotelTotalText = hotel && display.showHotelPrices ? m(hotel.total) : esc(labels.included);

  return `
    <div class="visit-card">
      <div class="visit-title"><span>${esc(label)}</span><strong>${m(visit.finalTotal)}</strong></div>
      ${
        hotel
          ? `
        <div class="visit-line">
          <span><strong>${esc(hotel.name)}</strong><br>${esc(hotel.roomLabel || hotel.roomType)} • ${bidi(hotel.nights, rtl)} ${esc(labels.nights)}</span>
          <strong>${hotelTotalText}</strong>
        </div>
      `
          : ''
      }
      <div class="service-list">${serviceRows.join('')}</div>
    </div>
  `;
}

/** Column count and per-image height for the uploaded-photo gallery, driven by how many
 *  photos there are and whether they're the page's ONLY visual (`hero`, i.e. they replaced the
 *  3D snapshot rather than sitting alongside it) — a fixed 3-column/48mm grid made every photo
 *  tiny and hard to actually read regardless of context, which defeats the point of uploading
 *  an X-ray or intraoral photo in the first place. */
function photoGalleryLayout(count: number, hero: boolean): { cols: number; heightMm: number } {
  const cols = count <= 1 ? 1 : count === 2 ? 2 : count <= 4 ? 2 : 3;
  const heightByHero: Record<number, number> = hero ? { 1: 150, 2: 120, 3: 85 } : { 1: 110, 2: 85, 3: 62 };
  return { cols, heightMm: heightByHero[cols] };
}

/** Renders the uploaded-photo grid at a size that actually reads as a photo, not a thumbnail
 *  — see `photoGalleryLayout`. When 2 columns don't divide evenly, the odd photo out spans the
 *  full row width instead of being stranded at half-width next to empty space. */
function photoGalleryHtml(photos: string[], hero: boolean): string {
  const { cols, heightMm } = photoGalleryLayout(photos.length, hero);
  const spanLastFullWidth = cols === 2 && photos.length % 2 === 1;
  const images = photos
    .map((src, i) => {
      const spanStyle = spanLastFullWidth && i === photos.length - 1 ? ' grid-column: 1 / -1;' : '';
      return `<img src="${src}" alt="" style="height: ${heightMm}mm;${spanStyle}">`;
    })
    .join('');
  return `<div class="patient-photo-gallery" style="grid-template-columns: repeat(${cols}, 1fr);">${images}</div>`;
}

/** Legacy source: `premiumDoctorCards()`. Caps at 4 cards. Names and bios are shown as
 *  supplied (proper nouns / free-text CVs); only the specialty fallback is localized. */
function doctorCardsHtml(doctors: Doctor[], labels: PremiumLabels): string {
  return doctors
    .slice(0, 4)
    .map(
      (doctor) => `
    <div class="doctor-card">
      <img src="${esc(doctor.photoUrl || '')}" alt="">
      <div>
        <h3>${esc(doctor.name)}</h3>
        <p class="doctor-specialty">${esc(doctor.specialty || labels.dentistry)}</p>
        <p>${esc(doctor.bio || (doctor.expertise || []).slice(0, 4).join(' • '))}</p>
      </div>
    </div>
  `,
    )
    .join('');
}

const RTL_CSS = `
  [dir="rtl"] body { font-family: "Segoe UI", "Tahoma", Arial, sans-serif; }
  [dir="rtl"] .eyebrow,
  [dir="rtl"] .kicker,
  [dir="rtl"] .option-kicker,
  [dir="rtl"] .section-label,
  [dir="rtl"] .page-header,
  [dir="rtl"] .treatment-head,
  [dir="rtl"] .cover h1,
  [dir="rtl"] .important strong { letter-spacing: 0; }
  [dir="rtl"] .cover-patient { border-left: 0; border-right: 3px solid #d8232a; padding-left: 0; padding-right: 7mm; }
  [dir="rtl"] .summary-box { border-left: 0; border-right: 4px solid #d8232a; }
  [dir="rtl"] .summary-box ul { margin-left: 0; margin-right: 5mm; }
  [dir="rtl"] .summary-box li { unicode-bidi: plaintext; }
  [dir="rtl"] .important { text-align: right; }
  [dir="rtl"] .notes-block { text-align: right; unicode-bidi: plaintext; }
  [dir="rtl"] .eyebrow,
  [dir="rtl"] .cover-footer,
  [dir="rtl"] .contact,
  [dir="rtl"] .closing p,
  [dir="rtl"] .doctor-card h3,
  [dir="rtl"] .doctor-card p,
  [dir="rtl"] .treatment-row div span { unicode-bidi: plaintext; }
`;

/**
 * Builds the complete Premium Proposal HTML document for `data`, in `data.patient.language`.
 * Arabic renders right-to-left; every other language shares the left-to-right layout. Omit
 * `data.display` to default to USD at face value with every price shown.
 *
 * Legacy source: `generatePremiumQuotationHtml()`.
 */
export function generatePremiumQuotationHtml(data: QuotationPdfData, doctors: Doctor[] = []): string {
  const display = resolveDisplay(data.display);
  const language = data.patient.language || 'English';
  const labels: PremiumLabels = getPremiumLabels(language);
  const rtl = language === 'Arabic';
  const patientName = (rtl ? data.patient.arabicName || data.patient.name : data.patient.name) || (rtl ? 'مريض' : 'Patient');
  const date = formatDate(data.generatedAt);
  const options = data.options;
  const m = (v: number) => bidi(esc(money(v, display)), rtl);

  const optionBlocks = options
    .map((option, index) => {
      const visitCount = option.visits.count || 1;
      const { visit1, visit2 } = option.visits;

      return `
      <section class="page option-page">
        <div class="page-header">
          <span>${esc(labels.options)}</span>
          <strong>${esc(patientName)}</strong>
        </div>

        <div class="option-kicker">${esc(labels.option)} ${bidi(index + 1, rtl)}</div>
        <h2>${esc(option.name || `${labels.option} ${index + 1}`)}</h2>

        <div class="treatment-table">
          <div class="treatment-head"><span>${esc(labels.procedure)}</span><span>${esc(labels.qty)}</span><span>${esc(labels.total)}</span></div>
          ${treatmentRowsHtml(option, display, labels, rtl, language)}
        </div>

        <div class="section-label">${esc(labels.accommodation)} — ${visitCount === 1 ? esc(labels.oneVisit) : esc(labels.twoVisits)}</div>
        <div class="visit-grid">
          ${visitCardHtml(visit1, labels.visit1, display, labels, rtl)}
          ${visitCardHtml(visit2, labels.visit2, display, labels, rtl)}
        </div>

        <div class="option-total-box">
          <span>${esc(labels.total)}</span>
          <strong>${m(option.totals.total)}</strong>
        </div>
      </section>
    `;
    })
    .join('');

  // The app no longer produces a 3D implant-map snapshot (that wizard step was removed) — this
  // page is now driven entirely by `patientPhotos`, whatever the coordinator uploaded on the
  // confirmation step. `data.implantMap` stays supported here for shape/back-compat (and the
  // three-way logic below still holds if it's ever populated again) but is never set by the
  // app today, so the headline/intro fall back to the generic "Photos" copy in that case.
  const photos = data.patientPhotos ?? [];
  const showSnapshot = Boolean(data.implantMap) && !(photos.length && data.replaceImplantMapWithPhotos);
  const showPhotos = photos.length > 0;
  const pageTitle = data.implantMap ? labels.implantMap : labels.photos;
  const pageIntro = data.implantMap ? labels.implantMapIntro : labels.photosIntro;

  const implantMapPage =
    data.implantMap || showPhotos
      ? `
<section class="page">
  <div class="page-header"><span>${esc(pageTitle)}</span><strong>${esc(patientName)}</strong></div>
  <div class="page-body">
    <div class="kicker">02</div>
    <h2>${esc(pageTitle)}</h2>
    <p class="intro">${esc(pageIntro)}</p>
    ${showSnapshot ? `<img class="implant-map-img" src="${data.implantMap!.image}" alt="">` : ''}
    ${
      data.implantMap
        ? `
    <div class="implant-legend">
      <span><i class="dot dot-implant"></i>${esc(labels.implant)} · ${bidi(data.implantMap.implants, rtl)}</span>
      <span><i class="dot dot-crown"></i>${esc(labels.crown)} · ${bidi(data.implantMap.crowns, rtl)}</span>
      ${
        data.implantMap.bridges
          ? `<span><i class="dot dot-bridge"></i>${esc(labels.bridge)} · ${bidi(data.implantMap.bridges, rtl)}</span>`
          : ''
      }
    </div>`
        : ''
    }
    ${showPhotos ? photoGalleryHtml(photos, !showSnapshot) : ''}
  </div>
</section>`
      : '';

  const selected = options[0] as QuotationOption | undefined;
  const visit1 = selected?.visits.visit1 ?? null;
  const visit2 = selected?.visits.visit2 ?? null;
  const paymentVisits: string[] = [];
  if (visit1) paymentVisits.push(`<div><span>${esc(labels.visit1)}</span><strong>${m(visit1.finalTotal)}</strong></div>`);
  if (visit2) paymentVisits.push(`<div><span>${esc(labels.visit2)}</span><strong>${m(visit2.finalTotal)}</strong></div>`);
  if (selected && selected.totals.flightTicket > 0) {
    paymentVisits.push(`<div><span>${esc(labels.flightTicket)}</span><strong>${m(selected.totals.flightTicket)}</strong></div>`);
  }

  // Prints the already-computed financing breakdown (`calculateFinancing`, the pricing
  // engine) — never re-derives the markup/cap math here. The markup applies only to the
  // financed amount itself (`installmentBase`, up to the clinic maximum or less per patient),
  // never to the whole treatment total.
  const financing =
    data.payment.installmentEligible && data.payment.financing
      ? (() => {
          const f = data.payment.financing!;
          return `
          <div class="finance-box">
            <div><span>${esc(labels.packagePlus)}</span><strong>${m(f.financedPackage)}</strong></div>
            <div><span>${esc(labels.installmentAmount)} ${bidi(`(+${f.markupPercent}%)`, rtl)}</span><strong>${m(f.installmentAmount)}</strong></div>
            <div><span>${esc(labels.remainingCash)}</span><strong>${m(f.cashRemaining)}</strong></div>
            <div><span>${esc(labels.cashPerVisit)}</span><strong>${m(f.cashPerVisit)}</strong></div>
          </div>
        `;
        })()
      : '';

  // Folded into the bottom of the Experience/gallery page below (not its own dedicated page):
  // notes are typically short, and a whole near-empty A4 page for a sentence or two is exactly
  // the "empty gap" look this document should avoid. Omitted entirely when there's nothing to
  // say. Still prints "near the end" as intended — this is the last content page before closing.
  const notesSection = data.notes?.trim()
    ? `<div class="section-label" style="margin-top: 10mm">${esc(labels.notes)}</div><div class="notes-block">${esc(data.notes.trim())}</div>`
    : '';

  const htmlLang =
    language === 'Russian' ? 'ru' : language === 'French' ? 'fr' : language === 'Spanish' ? 'es' : rtl ? 'ar' : 'en';

  return `
<!DOCTYPE html>
<html lang="${htmlLang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<title>Duty Clinic — ${esc(patientName)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #18263d; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 17mm; position: relative; page-break-after: always; overflow: hidden; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  /* The running header always stays pinned at the very top; everything below it shares the
     rest of the page's height and centers itself within that space — so a page whose content
     doesn't fill a full A4 sheet (most single-topic pages) reads as a deliberately composed,
     "full" layout instead of a short block stranded at the top with a large empty gap below
     it, the way every non-cover/closing page looked before. */
  .page-body { flex: 1; display: flex; flex-direction: column; justify-content: center; margin-top: 14mm; }
  .cover { color: #fff; background: linear-gradient(135deg, #061a3b 0%, #0c2d5f 62%, #071225 100%); padding: 0; }
  .cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .28; }
  .cover-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,13,31,.48), rgba(3,13,31,.88)); }
  .cover-content { position: relative; z-index: 2; min-height: 297mm; padding: 22mm 19mm; display: flex; flex-direction: column; justify-content: space-between; }
  .logo-card { display: inline-block; background: #fff; padding: 8px 14px; border-radius: 4px; width: fit-content; }
  .logo-card img { width: 56mm; display: block; }
  .cover-rule { width: 42mm; height: 2px; background: #d8232a; margin: 16mm 0 8mm; }
  .eyebrow { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; opacity: .8; }
  .cover h1 { font-size: 31px; line-height: 1.08; letter-spacing: 1.5px; margin: 0; max-width: 150mm; }
  .cover-patient { margin-top: 14mm; border-left: 3px solid #d8232a; padding-left: 7mm; }
  .cover-patient small { display: block; text-transform: uppercase; letter-spacing: 2px; opacity: .72; }
  .cover-patient strong { display: block; font-size: 25px; margin-top: 3mm; }
  .cover-footer { font-size: 10px; line-height: 1.6; opacity: .85; }
  .cover-footer strong { color: #fff; }
  .page-header { display: flex; justify-content: space-between; border-bottom: 1px solid #dfe4ea; padding-bottom: 4mm; font-size: 9px; color: #6c7583; text-transform: uppercase; letter-spacing: 1.4px; }
  .page-header strong { color: #18263d; }
  .kicker, .option-kicker, .section-label { color: #d8232a; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .page h2 { font-size: 27px; margin: 5mm 0 8mm; color: #09234a; }
  .page h3 { color: #09234a; }
  .intro { font-size: 11px; line-height: 1.75; color: #5c6674; }
  .summary-box { margin-top: 10mm; background: #f5f7fa; border-left: 4px solid #d8232a; border-radius: 5px; padding: 7mm; }
  .summary-box ul { margin: 3mm 0 0 5mm; padding: 0; line-height: 1.8; }
  .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 10mm; }
  .feature { border: 1px solid #e0e4e9; border-top: 3px solid #d8232a; border-radius: 6px; padding: 8mm 7mm; }
  .feature strong { display: block; color: #09234a; margin-bottom: 3mm; font-size: 13px; }
  .feature span { font-size: 10.5px; color: #667080; line-height: 1.65; }
  .treatment-table { border: 1px solid #e1e5ea; border-radius: 6px; overflow: hidden; margin-top: 7mm; }
  .treatment-head, .treatment-row { display: grid; grid-template-columns: 1fr 25mm 34mm; gap: 4mm; padding: 4mm 5mm; align-items: center; }
  .treatment-head { background: #09234a; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
  .treatment-row { border-top: 1px solid #e8ebef; font-size: 10px; }
  .treatment-row div strong { display: block; color: #18263d; }
  .treatment-row div span { display: block; font-size: 8.5px; color: #7b8490; margin-top: 1mm; }
  .section-label { margin-top: 9mm; }
  .visit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 4mm; }
  .visit-card { border: 1px solid #dfe4ea; border-radius: 6px; padding: 5mm; background: #fff; }
  .visit-title, .visit-line, .service-list div, .finance-box div { display: flex; justify-content: space-between; gap: 4mm; }
  .visit-title { padding-bottom: 3mm; border-bottom: 2px solid #d8232a; margin-bottom: 4mm; }
  .visit-title span { font-weight: 700; color: #09234a; }
  .visit-line { font-size: 9px; line-height: 1.5; }
  .service-list { margin-top: 4mm; border-top: 1px solid #edf0f3; padding-top: 3mm; }
  .service-list div { font-size: 8.5px; padding: 1.5mm 0; color: #687282; }
  .option-total-box { margin-top: 8mm; background: #09234a; color: #fff; border-radius: 6px; padding: 8mm; display: flex; justify-content: space-between; align-items: center; }
  .option-total-box span { font-size: 11px; letter-spacing: .5px; opacity: .85; }
  .option-total-box strong { font-size: 24px; }
  .payment-box { margin-top: 9mm; border: 1px solid #dfe4ea; border-radius: 6px; padding: 8mm; }
  .payment-box h3 { margin: 0 0 5mm; font-size: 15px; }
  .payment-box > div { display: flex; justify-content: space-between; padding: 4mm 0; border-top: 1px solid #edf0f3; font-size: 11px; }
  .included-strip { margin-top: 9mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
  .included-strip div { border: 1px solid #dfe4ea; border-radius: 6px; padding: 6mm; text-align: center; }
  .included-strip span { display: block; font-size: 9px; color: #737c89; text-transform: uppercase; letter-spacing: 1px; }
  .included-strip strong { display: block; margin-top: 2mm; color: #09234a; font-size: 12px; }
  .finance-box { margin-top: 6mm; display: grid; grid-template-columns: repeat(4,1fr); gap: 3mm; }
  .finance-box div { display: block; border: 1px solid #dfe4ea; border-radius: 5px; padding: 4mm; }
  .finance-box span { display: block; font-size: 8px; color: #737c89; }
  .finance-box strong { display: block; margin-top: 2mm; font-size: 12px; color: #09234a; }
  .doctor-card { display: grid; grid-template-columns: 38mm 1fr; gap: 5mm; border: 1px solid #e0e4e9; border-radius: 6px; padding: 4mm; margin-bottom: 4mm; min-height: 44mm; }
  .doctor-card img { width: 38mm; height: 44mm; object-fit: cover; border-radius: 4px; background: #eef1f5; }
  .doctor-card h3 { margin: 1mm 0 2mm; font-size: 15px; }
  .doctor-card p { margin: 1mm 0; font-size: 9px; color: #667080; line-height: 1.5; }
  .doctor-card .doctor-specialty { color: #d8232a; font-weight: 700; }
  .implant-map-img { width: 100%; height: 175mm; object-fit: contain; background: #0d1526; border-radius: 7px; margin-top: 8mm; }
  .implant-legend { display: flex; gap: 12mm; margin-top: 5mm; font-size: 10px; color: #5c6674; }
  .implant-legend .dot { display: inline-block; width: 3.4mm; height: 3.4mm; border-radius: 50%; margin-inline-end: 2mm; vertical-align: -0.4mm; }
  .implant-legend .dot-implant { background: #2f6bff; }
  .implant-legend .dot-crown { background: #e8a13a; }
  .implant-legend .dot-bridge { background: #2bb7a0; }
  /* Column count and per-image height are set inline per page (see photoGalleryHtml) —
     they depend on how many photos there are and whether they're the page's only visual. */
  .patient-photo-gallery { display: grid; gap: 5mm; margin-top: 8mm; }
  .patient-photo-gallery img { width: 100%; object-fit: cover; border-radius: 7px; display: block; background: #eef1f5; }
  .notes-block { margin-top: 7mm; padding: 7mm 8mm; background: #f6f8fb; border: 1px solid #dde3ec; border-radius: 8px; white-space: pre-wrap; line-height: 1.7; color: #303c4e; font-size: 12px; }
  .clinic-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 7mm; }
  .clinic-gallery img { width: 100%; height: 62mm; object-fit: cover; border-radius: 7px; display: block; background: #eef1f5; }
  .clinic-gallery img:first-child { grid-column: 1 / -1; height: 84mm; }
  .closing { min-height: 297mm; background: #071a3b; color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; }
  .closing-inner { max-width: 145mm; }
  .closing h2 { color: #fff; font-size: 29px; }
  .closing p { color: rgba(255,255,255,.76); line-height: 1.8; font-size: 11px; }
  .important { margin-top: 12mm; border: 1px solid rgba(216,35,42,.7); border-radius: 6px; padding: 5mm; text-align: left; }
  .important strong { color: #ff6a70; font-size: 10px; letter-spacing: 1.5px; }
  .important p { margin: 2mm 0 0; font-size: 9px; }
  .contact { margin-top: 10mm; font-size: 9px; line-height: 1.8; }
  @media print { .page { box-shadow: none; } }
${RTL_CSS}
</style>
</head>
<body>

<section class="page cover">
  <img class="cover-image" src="/assets/patients/0002.jpg" alt="">
  <div class="cover-overlay"></div>
  <div class="cover-content">
    <div>
      <div class="logo-card"><img src="/assets/logo/Logo-main.png" alt="Duty Clinic"></div>
      <div class="cover-rule"></div>
      <div class="eyebrow">Duty Clinic Istanbul</div>
      <h1>${esc(labels.proposal)}</h1>
      <div class="cover-patient">
        <small>${esc(labels.prepared)}</small>
        <strong>${esc(patientName)}</strong>
      </div>
    </div>
    <div class="cover-footer">
      <strong>Istanbul, Türkiye</strong><br>
      +90 536 779 07 91 • dutyclinic.com • info@dutyclinic.com<br>
      ${bidi(esc(date), rtl)}
    </div>
  </div>
</section>

<section class="page">
  <div class="page-header"><span>${esc(labels.treatment)}</span><strong>${esc(patientName)}</strong></div>
  <div class="page-body">
    <div class="kicker">01</div>
    <h2>${esc(labels.treatment)}</h2>
    <p class="intro">${esc(labels.generated)}</p>
    <div class="summary-box">
      <strong>${esc(labels.confirmed)}</strong>
      <ul>${treatmentSummaryItems(data, labels)}</ul>
    </div>
    <div class="feature-grid">
      ${labels.features
        .map((f) => `<div class="feature"><strong>${esc(f.title)}</strong><span>${esc(f.body)}</span></div>`)
        .join('')}
    </div>
  </div>
</section>

${implantMapPage}

${optionBlocks}

<section class="page">
  <div class="page-header"><span>${esc(labels.investment)}</span><strong>${esc(patientName)}</strong></div>
  <div class="page-body">
    <div class="kicker">03</div>
    <h2>${esc(labels.investment)}</h2>
    ${
      selected
        ? `<div class="option-total-box"><span>${esc(selected.name || labels.selectedOption)}</span><strong>${m(selected.totals.total)}</strong></div>`
        : ''
    }
    <div class="payment-box">
      <h3>${esc(labels.payment)}</h3>
      ${paymentVisits.join('') || `<p class="intro">${esc(labels.paymentTBD)}</p>`}
    </div>
    ${financing}
    <div class="included-strip">
      <div><span>${esc(labels.transfer)}</span><strong>${esc(labels.included)}</strong></div>
      <div><span>${esc(labels.prosthesis)}</span><strong>${esc(labels.included)}</strong></div>
      <div><span>${esc(labels.translator)}</span><strong>${esc(labels.included)}</strong></div>
    </div>
  </div>
</section>

<section class="page">
  <div class="page-header"><span>${esc(labels.team)}</span><strong>${esc(patientName)}</strong></div>
  <div class="page-body">
    <div class="kicker">04</div>
    <h2>${esc(labels.team)}</h2>
    ${doctorCardsHtml(doctors, labels) || `<p class="intro">${esc(labels.teamFallback)}</p>`}
  </div>
</section>

<section class="page">
  <div class="page-header"><span>${esc(labels.experience)}</span><strong>${esc(patientName)}</strong></div>
  <div class="page-body">
    <div class="kicker">05</div>
    <h2>${esc(labels.experience)}</h2>
    <p class="intro">${esc(labels.experienceIntro)}</p>
    <div class="clinic-gallery">
      ${CLINIC_IMAGES.map((src) => `<img src="${src}" alt="Duty Clinic Istanbul">`).join('')}
    </div>
    ${notesSection}
  </div>
</section>

<section class="page closing">
  <div class="closing-inner">
    <div class="logo-card"><img src="/assets/logo/Logo-main.png" alt="Duty Clinic"></div>
    <h2>${esc(labels.closing)}</h2>
    <p>Duty Clinic Istanbul<br>${esc(labels.closingTagline)}</p>
    <div class="important">
      <strong>${esc(labels.important)}</strong>
      <p>${esc(labels.disclaimer)}</p>
    </div>
    <div class="contact">+90 536 779 07 91<br>dutyclinic.com<br>info@dutyclinic.com</div>
  </div>
</section>

</body>
</html>`;
}

/**
 * Renders, opens and prints the Premium Proposal PDF for `data` (waiting for cover/clinic/
 * doctor images to load before invoking `window.print()`).
 *
 * Must be called from a browser context (uses `window.open`); typically wired to a button's
 * `onClick`. Legacy source: `generatePremiumQuotationPdf()`.
 */
export function generatePremiumQuotationPdf(data: QuotationPdfData, doctors: Doctor[] = []): void {
  const html = generatePremiumQuotationHtml(data, doctors);
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Please allow pop-ups for DutyAI to generate the Premium Proposal.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const printWhenReady = (): void => {
    const images = Array.from(printWindow.document.images || []);
    const waitForImages = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    });

    Promise.all(waitForImages).then(() => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    });
  };

  if (printWindow.document.readyState === 'complete') {
    printWhenReady();
  } else {
    printWindow.addEventListener('load', printWhenReady, { once: true });
  }
}
