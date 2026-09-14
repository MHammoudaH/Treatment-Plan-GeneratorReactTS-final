/**
 * DutyAI consolidated pricing engine — THE single authoritative place treatment-option
 * pricing is calculated. Nothing else in the app computes a price; UI components and PDF
 * generators only render the `QuotationOption` this module produces.
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
 *   1. Per-unit / per-line final-price overrides (implant, crown, bridge, each procedure
 *      line, each visit's hotel nightly rate, transfer, prosthesis) are applied first.
 *   2. A per-VISIT final-price override (if set) REPLACES that visit's calculated total
 *      outright — never added, subtracted, or proportionally blended with it. There is no
 *      whole-option override; the option's grand total is always the sum of its visits'
 *      final totals (see `calculateOption`'s `totals.finalTotal`).
 *
 * It also fixes the `Number(null) === 0` class of bug found earlier in this project:
 * every "is this field manually overridden" check here explicitly rejects null/undefined/
 * empty-string BEFORE coercing to a number, via `hasOverride()` below.
 *
 * MULTI-CURRENCY: USD, EUR and AUD are three INDEPENDENT clinic price lists (see
 * `PriceValue` in `src/data/pricing.ts`). `calculateOption` takes the selected `currency`
 * and reads that currency's price directly from the catalog — it never multiplies a USD
 * price by an exchange rate to get a EUR/AUD figure. The one exception is logistics
 * (hotel/transfer/prosthesis), which has no independent multi-currency list and is
 * therefore converted from its USD price using the reference `fxRate` — that rate is
 * otherwise used only to print an optional "≈ $X USD" reference line (see
 * `src/lib/formatMoney.ts`), never to compute a treatment price.
 *
 * TREATMENT COMPOSITION: implant, crown and bridge quantities are entered independently by
 * the coordinator — there is no automatic "All-on-X" derivation, no 1-crown-per-implant
 * coupling, and bridge quantity is never inferred from implant/crown counts. The coordinator
 * builds the plan from the doctor's confirmed treatment directly.
 *
 * FLIGHT TICKET: an optional, plan-level, manually entered cost (never calculated, never
 * currency-converted) added on top of the visits' final totals — see `totals.flightTicket`.
 */

import {
  PRICING,
  STANDARD_PROSTHESIS_USD,
  STANDARD_TRANSFER_USD,
  priceFor,
  type BridgeCatalogItem,
  type CrownCatalogItem,
  type Currency,
  type HotelCatalogItem,
  type ImplantCatalogItem,
  type PriceValue,
} from '../../data/pricing';
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
  /** Catalog id (`PRICING.implants|crowns|bridges[].id`), or null when not yet chosen. */
  itemId: string | null;
  count: number;
  /** Coordinator markup percentage, applied when `finalUnitPriceOverride` is not set. Legacy default: 25. */
  markupPercent: number;
  /** Direct final unit price, in the quotation's selected currency. Takes precedence over `markupPercent`. */
  finalUnitPriceOverride: number | null;
}

export interface ProcedureSelection {
  /** Catalog id (`PRICING.procedures[].id`). */
  procedureId: string;
  /** Billed quantity. Ignored (treated as 1) for procedures without a `unit`. */
  quantity: number;
  /** Direct final PER-UNIT price in the selected currency (multiplied by quantity), overriding the catalog price. */
  finalUnitPriceOverride: number | null;
}

export interface HotelSelection {
  hotelId: string | null;
  /** 'single' | 'double' | 'triple', or a room-option name for hotels with `roomOptions`. */
  roomType: string;
  nights: number;
  /** Coordinator's negotiated nightly rate in USD (hotels have no independent multi-currency
   *  price list — see the module doc comment). When set, replaces the catalog rate. */
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
  /** Coordinator's final-price override for THIS visit only, in the selected currency, or
   *  null. Replaces the visit's calculated total outright — see module doc comment. Every
   *  visit has its own independent override; there is no whole-option override. */
  overrideTotal: number | null;
}

/** An optional, plan-level, manually entered cost — see the module doc comment. */
export interface FlightTicketInput {
  /** Approximate flight-ticket price the coordinator typed, in the quotation's selected
   *  currency, or null when not entered. Never calculated, never converted between
   *  currencies — see `calculateOption`. */
  amount: number | null;
}

