/**
 * Shared TypeScript types for the DutyAI quotation PDF generators.
 *
 * These types are a faithful, typed superset of the object produced by the legacy
 * `buildQuotationData()` (quotation-data.js) — itself built from DOM values plus the
 * return value of the legacy `calculateOption(card)` pricing function — as further
 * enriched at runtime by `coordinator-updates.js` (display currency, price-visibility
 * flags, manual final price overrides).
 *
 * Nothing in this file does DOM scraping or price calculation. The rest of the app is
 * expected to compute pricing and assemble a `QuotationPdfData` object matching these
 * shapes; the `src/lib/pdf/simple` and `src/lib/pdf/premium` modules only render it.
 */

/** Language the quotation is written in. Drives label dictionaries, date formatting and
 *  layout direction (Arabic renders RTL via a dedicated template). Legacy source:
 *  `quotation.patient.language`, read from the `#language` select. */
export type QuotationLanguage = 'English' | 'Russian' | 'French' | 'Spanish' | 'Arabic';

/** Currency the PDF displays money in. Legacy source: `coordinator-updates.js`'s
 *  `selectedCurrency` (`#quoteCurrency`), propagated onto `buildQuotationData()`'s
 *  return value as `data.display.currency`. */
export type DisplayCurrencyCode = 'USD' | 'EUR' | 'AUD';

/**
 * A single priced line item for implants or crowns.
 * Legacy source: `option.treatment.implants` / `option.treatment.crowns` in
 * `getQuotationOptionData()` (quotation-data.js), derived from `calculateOption(card)`'s
 * `implantUnitPrice`/`crownUnitPrice`/`totalImplants`/`totalCrowns`.
 */
export interface TreatmentLineItem {
  /** Catalog id of the selected implant/crown brand (`DUTY_PRICING.implants|crowns` id), or null if none selected. */
  id: string | null;
  /** Display name of the brand/product, e.g. "Straumann" or "Zirconium Crowns Emax". Localized at render time via product-name dictionaries. */
  name: string | null;
  /** Raw catalog country-of-origin ("German" / "American" / "Swiss" / "Korean" / "Turkish" /
   *  "Other"), implants only — null for crowns/bridges (no such field on those catalog items).
   *  Translated and appended to `name` at render time (and "Other"/unrecognised values
   *  skipped — too vague to be useful patient-facing info) — see `src/lib/pdf/originLabels.ts`. */
  origin: string | null;
  /** Total units across the whole option (both visits combined). */
  quantity: number;
  /** Catalog base unit price in the quotation's selected currency, before markup. 0 when `priceConfigured` is false. */
  baseUnitPrice: number;
  /** Coordinator markup percentage applied on top of `baseUnitPrice`. */
  markupPercent: number;
  /** Final per-unit price actually billed (base + markup, or manual override), in the quotation's selected currency. This is what the PDF prints. */
  finalUnitPrice: number;
  /** Manual per-unit price override typed by the coordinator (in the selected currency), or null if the calculated price is used. Informational only — `finalUnitPrice` already reflects it. */
  manualUnitPrice: number | null;
  /** `quantity * finalUnitPrice`, in the quotation's selected currency. */
  total: number;
  /** False when the catalog has no independent price configured for the selected currency
   *  AND no manual override was entered — `baseUnitPrice`/`finalUnitPrice`/`total` are all 0
   *  and must NOT be treated as a real price. The catalog never falls back to converting
   *  another currency's price, so the renderer should show a "price not configured" notice
   *  instead of a $0 line. Always true when `id` is null (nothing selected yet). */
  priceConfigured: boolean;
}

/**
 * An additional procedure line (bone grafting, sedation, etc).
 * Legacy source: `getQuotationProcedureDetails()` (quotation-data.js), one entry per
 * checked `.procedure-choice`.
 */
export interface ProcedureLineItem {
  /** Catalog id from `DUTY_PRICING.procedures`. */
  id: string;
  /** English procedure name as stored in the catalog; localized at render time via `PROCEDURE_LABELS`. */
  name: string;
  /** Unit of measure when the procedure is quantity-based (e.g. "tooth", "arch"), or null for a flat one-off procedure. */
  unit: string | null;
  /** Quantity billed. Always 1 for procedures without a `unit`. */
  quantity: number;
  /** Per-unit price actually billed, in USD (manual override or catalog price). */
  unitPrice: number;
  /** Catalog base unit price in USD, before any manual override. */
  baseUnitPrice: number;
  /** Manual per-unit price override, or null. Informational — `unitPrice` already reflects it. */
  manualUnitPrice: number | null;
  /** `quantity * unitPrice`, in the quotation's selected currency. */
  total: number;
  /** See `TreatmentLineItem.priceConfigured` — same meaning. */
  priceConfigured: boolean;
}

