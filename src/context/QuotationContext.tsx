import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { cloneOptionForNewOption, createOptionInput, type OptionInput } from '../lib/pricing/engine';
import { countMarks, cycleMark, suggestPlan } from '../lib/dental/teeth';
import { createInitialState, type DiagnosisInfo, type DisplaySettings, type PatientInfo, type PaymentMethod, type WizardState } from '../types/wizard';

type Action =
  | { type: 'SET_STEP'; step: WizardState['step'] }
  | { type: 'SET_PATIENT'; patient: Partial<PatientInfo> }
  | { type: 'SET_DIAGNOSIS'; diagnosis: Partial<DiagnosisInfo> }
  | { type: 'CYCLE_TOOTH'; fdi: number }
  | { type: 'CLEAR_TEETH' }
  | { type: 'SUGGEST_TEETH_FROM_DIAGNOSIS' }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_INSTALLMENT_AMOUNT'; amount: number | null }
  | { type: 'SET_DISPLAY'; display: Partial<DisplaySettings> }
  | { type: 'ADD_OPTION' }
  | { type: 'PREFILL_OPTIONS_FROM_DIAGNOSIS' }
  | { type: 'REMOVE_OPTION'; id: string }
  | { type: 'UPDATE_OPTION'; id: string; option: OptionInput }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'ADD_PATIENT_PHOTOS'; photos: string[] }
  | { type: 'REMOVE_PATIENT_PHOTO'; index: number }
  | { type: 'SET_REPLACE_IMPLANT_MAP_WITH_PHOTOS'; value: boolean }
  | { type: 'RESET' };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_PATIENT':
      return { ...state, patient: { ...state.patient, ...action.patient } };
    case 'SET_DIAGNOSIS':
      return { ...state, diagnosis: { ...state.diagnosis, ...action.diagnosis } };
    case 'CYCLE_TOOTH': {
      const next = cycleMark(state.toothPlan[action.fdi]);
      const toothPlan = { ...state.toothPlan };
      if (next === null) delete toothPlan[action.fdi];
      else toothPlan[action.fdi] = next;
      return { ...state, toothPlan };
    }
    case 'CLEAR_TEETH':
      return { ...state, toothPlan: {} };
    case 'SUGGEST_TEETH_FROM_DIAGNOSIS': {
      const parsed = state.diagnosis.parsed;
      if (!parsed) return state;
      return {
        ...state,
        toothPlan: suggestPlan({
          upperImplants: parsed.upperImplants,
          lowerImplants: parsed.lowerImplantsMin,
          crowns: parsed.crowns,
        }),
      };
    }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method };
    case 'SET_INSTALLMENT_AMOUNT':
      return { ...state, installmentAmount: action.amount };
    case 'SET_DISPLAY':
      return { ...state, display: { ...state.display, ...action.display } };
    case 'ADD_OPTION': {
      const nextNumber = state.options.length + 1;
      const id = `option-${Date.now()}-${nextNumber}`;
      const name = `Option ${nextNumber}`;
      // Once at least one option exists, the next one starts as a brand/price variant of the
      // LAST one — same quantities/hotel/nights/transfer, blank brand choices and overrides —
      // rather than a fully blank template. See cloneOptionForNewOption's own doc comment.
      const lastOption = state.options[state.options.length - 1];
      const option = lastOption ? cloneOptionForNewOption(lastOption, id, name) : createOptionInput(id, name);
      return { ...state, options: [...state.options, option] };
    }
    case 'PREFILL_OPTIONS_FROM_DIAGNOSIS': {
      // Ensure Option 1 exists, then seed its implant/crown counts. The tooth map wins when
      // the coordinator has planted teeth on it; otherwise fall back to the parsed diagnosis
      // (lower-jaw range → its lower bound). Every count stays editable on the options step.
      const options = state.options.length ? state.options : [createOptionInput(`option-${Date.now()}-1`, 'Option 1')];
      const planted = countMarks(state.toothPlan);
      const parsed = state.diagnosis.parsed;
      if (!parsed && !planted.implants && !planted.crowns) return state.options.length ? state : { ...state, options };

      const implantCount = planted.implants || (parsed ? (parsed.upperImplants ?? 0) + (parsed.lowerImplantsMin ?? 0) : 0);
      const crownCount = planted.crowns || (parsed ? parsed.crowns ?? 0 : 0);
      const [first, ...rest] = options;
      const seeded: OptionInput = {
        ...first,
        implant: { ...first.implant, count: implantCount || first.implant.count },
        crown: { ...first.crown, count: crownCount || first.crown.count },
      };
      return { ...state, options: [seeded, ...rest] };
    }
    case 'REMOVE_OPTION': {
      const options = state.options.filter((option) => option.id !== action.id);
      return { ...state, options: renumber(options) };
    }
    case 'UPDATE_OPTION':
      return { ...state, options: state.options.map((option) => (option.id === action.id ? action.option : option)) };
    case 'SET_NOTES':
      return { ...state, notes: action.notes };
    case 'ADD_PATIENT_PHOTOS':
      return { ...state, patientPhotos: [...state.patientPhotos, ...action.photos] };
    case 'REMOVE_PATIENT_PHOTO':
      return { ...state, patientPhotos: state.patientPhotos.filter((_, i) => i !== action.index) };
    case 'SET_REPLACE_IMPLANT_MAP_WITH_PHOTOS':
      return { ...state, replaceImplantMapWithPhotos: action.value };
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}

function renumber(options: OptionInput[]): OptionInput[] {
  return options.map((option, index) => {
    const defaultName = /^Option \d+$/.test(option.name);
    return defaultName ? { ...option, name: `Option ${index + 1}` } : option;
  });
}

interface QuotationContextValue {
  state: WizardState;
  dispatch: Dispatch<Action>;
}

const QuotationContext = createContext<QuotationContextValue | null>(null);

export function QuotationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
}

export function useQuotation(): QuotationContextValue {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error('useQuotation must be used within a QuotationProvider');
  return ctx;
}
