/**
 * DutyAI official pricing catalog.
 * Ported verbatim from the legacy `Data/pricing.js` (`window.DUTY_PRICING`).
 * Source: Duty Clinic - Sales Price List.xlsx
 * Prices are official base prices. Coordinator markup/overrides are applied
 * separately by the pricing engine (see src/lib/pricing/engine.ts).
 *
 * MULTI-CURRENCY: every clinic price is a `PriceValue` — three INDEPENDENT numbers
 * (usd/eur/aud), never derived from one another. `null` means "not configured for
 * that currency yet" — see `priceFor()`. Do not invent missing EUR/AUD values; only
 * the clinic's official USD list (and the two bridge prices explicitly given) are
 * populated here. Everything else starts `null` until a coordinator/admin sets it.
 */

export type Currency = 'USD' | 'EUR' | 'AUD';

export const CURRENCIES: readonly Currency[] = ['USD', 'EUR', 'AUD'];

/** Three independent clinic prices. Never compute one from another. */
export interface PriceValue {
  usd: number | null;
  eur: number | null;
  aud: number | null;
}

/** A USD-only price, EUR/AUD left unconfigured (`null`) — NOT a conversion, just "not set yet". */
export function usdOnly(usd: number): PriceValue {
  return { usd, eur: null, aud: null };
}

/** The independent price for `currency`, or `null` if that currency isn't configured
 *  for this item. Never falls back to another currency — that would silently
 *  reintroduce USD-based conversion, which this catalog forbids. */
export function priceFor(value: PriceValue, currency: Currency): number | null {
  switch (currency) {
    case 'USD':
      return value.usd;
    case 'EUR':
      return value.eur;
    case 'AUD':
      return value.aud;
  }
}

export function hasPrice(value: PriceValue, currency: Currency): boolean {
  return priceFor(value, currency) !== null;
}

export interface CrownCatalogItem {
  id: string;
  name: string;
  displayName?: string;
  price: PriceValue;
}

export interface ImplantCatalogItem {
  id: string;
  name: string;
  displayName?: string;
  origin: string;
  price: PriceValue;
}

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  price: PriceValue;
  /** Present only for quantity-based procedures (e.g. "1 cc", "one side", "per arch"). */
  unit?: string;
}

/** A full-arch prosthetic bridge, priced independently per currency and billed
 *  `unit price × quantity` (one bridge per arch treated, see engine.ts). */
export interface BridgeCatalogItem {
  id: string;
  name: string;
  price: PriceValue;
}

export interface HotelRoomOption {
  name: string;
  price: number;
}

export interface HotelCatalogItem {
  id: string;
  name: string;
  currency: 'USD';
  /** Nightly price per room type, for hotels with a simple single/double/triple structure. */
  single?: number | null;
  double?: number | null;
  triple?: number | null;
  /** Present instead of single/double/triple for hotels with a non-standard room list. */
  roomOptions?: HotelRoomOption[];
  /** Informational: original currency the hotel quoted in, before conversion to USD. */
  originalCurrency?: string;
  originalPrices?: { single?: number; double?: number };
  conversionRate?: number;
  /** Informational: free-text validity window for the quoted rate. */
  validity?: string;
}

export interface FinancingRules {
  eligibleCountries: string[];
  markupPercent: number;
  installmentAmount: number;
  maximumTermMonths: number;
}

export interface PricingCatalog {
  crowns: CrownCatalogItem[];
  implants: ImplantCatalogItem[];
  procedures: ProcedureCatalogItem[];
  bridges: BridgeCatalogItem[];
  hotels: HotelCatalogItem[];
  financing: FinancingRules;
}

