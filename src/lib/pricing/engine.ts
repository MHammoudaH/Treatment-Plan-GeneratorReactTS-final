/**
 * DutyAI consolidated pricing engine.
 *
 * This REPLACES five layered legacy scripts that monkey-patched `window.calculateOption`
 * on top of each other at runtime, in this confirmed production order:
 *
 *   app.js (base calculateOption)
 *     -> coordinator-updates.js       (whole-option proportional "manual final price")
 *     -> coordinator-final-pricing.js (per-unit / per-procedure / per-visit final-price
 *                                       fields, forced $200 prosthesis, $150 transfer)
 *     -> coordinator-manual-pricing.js (per-visit-STAGE hotel/transfer/prosthesis final
 *                                       price fields, replaces markup% with direct price)
 *     -> coordinator-manual-currency-fix.js (USD/EUR round-trip safety wrapper)
 *
 * Tracing the actual composition (not just each file in isolation) found the layers do
 * NOT compose cleanly: coordinator-final-pricing.js's whole-quotation/visit "final price"
 * fields are silently discarded by coordinator-manual-pricing.js, which always recomputes
 * visit totals from dental+services; and when the whole-option proportional override
 * (coordinator-updates.js) is combined with a granular unit-price override, the two use
 * inconsistent scaling bases. Both are genuine bugs in production, not intentional design.
 *
 * This engine keeps every override *capability* the legacy layers offered, but as ONE
 * coherent, typed computation with a single, predictable precedence per field:
 *   1. Per-unit / per-line final-price overrides (implant, crown, each procedure line,
 *      each visit's hotel nightly rate, transfer, prosthesis) are applied first.
 *   2. A single whole-option "final total override" (if set) proportionally scales the
 *      totals computed from step 1 — matching the legacy proportional-scale approach,
 *      which was the simplest and most predictable of the three "whole total" mechanisms
 *      found in the legacy code.
 *
 * It also fixes the `Number(null) === 0` class of bug found earlier in this project:
 * every "is this field manually overridden" check here explicitly rejects null/undefined/
 * empty-string BEFORE coercing to a number, via `hasOverride()` below.
 */

import { PRICING, STANDARD_PROSTHESIS_USD, STANDARD_TRANSFER_USD, type HotelCatalogItem } from '../../data/pricing';
import type {
  ProcedureLineItem,
  QuotationHotelDetails,
  QuotationOption,
  QuotationOptionTotals,
  QuotationServiceItem,
  QuotationTreatment,
  QuotationVisit,
  QuotationVisitServices,
  QuotationVisits,
  TreatmentLineItem,
} from '../pdf/types';

// ---------------------------------------------------------------------------------------
// Input shape: what a coordinator fills in for one quotation option.
// ---------------------------------------------------------------------------------------

export interface ProductSelection {
  /** Catalog id (`DUTY_PRICING.implants[].id` / `.crowns[].id`), or null when not yet chosen. */
  itemId: string | null;
  count: number;
  /** Coordinator markup percentage, applied when `finalUnitPriceOverride` is not set. Legacy default: 25. */
  markupPercent: number;
  /** Direct final unit price in USD. When set, takes precedence over `markupPercent`. */
  finalUnitPriceOverride: number | null;
}

export interface ProcedureSelection {
  /** Catalog id (`DUTY_PRICING.procedures[].id`). */
  procedureId: string;
  /** Billed quantity. Ignored (treated as 1) for procedures without a `unit`. */
  quantity: number;
  /** Direct final PER-UNIT price in USD (multiplied by quantity), overriding the catalog price. */
  finalUnitPriceOverride: number | null;
}

export interface HotelSelection {
  hotelId: string | null;
  /** 'single' | 'double' | 'triple', or a room-option name for hotels with `roomOptions`. */
  roomType: string;
  nights: number;
  /** Coordinator's negotiated nightly rate in USD. When set, replaces the catalog rate. */
  nightlyPriceOverride: number | null;
}

export interface ServiceSelection {
  /** Selected flat price for this service in this visit, in USD (e.g. 0 or STANDARD_TRANSFER_USD). */
  selectedUsd: number;
  /** Direct final price override in USD, taking precedence over `selectedUsd`. */
  finalPriceOverride: number | null;
}

