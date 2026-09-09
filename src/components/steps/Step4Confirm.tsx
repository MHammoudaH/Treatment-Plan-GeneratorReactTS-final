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

  const selectedDoctors = DOCTORS.filter((d) => state.selectedDoctorIds.includes(d.id));
  const marks = countMarks(state.toothPlan);

  function handleSimplePdf() {
    generateSimpleQuotationPdf(buildQuotationPdfData(state));
  }

  async function handlePremiumPdf() {
    const doctors = (selectedDoctors.length > 0 ? selectedDoctors : DOCTORS).map(toPdfDoctor);
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
      <p className="step-intro">Review the quotation, choose which doctors appear on the Premium Proposal team page, then generate the patient-facing PDFs.</p>

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
          const result = calculateOption(input);
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
      <p className="hint">Leave none selected to include the full team.</p>
      <div className="doctor-picker">
        {DOCTORS.map((doctor) => (
          <label className="inline-check" key={doctor.id}>
            <input type="checkbox" checked={state.selectedDoctorIds.includes(doctor.id)} onChange={() => dispatch({ type: 'TOGGLE_DOCTOR', id: doctor.id })} />
            {doctor.name} — {doctor.specialty}
          </label>
        ))}
      </div>

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
