/**
 * Simple Quotation PDF — Russian / English / French / Spanish / Arabic.
 *
 * A single, self-contained entry point that opens a print window and writes a complete
 * HTML document into it, exactly the way the legacy `pdf-generator.js` /
 * `pdf-generator-ar.js` (`window.print()`-based "PDF") did. This keeps the template-literal
 * approach on purpose: it is what makes the print CSS (page breaks, `@page`, RTL) reliable.
 *
 * Ported from, and consolidates:
 *  - `pdf-generator.js`      (RU/EN/FR/ES template + `generateQuotationPdf()`)
 *  - `pdf-generator-ar.js`   (dedicated Arabic RTL template + `generateArabicQuotationPdf()`)
 *  - `pdf-polish.js`         (folded in directly, not as a `window.open` monkey-patch — see
 *                             the per-fix notes below and `src/lib/pdf/README.md`)
 *
 * Must run in a browser context: it calls `window.open`, `document.write` and
 * `window.print()`. Call it directly from a button's `onClick` handler.
 */
import type {
  QuotationDisplayOptions,
  QuotationOption,
  QuotationPdfData,
  QuotationServiceItem,
  QuotationVisit,
  QuotationVisitServices,
} from '../types';
import {
  getSimpleLabels,
  OPTION_NAME_TRANSLATIONS,
  PRODUCT_LABEL_TRANSLATIONS,
  PROCEDURE_LABEL_TRANSLATIONS,
  type SimpleLabels,
  type SimpleLatinLanguage,
} from './labels';
import { transliteratePatientName } from './transliteration';
import { ARABIC_LABELS } from './arabicLabels';
import { transliterateArabicPatientName } from './arabicTransliteration';

const DEFAULT_DISPLAY: QuotationDisplayOptions = {
  currency: 'USD',
  usdToCurrencyRate: 1,
  showProductPrices: true,
  showHotelPrices: true,
};

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

/**
 * Formats an amount that is ALREADY expressed in `display.currency` — every figure in a
 * `QuotationOption` comes straight out of `calculateOption()` (see `src/lib/pricing/engine.ts`)
 * already priced in the selected currency; nothing here converts USD to EUR/AUD. Legacy
 * source: `pdfMoney()` (and, once the coordinator layer patches it, `window.pdfMoney`/
 * `premiumMoney`) — which DID multiply by a USD rate; that conversion step is gone.
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

/** Legacy source: `pdfMoneyHtml()`. */
function moneyHtml(value: number, display: QuotationDisplayOptions): string {
  return `<span dir="ltr">${esc(money(value, display))}</span>`;
}

/** Legacy source: `arPdfMoney()`. */
function arMoneyHtml(value: number, display: QuotationDisplayOptions): string {
  return `<bdi class="ltr-number">${esc(money(value, display))}</bdi>`;
}

function formatDate(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return language === 'Russian' ? date.toLocaleDateString('ru-RU') : date.toLocaleDateString('en-GB');
}

function formatArabicDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ar-EG');
}

/**
 * Grammatically correct "N option(s)" phrase used in the patient-info card.
 *
 * Legacy note: `pdf-generator.js` printed this with a naive singular/plural ternary, and
 * `pdf-polish.js` shipped a smarter version (correct Russian 1 / 2-4 / 5+ forms) meant to
 * patch it in via a regex over the rendered HTML. That regex never actually matched the
 * generated markup (there are element tags, not just whitespace, between "·" and the number
 * — verified against the real template), so the patch silently never applied in production.
 * This port implements the *intended* correct pluralization directly instead of reproducing
 * the dead patch — see `src/lib/pdf/README.md`.
 */
function optionsCountWord(language: SimpleLatinLanguage, count: number): string {
  if (language === 'Russian') {
    if (count === 1) return 'вариант';
    if (count >= 2 && count <= 4) return 'варианта';
    return 'вариантов';
  }
  if (language === 'French') return count === 1 ? 'option' : 'options';
  if (language === 'Spanish') return count === 1 ? 'opción' : 'opciones';
  return count === 1 ? 'option' : 'options';
}

/** Legacy source: `pdfOptionName()`. */
function translateOptionName(name: string, language: SimpleLatinLanguage): string {
  const value = String(name || '').trim().toLowerCase();
  const table = OPTION_NAME_TRANSLATIONS[language];
  if (!table) return name;
  for (const [key, translated] of Object.entries(table)) {
    if (key.toLowerCase() === value) return translated;
  }
  return name;
}

/** Legacy source: `arPdfOptionName()`. */
function arTranslateOptionName(name: string): string {
  const value = String(name || '').trim();
  const key = value.toLowerCase();
  if (key === 'german' || key.includes('german')) {
    const withoutGerman = value.replace(/german/gi, '').trim();
    return withoutGerman ? `تركيب ${withoutGerman}` : 'تركيب ألماني';
  }
  return value;
}

/** Legacy source: `pdfProductLabel()`. Falls back to the original (not lowercased) name when
 *  no translation is found — see `src/lib/pdf/README.md` for why this differs from the
 *  legacy fallback. */
function translateProductName(name: string, language: SimpleLatinLanguage): string {
  const key = String(name || '').trim().toLowerCase();
  return PRODUCT_LABEL_TRANSLATIONS[language]?.[key] || name;
}

