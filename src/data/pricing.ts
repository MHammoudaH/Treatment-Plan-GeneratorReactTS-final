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

/** A EUR-only price, USD/AUD left unconfigured (`null`) — NOT a conversion, just "not set yet".
 *  Used by the Bariatric / Plastic-Aesthetic catalog below, whose source price list is EUR. */
export function eurOnly(eur: number): PriceValue {
  return { usd: null, eur, aud: null };
}

/** No independent price configured in any currency yet — the coordinator must enter a final
 *  price via `ProcedureSelection.finalUnitPriceOverride`. Never a stand-in for $0/€0. */
export function noPrice(): PriceValue {
  return { usd: null, eur: null, aud: null };
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

/** Groups `PRICING.procedures` for the coordinator's UI. Existing dental add-on procedures
 *  (bone grafting, sinus lifting, ...) are 'Dental'; the Bariatric and Plastic / Aesthetic
 *  catalogs added alongside them are their own categories so the option-builder UI can group,
 *  tab and search them instead of rendering one giant flat list. */
export type ProcedureCategory = 'Dental' | 'Bariatric' | 'Plastic';

/** Display-only reference range for procedures the clinic quotes as "€min–€max" rather than one
 *  fixed figure (e.g. Gastric Balloon). NEVER auto-selected as the final price — `price` stays
 *  unconfigured (`noPrice()`) for these, so the coordinator must still enter an explicit final
 *  price via `ProcedureSelection.finalUnitPriceOverride`; this is shown next to that field purely
 *  as the clinic's quoted range. */
export interface ProcedureCatalogItem {
  id: string;
  name: string;
  price: PriceValue;
  /** Present only for quantity-based procedures (e.g. "1 cc", "one side", "per arch"). */
  unit?: string;
  /** UI grouping — defaults to 'Dental' when omitted (all pre-existing entries). */
  category?: ProcedureCategory;
  /** Reference min–max, EUR, for procedures quoted as a range instead of one fixed price. See
   *  the interface doc comment — display-only, never used to compute a price. */
  priceRange?: { min: number; max: number };
  /** Informational note shown beside the procedure (e.g. J-Plasma's "must be combined with
   *  liposuction"). Purely explanatory — never affects pricing. */
  note?: string;
  /** False for procedures the clinic does not currently perform (e.g. Cat Eyes / Fox Eyes,
   *  Lip Lifting) — kept as catalog entries for completeness but must never be selectable.
   *  Defaults to true (selectable) when omitted. */
  available?: boolean;
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
    { id: 'bone-graft', name: 'Bone Grafting', price: usdOnly(400), unit: '1 cc', category: 'Dental' },
    { id: 'sinus-1', name: 'Sinus Lifting with Bone Graft (1 Side)', price: usdOnly(740), unit: 'one side', category: 'Dental' },
    { id: 'sinus-2', name: 'Sinus Lifting with Bone Graft (2 Sides)', price: usdOnly(1400), unit: 'two sides', category: 'Dental' },
    { id: 'surgical-extraction', name: 'Surgical Extraction', price: usdOnly(150), category: 'Dental' },
    { id: 'implant-removal', name: 'Implants Removal', price: usdOnly(100), category: 'Dental' },
    { id: 'root-canal', name: 'Root Canal', price: usdOnly(50), category: 'Dental' },
    { id: 'gingivectomy', name: 'Gingivectomy', price: usdOnly(300), unit: 'per arch', category: 'Dental' },
    { id: 'fillings', name: 'Fillings', price: usdOnly(75), category: 'Dental' },
    // Added by coordinator-updates.js in production (procedureSource()) — kept here as
    // first-class catalog entries rather than a runtime patch.
    { id: 'general-anesthesia', name: 'General Anesthesia', price: usdOnly(1500), category: 'Dental' },
    { id: 'hiv-protocol', name: 'HIV Protocol for a patient with HIV', price: usdOnly(1500), category: 'Dental' },

    // -----------------------------------------------------------------------------------
    // BARIATRIC — source: Duty Clinic Sales Price List (Bariatric section). All prices are
    // the clinic's official EUR list; USD/AUD are intentionally left unconfigured (`noPrice()`
    // components stay null) rather than derived from EUR — see the module doc comment and
    // `priceFor()`. Ranges are display-only reference figures (`priceRange`); the coordinator
    // must still enter one explicit final price via `finalUnitPriceOverride`.
    // -----------------------------------------------------------------------------------
    { id: 'gastric_botox', name: 'Gastric Botox', price: noPrice(), priceRange: { min: 1350, max: 2700 }, category: 'Bariatric' },
    { id: 'gastric_balloon', name: 'Gastric Balloon', price: noPrice(), priceRange: { min: 1300, max: 4000 }, category: 'Bariatric' },
    { id: 'elipse_balloon', name: 'Elipse Balloon', price: noPrice(), priceRange: { min: 3000, max: 3500 }, category: 'Bariatric' },
    { id: 'gastric_sleeve', name: 'Gastric Sleeve', price: eurOnly(2700), category: 'Bariatric' },
    { id: 'gastric_plication', name: 'Gastric Plication', price: noPrice(), priceRange: { min: 3000, max: 5000 }, category: 'Bariatric' },
    { id: 'gastric_bypass', name: 'Gastric Bypass', price: eurOnly(3400), category: 'Bariatric' },
    { id: 'gastric_mini_bypass', name: 'Gastric Mini-Bypass', price: eurOnly(2900), category: 'Bariatric' },
    { id: 'sadi_s', name: 'SADI-S / Bypass SADI-S', price: eurOnly(3600), category: 'Bariatric' },
    { id: 'bari_clip', name: 'Bari-Clip', price: eurOnly(7000), category: 'Bariatric' },
    { id: 'gastric_band', name: 'Gastric Band', price: noPrice(), category: 'Bariatric' },

    // -----------------------------------------------------------------------------------
    // PLASTIC / AESTHETIC — source: Duty Clinic Sales Price List (Plastic/Aesthetic section).
    // Same EUR-only / no-conversion rule as Bariatric above.
    // -----------------------------------------------------------------------------------
    { id: 'vaser_liposuction_4d', name: 'Vaser Liposuction 4D', price: noPrice(), category: 'Plastic' },
    { id: 'bbl_fat_transfer', name: 'BBL / Brazilian Butt Lift by Fat Transfer', price: noPrice(), category: 'Plastic' },
    { id: 'abdominoplasty', name: 'Abdominoplasty / Tummy Tuck', price: noPrice(), category: 'Plastic' },
    { id: 'arm_lifting', name: 'Arm Lifting / Brachioplasty', price: noPrice(), category: 'Plastic' },
    { id: 'thigh_lifting', name: 'Thigh Lifting', price: noPrice(), category: 'Plastic' },
    {
      id: 'breast_augmentation_silicone',
      name: 'Breast Augmentation / Silicone Implant',
      price: noPrice(),
      category: 'Plastic',
      note: 'No standalone catalog price — choose a specific implant brand/lift variant (Silimed, Motiva, Mentor, Cereform) below.',
    },
    { id: 'breast_reduction', name: 'Breast Reduction', price: noPrice(), category: 'Plastic' },
    { id: 'breast_lifting_mastopexy', name: 'Breast Lifting / Mastopexy', price: eurOnly(2900), category: 'Plastic', note: 'Without silicone.' },
    { id: 'gynecomastia', name: 'Gynecomastia', price: eurOnly(2900), category: 'Plastic' },
    { id: 'face_neck_lifting', name: 'Face & Neck Lifting', price: noPrice(), category: 'Plastic' },
    { id: 'blepharoplasty', name: 'Blepharoplasty', price: eurOnly(2000), category: 'Plastic' },
    { id: 'rhinoplasty', name: 'Rhinoplasty / Nose Job', price: eurOnly(2900), category: 'Plastic' },
    { id: 'septoplasty', name: 'Septoplasty', price: eurOnly(2900), category: 'Plastic' },
    { id: 'otoplasty', name: 'Otoplasty / Ear Reshaping', price: noPrice(), category: 'Plastic' },
    { id: 'mommy_makeover', name: 'Mommy Makeover', price: noPrice(), category: 'Plastic' },
    { id: 'bichectomy', name: 'Bichectomy / Buccal Fat Removal', price: noPrice(), category: 'Plastic' },
    { id: 'six_pack_surgery', name: 'Six-Pack Surgery / Abdominal Etching & Sculpting', price: eurOnly(3200), category: 'Plastic' },
    {
      id: 'j_plasma',
      name: 'J-Plasma',
      price: noPrice(),
      category: 'Plastic',
      note: 'Must be combined with liposuction. No standalone price — see "1–3 Areas Liposuction + 1–3 Areas J-Plasma" below.',
    },
    { id: 'labiaplasty', name: 'Labiaplasty', price: eurOnly(1900), category: 'Plastic' },
    { id: 'vaginoplasty', name: 'Vaginoplasty / Vaginal Rejuvenation', price: eurOnly(1900), category: 'Plastic' },
    { id: 'rhinoplasty_cartilage', name: 'Rhinoplasty with Cartilage', price: eurOnly(3600), category: 'Plastic' },
    { id: 'varicose_veins_ablation', name: 'Varicose Veins / Endovenous Ablation', price: noPrice(), category: 'Plastic' },
    { id: 'penis_enlargement_fat', name: 'Penis Enlargement by Fat / Penile Fat Injection', price: eurOnly(1900), category: 'Plastic' },
    { id: 'penis_extension', name: 'Penis Extension / Lengthening', price: eurOnly(1900), category: 'Plastic' },
    { id: 'penis_lengthening_enlargement', name: 'Penis Lengthening + Enlargement with Fat', price: eurOnly(3500), category: 'Plastic' },
    { id: 'fat_injection_hands', name: 'Fat Injection into Hands', price: noPrice(), category: 'Plastic' },
    { id: 'eyebrow_lift', name: 'Eyebrow Lift', price: noPrice(), category: 'Plastic' },
    { id: 'umbilical_hernia', name: 'Umbilical Hernia', price: noPrice(), category: 'Plastic', note: 'No standalone price — quoted together with the combined procedure.' },
    { id: 'hymen_repair', name: 'Hymen Repair / Hymenoplasty', price: eurOnly(1900), category: 'Plastic' },
    { id: 'jaw_silicone', name: 'Jaw Silicone', price: eurOnly(1600), category: 'Plastic' },
    { id: 'jaw_line_filler', name: 'Jaw Line — Jaw Silicone + 4 ml Filler', price: eurOnly(2500), category: 'Plastic' },
    { id: 'butt_silicone_sebbin_polytech', name: 'Butt Silicone — Sebbin / Polytech', price: eurOnly(4500), category: 'Plastic' },
    { id: 'butt_silicone_implantech_fda', name: 'Butt Silicone — Implantech American FDA Approved', price: eurOnly(4950), category: 'Plastic' },

    // Priced variants / combinations — kept as separate catalog entries (never collapsed into
    // a generic procedure), per the source price list.
    { id: 'dimple_one_side', name: 'Dimple — One Side', price: eurOnly(400), category: 'Plastic' },
    { id: 'dimple_two_sides', name: 'Dimple — Two Sides', price: eurOnly(700), category: 'Plastic' },
    { id: 'rhinoplasty_double_chin_lipo', name: 'Rhinoplasty + Double Chin Liposuction', price: eurOnly(4000), category: 'Plastic' },
    { id: 'revision_rhinoplasty', name: 'Second Rhinoplasty / Revision Rhinoplasty', price: eurOnly(4000), category: 'Plastic' },
    { id: 'laser_rhinoplasty', name: 'Laser Rhinoplasty', price: eurOnly(2900), category: 'Plastic' },
    { id: 'breast_nipple', name: 'Breast Nipple', price: eurOnly(1100), category: 'Plastic' },
    { id: 'breast_aug_silimed_circular', name: 'Breast Augmentation — Silimed Circular', price: eurOnly(2950), category: 'Plastic' },
    { id: 'breast_lift_silimed_circular', name: 'Breast Silicone + Lifting — Silimed Circular', price: eurOnly(3500), category: 'Plastic' },
    { id: 'breast_aug_motiva_circular', name: 'Breast Augmentation — Motiva Circular', price: eurOnly(3200), category: 'Plastic' },
    { id: 'breast_aug_motiva_teardrop', name: 'Breast Augmentation — Motiva Teardrop', price: eurOnly(3400), category: 'Plastic' },
    { id: 'breast_lift_motiva_circular', name: 'Breast Silicone + Lifting — Motiva Circular', price: eurOnly(3700), category: 'Plastic' },
    { id: 'breast_lift_motiva_teardrop', name: 'Breast Silicone + Lifting — Motiva Teardrop', price: eurOnly(3900), category: 'Plastic' },
    { id: 'breast_aug_mentor_circular', name: 'Breast Augmentation — Mentor Circular', price: eurOnly(3400), category: 'Plastic' },
    { id: 'breast_aug_mentor_teardrop', name: 'Breast Augmentation — Mentor Teardrop', price: eurOnly(3600), category: 'Plastic' },
    { id: 'breast_lift_mentor_circular', name: 'Breast Silicone + Lifting — Mentor Circular', price: eurOnly(3900), category: 'Plastic' },
    { id: 'breast_lift_mentor_teardrop', name: 'Breast Silicone + Lifting — Mentor Teardrop', price: eurOnly(4100), category: 'Plastic' },
    { id: 'breast_aug_cereform_circular', name: 'Breast Augmentation — Cereform Circular', price: eurOnly(4400), category: 'Plastic' },
    { id: 'breast_aug_cereform_teardrop', name: 'Breast Augmentation — Cereform Teardrop', price: eurOnly(4600), category: 'Plastic' },
    { id: 'breast_lift_cereform_circular', name: 'Breast Silicone + Lifting — Cereform Circular', price: eurOnly(4900), category: 'Plastic' },
    { id: 'breast_lift_cereform_teardrop', name: 'Breast Silicone + Lifting — Cereform Teardrop', price: eurOnly(5000), category: 'Plastic' },
    { id: 'lifting_without_liposuction', name: 'Only Lifting Without Liposuction', price: eurOnly(2500), category: 'Plastic' },
    { id: 'liposuction_3_areas', name: '3 Areas Liposuction', price: eurOnly(2500), category: 'Plastic' },
    { id: 'liposuction_3_areas_bbl', name: '3 Areas Liposuction + BBL', price: eurOnly(3500), category: 'Plastic' },
    { id: 'liposuction_jplasma_combo', name: '1–3 Areas Liposuction + 1–3 Areas J-Plasma', price: eurOnly(3600), category: 'Plastic' },
    { id: 'lipo3_motiva_circular_no_lift', name: '3 Areas Lipo + Motiva Circular Breast Silicone Without Lifting', price: eurOnly(4700), category: 'Plastic' },
    { id: 'lipo3_motiva_circular_with_lift', name: '3 Areas Lipo + Motiva Circular Breast Silicone With Lifting', price: eurOnly(5200), category: 'Plastic' },
    { id: 'lipo3_breast_bbl', name: '3 Areas Lipo + Breast Silicone ± Lifting + BBL', price: eurOnly(5500), category: 'Plastic' },
    { id: 'lipo3_rhinoplasty', name: '3 Areas Lipo + Rhinoplasty', price: eurOnly(4100), category: 'Plastic' },
    { id: 'lipo3_breast_rhinoplasty', name: '3 Areas Lipo + Breast Silicone ± Lifting + Rhinoplasty', price: eurOnly(6500), category: 'Plastic' },
    { id: 'vaginal_rejuvenation_labiaplasty', name: 'Vaginal Rejuvenation + Labiaplasty', price: eurOnly(3500), category: 'Plastic' },
    { id: 'vaginal_rejuvenation_labiaplasty_hymen', name: 'Vaginal Rejuvenation + Labiaplasty + Hymen Repair', price: eurOnly(5000), category: 'Plastic' },

    // Not currently performed — kept as catalog entries for completeness; `available: false`
    // means the coordinator UI must never let these be selected (see OptionCard.tsx).
    { id: 'cat_eyes_fox_eyes', name: 'Cat Eyes / Fox Eyes (surgical)', price: noPrice(), category: 'Plastic', available: false, note: 'Not currently offered by the clinic.' },
    { id: 'lip_lifting', name: 'Lip Lifting', price: noPrice(), category: 'Plastic', available: false, note: 'Not currently offered by the clinic.' },
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