/** The treatment breakdown for one quotation option. Legacy source: `option.treatment`. */
export interface QuotationTreatment {
  implants: TreatmentLineItem;
  crowns: TreatmentLineItem;
  /** Full-arch prosthetic bridge line (`unit price × quantity`, e.g. 1 per arch treated).
   *  `quantity` is 0 when the option has no bridge — the line is still present so PDFs can
   *  render a consistent shape; renderers should skip a zero-quantity bridge row. */
  bridge: TreatmentLineItem;
  procedures: ProcedureLineItem[];
}

/**
 * Hotel stay details for one visit.
 * Legacy source: `getQuotationHotelDetails()` (quotation-data.js).
 */
export interface QuotationHotelDetails {
  /** Catalog id from `DUTY_PRICING.hotels`. */
  id: string;
  /** Hotel display name. */
  name: string;
  /** Raw room-type key selected by the coordinator (e.g. "single", "double"). */
  roomType: string;
  /** Human-readable room label as resolved from the hotel's `roomOptions` (falls back to `roomType` when the hotel has no room-option list). */
  roomLabel: string;
  /** Number of nights booked. */
  nights: number;
  /** Price per night billed, in USD — the standard catalog rate for the room type, or the coordinator's override. */
  nightlyPrice: number;
  /** `nightlyPrice * nights`, in USD. */
  total: number;
  /** Currency the hotel's catalog price is denominated in (informational; the PDF always renders in `display.currency`). */
  currency: string;
}

/** A single add-on service line (VIP transfer, temporary prosthesis, translator).
 *  Legacy source: `visit.services.transfer` / `.prosthesis` / `.translator`. */
export interface QuotationServiceItem {
  /** Service name; the renderer maps this to a localized label by matching "vip"/"prosthesis"/"translator" substrings (legacy `pdfServiceLabel`/`arPdfHotelRows`), so pass the legacy English names ("VIP transfer", "Dental prosthesis", "Translator") for correct localization. */
  name: string;
  /** Price billed for this service in this visit, in USD. 0 (or omitted) prints as "Included". */
  total: number;
  /** True when the service is bundled at no extra cost (legacy always sets this for `translator`; optional for the others). */
  included?: boolean;
}

export interface QuotationVisitServices {
  transfer: QuotationServiceItem;
  /** Omitted on a second visit — the prosthesis is delivered once, on Visit 1. */
  prosthesis?: QuotationServiceItem;
  translator: QuotationServiceItem;
}

/**
 * Everything billed during a single clinic visit within one option.
 * Legacy source: `option.visits.visit1` / `option.visits.visit2`, combining
 * `calculateOption()`'s per-visit totals with `getQuotationHotelDetails()`.
 */
export interface QuotationVisit {
  /** Number of crowns fitted during this specific visit (legacy `calculateOption()`'s `visit1Crowns`/`visit2Crowns`). */
  crowns: number;
  /** Hotel booked for this visit, or null when no accommodation is included. */
  hotel: QuotationHotelDetails | null;
  services: QuotationVisitServices;
  /** Dental/treatment cost attributed to this visit, in the quotation's selected currency (legacy `visit1Dental`/`visit2Dental`). */
  dentalTotal: number;
  /** Hotel + services cost attributed to this visit, in the quotation's selected currency (legacy `visit1Services`/`visit2Services`). */
  servicesTotal: number;
  /** `dentalTotal + servicesTotal` for this visit, BEFORE any per-visit override — in the selected currency. */
  calculatedTotal: number;
  /** Coordinator's final-price override for THIS visit only, in the selected currency, or
   *  null when not set. Per-visit — there is no whole-option override. When set, it
   *  REPLACES `calculatedTotal` outright (never added/subtracted/scaled). */
  overrideTotal: number | null;
  /** `overrideTotal ?? calculatedTotal` — the authoritative amount for this visit. Every
   *  renderer (UI and PDF) must print this, never `calculatedTotal`, when the two differ. */
  finalTotal: number;
}

/** Visit structure for one option: either a single combined visit or two separate visits. */
export interface QuotationVisits {
  count: 1 | 2;
  visit1: QuotationVisit;
  /** Present only when `count === 2`. */
  visit2: QuotationVisit | null;
}