/** Legacy source: `arPdfCrownName()`. */
function arTranslateCrownName(name: string): string {
  const value = String(name || '').trim();
  if (!value) return '';
  return value
    .replace(/Zirconium Crowns/gi, 'تيجان الزركونيا')
    .replace(/German/gi, 'الألمانية')
    .replace(/\bIvoclar\b/gi, 'Ivoclar');
}

/** Legacy source: `pdfProcedureLabel()`. */
function translateProcedureName(name: string, language: SimpleLatinLanguage): string {
  const key = String(name || '').toLowerCase();
  return PROCEDURE_LABEL_TRANSLATIONS[language]?.[key] || name;
}

/** Legacy source: `arPdfProcedureName()`. */
function arTranslateProcedureName(name: string): string {
  const key = String(name || '').toLowerCase();
  if (key.includes('bone graft')) return 'تطعيم العظم';
  return name || '';
}

/** Legacy source: `pdfServiceLabel()`. */
function translateServiceLabel(name: string, labels: SimpleLabels): string {
  const key = String(name || '').toLowerCase();
  if (key.includes('vip')) return labels.transfer;
  if (key.includes('prosthesis')) return labels.prosthesis;
  if (key.includes('translator')) return labels.translator;
  return name || labels.services;
}

/** Legacy source: `pdfTranslateTreatmentPlan()`. Builds the free-text bullet summary from
 *  `patient.treatmentData`, falling back to the raw diagnosis text. */
function translateTreatmentPlan(data: QuotationPdfData, language: SimpleLatinLanguage): string {
  const d = data.patient.treatmentData;
  if (!d) return data.patient.diagnosis || '';

  const { upperImplants, lowerImplantsMin, lowerImplantsMax, crowns } = d;
  const crownWord =
    {
      Russian: 'циркониевые коронки',
      French: 'couronnes en zircone',
      Spanish: 'coronas de zirconio',
      English: 'zirconia crowns',
    }[language] || 'zirconia crowns';

  const lines: string[] = [];

  if (language === 'Russian') {
    if (upperImplants) lines.push(`• ${upperImplants} ${upperImplants === 1 ? 'имплант' : 'импланта'} на верхнюю челюсть.`);
    if (lowerImplantsMin) {
      const range = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? `${lowerImplantsMin}–${lowerImplantsMax}` : `${lowerImplantsMin}`;
      const word = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? 'импланта' : 'имплант';
      lines.push(`• ${range} ${word} на нижнюю челюсть в переднем отделе по результатам клинического обследования.`);
    }
    if (crowns) lines.push(`• ${crowns} ${crownWord}.`);
  } else if (language === 'French') {
    if (upperImplants) lines.push(`• ${upperImplants} implant${upperImplants > 1 ? 's' : ''} pour le maxillaire supérieur.`);
    if (lowerImplantsMin) {
      const range = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? `${lowerImplantsMin}–${lowerImplantsMax}` : `${lowerImplantsMin}`;
      const plural = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? 's' : '';
      lines.push(`• ${range} implant${plural} pour la mandibule, dans le secteur antérieur, selon l’examen clinique.`);
    }
    if (crowns) lines.push(`• ${crowns} ${crownWord}.`);
  } else if (language === 'Spanish') {
    if (upperImplants) lines.push(`• ${upperImplants} implante${upperImplants > 1 ? 's' : ''} para el maxilar superior.`);
    if (lowerImplantsMin) {
      const range = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? `${lowerImplantsMin}–${lowerImplantsMax}` : `${lowerImplantsMin}`;
      const plural = lowerImplantsMax && lowerImplantsMax !== lowerImplantsMin ? 's' : '';
      lines.push(`• ${range} implante${plural} para la mandíbula, en el sector anterior, según el examen clínico.`);
    }
    if (crowns) lines.push(`• ${crowns} ${crownWord}.`);
  }

  return lines.join('\n') || data.patient.diagnosis || '';
}

/** Legacy source: `arPdfTreatmentPlan()`. Returns `<li>` items for `<ul class="treatment-plan-list">`. */
function arTranslateTreatmentPlan(data: QuotationPdfData): string {
  const d = data.patient.treatmentData;
  if (!d) return esc(data.patient.diagnosis || '');

  const lines: string[] = [];
  if (d.upperImplants) lines.push(`<li><bdi class="ltr-number">${d.upperImplants}</bdi> زرعة في الفك العلوي.</li>`);
  if (d.lowerImplantsMin) {
    const range = d.lowerImplantsMax && d.lowerImplantsMax !== d.lowerImplantsMin ? `${d.lowerImplantsMin}–${d.lowerImplantsMax}` : `${d.lowerImplantsMin}`;
    lines.push(`<li><bdi class="ltr-number">${esc(range)}</bdi> زرعة في الفك السفلي في المنطقة الأمامية، وفقاً للفحص السريري.</li>`);
  }
  if (d.crowns) lines.push(`<li><bdi class="ltr-number">${d.crowns}</bdi> تيجان الزركونيا.</li>`);
  return lines.join('');
}

function activeServices(services: QuotationVisitServices): QuotationServiceItem[] {
  return [services.transfer, services.prosthesis, services.translator].filter((service): service is QuotationServiceItem => Boolean(service));
}

// ---------------------------------------------------------------------------------------
// Latin-script (Russian / English / French / Spanish) template
// ---------------------------------------------------------------------------------------

