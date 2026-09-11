import { useState } from 'react';
import { DOCTORS, toPdfDoctor } from '../../data/doctors';
import { useQuotation } from '../../context/QuotationContext';
import { formatMoney } from '../../lib/formatMoney';
import { buildQuotationPdfData } from '../../lib/pricing/buildQuotationPdfData';
import { calculateOption } from '../../lib/pricing/engine';
import { countMarks } from '../../lib/dental/teeth';
import { generateSimpleQuotationPdf } from '../../lib/pdf/simple/generateSimpleQuotationPdf';
import { generatePremiumQuotationPdf } from '../../lib/pdf/premium/generatePremiumQuotationPdf';

export function Step4Confirm() {
  const { state, dispatch } = useQuotation();
  const { display } = state;
  const [buildingPremium, setBuildingPremium] = useState(false);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const marks = countMarks(state.toothPlan);

  function handleSimplePdf() {
    generateSimpleQuotationPdf(buildQuotationPdfData(state));
  }

  async function handlePremiumPdf() {
    const chosen = DOCTORS.filter((doctor) => selectedDoctorIds.includes(doctor.id));
    const doctors = (chosen.length > 0 ? chosen : DOCTORS).map(toPdfDoctor);
    const pdfData = buildQuotationPdfData(state);

    if (marks.implants || marks.crowns) {
      setBuildingPremium(true);
      try {
        const { renderImplantMapSnapshot } = await import('../../lib/dental/implantMapSnapshot');
        const image = await renderImplantMapSnapshot(state.toothPlan);
        pdfData.implantMap = { image, implants: marks.implants, crowns: marks.crowns };
      } catch {
        // Snapshot failed (e.g. no WebGL) — issue the proposal without the implant map.
      } finally {
        setBuildingPremium(false);
      }
    }

    generatePremiumQuotationPdf(pdfData, doctors);
  }

  return (
    <section className="wizard-step">
      <h2>Confirmation</h2>
      <p className="step-intro">Review the quotation, choose the doctors for the Premium Proposal team page, then generate the patient-facing PDFs.</p>

      <div className="confirmation-summary">
        <div className="summary-row">
          <span>Patient</span>
          <strong>{state.patient.name}</strong>
        </div>
        <div className="summary-row">
          <span>Language</span>
          <strong>{state.patient.language}</strong>
        </div>
        <div className="summary-row">
          <span>Country</span>
          <strong>{state.patient.country || '—'}</strong>
        </div>

        {state.options.map((input) => {
          const fxRate = display.currency === 'USD' ? 1 : display.fxRate;
          const result = calculateOption(input, display.currency, fxRate);
          return (
            <div className="quotation-summary-option" key={input.id}>
              <h3>{input.name}</h3>
              <div className="summary-row">
                <span>Option total</span>
                <strong>{formatMoney(result.totals.total, display)}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <h3>Doctor team (Premium Proposal)</h3>
      <p className="hint">Pick the doctor(s) to feature on the team page — each option shows the name and specialty. Hold Ctrl (Cmd on Mac) to select more than one; leave none selected to include the full team.</p>
      <label htmlFor="doctor-select">Doctors</label>
      <select
        id="doctor-select"
        multiple
        size={DOCTORS.length}
        value={selectedDoctorIds.map(String)}
        onChange={(e) => setSelectedDoctorIds(Array.from(e.target.selectedOptions, (option) => Number(option.value)))}
      >
        {DOCTORS.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name} — {doctor.specialty}
          </option>
        ))}
      </select>

      <h3>Implant map</h3>
      <p className="hint">
        {marks.implants || marks.crowns
          ? `${marks.implants} implant(s) and ${marks.crowns} crown(s) planned — a 3D snapshot is added to the Premium Proposal.`
          : 'No teeth marked on the implant map — the Premium Proposal will omit the 3D map.'}
      </p>

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}>
          Back
        </button>
        <button type="button" onClick={handleSimplePdf}>
          Generate Simple Quotation PDF
        </button>
        <button type="button" disabled={buildingPremium} onClick={handlePremiumPdf}>
          {buildingPremium ? 'Rendering implant map…' : 'Generate Premium Proposal PDF'}
        </button>
      </div>
    </section>
  );
}
