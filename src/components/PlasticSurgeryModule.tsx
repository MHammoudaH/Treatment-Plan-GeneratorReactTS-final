import { useMemo, useState } from 'react';
import { PLASTIC_CATEGORIES, PLASTIC_SURGERIES, recommendedNights, type PlasticSurgeryItem } from '../data/plasticSurgery';
import { galleryForItem } from '../data/plasticGallery';
import { heroImageForItem, stripForItem } from '../data/plasticImagery';
import { PRICING } from '../data/pricing';
import type { QuotationLanguage } from '../lib/pdf/types';
import { generatePlasticPremiumPdf } from '../lib/pdf/plastic/generatePlasticPremiumPdf';
import { NumberField } from './NumberField';

interface Props {
  onBack: () => void;
}

export function PlasticSurgeryModule({ onBack }: Props) {
  const [category, setCategory] = useState<(typeof PLASTIC_CATEGORIES)[number]>('All');
  const [selected, setSelected] = useState<PlasticSurgeryItem | null>(null);
  const [patientName, setPatientName] = useState('');
  const [language, setLanguage] = useState<QuotationLanguage>('English');
  const [travelDate, setTravelDate] = useState('');
  const [coordinatorNote, setCoordinatorNote] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'AUD'>('EUR');
  const [hotelId, setHotelId] = useState('');
  const [hotelNights, setHotelNights] = useState(0);
  const [nightsEdited, setNightsEdited] = useState(false);
  const [hotelPriceOverride, setHotelPriceOverride] = useState('');
  const [transferIncluded, setTransferIncluded] = useState(true);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [manualTotal, setManualTotal] = useState('');
  const [page, setPage] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);

  const cards = useMemo(() => {
    const list = category === 'All' ? PLASTIC_SURGERIES : PLASTIC_SURGERIES.filter((item) => item.category === category);
    return list.map((item) => ({ item, image: heroImageForItem(item) }));
  }, [category]);

  const showcase = useMemo(
    () => (selected ? { image: heroImageForItem(selected), strip: stripForItem(selected) } : null),
    [selected],
  );

  function selectSurgery(item: PlasticSurgeryItem) {
    setSelected(item);
    setSubmitted(false);
    // Pre-fill the hotel stay with the operation's recommended nights, unless the
    // coordinator has already typed their own value.
    if (!nightsEdited) setHotelNights(recommendedNights(item));
  }

  function hotelPriceUsd(): number {
    const hotel = PRICING.hotels.find((item) => item.id === hotelId);
    if (!hotel || hotelNights === 0) return 0;
    return Number(hotel.single ?? hotel.roomOptions?.[0]?.price ?? 0) * hotelNights;
  }

  function quotationTotals() {
    if (!selected) return { surgery: 0, hotel: 0, hotelAuto: 0, transfer: 0, subtotal: 0, calculated: 0, finalTotal: 0 };
    const rates = { EUR: 1, USD: 1.09, AUD: 1.67 };
    const displayRate = currency === 'EUR' ? 1 / 1.09 : rates[currency];
    const surgery = selected.priceEur * rates[currency];
    // Hotels are quoted on top of the operation price. The coordinator can override the
    // computed hotel cost (catalog nightly rate × nights) with a negotiated figure.
    const hotelAuto = hotelPriceUsd() * displayRate;
    const hotel = hotelPriceOverride !== '' ? Math.max(0, Number(hotelPriceOverride) || 0) : hotelAuto;
    const transfer = transferIncluded ? 150 * displayRate : 0;
    const subtotal = surgery + hotel + transfer;
    const calculated = subtotal * (1 + Math.max(0, markupPercent) / 100);
    // A non-empty "Final total override" wins over the markup calculation — this is the
    // number that goes on the proposal.
    const finalTotal = manualTotal.trim() === '' ? calculated : Math.max(0, Number(manualTotal) || 0);
    return { surgery, hotel, hotelAuto, transfer, subtotal, calculated, finalTotal };
  }

  function generateProposal() {
    if (!selected) return;
    const hotel = PRICING.hotels.find((item) => item.id === hotelId);
    const totals = quotationTotals();
    const total = totals.finalTotal;

    generatePlasticPremiumPdf({
      item: selected,
      patientName,
      language,
      currency,
      doctorName,
      travelDate,
      coordinatorNote,
      hotelName: hotel ? hotel.name : null,
      hotelNights: hotel ? hotelNights : 0,
      transferIncluded,
      markupPercent,
      amounts: {
        surgery: totals.surgery,
        hotel: totals.hotel,
        transfer: totals.transfer,
        markup: Math.max(0, totals.calculated - totals.subtotal),
        total,
      },
      gallery: galleryForItem(selected),
    });

    setSubmitted(true);
    setPage(1);
  }

  return (
    <main className="plastic-module">
      <section className="plastic-hero">
        <div className="plastic-hero-content">
          <span className="eyebrow">DUTY Clinic — Istanbul</span>
          <h2>Aesthetic &amp; Plastic Surgery</h2>
          <p>Browse the operation list, preview real before &amp; after results, and build a multi-page Premium Proposal in minutes.</p>
        </div>
        <button type="button" className="secondary plastic-hero-back" onClick={onBack}>Change module</button>
      </section>

      {page === 1 ? <section className="plastic-catalog">
        <div className="plastic-toolbar">
          <div>
            <h3>Operations and prices</h3>
            <p className="hint">Final suitability and package details are confirmed by the medical team.</p>
          </div>
          <select aria-label="Filter plastic surgery category" value={category} onChange={(e) => setCategory(e.target.value as (typeof PLASTIC_CATEGORIES)[number])}>
            {PLASTIC_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <p className="rule-note">
          <strong>Hotel stays are not included</strong> in the operation prices below. On the quotation step the
          coordinator selects a hotel and number of nights (and can override the hotel price) so it is added to the total.
        </p>
        <div className="plastic-grid">
          {cards.map(({ item, image }) => (
            <button type="button" className={`plastic-card${selected?.id === item.id ? ' selected' : ''}`} key={item.id} onClick={() => selectSurgery(item)}>
              <span className="plastic-card-media" style={{ backgroundImage: `url("${image}")` }}>
                <span className="plastic-card-price">€{item.priceEur.toLocaleString('en-US')}</span>
              </span>
              <span className="plastic-card-body">
                <span className="plastic-category">{item.category}</span>
                <strong>{item.name}</strong>
                <small>{item.stay} · Hospital: {item.hospitalStay}</small>
              </span>
            </button>
          ))}
        </div>
      </section> : null}

      {page === 1 ? <section className="plastic-appointment">
        <div>
          <h3>Appointment request</h3>
          <p className="step-intro">No doctor list is required here. The coordinator will assign the doctor and send the name manually after reviewing the request.</p>
        </div>
        {selected && showcase ? (
          <div className="plastic-showcase">
            <div className="plastic-showcase-media" style={{ backgroundImage: `url("${showcase.image}")` }} />
            <div className="plastic-showcase-info">
              <span className="eyebrow">Selected procedure</span>
              <h3>{selected.name}</h3>
              <p className="plastic-showcase-price">From €{selected.priceEur.toLocaleString('en-US')}</p>
              <div className="plastic-facts">
                <span>{selected.category}</span>
                <span>{selected.stay}</span>
                <span>Hospital: {selected.hospitalStay}</span>
              </div>
              {selected.note && <p className="plastic-note">{selected.note}</p>}
              {showcase.strip.length > 0 && (
                <div className="plastic-strip">
                  {showcase.strip.map((url) => (
                    <span key={url} style={{ backgroundImage: `url("${url}")` }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : <p className="rule-note">Select an operation above to start an appointment request.</p>}
        <div className="grid-2">
          <div>
            <label htmlFor="plastic-patient-name">Patient name</label>
            <input id="plastic-patient-name" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. John Smith" />
          </div>
          <div>
            <label htmlFor="plastic-travel-date">Preferred Istanbul date</label>
            <input id="plastic-travel-date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="plastic-language">Quotation language</label>
            <select id="plastic-language" value={language} onChange={(e) => setLanguage(e.target.value as QuotationLanguage)}>
              {(['English', 'Russian', 'French', 'Spanish', 'Arabic'] as QuotationLanguage[]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <label htmlFor="plastic-coordinator-note">Coordinator notes</label>
        <textarea id="plastic-coordinator-note" rows={3} value={coordinatorNote} onChange={(e) => setCoordinatorNote(e.target.value)} placeholder="Medical details, requested combinations, or questions for the coordinator" />
        <div className="wizard-actions">
          <button type="button" disabled={!selected || !patientName.trim()} onClick={() => setPage(2)}>Continue to quotation details</button>
        </div>
        {submitted && (
          <div className="success-note">
            <p>Request prepared for {patientName}. The coordinator will confirm the doctor name and final quotation manually.</p>
            <div className="wizard-actions">
              <button type="button" onClick={() => {
                setSelected(null);
                setPatientName('');
                setTravelDate('');
                setCoordinatorNote('');
                setDoctorName('');
                setHotelId('');
                setHotelNights(0);
                setNightsEdited(false);
                setHotelPriceOverride('');
                setTransferIncluded(true);
                setMarkupPercent(0);
                setManualTotal('');
                setSubmitted(false);
                setPage(1);
              }}>
                Start another request
              </button>
              <button type="button" className="secondary" onClick={onBack}>Return to module selection</button>
            </div>
          </div>
        )}
      </section> : null}

      {page === 2 && selected ? (
        <section className="plastic-appointment">
          <h3>Quotation details</h3>
          <p className="step-intro">Choose the currency and travel services to include, then generate the multi-page Premium Proposal (cover, procedure &amp; investment, before &amp; after gallery, closing). The gallery photos are auto-matched to the procedure area.</p>
          <div className="plastic-quote-banner">
            <span className="thumb" style={{ backgroundImage: `url("${showcase?.image ?? heroImageForItem(selected)}")` }} />
            <div>
              <strong>{selected.name}</strong><br />
              <span>Base price €{selected.priceEur.toLocaleString('en-US')} · {selected.stay} · {selected.category}</span>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="plastic-currency">Quotation currency</label>
              <select id="plastic-currency" value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD' | 'AUD')}>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
              </select>
            </div>
            <div>
              <label htmlFor="plastic-doctor">Doctor name (manual)</label>
              <input id="plastic-doctor" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Coordinator enters assigned doctor" />
            </div>
            <div>
              <label htmlFor="plastic-hotel">Hotel</label>
              <select id="plastic-hotel" value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
                <option value="">No hotel included</option>
                {PRICING.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="plastic-nights">Number of hotel nights</label>
              <NumberField
                id="plastic-nights"
                min={0}
                value={hotelNights}
                onChange={(n) => {
                  setNightsEdited(true);
                  setHotelNights(Math.max(0, n));
                }}
              />
              <small className="hint">
                Recommended stay for {selected.name}: {selected.stay}
                {recommendedNights(selected) > 0 ? ` (${recommendedNights(selected)} nights pre-filled — editable)` : ''}
              </small>
            </div>
            <div>
              <label htmlFor="plastic-hotel-override">Hotel price override ({currency}) — optional</label>
              <input
                id="plastic-hotel-override"
                type="number"
                min={0}
                step={0.01}
                value={hotelPriceOverride}
                onChange={(e) => setHotelPriceOverride(e.target.value)}
                placeholder={`Auto: ${quotationTotals().hotelAuto.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
              <small className="hint">Hotel is not part of the operation price. Leave empty to use catalog rate × nights.</small>
            </div>
          </div>
          <label className="inline-check"><input type="checkbox" checked={transferIncluded} onChange={(e) => setTransferIncluded(e.target.checked)} /> Include airport transfer</label>
          <div className="coordinator-pricing">
            <h4>Coordinator price review</h4>
            <div className="summary-row"><span>Surgery + hotel + transfer</span><strong>{currency} {quotationTotals().subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <label htmlFor="plastic-markup">Coordinator markup (%)</label>
            <NumberField id="plastic-markup" min={0} step={0.5} value={markupPercent} onChange={(n) => setMarkupPercent(Math.max(0, n))} />
            <label htmlFor="plastic-total-override">Final total override ({currency}) — optional</label>
            <input id="plastic-total-override" type="number" min={0} step={0.01} value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} placeholder="Leave empty to use markup calculation" />
            <div className="summary-row"><span>Calculated total (subtotal + markup)</span><strong>{currency} {quotationTotals().calculated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div className="summary-row summary-total">
              <span>{manualTotal.trim() === '' ? 'Final total' : 'Final total (manual override)'}</span>
              <strong>{currency} {quotationTotals().finalTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <label htmlFor="plastic-final-note">Final quotation notes</label>
          <textarea id="plastic-final-note" rows={3} value={coordinatorNote} onChange={(e) => setCoordinatorNote(e.target.value)} />
          <div className="wizard-actions">
            <button type="button" className="secondary" onClick={() => setPage(1)}>Back to appointment</button>
            <button type="button" onClick={generateProposal}>Generate Premium Proposal PDF</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