function treatmentRowsHtml(option: QuotationOption, labels: SimpleLabels, language: SimpleLatinLanguage, display: QuotationDisplayOptions): string {
  const rows: string[] = [];
  const { implants, crowns, bridge, procedures } = option.treatment;

  if (implants.quantity > 0) {
    rows.push(
      `<tr><td>${esc(labels.implants)} — ${esc(translateProductName(implants.name || '', language))}</td><td>${implants.quantity}</td><td>${moneyHtml(implants.finalUnitPrice, display)}</td><td>${moneyHtml(implants.total, display)}</td></tr>`,
    );
  }
  if (crowns.quantity > 0) {
    rows.push(
      `<tr><td>${esc(labels.crowns)} — ${esc(translateProductName(crowns.name || '', language))}</td><td>${crowns.quantity}</td><td>${moneyHtml(crowns.finalUnitPrice, display)}</td><td>${moneyHtml(crowns.total, display)}</td></tr>`,
    );
  }
  if (bridge.quantity > 0) {
    rows.push(
      `<tr><td>${esc(labels.bridge)} — ${esc(bridge.name || labels.bridge)}</td><td>${bridge.quantity}</td><td>${moneyHtml(bridge.finalUnitPrice, display)}</td><td>${moneyHtml(bridge.total, display)}</td></tr>`,
    );
  }
  for (const p of procedures) {
    const unit = p.unit ? ` / ${esc(p.unit)}` : '';
    rows.push(`<tr><td>${esc(translateProcedureName(p.name, language))}</td><td>${p.quantity}${unit}</td><td>${moneyHtml(p.unitPrice, display)}</td><td>${moneyHtml(p.total, display)}</td></tr>`);
  }
  return rows.length ? rows.join('') : '<tr><td colspan="4">—</td></tr>';
}

function hotelRowsHtml(visit: QuotationVisit, labels: SimpleLabels, display: QuotationDisplayOptions): string {
  const rows: string[] = [];
  if (visit.hotel) {
    const hotel = visit.hotel;
    rows.push(`<tr><td>${esc(labels.hotel)}</td><td>${esc(hotel.name)}</td><td>${hotel.nights}</td><td>${moneyHtml(hotel.nightlyPrice, display)}</td><td>${moneyHtml(hotel.total, display)}</td></tr>`);
  }
  for (const service of activeServices(visit.services)) {
    const total = service.total ? moneyHtml(service.total, display) : esc(labels.included);
    rows.push(`<tr><td>${esc(translateServiceLabel(service.name, labels))}</td><td>${service.included ? esc(labels.included) : '—'}</td><td>—</td><td>—</td><td>${total}</td></tr>`);
  }
  return rows.length ? rows.join('') : '<tr><td colspan="5">—</td></tr>';
}

function visitSummaryHtml(option: QuotationOption, labels: SimpleLabels, display: QuotationDisplayOptions): string {
  const parts: string[] = [];
  const { visit1, visit2 } = option.visits;
  if (visit1) {
    parts.push(
      `<div class="visit-summary"><div class="visit-summary-title">${esc(labels.visit1)}</div><div class="visit-line"><span>${esc(labels.treatment)}</span><strong>${moneyHtml(visit1.dentalTotal, display)}</strong></div><div class="visit-line"><span>${esc(labels.services)}</span><strong>${moneyHtml(visit1.servicesTotal, display)}</strong></div><div class="visit-total"><span>${esc(labels.visit)} 1</span><strong>${moneyHtml(visit1.finalTotal, display)}</strong></div></div>`,
    );
  }
  if (visit2) {
    parts.push(
      `<div class="visit-summary"><div class="visit-summary-title">${esc(labels.visit2)}</div><div class="visit-line"><span>${esc(labels.treatment)}</span><strong>${moneyHtml(visit2.dentalTotal, display)}</strong></div><div class="visit-line"><span>${esc(labels.services)}</span><strong>${moneyHtml(visit2.servicesTotal, display)}</strong></div><div class="visit-total"><span>${esc(labels.visit)} 2</span><strong>${moneyHtml(visit2.finalTotal, display)}</strong></div></div>`,
    );
  }
  return parts.join('');
}

function installmentBlockHtml(data: QuotationPdfData, option: QuotationOption, labels: SimpleLabels, display: QuotationDisplayOptions): string {
  const financing = data.payment.financing;
  if (!data.payment.installmentEligible || !financing) return '';

  const financedPackage = option.totals.total * (1 + financing.markupPercent / 100);
  const installment = Math.min(financing.installmentAmount, financedPackage);
  const remaining = Math.max(0, financedPackage - installment);
  const perVisit = option.visits.count > 1 ? remaining / option.visits.count : remaining;

  return `<section class="installment-box"><div class="section-kicker">${esc(labels.installment)}</div><div class="installment-grid"><div><span>${esc(labels.package)} ${financing.markupPercent}%</span><strong>${moneyHtml(financedPackage, display)}</strong></div><div><span>${esc(labels.installmentAmount)}</span><strong>${moneyHtml(installment, display)}</strong></div><div><span>${esc(labels.remainingCash)}</span><strong>${moneyHtml(remaining, display)}</strong></div><div><span>${esc(labels.cashPerVisit)}</span><strong>${moneyHtml(perVisit, display)}</strong></div></div></section>`;
}

