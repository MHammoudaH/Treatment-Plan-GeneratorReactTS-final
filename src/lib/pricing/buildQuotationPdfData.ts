/**
 * Assembles a full `QuotationPdfData` object (the shared input contract for both PDF
 * generators) from the wizard's state. Legacy equivalent: `buildQuotationData()`
 * (quotation-data.js) as enriched by `coordinator-updates.js`'s `display` block.
 */

import { PRICING } from '../../data/pricing';
import type { QuotationPdfData } from '../pdf/types';
import type { WizardState } from '../../types/wizard';
import { calculateFinancing, calculateOption } from './engine';

export function buildQuotationPdfData(state: WizardState): QuotationPdfData {
  const fxRate = state.display.currency === 'USD' ? 1 : state.display.fxRate;
  const options = state.options.map((option) => calculateOption(option, state.display.currency, fxRate));

  const installmentEligible =
    state.paymentMethod === 'installments' && PRICING.financing.eligibleCountries.includes(state.patient.country);

  // Financing terms are the same for every option's markup%, so surface them once at the
  // quotation level using the first option (legacy showed a financing box per-option; this
  // keeps the same numbers, just summarized once for the payment step). Fully pre-computed
  // here (the pricing engine, the one authoritative place this formula lives) — the PDF
  // generators only print these fields, they never re-derive the markup/cap math themselves.
  const financing =
    installmentEligible && options[0]
      ? calculateFinancing(options[0], state.patient.country, state.paymentMethod, state.installmentAmount)
      : null;

  return {
    generatedAt: new Date().toISOString(),
    patient: {
      name: state.patient.name,
      arabicName: state.patient.arabicName || state.patient.name,
      country: state.patient.country,
      language: state.patient.language,
      diagnosis: state.diagnosis.editedText || state.diagnosis.rawText,
      treatmentData: state.diagnosis.parsed,
    },
    payment: {
      method: state.paymentMethod,
      installmentEligible,
      financing: financing
        ? {
            markupPercent: PRICING.financing.markupPercent,
            installmentBase: financing.installmentBase,
            installmentAmount: financing.installment,
            financedPackage: financing.financedPackage,
            cashRemaining: financing.cashRemaining,
            cashPerVisit: financing.cashPerVisit,
            maximumTermMonths: PRICING.financing.maximumTermMonths,
          }
        : null,
    },
    options,
    display: {
      currency: state.display.currency,
      usdToCurrencyRate: state.display.currency === 'USD' ? 1 : state.display.fxRate,
      showProductPrices: state.display.showProductPrices,
      showHotelPrices: state.display.showHotelPrices,
      showUsdEquivalent: state.display.showUsdEquivalent,
    },
  };
}
