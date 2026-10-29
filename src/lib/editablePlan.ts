/**
 * "Open & update" — the editable plan saved with each quote in My Patients, and how it is
 * turned back into a pre-filled dental wizard / plastic module.
 *
 * Uploaded photos are deliberately not part of a plan (they never leave the coordinator's
 * browser); everything needed to regenerate the same quotation is.
 */
import { PLASTIC_SURGERIES, type PlasticSurgeryItem } from '../data/plasticSurgery';
import { createInitialState, type WizardState } from '../types/wizard';
import type { QuoteSnapshot } from './api';
import type { BmiValues } from './bmi';
import type { PlasticCurrency } from './currencyRates';
import type { QuotationLanguage } from './pdf/types';
import { createOptionInput } from './pricing/engine';
import type { RecordSaveState } from './recordSaver';

export interface DentalPlan {
  module: 'dental';
  version: 1;
  /** Rebuilt from an older quote's text summary (see rebuildPlan.ts) — the coordinator checks it. */
  rebuilt?: boolean;
  patient: WizardState['patient'];
  diagnosis: WizardState['diagnosis'];
  toothPlan: WizardState['toothPlan'];
  paymentMethod: WizardState['paymentMethod'];
  installmentAmount: WizardState['installmentAmount'];
  options: WizardState['options'];
  display: WizardState['display'];
  notes: string;
}

export interface PlasticPlan {
  module: 'plastic';
  version: 1;
  /** Rebuilt from an older quote's text summary (see rebuildPlan.ts) — the coordinator checks it. */
  rebuilt?: boolean;
  itemIds: string[];
  patientName: string;
  language: QuotationLanguage;
  travelDate: string;
  coordinatorNote: string;
  doctorName: string;
  currency: PlasticCurrency;
  hotelId: string;
  hotelNights: number;
  nightsEdited: boolean;
  hotelPriceOverride: string;
  transferIncluded: boolean;
  packagePrice: boolean;
  manualTotal: string;
  priceOverrides: Record<string, string>;
  bmi: BmiValues;
  expectedWeightOverride: string;
  includeWeightInPdf: boolean;
}

export type EditablePlan = DentalPlan | PlasticPlan;

/** A saved quote opened for updating: which record it belongs to, and its plan. */
export interface OpenedPlan {
  recordId: number;
  patientName: string;
  quote: QuoteSnapshot;
  plan: EditablePlan;
}

export function dentalPlanFromState(state: WizardState): DentalPlan {
  return {
    module: 'dental',
    version: 1,
    patient: state.patient,
    diagnosis: state.diagnosis,
    toothPlan: state.toothPlan,
    paymentMethod: state.paymentMethod,
    installmentAmount: state.installmentAmount,
    options: state.options,
    display: state.display,
    notes: state.notes,
  };
}

/** The record an opened plan saves back to — kept even if the patient's name is corrected. */
export function recordSaveFor(opened: OpenedPlan): RecordSaveState {
  return { enabled: true, record: { id: opened.recordId, patientName: opened.patientName, lastQuote: opened.quote, pinned: true } };
}

/**
 * A dental wizard pre-filled from a saved plan, opened on the Options step. The exchange rate
 * the quote was priced at is kept (marked as typed), so prices don't silently move with today's
 * live rate — the coordinator can switch back to the live rate with one click.
 */
export function wizardStateFromPlan(opened: OpenedPlan & { plan: DentalPlan }): WizardState {
  const { plan } = opened;
  const initial = createInitialState();
  return {
    ...initial,
    step: plan.options.length > 0 ? 2 : 0,
    patient: { ...initial.patient, ...plan.patient },
    diagnosis: { ...initial.diagnosis, ...plan.diagnosis },
    toothPlan: plan.toothPlan ?? {},
    paymentMethod: plan.paymentMethod ?? initial.paymentMethod,
    installmentAmount: plan.installmentAmount ?? null,
    // Fill any field a newer app version added since the plan was saved.
    options: (plan.options ?? []).map((option) => ({ ...createOptionInput(option.id, option.name), ...option })),
    // A rebuilt plan never knew its rate: let today's live rate fill it in.
    display: { ...initial.display, ...plan.display, fxRateEdited: !plan.rebuilt && (plan.display?.currency ?? 'USD') !== 'USD' },
    notes: plan.notes ?? '',
    recordSave: recordSaveFor(opened),
    rebuiltFromSummary: plan.rebuilt === true,
  };
}

/** The plastic procedures of a saved plan, in their original order (unknown ids dropped). */
export function plasticItemsFromPlan(plan: PlasticPlan): PlasticSurgeryItem[] {
  return plan.itemIds
    .map((id) => PLASTIC_SURGERIES.find((item) => item.id === id))
    .filter((item): item is PlasticSurgeryItem => item !== undefined && item.available !== false);
}