function optionHtml(option: QuotationOption, data: QuotationPdfData, labels: SimpleLabels, index: number, language: SimpleLatinLanguage, display: QuotationDisplayOptions): string {
  const { visit1, visit2, count: visitCount } = option.visits;

  // Note: the header only prints the option number + name — no separate "option total" card.
  // Legacy `pdf-generator.js` rendered one here too, duplicating the payment-section grand
  // total; `pdf-polish.js` stripped it back out via a regex over the rendered HTML. Ported
  // here by simply never emitting it, instead of generating-then-stripping.
  return `<section class="option-block"><div class="option-title-row"><div><div class="option-number">${esc(labels.option)} ${index + 1}</div><h2>${esc(translateOptionName(option.name, language))}</h2></div></div>
  <div class="section-kicker">${esc(labels.treatmentPlan)}</div><table class="proposal-table"><thead><tr><th>${esc(labels.treatment)}</th><th>${esc(labels.quantity)}</th><th>${esc(labels.unitPrice)}</th><th>${esc(labels.total)}</th></tr></thead><tbody>${treatmentRowsHtml(option, labels, language, display)}</tbody></table>
  <div class="section-kicker">${esc(labels.accommodation)} — ${visitCount === 1 ? esc(labels.oneVisit) : esc(labels.twoVisits)}</div>
  ${visit1 ? `<div class="visit-heading">${esc(labels.visit1)}</div><table class="proposal-table services-table"><thead><tr><th>${esc(labels.services)}</th><th>${esc(labels.details)}</th><th>${esc(labels.nights)}</th><th>${esc(labels.perNight)}</th><th>${esc(labels.total)}</th></tr></thead><tbody>${hotelRowsHtml(visit1, labels, display)}</tbody></table>` : ''}
  ${visit2 ? `<div class="visit-heading">${esc(labels.visit2)}</div><table class="proposal-table services-table"><thead><tr><th>${esc(labels.services)}</th><th>${esc(labels.details)}</th><th>${esc(labels.nights)}</th><th>${esc(labels.perNight)}</th><th>${esc(labels.total)}</th></tr></thead><tbody>${hotelRowsHtml(visit2, labels, display)}</tbody></table>` : ''}
  <div class="payment-section"><div class="section-kicker">${esc(labels.paymentByVisit)}</div>${visitSummaryHtml(option, labels, display)}<div class="grand-total"><span>${esc(labels.total)}</span><strong>${moneyHtml(option.totals.total, display)}</strong></div></div>
  ${installmentBlockHtml(data, option, labels, display)}</section>`;
}

