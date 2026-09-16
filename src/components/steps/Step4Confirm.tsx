import { useState } from 'react';
import { DOCTORS, toPdfDoctor } from '../../data/doctors';
import { useQuotation } from '../../context/QuotationContext';
import { formatMoney } from '../../lib/formatMoney';
import { buildQuotationPdfData } from '../../lib/pricing/buildQuotationPdfData';
import { calculateOption } from '../../lib/pricing/engine';
import { generateSimpleQuotationPdf } from '../../lib/pdf/simple/generateSimpleQuotationPdf';
import { generatePremiumQuotationPdf } from '../../lib/pdf/premium/generatePremiumQuotationPdf';
import { resizeImageFiles } from '../../lib/pdf/imageUtils';

export function Step4Confirm() {
  const { state, dispatch } = useQuotation();
  const { display } = state;
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const hasPhotos = state.patientPhotos.length > 0;

  function handleSimplePdf() {
    const pdfData = buildQuotationPdfData(state);
    if (state.notes.trim()) pdfData.notes = state.notes.trim();
    generateSimpleQuotationPdf(pdfData);
  }

  async function handlePhotosSelected(e: React.ChangeEvent<HTMLInputElement>) {
    // `e.target.files` is a LIVE FileList tied to the input — resetting `e.target.value` below
    // (so the same file can be re-selected later) clears that same list's contents too, not
    // just the displayed value. Snapshotting into a plain array first, before the reset, is
    // what makes the reset safe; capturing just the FileList reference was silently losing
    // every upload (files.length back to 0 before resizeImageFiles ever ran, no error).
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // allow selecting the same file again later
    if (files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const photos = await resizeImageFiles(files);
      dispatch({ type: 'ADD_PATIENT_PHOTOS', photos });
    } finally {
      setUploadingPhotos(false);
    }
  }

  function handlePremiumPdf() {
    const chosen = DOCTORS.filter((doctor) => selectedDoctorIds.includes(doctor.id));
    const doctors = (chosen.length > 0 ? chosen : DOCTORS).map((doctor) => toPdfDoctor(doctor, state.patient.language));
    const pdfData = buildQuotationPdfData(state);
    if (state.notes.trim()) pdfData.notes = state.notes.trim();
    // No more 3D implant map — the Photos section is built entirely from whatever the
    // coordinator uploaded here; the PDF omits the section altogether when nothing was
    // uploaded (see generatePremiumQuotationPdf.ts).
    if (hasPhotos) pdfData.patientPhotos = state.patientPhotos;

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

      <h3>Photos (Premium Proposal)</h3>
      <p className="hint">
        <strong>Note for the coordinator:</strong> you may upload before &amp; after photos, X-rays, intraoral photos, or
        scans here — they'll be added as their own page in the Premium Proposal PDF. Nothing is uploaded to a server;
        photos are embedded directly into the generated PDF. Leave empty to omit this page.
      </p>
      <label htmlFor="patient-photos">Photos</label>
      <input id="patient-photos" type="file" accept="image/*" multiple onChange={handlePhotosSelected} disabled={uploadingPhotos} />
      {uploadingPhotos && <p className="hint">Processing photo(s)…</p>}

      {hasPhotos && (
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
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>
          Back
        </button>
        <button type="button" onClick={handleSimplePdf}>
          Generate Simple Quotation PDF
        </button>
        <button type="button" onClick={handlePremiumPdf}>
          Generate Premium Proposal PDF
        </button>
      </div>
    </section>
  );
}
