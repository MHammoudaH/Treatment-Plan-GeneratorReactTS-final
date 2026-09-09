import './App.css';
import { QuotationProvider, useQuotation } from './context/QuotationContext';
import { Stepper } from './components/Stepper';
import { Step1Patient } from './components/steps/Step1Patient';
import { Step2Diagnosis } from './components/steps/Step2Diagnosis';
import { StepImplantMap } from './components/steps/StepImplantMap';
import { Step3Options } from './components/steps/Step3Options';
import { Step4Confirm } from './components/steps/Step4Confirm';

function WizardShell() {
  const { state } = useQuotation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/assets/logo/Logo-main.png" alt="Duty Clinic" className="app-logo" />
        <div>
          <h1>DutyAI Treatment Plan Generator</h1>
          <p>Coordinator quotation &amp; treatment plan builder</p>
        </div>
      </header>

      <Stepper />

      <main>
        {state.step === 0 && <Step1Patient />}
        {state.step === 1 && <Step2Diagnosis />}
        {state.step === 2 && <StepImplantMap />}
        {state.step === 3 && <Step3Options />}
        {state.step === 4 && <Step4Confirm />}
      </main>
    </div>
  );
}

function App() {
  return (
    <QuotationProvider>
      <WizardShell />
    </QuotationProvider>
  );
}

export default App;