function buildLatinHtml(data: QuotationPdfData, language: SimpleLatinLanguage): string {
  const display = resolveDisplay(data.display);
  const labels = getSimpleLabels(language);
  const patientName = transliteratePatientName(data.patient.name, language);
  const generatedDate = formatDate(data.generatedAt, language);
  const translatedPlan = translateTreatmentPlan(data, language);
  const optionsHtml = data.options.length
    ? data.options.map((option, index) => optionHtml(option, data, labels, index, language, display)).join('')
    : '<p>No quotation options were added.</p>';

  // Legacy `pdf-polish.js` forces the payment section of every option onto its own page when
  // any option spans two visits, so the visit1/visit2 payment cards never split awkwardly
  // across a page boundary. Folded in directly as conditional CSS instead of a post-hoc
  // string patch.
  const shouldSplitPayment = data.options.some((option) => (option.visits.count || 1) > 1);
  const pageBreakCss = shouldSplitPayment
    ? `.payment-section{break-before:page;page-break-before:always}.payment-section .section-kicker{margin-top:0}`
    : '';

  const htmlLang = language === 'Russian' ? 'ru' : language === 'French' ? 'fr' : language === 'Spanish' ? 'es' : 'en';
  const optionsCount = data.options.length;
  const printNote = language === 'Russian' ? 'В окне печати выберите «Сохранить как PDF».' : 'In the print dialog, choose “Save as PDF”.';

  return `<!doctype html><html lang="${htmlLang}"><head><meta charset="utf-8"><title>Duty Clinic — ${esc(patientName)}</title><style>
  @page{size:A4;margin:10mm 12mm 12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#18202b;background:#fff;font-size:10pt;line-height:1.34}.page{max-width:190mm;margin:0 auto}.brand-bar{border-bottom:4px solid #e43b3b;padding:0 0 9px;margin-bottom:12px}.brand{font-size:26pt;font-weight:800;letter-spacing:-1px;color:#15283f}.brand-meta{margin-top:3px;font-size:8pt;color:#56616d}.brand-meta strong{color:#15283f}.title{margin:10px 0 4px;color:#15283f;font-size:18pt;letter-spacing:.2px}.subtitle{color:#596572;font-size:9pt}.patient-card{margin:12px 0 13px;padding:11px 14px;background:#f4f7fa;border-left:5px solid #1f5eff;border-radius:5px}.patient-name{font-size:15pt;font-weight:700;color:#15283f}.patient-meta{margin-top:3px;color:#596572}.intro{margin:11px 0 12px}.diagnosis{
  padding:9px 11px;
  background:#fafafa;
  border:1px solid #e2e6ea;
  border-radius:5px;
  white-space:pre-wrap;
  font-size:9pt;
}.translation-note{margin-top:5px;color:#7b8792;font-size:7.5pt}.option-block{margin:14px 0 16px;padding:0 0 13px;border-bottom:1px solid #d9dfe5;break-inside:auto;page-break-inside:auto}.option-title-row{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:9px}.option-number{color:#e43b3b;font-size:8pt;font-weight:800;letter-spacing:1.3px}h2{margin:2px 0 0;color:#15283f;font-size:16pt}.option-total{min-width:39mm;padding:8px 10px;background:#15283f;color:#fff;border-radius:6px;text-align:right}.option-total span{display:block;font-size:7pt;opacity:.8}.option-total strong{display:block;margin-top:1px;font-size:15pt}.section-kicker{margin:10px 0 5px;color:#15283f;font-size:8pt;font-weight:800;letter-spacing:1px}.proposal-table{width:100%;border-collapse:collapse;margin-bottom:7px;break-inside:auto}.proposal-table th{background:#eef3f8;color:#15283f;text-align:left;font-size:7.5pt;padding:5px 7px;border-bottom:1px solid #ccd5de}.proposal-table td{padding:5px 7px;border-bottom:1px solid #e3e7eb;vertical-align:top;font-size:8.5pt}.proposal-table th:not(:first-child),.proposal-table td:not(:first-child){text-align:right;white-space:nowrap}.services-table th:first-child,.services-table td:first-child{width:24%}.services-table th:nth-child(2),.services-table td:nth-child(2){width:30%}.visit-heading{margin:8px 0 3px;font-size:9pt;font-weight:800;color:#1f5eff}.payment-section{margin-top:10px}.visit-summary{display:inline-block;vertical-align:top;width:48.5%;margin:0 1% 6px 0;padding:8px 10px;border:1px solid #dce2e8;border-radius:5px;break-inside:avoid}.visit-summary:nth-child(2n){margin-right:0}.visit-summary-title{color:#15283f;font-weight:800;font-size:8.5pt;margin-bottom:3px}.visit-line,.visit-total{display:flex;justify-content:space-between;gap:10px}.visit-line{color:#596572;font-size:8pt;margin-top:1px}.visit-total{margin-top:4px;padding-top:4px;border-top:1px solid #e0e5ea;font-weight:800;color:#15283f}.grand-total{margin-top:6px;padding:9px 12px;background:#f4f7fa;display:flex;justify-content:space-between;align-items:center;border-radius:5px}.grand-total span{font-weight:700;color:#15283f}.grand-total strong{font-size:15pt;color:#e43b3b}.installment-box{margin-top:9px;padding:9px 11px;border:1px solid #ccd8e6;border-left:5px solid #1f5eff;border-radius:5px;background:#f7faff;break-inside:avoid}.installment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.installment-grid div{padding:6px;background:#fff;border:1px solid #e1e7ee;border-radius:4px}.installment-grid span{display:block;font-size:7pt;color:#66727e}.installment-grid strong{display:block;margin-top:2px;color:#15283f;font-size:8.5pt}.closing{margin-top:10px;break-inside:avoid;page-break-inside:avoid}.important{padding:9px 11px;background:#fff8f8;border-left:5px solid #e43b3b;border-radius:4px}.important-title{color:#e43b3b;font-weight:800;letter-spacing:.7px;margin-bottom:3px}.footer{margin-top:10px;padding-top:7px;border-top:2px solid #15283f;color:#596572;font-size:7pt}.footer strong{color:#15283f}.print-note{margin:8px 0;padding:7px 9px;background:#fffbe8;border:1px solid #eadb91;font-size:8pt}
${pageBreakCss}
 @media print{.print-note{display:none}a{color:inherit;text-decoration:none}.page{max-width:none}body{font-size:9.5pt}}
</style></head><body><div class="page"><div class="print-note">${printNote}</div>
<header class="brand-bar"><div class="brand">Duty Clinic</div><div class="brand-meta"><strong>Istanbul • Türkiye</strong> | Professional Dental Care with International Standards.</div><div class="brand-meta">Duty Clinic Istanbul | +90 536 779 07 91 | dutyclinic.com | info@dutyclinic.com</div></header>
<h1 class="title">${esc(labels.proposal)}</h1><div class="subtitle">${esc(labels.date)}: ${esc(generatedDate)}</div>
<div class="patient-card"><div class="patient-name">${esc(patientName)}</div><div class="patient-meta">
  <span>${esc(labels.preparedFor)}</span>
  <bdi dir="ltr">${esc(patientName)}</bdi>
  <span> · </span>
  <span><bdi dir="ltr">${optionsCount}</bdi> ${esc(optionsCountWord(language, optionsCount))}</span>
</div></div>
<div class="intro">${esc(labels.intro)}</div>
${translatedPlan ? `
  <div class="section-kicker">${esc(labels.treatmentPlan)}</div>
  <div class="diagnosis">
  ${esc(translatedPlan)}
</div>
<div class="translation-note">
  ${esc(labels.translationNotice)}
</div>
` : ''}
${optionsHtml}
<section class="closing"><div class="important"><div class="important-title">${esc(labels.important)}</div><div>${esc(labels.disclaimer)}</div></div></section>
<footer class="footer"><strong>Duty Clinic Istanbul</strong> | Istanbul, Türkiye | +90 536 779 07 91 | dutyclinic.com | info@dutyclinic.com<br>${esc(labels.generated)}</footer></div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`;
}