export const PRICING: PricingCatalog = {
  crowns: [
    { id: 'ivoclar-zirconia', name: 'Zirconium Crowns Ivoclar German', price: usdOnly(100) },
    { id: 'emax', name: 'Zirconium Crowns Emax', price: usdOnly(150) },
    { id: 'monolithic', name: 'Zirconium Crowns Monolithic', price: usdOnly(170) },
    { id: 'multilayer', name: 'Zirconium Crowns Multilayer', price: usdOnly(170) },
    { id: 'straumann-zirconia', name: 'Zirconium Crowns Straumann', displayName: 'Straumann Zirconia', price: usdOnly(170) },
    { id: 'veneers', name: 'Veneers', price: usdOnly(150) },
  ],
  implants: [
    { id: 'medigma', name: 'German Implants Medigma', displayName: 'Medigma', origin: 'German', price: usdOnly(300) },
    { id: 'bego', name: 'German Implants Bego', displayName: 'BEGO', origin: 'German', price: usdOnly(370) },
    { id: 'hiossen', name: 'American Implants Hiossen', displayName: 'Hiossen', origin: 'American', price: usdOnly(500) },
    { id: 'zimmer', name: 'American Implants Zimmer', displayName: 'Zimmer', origin: 'American', price: usdOnly(650) },
    { id: 'neodent', name: 'Neodent by Straumann', origin: 'Swiss', price: usdOnly(500) },
    { id: 'medentika', name: 'Medentika by Straumann', displayName: 'Medentika by Straumann Group', origin: 'Swiss', price: usdOnly(650) },
    { id: 'nobel-biocare', name: 'Nobel Biocare', origin: 'Other', price: usdOnly(600) },
    { id: 'megagen', name: 'Korean Implants Megagen', displayName: 'Megagen', origin: 'Korean', price: usdOnly(500) },
    { id: 'osstem', name: 'Korean Implants Osstem', displayName: 'Osstem', origin: 'Korean', price: usdOnly(500) },
    { id: 'straumann', name: 'Swiss Implants Straumann', displayName: 'Straumann', origin: 'Swiss', price: usdOnly(600) },
    { id: 'straumann-blt', name: 'Swiss Implants Straumann BLT', displayName: 'Straumann BLT', origin: 'Swiss', price: usdOnly(600) },
    { id: 'straumann-blx', name: 'Swiss Implants Straumann BLX', displayName: 'Straumann BLX', origin: 'Swiss', price: usdOnly(750) },
    { id: 'venus', name: 'Turkish Implants Venus', displayName: 'Venus', origin: 'Turkish', price: usdOnly(225) },
  ],
  procedures: [
    { id: 'bone-graft', name: 'Bone Grafting', price: usdOnly(400), unit: '1 cc' },
    { id: 'sinus-1', name: 'Sinus Lifting with Bone Graft (1 Side)', price: usdOnly(740), unit: 'one side' },
    { id: 'sinus-2', name: 'Sinus Lifting with Bone Graft (2 Sides)', price: usdOnly(1400), unit: 'two sides' },
    { id: 'surgical-extraction', name: 'Surgical Extraction', price: usdOnly(150) },
    { id: 'implant-removal', name: 'Implants Removal', price: usdOnly(100) },
    { id: 'root-canal', name: 'Root Canal', price: usdOnly(50) },
    { id: 'gingivectomy', name: 'Gingivectomy', price: usdOnly(300), unit: 'per arch' },
    { id: 'fillings', name: 'Fillings', price: usdOnly(75) },
    // Added by coordinator-updates.js in production (procedureSource()) — kept here as
    // first-class catalog entries rather than a runtime patch.
    { id: 'general-anesthesia', name: 'General Anesthesia', price: usdOnly(1500) },
    { id: 'hiv-protocol', name: 'HIV Protocol for a patient with HIV', price: usdOnly(1500) },
  ],
  bridges: [
    // The clinic's usual full-arch fixed-bridge price. USD/EUR are the clinic's own
    // independent figures for each currency (NOT converted from one another). AUD is
    // intentionally left unconfigured — do not assume AUD = USD or AUD = EUR.
    { id: 'full-arch-bridge', name: 'Full-Arch Dental Bridge', price: { usd: 1000, eur: 1000, aud: null } },
  ],
  hotels: [
    { id: 'tryp-wyndham-topkapi', name: 'Tryp by Wyndham Istanbul Topkapi', single: 65, double: 65, triple: 95, currency: 'USD' },
    { id: 'ibis-merter', name: 'IBIS Merter', single: 75, double: 75, triple: 105, currency: 'USD', validity: 'Until 30.8' },
    { id: 'hampton-merter', name: 'Hampton by Hilton Istanbul Merter', single: 65, double: 65, triple: 90, currency: 'USD', validity: 'Until 30.8' },
    { id: 'ramada-merter', name: 'Ramada Merter', single: 75, double: 75, triple: 95, currency: 'USD' },
    {
      id: 'rios-edition',
      name: 'Rios Edition Hotel',
      roomOptions: [
        { name: 'Single/Double — Standard', price: 55 },
        { name: 'Single/Double — Jacuzzi', price: 95 },
        { name: 'Triple — Standard', price: 75 },
      ],
      currency: 'USD',
    },
    { id: 'gunes-merter', name: 'Güneş Hotel Merter', single: 60, double: 60, triple: null, currency: 'USD', validity: 'Until 30.8' },
    {
      id: 'eresin-topkapi',
      name: 'Eresin Hotels Topkapı 5',
      single: 81.2,
      double: 92.8,
      triple: null,
      currency: 'USD',
      originalCurrency: 'EUR',
      originalPrices: { single: 70, double: 80 },
      conversionRate: 1.16,
      validity: 'Until 30.8',
    },
    {
      id: 'novotel-zeytinburnu',
      name: 'Novotel Zeytinburnu',
      single: 87,
      double: 98.6,
      triple: null,
      currency: 'USD',
      originalCurrency: 'EUR',
      originalPrices: { single: 75, double: 85 },
      conversionRate: 1.16,
      validity: 'Until 30.08',
    },
    {
      id: 'ottoperla',
      name: 'Ottoperla Hotel',
      single: 81.2,
      double: 92.8,
      triple: null,
      currency: 'USD',
      originalCurrency: 'EUR',
      originalPrices: { single: 70, double: 80 },
      conversionRate: 1.16,
      validity: 'Until 1.09',
    },
    { id: 'business-life-bakirkoy', name: 'Business Life Hotel & SPA Bakırköy', single: 45, double: 50, triple: 65, currency: 'USD', validity: '31.8' },
    { id: 'holiday-inn-old-city-fatih', name: 'Holiday Inn Old City Fatih', single: 75, double: 75, triple: 115, currency: 'USD', validity: 'Until 30.07' },
    { id: 'akgun-istanbul', name: 'Akgün İstanbul Hotel', single: 75, double: 85, triple: 110, currency: 'USD', validity: '31.10' },
    {
      id: 'ottomans-life-deluxe',
      name: "Ottoman's Life Hotel Deluxe",
      single: 98.6,
      double: 110.2,
      triple: null,
      currency: 'USD',
      originalCurrency: 'EUR',
      originalPrices: { single: 85, double: 95 },
      conversionRate: 1.16,
      validity: '31.10',
    },
  ],
  financing: {
    eligibleCountries: ['United States', 'Canada'],
    markupPercent: 20,
    installmentAmount: 3900,
    maximumTermMonths: 24,
  },
};

/** Flat clinic-standard prices used by the pricing engine's defaults (legacy: hardcoded
 *  constants inside coordinator-final-pricing.js, now first-class catalog values).
 *  Hotel/transfer/prosthesis logistics pricing is USD-only by design (unchanged from the
 *  legacy app) — the multi-currency architecture below applies to the clinical treatment
 *  items (implants, crowns, procedures, bridges) named in the pricing brief. */
export const STANDARD_TRANSFER_USD = 150;
export const STANDARD_PROSTHESIS_USD = 200;

/** Coordinator markup-percent presets, keyed by base unit price band.
 *  Legacy source: `getUnitMarkupOptions()` / `updateMarkupOptions()` in app.js. */
export function markupPresetsForPrice(price: number): number[] {
  if (price >= 50 && price <= 350) return [20, 25, 30, 35];
  if (price > 350 && price <= 750) return [10, 12, 15];
  if (price > 750) return [5, 7];
  return [0];
}
