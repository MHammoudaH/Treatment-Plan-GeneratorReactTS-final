import { useState } from 'react';
import { DOCTORS, toPdfDoctor } from '../../data/doctors';
import { useQuotation } from '../../context/QuotationContext';
import { formatMoney } from '../../lib/formatMoney';
import { buildQuotationPdfData } from '../../lib/pricing/buildQuotationPdfData';
import { calculateOption } from '../../lib/pricing/engine';
import { countMarks } from '../../lib/dental/teeth';
import { generateSimpleQuotationPdf } from '../../lib/pdf/simple/generateSimpleQuotationPdf';
import { generatePremiumQuotationPdf } from '../../lib/pdf/premium/generatePremiumQuotationPdf';
import { resizeImageFiles } from '../../lib/pdf/imageUtils';

export function Step4Confirm() {
  const { state, dispatch } = useQuotation();
  const { display } = state;
  const [buildingPremium, setBuildingPremium] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const marks = countMarks(state.toothPlan);
  const hasPhotos = state.patientPhotos.length > 0;

  function handleSimplePdf() {
    const pdfData = buildQuotationPdfData(state);
    if (state.notes.trim()) pdfData.notes = state.notes.trim();
    generateSimpleQuotationPdf(pdfData);
  }

  async function handlePhotosSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = ''; // allow selecting the same file again later
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const photos = await resizeImageFiles(files);
      dispatch({ type: 'ADD_PATIENT_PHOTOS', photos });
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handlePremiumPdf() {
    const chosen = DOCTORS.filter((doctor) => selectedDoctorIds.includes(doctor.id));
    const doctors = (chosen.length > 0 ? chosen : DOCTORS).map((doctor) => toPdfDoctor(doctor, state.patient.language));
    const pdfData = buildQuotationPdfData(state);
    if (state.notes.trim()) pdfData.notes = state.notes.trim();
    if (hasPhotos) {
      pdfData.patientPhotos = state.patientPhotos;
      pdfData.replaceImplantMapWithPhotos = state.replaceImplantMapWithPhotos;
    }

    if (marks.implants || marks.crowns) {
      setBuildingPremium(true);
      try {
        // Prefer the GLB-backed snapshot (see DENTAL_MODEL_ASSET.md); while no asset exists,
        // this rejects immediately and we fall back to the existing procedural snapshot — same
        // deterministic presentation camera contract either way, never a random leftover angle.
        let image: string;
        try {
          const { renderDentalMapSnapshot } = await import('../../lib/dental/gltf/DentalMapSnapshot');
          image = await renderDentalMapSnapshot(state.toothPlan);
        } catch {
          const { renderImplantMapSnapshot } = await import('../../lib/dental/implantMapSnapshot');
          image = await renderImplantMapSnapshot(state.toothPlan);
        }
        pdfData.implantMap = { image, implants: marks.implants, crowns: marks.crowns, bridges: marks.bridges };
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

      <h3>Additional photos (Premium Proposal)</h3>
      <p className="hint">
        Upload X-rays, intraoral photos, or scans to include alongside — or in place of — the 3D implant map. Nothing is
        uploaded to a server; photos are embedded directly into the generated PDF.
      </p>
      <label htmlFor="patient-photos">Photos</label>
      <input id="patient-photos" type="file" accept="image/*" multiple onChange={handlePhotosSelected} disabled={uploadingPhotos} />
      {uploadingPhotos && <p className="hint">Processing photo(s)…</p>}

      {hasPhotos && (
        <>
          <div className="photo-thumb-grid">
            {state.patientPhotos.map((photo, index) => (
              <div className="photo-thumb" key={index}>
                <img src={photo} alt={`Upload ${index + 1}`} />
                <button type="button" className="photo-thumb-remove" onClick={() => dispatch({ type: 'REMOVE_PATIENT_PHOTO', index })} aria-label="Remove photo">
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={state.replaceImplantMapWithPhotos}
              onChange={(e) => dispatch({ type: 'SET_REPLACE_IMPLANT_MAP_WITH_PHOTOS', value: e.target.checked })}
            />
            Replace the 3D map with these photos (uncheck to show both together)
          </label>
        </>
      )}

      <h3>Notes</h3>
      <p className="hint">Printed as its own page near the end of both PDFs. Leave blank to omit.</p>
      <textarea
        rows={4}
        value={state.notes}
        onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
        placeholder="Anything else to include for the patient or the file…"
      />

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