export function emptyFlightTicket(): FlightTicketInput {
  return { amount: null };
}

export interface OptionInput {
  id: string;
  name: string;
  /** Implant quantity, brand and pricing — entered independently of crown/bridge quantity. */
  implant: ProductSelection;
  /** Crown quantity, material and pricing — entered independently of implant/bridge quantity.
   *  There is no 1-crown-per-implant rule; the coordinator enters the actual count. */
  crown: ProductSelection;
  /** Full-arch prosthetic bridge — an ordinary priced line like implant/crown (unit price
   *  × quantity), independent of currency AND independent of implant/crown quantity. The
   *  coordinator adds/removes it manually; it is never inferred from implants being present. */
  bridge: ProductSelection;
  procedures: ProcedureSelection[];
  visits: 1 | 2;
  /** Crowns completed during visit 1 when `visits === 2`. Remaining crowns are assigned to visit 2. */
  visit1CrownCount: number;
  visit1: VisitInput;
  /** Required when `visits === 2`; ignored (treated as absent) when `visits === 1`. */
  visit2: VisitInput | null;
  /** Optional plan-level flight-ticket cost — see `FlightTicketInput`. */
  flightTicket: FlightTicketInput;
}

export function emptyServiceSelection(): ServiceSelection {
  return { selectedUsd: 0, finalPriceOverride: null };
}

export function emptyHotelSelection(): HotelSelection {
  return { hotelId: null, roomType: 'single', nights: 0, nightlyPriceOverride: null };
}

export function emptyVisitInput(): VisitInput {
  return { hotel: emptyHotelSelection(), transfer: emptyServiceSelection(), prosthesis: emptyServiceSelection(), overrideTotal: null };
}

export function emptyProductSelection(): ProductSelection {
  return { itemId: null, count: 0, markupPercent: 0, finalUnitPriceOverride: null };
}

export function createOptionInput(id: string, name: string): OptionInput {
  return {
    id,
    name,
    implant: { itemId: null, count: 0, markupPercent: 25, finalUnitPriceOverride: null },
    crown: { itemId: null, count: 0, markupPercent: 25, finalUnitPriceOverride: null },
    bridge: emptyProductSelection(),
    procedures: [],
    visits: 2,
    visit1CrownCount: 0,
    visit1: { ...emptyVisitInput(), transfer: { selectedUsd: STANDARD_TRANSFER_USD, finalPriceOverride: null } },
    visit2: emptyVisitInput(),
    flightTicket: emptyFlightTicket(),
  };
}

/**
 * Builds a new option pre-filled from `source`'s copyable fields — implant/crown/bridge
 * QUANTITIES, visit structure, hotel selection + nights, transfer/prosthesis selections — while
 * resetting every brand/material choice (`itemId`) and every manual price override
 * (`finalUnitPriceOverride`, `nightlyPriceOverride`, `finalPriceOverride`, `overrideTotal`) to
 * blank. Used by `ADD_OPTION` once at least one option already exists, so a coordinator
 * building "Option 2" as a brand/price variant of Option 1 only has to repick the brand and/or
 * re-price it, not re-enter every quantity and hotel night by hand. Additional procedures and
 * the flight ticket are NOT copied — they're closer to manually-entered one-offs than a
 * treatment quantity, and are cheap to re-add if the new option genuinely needs them too.
 */
export function cloneOptionForNewOption(source: OptionInput, id: string, name: string): OptionInput {
  const cloneProduct = (p: ProductSelection): ProductSelection => ({ itemId: null, count: p.count, markupPercent: p.markupPercent, finalUnitPriceOverride: null });
  const cloneHotel = (h: HotelSelection): HotelSelection => ({ hotelId: h.hotelId, roomType: h.roomType, nights: h.nights, nightlyPriceOverride: null });
  const cloneService = (s: ServiceSelection): ServiceSelection => ({ selectedUsd: s.selectedUsd, finalPriceOverride: null });
  const cloneVisit = (v: VisitInput): VisitInput => ({
    hotel: cloneHotel(v.hotel),
    transfer: cloneService(v.transfer),
    prosthesis: cloneService(v.prosthesis),
    overrideTotal: null,
  });

  return {
    id,
    name,
    implant: cloneProduct(source.implant),
    crown: cloneProduct(source.crown),
    bridge: cloneProduct(source.bridge),
    procedures: [],
    visits: source.visits,
    visit1CrownCount: source.visit1CrownCount,
    visit1: cloneVisit(source.visit1),
    visit2: source.visit2 ? cloneVisit(source.visit2) : null,
    flightTicket: emptyFlightTicket(),
  };
}

