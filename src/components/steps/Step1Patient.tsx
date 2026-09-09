import type { QuotationLanguage } from '../../lib/pdf/types';
import { useQuotation } from '../../context/QuotationContext';

const LANGUAGES: QuotationLanguage[] = ['English', 'Russian', 'French', 'Spanish', 'Arabic'];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Russia',
  'Saudi Arabia',
  'United Arab Emirates',
  'Other',
];

export function Step1Patient() {
  const { state, dispatch } = useQuotation();
  const { patient } = state;

  const canContinue = patient.name.trim().length > 0;

  return (
    <section className="wizard-step">
      <h2>Patient information</h2>
      <p className="step-intro">Basic details for this quotation. You can always come back and edit them.</p>

      <label>Patient name</label>
      <input
        className="patient-name"
        value={patient.name}
        onChange={(e) => dispatch({ type: 'SET_PATIENT', patient: { name: e.target.value } })}
        placeholder="e.g. John Smith"
      />

      <label>Patient name (Arabic script) — optional</label>
      <input
        value={patient.arabicName}
        onChange={(e) => dispatch({ type: 'SET_PATIENT', patient: { arabicName: e.target.value } })}
        placeholder="Used on the Arabic quotation PDF, falls back to the Latin name"
        dir="rtl"
      />

      <div className="grid-2">
        <div>
          <label>Quotation language</label>
          <select value={patient.language} onChange={(e) => dispatch({ type: 'SET_PATIENT', patient: { language: e.target.value as QuotationLanguage } })}>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Patient country</label>
          <select value={patient.country} onChange={(e) => dispatch({ type: 'SET_PATIENT', patient: { country: e.target.value } })}>
            <option value="">Select country</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <small className="hint">US / Canada patients are eligible for the installment plan.</small>
        </div>
      </div>

      <div className="wizard-actions">
        <button type="button" disabled={!canContinue} onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}>
          Continue to diagnosis
        </button>
      </div>
    </section>
  );
}