export interface VisitInput {
  hotel: HotelSelection;
  transfer: ServiceSelection;
  prosthesis: ServiceSelection;
}

export interface OptionInput {
  id: string;
  name: string;
  implant: ProductSelection;
  crown: ProductSelection;
  procedures: ProcedureSelection[];
  visits: 1 | 2;
  /** Crowns completed during visit 1 when `visits === 2`. Remaining crowns are assigned to visit 2. */
  visit1CrownCount: number;
  visit1: VisitInput;
  /** Required when `visits === 2`; ignored (treated as absent) when `visits === 1`. */
  visit2: VisitInput | null;
  /** Whole-option final price override, in USD. When set, proportionally scales every
   *  visit/dental/services total computed from the granular overrides above. */
  finalTotalOverride: number | null;
}

export function emptyServiceSelection(): ServiceSelection {
  return { selectedUsd: 0, finalPriceOverride: null };
}

export function emptyHotelSelection(): HotelSelection {
  return { hotelId: null, roomType: 'single', nights: 0, nightlyPriceOverride: null };
}

export function emptyVisitInput(): VisitInput {
  return { hotel: emptyHotelSelection(), transfer: emptyServiceSelection(), prosthesis: emptyServiceSelection() };
}

export function createOptionInput(id: string, name: string): OptionInput {
  return {
    id,
    name,
    implant: { itemId: null, count: 0, markupPercent: 25, finalUnitPriceOverride: null },
    crown: { itemId: null, count: 0, markupPercent: 25, finalUnitPriceOverride: null },
    procedures: [],
    visits: 2,
    visit1CrownCount: 0,
    visit1: { ...emptyVisitInput(), transfer: { selectedUsd: STANDARD_TRANSFER_USD, finalPriceOverride: null } },
    visit2: emptyVisitInput(),
    finalTotalOverride: null,
  };
}

// ---------------------------------------------------------------------------------------
// Override-detection helper (fixes the Number(null) === 0 bug found in the legacy code).
// ---------------------------------------------------------------------------------------

/** True only when `value` is a real, non-negative override the coordinator actually typed.
 *  Explicitly rejects null/undefined before coercing, unlike the legacy
 *  `Number.isFinite(Number(x)) && Number(x) >= 0` pattern (which treats null as 0 and
 *  therefore misreads "no override" as "override to $0"). */