// ---------------------------------------------------------------------------------------
// Arabic (RTL) template
// ---------------------------------------------------------------------------------------

function arHotelRowsHtml(visit: QuotationVisit, display: QuotationDisplayOptions): string {
  const rows: string[] = [];
  if (visit.hotel) {
    const hotel = visit.hotel;
    rows.push(
      `<tr><td>${esc(ARABIC_LABELS.hotel)}</td><td><bdi class="brand-name">${esc(hotel.name)}</bdi></td><td><bdi class="ltr-number">${hotel.nights}</bdi></td><td>${arMoneyHtml(hotel.nightlyPrice, display)}</td><td>${arMoneyHtml(hotel.total, display)}</td></tr>`,
    );
  }
  for (const service of activeServices(visit.services)) {
    const key = String(service.name || '').toLowerCase();
    let label = service.name;
    if (key.includes('vip')) label = ARABIC_LABELS.transfer;
    else if (key.includes('prosthesis')) label = ARABIC_LABELS.prosthesis;
    else if (key.includes('translator')) label = ARABIC_LABELS.translator;
    const total = service.total ? arMoneyHtml(service.total, display) : esc(ARABIC_LABELS.included);
    rows.push(`<tr><td>${esc(label)}</td><td>${service.included ? esc(ARABIC_LABELS.included) : '—'}</td><td>—</td><td>—</td><td>${total}</td></tr>`);
  }
  return rows.join('');
}

function arVisitSummaryHtml(option: QuotationOption, display: QuotationDisplayOptions): string {
  const rows: string[] = [];
  const { visit1, visit2 } = option.visits;
  if (visit1) {
    rows.push(
      `<div class="visit-summary"><div class="visit-title">${ARABIC_LABELS.visit1}</div><div class="visit-line"><span>${ARABIC_LABELS.treatment}</span><strong>${arMoneyHtml(visit1.dentalTotal, display)}</strong></div><div class="visit-line"><span>${ARABIC_LABELS.services}</span><strong>${arMoneyHtml(visit1.servicesTotal, display)}</strong></div><div class="visit-total"><span>${ARABIC_LABELS.visit} 1</span><strong>${arMoneyHtml(visit1.finalTotal, display)}</strong></div></div>`,
    );
  }
  if (visit2) {
    rows.push(
      `<div class="visit-summary"><div class="visit-title">${ARABIC_LABELS.visit2}</div><div class="visit-line"><span>${ARABIC_LABELS.treatment}</span><strong>${arMoneyHtml(visit2.dentalTotal, display)}</strong></div><div class="visit-line"><span>${ARABIC_LABELS.services}</span><strong>${arMoneyHtml(visit2.servicesTotal, display)}</strong></div><div class="visit-total"><span>${ARABIC_LABELS.visit} 2</span><strong>${arMoneyHtml(visit2.finalTotal, display)}</strong></div></div>`,
    );
  }
  return rows.join('');
}

function arInstallmentHtml(data: QuotationPdfData, option: QuotationOption, display: QuotationDisplayOptions): string {
  const financing = data.payment.financing;
  if (!data.payment.installmentEligible || !financing) return '';
  const financed = option.totals.total * (1 + financing.markupPercent / 100);
  const installment = Math.min(financing.installmentAmount, financed);
  const remaining = Math.max(0, financed - installment);
  const perVisit = option.visits.count > 1 ? remaining / option.visits.count : remaining;
  return `<section class="installment-box"><div class="section-title">${ARABIC_LABELS.installment}</div><div class="installment-grid"><div><span>${ARABIC_LABELS.package} ${financing.markupPercent}%</span><strong>${arMoneyHtml(financed, display)}</strong></div><div><span>${ARABIC_LABELS.installmentAmount}</span><strong>${arMoneyHtml(installment, display)}</strong></div><div><span>${ARABIC_LABELS.remainingCash}</span><strong>${arMoneyHtml(remaining, display)}</strong></div><div><span>${ARABIC_LABELS.cashPerVisit}</span><strong>${arMoneyHtml(perVisit, display)}</strong></div></div></section>`;
}