// ---------------------------------------------------------------------------------------
// Auto-naming an option after its implant brand's country of origin (e.g. "Straumann" ->
// "Swiss", "Medigma" -> "German") — matches the per-language dictionaries already built for
// this exact convention (`OPTION_NAME_TRANSLATIONS` / `arTranslateOptionName`), which expect
// the option's `name` to be exactly one of these bare origin words.
// ---------------------------------------------------------------------------------------

/** Every `ImplantCatalogItem.origin` value specific enough to name an option after — "Other" is
 *  excluded (too vague), and this list is also exactly what the PDF translation dictionaries
 *  key on, so renaming to anything else here would silently stop translating. */
const NAMEABLE_IMPLANT_ORIGINS = ['German', 'Swiss', 'American', 'Korean', 'Turkish'];

/** True when `name` looks auto-generated — either `createOptionInput`'s default "Option N", or
 *  a bare origin name this module itself previously assigned from a brand selection — so
 *  callers can keep auto-renaming as the brand changes without ever clobbering a name the
 *  coordinator typed themselves. */
export function isAutoGeneratedOptionName(name: string): boolean {
  return /^Option \d+$/.test(name) || NAMEABLE_IMPLANT_ORIGINS.includes(name);
}

/** The option name to auto-assign when `itemId` is selected as the implant brand, or null when
 *  there's no selection or its origin isn't one of `NAMEABLE_IMPLANT_ORIGINS`. */