/** Aggregate totals for one option, in the quotation's selected currency. Legacy source: `option.totals`. */
export interface QuotationOptionTotals {
  /** Same value as `total` in the legacy data (both mirror `calculateOption()`'s `subtotal`) — kept for shape fidelity. */
  treatmentAndServices: number;
  /** = visit1.finalTotal */
  visit1: number;
  /** = visit2.finalTotal, or 0 when the option has only one visit. */
  visit2: number;
  /** Optional plan-level flight-ticket cost, in the selected currency. 0 when not entered.
   *  Manually entered by the coordinator — never calculated, never currency-converted. */
  flightTicket: number;
  /** Sum of every visit's `calculatedTotal` plus `flightTicket`, i.e. the total BEFORE any
   *  per-visit overrides. */
  calculatedTotal: number;
  /** Sum of every visit's `finalTotal` plus `flightTicket` — the authoritative treatment-plan
   *  total. This is what changes when a coordinator overrides one visit; the other visit's
   *  calculated price is untouched (no proportional scaling of the whole option). */
  finalTotal: number;
  /** Alias of `finalTotal`. Grand total for the option — the number the PDF prints as the option's price. */
  total: number;
}

/**
 * One priced treatment option ("Option 1", "Option 2", ...) as offered to the patient.
 * Legacy source: `getQuotationOptionData()`'s return value, one per `.quotation-option` card.
 */
export interface QuotationOption {
  /** Stable id for the option (legacy `card.dataset.optionId` or `option-{n}`). */
  id: string;
  /** Option display name, e.g. "German Implant System" or a coordinator-typed custom name. Some translations are applied at render time (see `OPTION_NAME_TRANSLATIONS`). */
  name: string;
  treatment: QuotationTreatment;
  visits: QuotationVisits;
  totals: QuotationOptionTotals;
  /** Currency the coordinator was viewing when this option was priced (legacy `option.displayCurrency`). Informational only — use `QuotationPdfData.display.currency` to control what the PDF renders. */
  displayCurrency?: DisplayCurrencyCode;
}

/** US/Canada installment financing terms. Legacy source: `DUTY_PRICING.financing`, surfaced via `quotation.payment.financing`. */
/**
 * Fully pre-computed by `calculateFinancing` (the pricing engine) — see that function's own
 * doc comment for the formula. Renderers only ever print these fields directly; they must
 * never re-derive the markup/cap math themselves (that duplication is exactly how this ended
 * up computed three different, inconsistent ways across the two PDF generators before).
 */
export interface FinancingDetails {
  /** Percentage markup — informational context for the `installmentAmount` figure below; it
   *  was already applied to `installmentBase` to produce `installmentAmount`. */
  markupPercent: number;
  /** The financed portion's face value, BEFORE the markup — capped at the clinic's maximum
   *  and never more than the treatment total; may be lower per patient. */
  installmentBase: number;
  /** `installmentBase` plus its markup — the amount actually collected as the installment. */
  installmentAmount: number;
  /** What the patient pays in total under the plan: `installmentAmount` + the remaining cash
   *  portion (at face value) — NOT the whole treatment total marked up. */
  financedPackage: number;
  /** The non-financed portion of the treatment total, paid in cash at face value. */
  cashRemaining: number;
  /** `cashRemaining` split evenly across the option's visits. */
  cashPerVisit: number;
  /** Maximum financing term offered, in months (informational — not printed by either generator today). */
  maximumTermMonths: number;
}

/** Payment method + installment-financing eligibility for the whole quotation. Legacy source: `quotation.payment`. */
export interface QuotationPayment {
  /** Raw payment method id, e.g. "visit-payments" or "installments" (legacy `#paymentMethod` value). */
  method: string;
  /** True when the patient's country and chosen payment method qualify for the US/Canada installment plan. */
  installmentEligible: boolean;
  /** Present only when `installmentEligible` is true. */
  financing: FinancingDetails | null;
}

/**
 * Clinically-confirmed treatment quantities used to auto-generate the plain-language
 * treatment-plan summary (legacy `confirmedTreatmentData`, read by `pdfTranslateTreatmentPlan`
 * / `arPdfTreatmentPlan` / `premiumTreatmentSummary`). All fields are optional/falsy-skippable —
 * each renderer only prints a line for a field that is truthy.
 */
export interface PatientTreatmentData {
  /** Number of implants planned for the upper jaw. */
  upperImplants?: number;
  /** Minimum number of implants planned for the lower jaw. */
  lowerImplantsMin?: number;
  /** Maximum number of implants planned for the lower jaw; renders as a "{min}–{max}" range when different from `lowerImplantsMin`. */
  lowerImplantsMax?: number;
  /** Number of crowns planned. */
  crowns?: number;
  /** Crown material, e.g. "zirconia" (only affects the English/Premium wording today). */
  crownMaterial?: string;
}

