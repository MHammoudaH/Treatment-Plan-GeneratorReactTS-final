/**
 * "Open & update" for quotes saved before editable plans were stored: rebuild the plan from the
 * quote's text summary (see `patientRecords.ts`, which wrote it). Products, procedures and
 * hotels are matched back to the catalog by name, and every quoted line price is kept as a
 * final-price override, so the re-opened quote shows the same numbers as the original PDF.
 *
 * What a summary never held can't come back: the diagnosis text, markups (the quoted price is
 * kept instead), the exchange rate (today's live rate is used for hotel / transfer), and
 * dental hotel prices / transfer choices (the defaults apply). The coordinator checks those.
 */
import { PLASTIC_SURGERIES } from '../data/plasticSurgery';
import { PRICING } from '../data/pricing';
import type { QuoteSnapshot } from './api';
import type { DentalPlan, EditablePlan, PlasticPlan } from './editablePlan';
import { EMPTY_BMI } from './bmi';
import type { PlasticCurrency } from './currencyRates';
import type { QuotationLanguage } from './pdf/types';
import { createOptionInput, emptyVisitInput, type OptionInput, type ProductSelection } from './pricing/engine';
import { CURRENCY_META, createInitialState, type DisplayCurrency } from '../types/wizard';

/** "…: €1,234.5" → 1234.5 (any of $ € £ A$ or a 3-letter code), else null. */
function trailingAmount(line: string): { text: string; amount: number | null } {
  const m = /^(.*):\s*(?:A\$|[$€£]|[A-Z]{3}\s)([\d,]+(?:\.\d+)?)$/.exec(line);
  return m ? { text: m[1].trim(), amount: Number(m[2].replace(/,/g, '')) } : { text: line.trim(), amount: null };
}

