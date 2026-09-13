import type { OptionInput } from '../lib/pricing/engine';
import type { PatientTreatmentData, QuotationLanguage } from '../lib/pdf/types';
import type { ToothMark } from '../lib/dental/teeth';

export interface PatientInfo {
  name: string;
  arabicName: string;
  country: string;
  language: QuotationLanguage;
}

export interface DiagnosisInfo {
  rawText: string;
  editedText: string;
  parsed: PatientTreatmentData | null;
  confirmed: boolean;
}

export type PaymentMethod = 'visit-payments' | 'installments';

export type DisplayCurrency = 'USD' | 'EUR' | 'AUD';

/** Per-currency display metadata: dropdown label, money symbol, and a starting
 *  "1 USD = X" reference rate the coordinator can override before issuing. */
export const CURRENCY_META: Record<DisplayCurrency, { label: string; symbol: string; defaultUsdRate: number }> = {
  USD: { label: 'USD — US Dollar', symbol: '$', defaultUsdRate: 1 },
  EUR: { label: 'EUR — Euro', symbol: '€', defaultUsdRate: 1 / 1.1567 },
  AUD: { label: 'AUD — Australian Dollar', symbol: 'A$', defaultUsdRate: 1.52 },
};

export interface DisplaySettings {
  currency: DisplayCurrency;
  /** USD → display-currency conversion rate (always 1 while `currency` is USD). */
  fxRate: number;
  showProductPrices: boolean;
  showHotelPrices: boolean;
  /** When a non-USD currency is selected, also print the USD equivalent in parentheses. */
  showUsdEquivalent: boolean;
}

export interface WizardState {
  /** 0 Patient · 1 Diagnosis · 2 Implant map · 3 Options · 4 Confirmation */
  step: 0 | 1 | 2 | 3 | 4;
  patient: PatientInfo;
  diagnosis: DiagnosisInfo;
  /** Per-tooth implant/crown plan, keyed by FDI number. Drives the 3D implant map. */
  toothPlan: Record<number, ToothMark>;
  paymentMethod: PaymentMethod;
  /** Amount the coordinator is financing for this patient under the US/Canada installment
   *  plan, in USD — the ONLY portion the plan's markup applies to (see `calculateFinancing`).
   *  `null` defaults to the clinic maximum (`PRICING.financing.installmentAmount`, $3900); a
   *  patient whose credit approval covers less can be financed for that lower amount instead.
   *  Clamped to `[0, clinic maximum]` at calculation time regardless of what's typed here. */
  installmentAmount: number | null;
  options: OptionInput[];
  display: DisplaySettings;
  /** Free-text notes printed near the end of both PDFs — see `QuotationPdfData.notes`. */
  notes: string;
  /** Uploaded patient images for the Premium Proposal's Implant Map section — data URLs,
   *  resized client-side, never uploaded to a server. See `QuotationPdfData.patientPhotos`. */
  patientPhotos: string[];
  /** When true (and `patientPhotos` is non-empty), the uploaded photos replace the 3D
   *  snapshot in the Premium Proposal instead of appearing alongside it. */
  replaceImplantMapWithPhotos: boolean;
}

export function createInitialState(): WizardState {
  return {
    step: 0,
    patient: { name: '', arabicName: '', country: '', language: 'English' },
    diagnosis: { rawText: '', editedText: '', parsed: null, confirmed: false },
    toothPlan: {},
    paymentMethod: 'visit-payments',
    installmentAmount: null,
    options: [],
    display: { currency: 'USD', fxRate: 1, showProductPrices: true, showHotelPrices: true, showUsdEquivalent: false },
    notes: '',
    patientPhotos: [],
    replaceImplantMapWithPhotos: false,
  };
}