/** Patient identity and clinical summary. Legacy source: `quotation.patient`. */
export interface QuotationPatient {
  /** Patient's name in Latin script, used by every generator except when Arabic-script name is supplied. */
  name: string;
  /** Patient's name in Arabic script, preferred by the Arabic generator when present (falls back to `name`). */
  arabicName: string;
  /** Patient's country of residence (drives installment-financing eligibility upstream; not printed directly). */
  country: string;
  language: QuotationLanguage;
  /** Free-text clinical diagnosis, used as a fallback when `treatmentData` is absent. */
  diagnosis: string;
  treatmentData: PatientTreatmentData | null;
}

/**
 * Coordinator-controlled display settings for the generated PDF.
 * Legacy source: `coordinator-updates.js`'s in-memory state, attached to
 * `buildQuotationData()`'s return value as `data.display`. Not present in the original
 * (pre-coordinator-layer) `buildQuotationData()` output — callers that don't need
 * currency conversion or price hiding can omit `display` entirely and the renderers
 * default to USD / rate 1 / all prices shown.
 */
export interface QuotationDisplayOptions {
  /** Currency every money amount is rendered in. Implant/crown/procedure/bridge amounts are
   *  the clinic's OWN independent price for this currency (never computed from USD) — see
   *  `PriceValue` in `src/data/pricing.ts`. Hotel/transfer/prosthesis logistics prices have
   *  no independent multi-currency list, so they are still expressed via `usdToCurrencyRate`. */
  currency: DisplayCurrencyCode;
  /** Reference "1 USD = X currency" rate (1 for USD). Two uses ONLY: (1) converting the
   *  USD-only hotel/transfer/prosthesis logistics prices into the selected currency, and
   *  (2) computing the optional "≈ $X USD" reference line (`showUsdEquivalent`). It is
   *  NEVER used to compute an implant/crown/procedure/bridge price — those come directly
   *  from the catalog's per-currency value or a manual override typed in that currency. */
  usdToCurrencyRate: number;
  /** When false, hides the printed price for treatment line items (implants/crowns/procedures) — Premium proposal only, see README. */
  showProductPrices: boolean;
  /** When false, hides the printed price for hotel line items — Premium proposal only, see README. */
  showHotelPrices: boolean;
  /** When true and `currency` is not USD, every rendered amount is followed by its USD equivalent in parentheses. */
  showUsdEquivalent?: boolean;
}

/**
 * Full input contract for the Simple Quotation PDF (`generateSimpleQuotationPdf`) and the
 * Premium Proposal PDF (`generatePremiumQuotationHtml`/`generatePremiumQuotationPdf`).
 * Legacy source: the object returned by `buildQuotationData()` (quotation-data.js), as
 * further enriched by `coordinator-updates.js` (the `display` block).
 */
/** Rendered implant-map image for the Premium Proposal (PNG data URL) plus its tooth counts. */
export interface ImplantMapData {
  /** `data:image/png;base64,...` snapshot of the 3D implant map. */
  image: string;
  implants: number;
  crowns: number;
  /** Bridge units marked on the tooth map. Optional — omit or 0 hides the legend row. */
  bridges?: number;
}

export interface QuotationPdfData {
  /** ISO 8601 timestamp of when the quotation was generated (legacy `new Date().toISOString()`). */
  generatedAt: string;
  patient: QuotationPatient;
  payment: QuotationPayment;
  options: QuotationOption[];
  /** Currency/visibility controls. Omit to default to USD at rate 1 with all prices shown. */
  display?: QuotationDisplayOptions;
  /** Optional 3D implant-map snapshot; when present (or `patientPhotos` is) the Premium
   *  Proposal adds an "Implant Map" page. See `patientPhotos`/`replaceImplantMapWithPhotos`
   *  for how uploaded photos interact with this snapshot. */
  implantMap?: ImplantMapData;
  /** Additional patient images (X-rays, intraoral photos, scans, …) for the Implant Map
   *  section — `data:image/...;base64,...` URLs, resized/compressed client-side before being
   *  stored (see `src/lib/pdf/imageUtils.ts`); never uploaded to a server. Premium Proposal
   *  only — the Simple Quotation has no image section. */
  patientPhotos?: string[];
  /** Governs how `patientPhotos` and the 3D `implantMap` snapshot combine on the Implant Map
   *  page, when both a snapshot exists and photos were uploaded:
   *   - no photos uploaded            -> the 3D snapshot alone (unchanged existing behaviour)
   *   - photos uploaded, false/unset  -> the 3D snapshot AND the photos, together
   *   - photos uploaded, true         -> the photos REPLACE the 3D snapshot
   *  Has no effect when `patientPhotos` is empty. */
  replaceImplantMapWithPhotos?: boolean;
  /** Free-text coordinator notes, printed as their own page/section near the end of the
   *  document (just before the closing page) in both PDFs. Omitted entirely when empty. */
  notes?: string;
  /** Legacy schema marker, carried through for forward compatibility. Not used by the renderers. */
  schemaVersion?: number;
}