/** "3 × Something" → { qty: 3, rest: "Something" }. */
function leadingQty(text: string): { qty: number | null; rest: string } {
  const m = /^(\d+)\s*×\s*(.*)$/.exec(text);
  return m ? { qty: Number(m[1]), rest: m[2].trim() } : { qty: null, rest: text };
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const round2 = (n: number) => Math.round(n * 100) / 100;

const PRODUCT_LISTS: Record<string, { key: 'implant' | 'crown' | 'veneer' | 'bridge'; list: Array<{ id: string; name: string; displayName?: string }> }> = {
  Implant: { key: 'implant', list: PRICING.implants },
  Crown: { key: 'crown', list: PRICING.crowns },
  Veneer: { key: 'veneer', list: PRICING.veneers },
  Bridge: { key: 'bridge', list: PRICING.bridges },
};

function hotelIdByName(name: string): string | null {
  return PRICING.hotels.find((h) => same(h.name, name))?.id ?? null;
}

function rebuildDentalOption(option: QuoteSnapshot['options'][number], index: number): OptionInput {
  const input = createOptionInput(`opt-${index + 1}`, option.name);
  input.visits = option.lines.some((l) => same(l, 'Two visits')) ? 2 : 1;
  if (input.visits === 1) input.visit2 = null;
  else input.visit2 ??= emptyVisitInput();

  for (const raw of option.lines) {
    const { text, amount } = trailingAmount(raw);

    const hotel = /^(?:Visit ([12]) hotel|Hotel) — (.+), (\d+) nights$/.exec(text);
    if (hotel) {
      const visit = hotel[1] === '2' ? input.visit2 : input.visit1;
      if (visit) visit.hotel = { ...visit.hotel, hotelId: hotelIdByName(hotel[2]), nights: Number(hotel[3]) };
      continue;
    }
    if (same(text, 'Two visits')) continue;
    if (same(text, 'Flight ticket')) {
      input.flightTicket = { ...input.flightTicket, amount };
      continue;
    }

    const { qty, rest } = leadingQty(text);
    const product = /^(Implant|Crown|Veneer|Bridge)(?: — (.+))?$/.exec(rest);
    if (product && qty !== null) {
      const { key, list } = PRODUCT_LISTS[product[1]];
      const item = product[2] ? list.find((p) => same(p.displayName ?? p.name, product[2]) || same(p.name, product[2])) : undefined;
      const selection: ProductSelection = {
        itemId: item?.id ?? null,
        count: qty,
        markupPercent: 0,
        finalUnitPriceOverride: amount !== null && qty > 0 ? round2(amount / qty) : null,
      };
      input[key] = selection;
      continue;
    }

    const procedure = PRICING.procedures.find((p) => same(p.name, rest));
    if (procedure) {
      const quantity = qty ?? 1;
      input.procedures.push({ procedureId: procedure.id, quantity, finalUnitPriceOverride: amount !== null ? round2(amount / quantity) : null });
    }
  }
  return input;
}

function rebuildDental(quote: QuoteSnapshot, patientName: string): DentalPlan {
  const initial = createInitialState();
  const currency = (Object.keys(CURRENCY_META).includes(quote.currency) ? quote.currency : 'USD') as DisplayCurrency;
  return {
    module: 'dental',
    version: 1,
    rebuilt: true,
    patient: { ...initial.patient, name: patientName, language: quote.language as QuotationLanguage },
    diagnosis: initial.diagnosis,
    toothPlan: {},
    paymentMethod: initial.paymentMethod,
    installmentAmount: null,
    options: quote.options.map(rebuildDentalOption),
    display: { ...initial.display, currency, fxRate: CURRENCY_META[currency].defaultUsdRate, fxRateEdited: false },
    notes: '',
  };
}

function rebuildPlastic(quote: QuoteSnapshot, patientName: string): PlasticPlan {
  const itemIds: string[] = [];
  const priceOverrides: Record<string, string> = {};
  let hotelId = '';
  let hotelNights = 0;
  let hotelPriceOverride = '';
  let transferIncluded = false;

  for (const raw of quote.options[0]?.lines ?? []) {
    const { text, amount } = trailingAmount(raw);
    const hotel = /^Hotel — (.+), (\d+) nights$/.exec(text);
    if (hotel) {
      hotelId = hotelIdByName(hotel[1]) ?? '';
      hotelNights = Number(hotel[2]);
      if (amount !== null) hotelPriceOverride = String(amount);
      continue;
    }
    if (same(text, 'Airport transfer')) {
      transferIncluded = true;
      continue;
    }
    const item = PLASTIC_SURGERIES.find((p) => same(p.name, text));
    if (item) {
      itemIds.push(item.id);
      // Catalog-priced items re-price from the catalog; a coordinator-priced one keeps its price.
      if (item.priceEur === null && amount !== null) priceOverrides[item.id] = String(amount);
    }
  }

  return {
    module: 'plastic',
    version: 1,
    rebuilt: true,
    itemIds,
    patientName,
    language: quote.language as QuotationLanguage,
    travelDate: '',
    coordinatorNote: '',
    doctorName: '',
    currency: (['EUR', 'USD', 'AUD', 'GBP'].includes(quote.currency) ? quote.currency : 'EUR') as PlasticCurrency,
    hotelId,
    hotelNights,
    nightsEdited: hotelNights > 0,
    hotelPriceOverride,
    transferIncluded,
    packagePrice: /full package price/i.test(quote.remark ?? ''),
    manualTotal: '',
    priceOverrides,
    bmi: EMPTY_BMI,
    expectedWeightOverride: '',
    includeWeightInPdf: true,
  };
}

/** A best-effort editable plan from a saved quote's summary, or null when nothing could be matched. */
export function rebuildPlanFromQuote(quote: QuoteSnapshot, patientName: string): EditablePlan | null {
  if (quote.module === 'plastic') {
    const plan = rebuildPlastic(quote, patientName);
    return plan.itemIds.length > 0 ? plan : null;
  }
  const plan = rebuildDental(quote, patientName);
  return plan.options.length > 0 ? plan : null;
}