function buildArabicHtml(data: QuotationPdfData): string {
  const display = resolveDisplay(data.display);
  const patientName = transliterateArabicPatientName(data.patient.arabicName || data.patient.name);
  const translatedPlan = arTranslateTreatmentPlan(data);
  const optionCount = data.options.length;

  const optionsHtml = data.options
    .map((option, index) => {
      const { visit1, visit2, count: visitCount } = option.visits;
      const { implants, crowns, bridge, procedures } = option.treatment;
      const rows: string[] = [];

      if (implants.quantity > 0) {
        rows.push(
          `<tr><td>${ARABIC_LABELS.implants} — <bdi class="brand-name">${esc(implants.name || '')}</bdi></td><td><bdi class="ltr-number">${implants.quantity}</bdi></td><td>${arMoneyHtml(implants.finalUnitPrice, display)}</td><td>${arMoneyHtml(implants.total, display)}</td></tr>`,
        );
      }
      if (crowns.quantity > 0) {
        rows.push(
          `<tr><td>${ARABIC_LABELS.crowns} — <bdi class="mixed-label">${esc(arTranslateCrownName(crowns.name || ''))}</bdi></td><td><bdi class="ltr-number">${crowns.quantity}</bdi></td><td>${arMoneyHtml(crowns.finalUnitPrice, display)}</td><td>${arMoneyHtml(crowns.total, display)}</td></tr>`,
        );
      }
      if (bridge.quantity > 0) {
        rows.push(
          `<tr><td>${ARABIC_LABELS.bridge}</td><td><bdi class="ltr-number">${bridge.quantity}</bdi></td><td>${arMoneyHtml(bridge.finalUnitPrice, display)}</td><td>${arMoneyHtml(bridge.total, display)}</td></tr>`,
        );
      }
      for (const p of procedures) {
        rows.push(
          `<tr><td>${esc(arTranslateProcedureName(p.name))}</td><td><bdi class="ltr-number">${p.quantity}${p.unit ? ` / ${esc(p.unit)}` : ''}</bdi></td><td>${arMoneyHtml(p.unitPrice, display)}</td><td>${arMoneyHtml(p.total, display)}</td></tr>`,
        );
      }

      return `<section class="option-block"><div class="option-header"><div><div class="option-number">${ARABIC_LABELS.option} ${index + 1}</div><h2>${esc(arTranslateOptionName(option.name))}</h2></div></div>
      <div class="section-title">${ARABIC_LABELS.treatmentPlan}</div>
      <table class="proposal-table"><thead><tr><th>${ARABIC_LABELS.treatment}</th><th>${ARABIC_LABELS.quantity}</th><th>${ARABIC_LABELS.unitPrice}</th><th>${ARABIC_LABELS.total}</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="section-title">${ARABIC_LABELS.accommodation} — ${visitCount === 1 ? ARABIC_LABELS.oneVisit : ARABIC_LABELS.twoVisits}</div>
      ${visit1 ? `<div class="visit-heading">${ARABIC_LABELS.visit1}</div><table class="proposal-table"><thead><tr><th>${ARABIC_LABELS.services}</th><th>${ARABIC_LABELS.details}</th><th>${ARABIC_LABELS.nights}</th><th>${ARABIC_LABELS.perNight}</th><th>${ARABIC_LABELS.total}</th></tr></thead><tbody>${arHotelRowsHtml(visit1, display)}</tbody></table>` : ''}
      ${visit2 ? `<div class="visit-heading">${ARABIC_LABELS.visit2}</div><table class="proposal-table"><thead><tr><th>${ARABIC_LABELS.services}</th><th>${ARABIC_LABELS.details}</th><th>${ARABIC_LABELS.nights}</th><th>${ARABIC_LABELS.perNight}</th><th>${ARABIC_LABELS.total}</th></tr></thead><tbody>${arHotelRowsHtml(visit2, display)}</tbody></table>` : ''}
      <div class="payment-section"><div class="section-title">${ARABIC_LABELS.paymentByVisit}</div>${arVisitSummaryHtml(option, display)}<div class="grand-total"><span>${ARABIC_LABELS.total}</span><strong>${arMoneyHtml(option.totals.total, display)}</strong></div></div>
      ${arInstallmentHtml(data, option, display)}</section>`;
    })
    .join('');

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Duty Clinic — ${esc(patientName)}</title><style>
    @page{size:A4;margin:10mm 12mm 12mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;direction:rtl;background:#fff;color:#18202b;font-family:Arial,"Tahoma",sans-serif}
    body{font-size:10pt;line-height:1.45}
    .page{max-width:190mm;margin:0 auto}
    .brand-bar{border-bottom:4px solid #e43b3b;padding:0 0 9px;margin-bottom:12px;text-align:right}
    .brand{font-size:26pt;font-weight:800;letter-spacing:-1px;color:#15283f;direction:ltr;text-align:right}
    .brand-meta{margin-top:3px;font-size:8pt;color:#56616d}
    .brand-meta .ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
    .title{margin:10px 0 4px;color:#15283f;font-size:18pt}
    .subtitle{color:#596572;font-size:9pt}
    .patient-card{margin:12px 0 13px;padding:11px 14px;background:#f4f7fa;border-right:5px solid #1f5eff;border-radius:5px}
    .patient-name{font-size:15pt;font-weight:700;color:#15283f}
    .patient-meta{margin-top:3px;color:#596572}
    .intro{margin:11px 0 12px}
    .diagnosis{padding:9px 11px;background:#fafafa;border:1px solid #e2e6ea;border-radius:5px;white-space:pre-wrap;font-size:9pt}
    .treatment-plan-list{margin:0;padding-right:20px}
    .treatment-plan-list li{margin:2px 0}
    .option-block{margin:14px 0 16px;padding-bottom:13px;border-bottom:1px solid #d9dfe5;break-inside:auto}
    .option-header{margin-bottom:9px}.option-number{color:#e43b3b;font-size:8pt;font-weight:800;letter-spacing:1px}h2{margin:2px 0;color:#15283f;font-size:16pt}
    .section-title{margin:10px 0 5px;color:#15283f;font-size:8pt;font-weight:800;letter-spacing:1px}
    .proposal-table{width:100%;border-collapse:collapse;margin-bottom:7px;direction:rtl}
    .proposal-table th{background:#eef3f8;color:#15283f;text-align:right;font-size:7.5pt;padding:5px 7px;border-bottom:1px solid #ccd5de}
    .proposal-table td{padding:5px 7px;border-bottom:1px solid #e3e7eb;vertical-align:top;font-size:8.5pt;text-align:right}
    .proposal-table th:not(:first-child),.proposal-table td:not(:first-child){text-align:left;white-space:nowrap}
    .visit-heading{margin:8px 0 3px;font-size:9pt;font-weight:800;color:#1f5eff}
    .payment-section{margin-top:10px;break-inside:avoid;page-break-inside:avoid}
    .visit-summary{display:inline-block;vertical-align:top;width:48.5%;margin:0 1% 6px 0;padding:8px 10px;border:1px solid #dce2e8;border-radius:5px;break-inside:avoid}
    .visit-summary:nth-child(2n){margin-right:0}
    .visit-title{font-weight:800;font-size:8.5pt;color:#15283f;margin-bottom:3px}
    .visit-line,.visit-total{display:flex;justify-content:space-between;gap:10px}
    .visit-line{font-size:8pt;color:#596572;margin-top:1px}.visit-total{margin-top:4px;padding-top:4px;border-top:1px solid #e0e5ea;font-weight:800;color:#15283f}
    .grand-total{margin-top:6px;padding:9px 12px;background:#f4f7fa;display:flex;justify-content:space-between;align-items:center;border-radius:5px}.grand-total span{font-weight:700}.grand-total strong{font-size:15pt;color:#e43b3b}
    .installment-box{margin-top:9px;padding:9px 11px;border:1px solid #ccd8e6;border-right:5px solid #1f5eff;border-radius:5px;background:#f7faff;break-inside:avoid}
    .installment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.installment-grid div{padding:6px;background:#fff;border:1px solid #e1e7ee;border-radius:4px}.installment-grid span{display:block;font-size:7pt;color:#66727e}.installment-grid strong{display:block;margin-top:2px;color:#15283f;font-size:8.5pt}
    .closing{margin-top:10px;break-inside:avoid;page-break-inside:avoid}.important{padding:9px 11px;background:#fff8f8;border-right:5px solid #e43b3b;border-radius:4px}.important-title{color:#e43b3b;font-weight:800;margin-bottom:3px}
    .footer{margin-top:10px;padding-top:7px;border-top:2px solid #15283f;color:#596572;font-size:7pt}.footer strong{color:#15283f}
    .ltr-number,.brand-name{direction:ltr;unicode-bidi:isolate;display:inline-block}.mixed-label{unicode-bidi:isolate;direction:rtl}
    .print-note{margin:8px 0;padding:7px 9px;background:#fffbe8;border:1px solid #eadb91;font-size:8pt}
    @media print{.print-note{display:none}.page{max-width:none}body{font-size:9.5pt}}
  </style></head><body><div class="page"><div class="print-note">في نافذة الطباعة اختر «حفظ كملف PDF».</div>
    <header class="brand-bar"><div class="brand">Duty Clinic</div><div class="brand-meta"><span class="ltr">Istanbul • Türkiye</span> | الرعاية السنية الاحترافية وفق المعايير الدولية.</div><div class="brand-meta">Duty Clinic Istanbul | <span class="ltr">+90 536 779 07 91</span> | <span class="ltr">dutyclinic.com</span> | <span class="ltr">info@dutyclinic.com</span></div></header>
    <h1 class="title">${ARABIC_LABELS.proposal}</h1><div class="subtitle">${ARABIC_LABELS.date}: <bdi class="ltr-number">${esc(formatArabicDate(data.generatedAt))}</bdi></div>
    <div class="patient-card"><div class="patient-name">${esc(patientName)}</div><div class="patient-meta">${ARABIC_LABELS.preparedFor} <bdi class="ltr-number">${esc(patientName)}</bdi> · <bdi class="ltr-number">${optionCount}</bdi> خيار</div></div>
    <div class="intro">${ARABIC_LABELS.intro}</div>
    ${translatedPlan ? `<div class="section-title">${ARABIC_LABELS.treatmentPlan}</div><div class="diagnosis"><ul class="treatment-plan-list">${translatedPlan}</ul></div><div class="subtitle">${ARABIC_LABELS.translationNotice}</div>` : ''}
    ${optionsHtml}
    <section class="closing"><div class="important"><div class="important-title">${ARABIC_LABELS.important}</div><div>${ARABIC_LABELS.disclaimer}</div></div></section>
    <footer class="footer"><strong>Duty Clinic Istanbul</strong> | Istanbul, Türkiye | <span class="ltr">+90 536 779 07 91</span> | <span class="ltr">dutyclinic.com</span> | <span class="ltr">info@dutyclinic.com</span><br>${ARABIC_LABELS.generated}</footer>
  </div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`;
}

// ---------------------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------------------

function openAndPrint(html: string): void {
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('Please allow pop-ups for Duty AI to generate the PDF.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Renders and prints the Simple Quotation PDF for `data`, in whichever language
 * `data.patient.language` specifies. Arabic is rendered with the dedicated RTL template;
 * every other supported language shares the Latin-script template.
 *
 * Must be called from a browser context (uses `window.open`); typically wired to a button's
 * `onClick`. Legacy source: `generateQuotationPdf()` / `generateArabicQuotationPdf()`.
 */
export function generateSimpleQuotationPdf(data: QuotationPdfData): void {
  const language = data.patient.language || 'English';
  const html = language === 'Arabic' ? buildArabicHtml(data) : buildLatinHtml(data, language as SimpleLatinLanguage);
  openAndPrint(html);
}
