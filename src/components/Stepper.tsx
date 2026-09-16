import { useQuotation } from '../context/QuotationContext';

const STEPS = ['Patient', 'Diagnosis', 'Options', 'Confirmation'];

export function Stepper() {
  const { state } = useQuotation();
  return (
    <ol className="stepper">
      {STEPS.map((label, index) => (
        <li key={label} className={index === state.step ? 'active' : index < state.step ? 'done' : ''}>
          <span className="step-number">{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