export function nameForImplantBrand(itemId: string | null): string | null {
  if (!itemId) return null;
  const item = PRICING.implants.find((i) => i.id === itemId);
  if (!item || !NAMEABLE_IMPLANT_ORIGINS.includes(item.origin)) return null;
  return item.origin;
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

function findImplant(id: string | null): ImplantCatalogItem | null {
  return id ? PRICING.implants.find((item) => item.id === id) ?? null : null;
}

function findCrown(id: string | null): CrownCatalogItem | null {
  return id ? PRICING.crowns.find((item) => item.id === id) ?? null : null;
}

function findBridge(id: string | null): BridgeCatalogItem | null {
  return id ? PRICING.bridges.find((item) => item.id === id) ?? null : null;
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

/** Implant / crown / bridge: unit price × quantity, in `currency`, with markup% or a direct
 *  manual override. `catalog` is null when nothing is selected yet OR when the selected
 *  item has no price configured for `currency` — in the latter case `priceConfigured` is
 *  false and every price field is 0 (never a converted guess) unless the coordinator typed
 *  a manual override, which is always honoured (that's an explicit human-entered price, not
 *  a fallback conversion). */
function calculateProduct(
  selection: ProductSelection,
  catalog: { id: string; name: string; displayName?: string; origin?: string; price: PriceValue } | null,
  currency: Currency,
): TreatmentLineItem {
  const nativePrice = catalog ? priceFor(catalog.price, currency) : null;
  const override = hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : null;
  const priceConfigured = override !== null || nativePrice !== null;
  const baseUnitPrice = nativePrice ?? 0;
  const markupUnitPrice = baseUnitPrice * (1 + selection.markupPercent / 100);
  const finalUnitPrice = override ?? markupUnitPrice;
  return {
    id: catalog?.id ?? null,
    name: catalog ? (catalog.displayName ?? catalog.name) : null,
    // Only implants carry a catalog `origin` (crowns/bridges have no such field) — passed
    // through raw/untranslated; the PDF renderers translate and append it at render time.
    origin: catalog?.origin ?? null,
    quantity: selection.count,
    baseUnitPrice: round2(baseUnitPrice),
    markupPercent: selection.markupPercent,
    finalUnitPrice: round2(finalUnitPrice),
    manualUnitPrice: override,
    total: round2(selection.count * finalUnitPrice),
    priceConfigured,
  };
}

function calculateProcedureLine(selection: ProcedureSelection, currency: Currency): ProcedureLineItem | null {
  const catalog = findProcedure(selection.procedureId);
  if (!catalog) return null;
  const quantity = catalog.unit ? Math.max(0, selection.quantity || 1) : 1;
  const nativePrice = priceFor(catalog.price, currency);
  const override = hasOverride(selection.finalUnitPriceOverride) ? selection.finalUnitPriceOverride : null;
  const priceConfigured = override !== null || nativePrice !== null;
  const unitPrice = override ?? nativePrice ?? 0;
  return {
    id: catalog.id,
    name: catalog.name,
    unit: catalog.unit ?? null,
    quantity,
    unitPrice: round2(unitPrice),
    baseUnitPrice: round2(nativePrice ?? 0),
    manualUnitPrice: override,
    total: round2(quantity * unitPrice),
    priceConfigured,
  };
}

/** Hotel/transfer/prosthesis have no independent multi-currency price list, so — unlike
 *  the dental lines above — they are priced in USD and converted with `fxRate` (1 for USD),
 *  the same reference rate used for the optional "≈ $X USD" display line. This is the one
 *  place `fxRate` feeds into a calculated total, and it is logistics, not a clinical price. */
function calculateHotel(selection: HotelSelection, fxRate: number): QuotationHotelDetails | null {
  const catalog = findHotel(selection.hotelId);
  if (!catalog || selection.nights <= 0) return null;
  const nightlyUsd = hasOverride(selection.nightlyPriceOverride) ? selection.nightlyPriceOverride : hotelNightlyRate(catalog, selection.roomType);
  const nightlyPrice = round2(nightlyUsd * fxRate);
  return {
    id: catalog.id,
    name: catalog.name,
    roomType: selection.roomType,
    roomLabel: hotelRoomLabel(catalog, selection.roomType),
    nights: selection.nights,
    nightlyPrice,
    total: round2(nightlyPrice * selection.nights),
    currency: catalog.currency,
  };
}

function calculateService(name: string, selection: ServiceSelection, fxRate: number): QuotationServiceItem {
  const usd = hasOverride(selection.finalPriceOverride) ? selection.finalPriceOverride : selection.selectedUsd;
  const total = round2(usd * fxRate);
  return { name, total, included: usd === 0 };
}

// ---------------------------------------------------------------------------------------
// Whole-option computation
// ---------------------------------------------------------------------------------------

/**
 * @param currency The quotation's selected currency. Implant/crown/procedure/bridge prices
 *   come directly from the catalog's value for this currency (or a manual override typed in
 *   this currency) — never computed from another currency.
 * @param fxRate Reference "1 USD = X `currency`" rate (pass 1 for USD). Used ONLY to convert
 *   the USD-only hotel/transfer/prosthesis logistics prices, and made available on the
 *   result for an optional USD-equivalent display line — never to price implants/crowns/
 *   procedures/bridges.
 */
export function calculateOption(input: OptionInput, currency: Currency, fxRate: number): QuotationOption {
  const effectiveFxRate = currency === 'USD' ? 1 : fxRate;

  const implantCatalog = findImplant(input.implant.itemId);
  const crownCatalog = findCrown(input.crown.itemId);
  const bridgeCatalog = findBridge(input.bridge.itemId);

  const implantLine = calculateProduct(input.implant, implantCatalog, currency);
  const crownLine = calculateProduct(input.crown, crownCatalog, currency);
  const bridgeLine = calculateProduct(input.bridge, bridgeCatalog, currency);

  const procedures = input.procedures
    .map((p) => calculateProcedureLine(p, currency))
    .filter((line): line is ProcedureLineItem => line !== null);
  const proceduresTotal = round2(procedures.reduce((sum, line) => sum + line.total, 0));

  // Crowns split across visits (legacy: visit1-crown-count input, remainder to visit2).
  const visit1CrownCount = input.visits === 2 ? Math.min(Math.max(0, input.visit1CrownCount), input.crown.count) : input.crown.count;
  const visit2CrownCount = input.visits === 2 ? input.crown.count - visit1CrownCount : 0;
  const visit1CrownTotal = round2(visit1CrownCount * crownLine.finalUnitPrice);
  const visit2CrownTotal = round2(visit2CrownCount * crownLine.finalUnitPrice);

  // All implants, the bridge and additional procedures are billed on visit 1 (legacy
  // behaviour, preserved: these have no per-visit split in the source data model — a
  // bridge is a discrete per-arch unit, not something to fraction across visits).
  const visit1DentalTotal = round2(implantLine.total + bridgeLine.total + visit1CrownTotal + proceduresTotal);
  const visit2DentalTotal = round2(visit2CrownTotal);

  const visit1Hotel = calculateHotel(input.visit1.hotel, effectiveFxRate);
  const visit1Transfer = calculateService('VIP transfer', input.visit1.transfer, effectiveFxRate);
  const visit1Prosthesis = calculateService('Dental prosthesis', input.visit1.prosthesis, effectiveFxRate);
  const visit1Services: QuotationVisitServices = {
    transfer: visit1Transfer,
    prosthesis: visit1Prosthesis,
    translator: { name: 'Translator', total: 0, included: true },
  };
  const visit1ServicesTotal = round2((visit1Hotel?.total ?? 0) + visit1Transfer.total + visit1Prosthesis.total);
  const visit1CalculatedTotal = round2(visit1DentalTotal + visit1ServicesTotal);
  const visit1OverrideTotal = hasOverride(input.visit1.overrideTotal) ? input.visit1.overrideTotal : null;
  const visit1FinalTotal = visit1OverrideTotal ?? visit1CalculatedTotal;

  const visit1: QuotationVisit = {
    crowns: visit1CrownCount,
    hotel: visit1Hotel,
    services: visit1Services,
    dentalTotal: visit1DentalTotal,
    servicesTotal: visit1ServicesTotal,
    calculatedTotal: visit1CalculatedTotal,
    overrideTotal: visit1OverrideTotal,
    finalTotal: visit1FinalTotal,
  };

  let visit2: QuotationVisit | null = null;
  if (input.visits === 2 && input.visit2) {
    const visit2Hotel = calculateHotel(input.visit2.hotel, effectiveFxRate);
    const visit2Transfer = calculateService('VIP transfer', input.visit2.transfer, effectiveFxRate);
    // The prosthesis is delivered once, on Visit 1 — a second visit never carries a
    // prosthesis line at all (no charge, no row in the PDF).
    const visit2Services: QuotationVisitServices = {
      transfer: visit2Transfer,
      translator: { name: 'Translator', total: 0, included: true },
    };
    const visit2ServicesTotal = round2((visit2Hotel?.total ?? 0) + visit2Transfer.total);
    const visit2CalculatedTotal = round2(visit2DentalTotal + visit2ServicesTotal);
    const visit2OverrideTotal = hasOverride(input.visit2.overrideTotal) ? input.visit2.overrideTotal : null;
    const visit2FinalTotal = visit2OverrideTotal ?? visit2CalculatedTotal;
    visit2 = {
      crowns: visit2CrownCount,
      hotel: visit2Hotel,
      services: visit2Services,
      dentalTotal: visit2DentalTotal,
      servicesTotal: visit2ServicesTotal,
      calculatedTotal: visit2CalculatedTotal,
      overrideTotal: visit2OverrideTotal,
      finalTotal: visit2FinalTotal,
    };
  }

  const visits: QuotationVisits = { count: input.visits, visit1, visit2 };

  // Optional plan-level cost, entered directly in the selected currency — never calculated,
  // never converted. 0 when not entered (see FlightTicketInput / module doc).
  const flightTicket = hasOverride(input.flightTicket.amount) ? round2(input.flightTicket.amount) : 0;

  // The treatment-plan total is ALWAYS the sum of each visit's own final total (override or
  // calculated) plus any plan-level cost like the flight ticket — never a proportional scale
  // of a single whole-option number. See module doc.
  const calculatedTotal = round2(visit1.calculatedTotal + (visit2?.calculatedTotal ?? 0) + flightTicket);
  const finalTotal = round2(visit1.finalTotal + (visit2?.finalTotal ?? 0) + flightTicket);

  const totals: QuotationOptionTotals = {
    treatmentAndServices: finalTotal,
    visit1: visit1.finalTotal,
    visit2: visit2?.finalTotal ?? 0,
    flightTicket,
    calculatedTotal,
    finalTotal,
    total: finalTotal,
  };

  const treatment: QuotationTreatment = { implants: implantLine, crowns: crownLine, bridge: bridgeLine, procedures };

  return {
    id: input.id,
    name: input.name,
    treatment,
    visits,
    totals,
    displayCurrency: currency,
  };
}

// ---------------------------------------------------------------------------------------
// Financing (US / Canada installment plan). Legacy source: recalculateQuotation()'s
// `installmentEligible` block in app.js, using PRICING.financing. Financing terms are
// defined in USD; when the option's selected currency isn't USD the numbers below are in
// that currency instead (pre-existing simplification, unchanged by the multi-currency work).
// ---------------------------------------------------------------------------------------

export interface FinancingBreakdown {
  eligible: boolean;
  /** What the patient pays in total under the plan: `installment` (already including its
   *  markup) plus `cashRemaining` (at face value, no markup) — NOT the whole treatment total
   *  marked up. See `installmentBase` for the pre-markup financed amount. */
  financedPackage: number;
  /** The financed portion's face value, BEFORE the markup — capped at the clinic's maximum
   *  (`PRICING.financing.installmentAmount`) and never more than the treatment total. May be
   *  set lower per patient (e.g. a smaller amount their credit approval covers) — see
   *  `calculateFinancing`'s `requestedInstallmentAmount` parameter. */
  installmentBase: number;
  /** `installmentBase` plus its markup — the amount actually collected as the installment. */
  installment: number;
  maximumTermMonths: number;
  /** The NON-financed portion of the treatment total, paid in cash at face value — never
   *  marked up. */
  cashRemaining: number;
  cashPerVisit: number;
}

/**
 * US/Canada installment plan. The markup applies ONLY to the amount actually being financed
 * (`installmentBase`, capped at the clinic's maximum — `PRICING.financing.installmentAmount`,
 * currently $3900) — never to the whole treatment total. This was a real bug in an earlier
 * version of this function (and independently duplicated, with the same bug, inside both PDF
 * generators): `financedPackage` was computed as `total * 1.20` first, and only THEN was the
 * $3900 cap applied to slice a piece off that already-inflated number — meaning a patient
 * financing $3900 of a $10,000 treatment was effectively charged 20% on the full $10,000, not
 * on the $3900 they were actually financing.
 *
 * `requestedInstallmentAmount` lets the coordinator finance LESS than the clinic maximum — e.g.
 * a patient's credit approval only covers $2500. `null`/`undefined` (or anything above the
 * maximum) falls back to the maximum; the result is always clamped to `[0, min(max, total)]`.
 */
export function calculateFinancing(
  option: QuotationOption,
  country: string,
  paymentMethod: string,
  requestedInstallmentAmount?: number | null,
): FinancingBreakdown {
  const eligible = paymentMethod === 'installments' && PRICING.financing.eligibleCountries.includes(country);
  if (!eligible) {
    return {
      eligible: false,
      financedPackage: 0,
      installmentBase: 0,
      installment: 0,
      maximumTermMonths: PRICING.financing.maximumTermMonths,
      cashRemaining: 0,
      cashPerVisit: 0,
    };
  }
  const cap = PRICING.financing.installmentAmount;
  const requested = hasOverride(requestedInstallmentAmount) ? requestedInstallmentAmount : cap;
  const installmentBase = Math.min(requested, cap, option.totals.total);
  const installment = round2(installmentBase * (1 + PRICING.financing.markupPercent / 100));
  const cashRemaining = round2(Math.max(0, option.totals.total - installmentBase));
  const financedPackage = round2(installment + cashRemaining);
  const cashPerVisit = option.visits.count > 1 ? round2(cashRemaining / option.visits.count) : cashRemaining;
  return { eligible: true, financedPackage, installmentBase: round2(installmentBase), installment, maximumTermMonths: PRICING.financing.maximumTermMonths, cashRemaining, cashPerVisit };
}

export { STANDARD_PROSTHESIS_USD, STANDARD_TRANSFER_USD };