function hasOverride(value: number | null | undefined): value is number {
  if (value === null || value === undefined) return false;
  return Number.isFinite(value) && value >= 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------------------
// Catalog lookups
// ---------------------------------------------------------------------------------------

function findImplant(id: string | null) {
  return id ? PRICING.implants.find((item) => item.id === id) ?? null : null;
}

function findCrown(id: string | null) {
  return id ? PRICING.crowns.find((item) => item.id === id) ?? null : null;
}

function findProcedure(id: string) {
  return PRICING.procedures.find((item) => item.id === id) ?? null;
}

function findHotel(id: string | null): HotelCatalogItem | null {
  return id ? PRICING.hotels.find((item) => item.id === id) ?? null : null;
}

function hotelNightlyRate(hotel: HotelCatalogItem, roomType: string): number {
  if (hotel.roomOptions) {
    const match = hotel.roomOptions.find((room) => room.name.toLowerCase().includes(roomType.toLowerCase()));
    return match ? Number(match.price) : 0;
  }
  const raw = (hotel as unknown as Record<string, unknown>)[roomType];
  const price = Number(raw);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function hotelRoomLabel(hotel: HotelCatalogItem, roomType: string): string {
  if (hotel.roomOptions) {
    const match = hotel.roomOptions.find((room) => room.name.toLowerCase().includes(roomType.toLowerCase()));
    return match ? match.name : roomType;
  }
  return roomType.charAt(0).toUpperCase() + roomType.slice(1);
}

// ---------------------------------------------------------------------------------------
// Line-item calculators
// ---------------------------------------------------------------------------------------

function calculateProduct(selection: ProductSelection, catalog: ReturnType<typeof findImplant> | ReturnType<typeof findCrown>): TreatmentLineItem {
  const baseUnitPrice = catalog?.price ?? 0;
  const markupUnitPrice = baseUnitPrice * (1 + selection.markupPercent / 100);
  const finalUnitPrice = hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : markupUnitPrice;
  return {
    id: catalog?.id ?? null,
    name: catalog ? (catalog.displayName ?? catalog.name) : null,
    quantity: selection.count,
    baseUnitPrice,
    markupPercent: selection.markupPercent,
    finalUnitPrice: round2(finalUnitPrice),
    manualUnitPrice: hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : null,
    total: round2(selection.count * finalUnitPrice),
  };
}

function calculateProcedureLine(selection: ProcedureSelection): ProcedureLineItem | null {
  const catalog = findProcedure(selection.procedureId);
  if (!catalog) return null;
  const quantity = catalog.unit ? Math.max(0, selection.quantity || 1) : 1;
  const unitPrice = hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : catalog.price;
  return {
    id: catalog.id,
    name: catalog.name,
    unit: catalog.unit ?? null,
    quantity,
    unitPrice: round2(unitPrice),
    baseUnitPrice: catalog.price,
    manualUnitPrice: hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : null,
    total: round2(quantity * unitPrice),
  };
}

function calculateHotel(selection: HotelSelection): QuotationHotelDetails | null {
  const catalog = findHotel(selection.hotelId);
  if (!catalog || selection.nights <= 0) return null;
  // Standard catalog rate for the room type, unless the coordinator entered a negotiated one.
  const nightlyPrice = hasOverride(selection.nightlyPriceOverride)
    ? selection.nightlyPriceOverride
    : hotelNightlyRate(catalog, selection.roomType);
  return {
    id: catalog.id,
    name: catalog.name,
    roomType: selection.roomType,
    roomLabel: hotelRoomLabel(catalog, selection.roomType),
    nights: selection.nights,
    nightlyPrice: round2(nightlyPrice),
    total: round2(nightlyPrice * selection.nights),
    currency: catalog.currency,
  };
}

function calculateService(name: string, selection: ServiceSelection): QuotationServiceItem {
  const total = hasOverride(selection.finalPriceOverride) ? selection.finalPriceOverride : selection.selectedUsd;
  return { name, total: round2(total), included: total === 0 };
}

// ---------------------------------------------------------------------------------------
// Whole-option computation
// ---------------------------------------------------------------------------------------

export function calculateOption(input: OptionInput): QuotationOption {
  const implantCatalog = findImplant(input.implant.itemId);
  const crownCatalog = findCrown(input.crown.itemId);

  const implantLine = calculateProduct(input.implant, implantCatalog);
  const crownLine = calculateProduct(input.crown, crownCatalog);

  const procedures = input.procedures.map(calculateProcedureLine).filter((line): line is ProcedureLineItem => line !== null);
  const proceduresTotal = round2(procedures.reduce((sum, line) => sum + line.total, 0));

  // Crowns split across visits (legacy: visit1-crown-count input, remainder to visit2).
  const visit1CrownCount = input.visits === 2 ? Math.min(Math.max(0, input.visit1CrownCount), input.crown.count) : input.crown.count;
  const visit2CrownCount = input.visits === 2 ? input.crown.count - visit1CrownCount : 0;
  const visit1CrownTotal = round2(visit1CrownCount * crownLine.finalUnitPrice);
  const visit2CrownTotal = round2(visit2CrownCount * crownLine.finalUnitPrice);

  // All implants and additional procedures are billed on visit 1 (legacy behaviour,
  // preserved: implants/procedures have no per-visit split in the source data model).
  const visit1DentalTotal = round2(implantLine.total + visit1CrownTotal + proceduresTotal);
  const visit2DentalTotal = round2(visit2CrownTotal);

  const visit1Hotel = calculateHotel(input.visit1.hotel);
  const visit1Transfer = calculateService('VIP transfer', input.visit1.transfer);
  const visit1Prosthesis = calculateService('Dental prosthesis', input.visit1.prosthesis);
  const visit1Services: QuotationVisitServices = {
    transfer: visit1Transfer,
    prosthesis: visit1Prosthesis,
    translator: { name: 'Translator', total: 0, included: true },
  };
  const visit1ServicesTotal = round2((visit1Hotel?.total ?? 0) + visit1Transfer.total + visit1Prosthesis.total);

  const visit1: QuotationVisit = {
    crowns: visit1CrownCount,
    hotel: visit1Hotel,
    services: visit1Services,
    dentalTotal: visit1DentalTotal,
    servicesTotal: visit1ServicesTotal,
    total: round2(visit1DentalTotal + visit1ServicesTotal),
  };

  let visit2: QuotationVisit | null = null;
  if (input.visits === 2 && input.visit2) {
    const visit2Hotel = calculateHotel(input.visit2.hotel);
    const visit2Transfer = calculateService('VIP transfer', input.visit2.transfer);
    // The prosthesis is delivered once, on Visit 1 — a second visit never carries a
    // prosthesis line at all (no charge, no row in the PDF).
    const visit2Services: QuotationVisitServices = {
      transfer: visit2Transfer,
      translator: { name: 'Translator', total: 0, included: true },
    };
    const visit2ServicesTotal = round2((visit2Hotel?.total ?? 0) + visit2Transfer.total);
    visit2 = {
      crowns: visit2CrownCount,
      hotel: visit2Hotel,
      services: visit2Services,
      dentalTotal: visit2DentalTotal,
      servicesTotal: visit2ServicesTotal,
      total: round2(visit2DentalTotal + visit2ServicesTotal),
    };
  }

  const visits: QuotationVisits = { count: input.visits, visit1, visit2 };

  let subtotal = round2(visit1.total + (visit2?.total ?? 0));
  let finalVisit1 = visit1.total;
  let finalVisit2 = visit2?.total ?? 0;

  // Whole-option override: proportionally scale everything computed so far. This is the
  // single "final total" escape hatch this engine offers (legacy had three overlapping,
  // inconsistently-composing mechanisms for this — see file header).
  if (hasOverride(input.finalTotalOverride) && input.finalTotalOverride > 0) {
    const target = input.finalTotalOverride;
    if (subtotal > 0) {
      const ratio = target / subtotal;
      finalVisit1 = round2(finalVisit1 * ratio);
      finalVisit2 = round2(finalVisit2 * ratio);
    } else {
      finalVisit1 = target;
      finalVisit2 = 0;
    }
    subtotal = round2(finalVisit1 + finalVisit2);
  }

  const totals: QuotationOptionTotals = {
    treatmentAndServices: subtotal,
    visit1: finalVisit1,
    visit2: finalVisit2,
    total: subtotal,
  };

  const treatment: QuotationTreatment = { implants: implantLine, crowns: crownLine, procedures };

  return {
    id: input.id,
    name: input.name,
    treatment,
    visits,
    totals,
    ...(hasOverride(input.finalTotalOverride) ? { manualFinalPrice: input.finalTotalOverride } : {}),
  };
}

// ---------------------------------------------------------------------------------------
// Financing (US / Canada installment plan). Legacy source: recalculateQuotation()'s
// `installmentEligible` block in app.js, using DUTY_PRICING.financing.
// ---------------------------------------------------------------------------------------

export interface FinancingBreakdown {
  eligible: boolean;
  financedPackage: number;
  installment: number;
  maximumTermMonths: number;
  cashRemaining: number;
  cashPerVisit: number;
}

export function calculateFinancing(option: QuotationOption, country: string, paymentMethod: string): FinancingBreakdown {
  const eligible = paymentMethod === 'installments' && PRICING.financing.eligibleCountries.includes(country);
  if (!eligible) {
    return { eligible: false, financedPackage: 0, installment: 0, maximumTermMonths: PRICING.financing.maximumTermMonths, cashRemaining: 0, cashPerVisit: 0 };
  }
  const financedPackage = round2(option.totals.total * (1 + PRICING.financing.markupPercent / 100));
  const installment = Math.min(PRICING.financing.installmentAmount, financedPackage);
  const cashRemaining = round2(Math.max(0, financedPackage - installment));
  const cashPerVisit = option.visits.count > 1 ? round2(cashRemaining / option.visits.count) : cashRemaining;
  return { eligible: true, financedPackage, installment, maximumTermMonths: PRICING.financing.maximumTermMonths, cashRemaining, cashPerVisit };
}

export { STANDARD_PROSTHESIS_USD, STANDARD_TRANSFER_USD };
