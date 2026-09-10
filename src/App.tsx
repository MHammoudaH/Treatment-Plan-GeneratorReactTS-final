import './App.css';
import { useState } from 'react';
import { QuotationProvider, useQuotation } from './context/QuotationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/auth/AuthGate';
import { ZohoDealsPanel } from './components/ZohoDealsPanel';
import { Stepper } from './components/Stepper';
import { Step1Patient } from './components/steps/Step1Patient';
import { Step2Diagnosis } from './components/steps/Step2Diagnosis';
import { StepImplantMap } from './components/steps/StepImplantMap';
import { Step3Options } from './components/steps/Step3Options';
import { Step4Confirm } from './components/steps/Step4Confirm';
import { PlasticSurgeryModule } from './components/PlasticSurgeryModule';

type ClinicModule = 'dental' | 'plastic';

function AppHeader({ onChangeModule }: { onChangeModule?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="app-header">
      <img src="/assets/logo/Logo-main.png" alt="Duty Clinic" className="app-logo" />
      <div>
        <h1>DutyAI Treatment Plan Generator</h1>
        <p>Coordinator quotation &amp; treatment plan builder</p>
      </div>
      <div className="app-header-actions">
        {onChangeModule && (
          <button type="button" className="secondary change-module" onClick={onChangeModule}>
            Change module
          </button>
        )}
        {user && (
          <div className="app-user">
            <span className="app-user-email" title={user.email}>{user.name || user.email}</span>
            <button type="button" className="secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function ModuleLanding({ onChoose }: { onChoose: (module: ClinicModule) => void }) {
  return (
    <>
      <section className="module-landing wizard-step">
        <span className="eyebrow">DUTY Clinic</span>
        <h2>Choose a treatment module</h2>
        <p className="step-intro">Start with the service your patient is requesting.</p>
        <label htmlFor="clinic-module">Treatment module</label>
        <select id="clinic-module" defaultValue="" onChange={(e) => e.target.value && onChoose(e.target.value as ClinicModule)}>
          <option value="" disabled>Select dental or plastic surgery</option>
          <option value="dental">Dental treatment</option>
          <option value="plastic">Plastic surgery</option>
        </select>
        <div className="module-choice-grid">
          <button type="button" className="secondary" onClick={() => onChoose('dental')}>Open dental module</button>
          <button type="button" onClick={() => onChoose('plastic')}>Open plastic surgery module</button>
        </div>
      </section>

      <ZohoDealsPanel />
    </>
  );
}

function WizardShell({ onChangeModule }: { onChangeModule: () => void }) {
  const { state } = useQuotation();
  return (
    <div className="app-shell">
      <AppHeader onChangeModule={onChangeModule} />

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

function AppContent() {
  const [module, setModule] = useState<ClinicModule | null>(null);

  if (module === 'dental') {
    return (
      <QuotationProvider>
        <WizardShell onChangeModule={() => setModule(null)} />
      </QuotationProvider>
    );
  }

  if (module === 'plastic') {
    return (
      <QuotationProvider>
        <div className="app-shell">
          <AppHeader />
          <PlasticSurgeryModule onBack={() => setModule(null)} />
        </div>
      </QuotationProvider>
    );
  }

  return (
    <QuotationProvider>
      <div className="app-shell">
        <AppHeader />
        <ModuleLanding onChoose={setModule} />
      </div>
    </QuotationProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
