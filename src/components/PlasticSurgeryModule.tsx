import { useEffect, useMemo, useState } from 'react';
import { PLASTIC_CATEGORIES, PLASTIC_SURGERIES, recommendedNights, type PlasticSurgeryItem } from '../data/plasticSurgery';
import { galleryForItem } from '../data/plasticGallery';
import { heroImageForItem } from '../data/plasticImagery';
import { PRICING } from '../data/pricing';
import type { QuotationLanguage } from '../lib/pdf/types';
import { generatePlasticPremiumPdf } from '../lib/pdf/plastic/generatePlasticPremiumPdf';
import { NumberField } from './NumberField';

interface Props {
  onBack: () => void;
}

/** Combined gallery for several procedures — a few images per procedure rather than every
 *  image from every one, so a patient combining 4-5 procedures doesn't get a 40-image page.
 *  Falls back to each procedure's hero image when it has no dedicated gallery at all. */
function combinedGallery(items: PlasticSurgeryItem[]): string[] {
  const perItem = items.length <= 2 ? 6 : items.length <= 4 ? 3 : 2;
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of items) {
    const own = galleryForItem(item);
    const slice = (own.length ? own : [heroImageForItem(item)]).slice(0, perItem);
    for (const url of slice) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

export function PlasticSurgeryModule({ onBack }: Props) {
  const [category, setCategory] = useState<(typeof PLASTIC_CATEGORIES)[number]>('All');
  const [selectedItems, setSelectedItems] = useState<PlasticSurgeryItem[]>([]);
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

  const isSelected = (id: string) => selectedItems.some((item) => item.id === id);

  function toggleSurgery(item: PlasticSurgeryItem) {
    setSelectedItems((prev) => (prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item]));
    setSubmitted(false);
  }

  function removeSurgery(id: string) {
    setSelectedItems((prev) => prev.filter((p) => p.id !== id));
  }

  // Pre-fill the hotel stay with the LONGEST recommended stay across every selected
  // procedure (the patient needs to be in Istanbul for however long the slowest-recovery one
  // takes), unless the coordinator has already typed their own value.
  useEffect(() => {
    if (nightsEdited) return;
    const longest = selectedItems.reduce((max, item) => Math.max(max, recommendedNights(item)), 0);
    setHotelNights(longest);
  }, [selectedItems, nightsEdited]);

  function hotelPriceUsd(): number {
    const hotel = PRICING.hotels.find((item) => item.id === hotelId);
    if (!hotel || hotelNights === 0) return 0;
    return Number(hotel.single ?? hotel.roomOptions?.[0]?.price ?? 0) * hotelNights;
  }

  function quotationTotals() {
    const rates = { EUR: 1, USD: 1.09, AUD: 1.67 };
    const displayRate = currency === 'EUR' ? 1 / 1.09 : rates[currency];
    const surgeryItems = selectedItems.map((item) => ({ name: item.name, amount: item.priceEur * rates[currency] }));
    const surgeryTotal = surgeryItems.reduce((sum, s) => sum + s.amount, 0);
    // Hotels are quoted on top of the operation price(s). The coordinator can override the
    // computed hotel cost (catalog nightly rate × nights) with a negotiated figure.
    const hotelAuto = hotelPriceUsd() * displayRate;
    const hotel = hotelPriceOverride !== '' ? Math.max(0, Number(hotelPriceOverride) || 0) : hotelAuto;
    const transfer = transferIncluded ? 150 * displayRate : 0;
    const subtotal = surgeryTotal + hotel + transfer;
    const calculated = subtotal * (1 + Math.max(0, markupPercent) / 100);
    // A non-empty "Final total override" wins over the markup calculation — this is the
    // number that goes on the proposal.
    const finalTotal = manualTotal.trim() === '' ? calculated : Math.max(0, Number(manualTotal) || 0);
    return { surgeryItems, surgeryTotal, hotel, hotelAuto, transfer, subtotal, calculated, finalTotal };
  }

  function generateProposal() {
    if (selectedItems.length === 0) return;
    const hotel = PRICING.hotels.find((item) => item.id === hotelId);
    const totals = quotationTotals();
    const total = totals.finalTotal;

    generatePlasticPremiumPdf({
      items: selectedItems,
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
        surgeryItems: totals.surgeryItems,
        hotel: totals.hotel,
        transfer: totals.transfer,
        markup: Math.max(0, totals.calculated - totals.subtotal),
        total,
      },
      gallery: combinedGallery(selectedItems),
    });

    setSubmitted(true);
    setPage(1);
  }

  const totals = quotationTotals();
  const longestRecommendedNights = selectedItems.reduce((max, item) => Math.max(max, recommendedNights(item)), 0);

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
            <p className="hint">
              Click as many procedures as needed — they combine into one quotation. Final suitability and package details are
              confirmed by the medical team.
            </p>
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
            <button type="button" className={`plastic-card${isSelected(item.id) ? ' selected' : ''}`} key={item.id} onClick={() => toggleSurgery(item)}>
              <span className="plastic-card-media" style={{ backgroundImage: `url("${image}")` }}>
                <span className="plastic-card-price">€{item.priceEur.toLocaleString('en-US')}</span>
                {isSelected(item.id) && <span className="plastic-card-check">✓ Added</span>}
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
        {selectedItems.length > 0 ? (
          <div className="plastic-selected-list">
            <span className="eyebrow">Selected procedures ({selectedItems.length})</span>
            {selectedItems.map((item) => (
              <div className="plastic-quote-banner" key={item.id}>
                <span className="thumb" style={{ backgroundImage: `url("${heroImageForItem(item)}")` }} />
                <div className="plastic-quote-banner-info">
                  <strong>{item.name}</strong><br />
                  <span>€{item.priceEur.toLocaleString('en-US')} · {item.stay} · {item.category}</span>
                  {item.note && <p className="plastic-note">{item.note}</p>}
                </div>
                <button type="button" className="secondary remove-item" onClick={() => removeSurgery(item.id)} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </div>
            ))}
            {selectedItems.length > 1 && (
              <div className="plastic-combined-total">
                <span>Combined surgery price</span>
                <strong>€{selectedItems.reduce((sum, i) => sum + i.priceEur, 0).toLocaleString('en-US')}</strong>
              </div>
            )}
          </div>
        ) : <p className="rule-note">Select one or more operations above to start an appointment request.</p>}
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
          <button type="button" disabled={selectedItems.length === 0 || !patientName.trim()} onClick={() => setPage(2)}>Continue to quotation details</button>
        </div>
        {submitted && (
          <div className="success-note">
            <p>Request prepared for {patientName}. The coordinator will confirm the doctor name and final quotation manually.</p>
            <div className="wizard-actions">
              <button type="button" onClick={() => {
                setSelectedItems([]);
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

      {page === 2 && selectedItems.length > 0 ? (
        <section className="plastic-appointment">
          <h3>Quotation details</h3>
          <p className="step-intro">Choose the currency and travel services to include, then generate the multi-page Premium Proposal (cover, procedures &amp; investment, before &amp; after gallery, closing). The gallery photos are auto-matched to each procedure's area.</p>
          {selectedItems.map((item) => (
            <div className="plastic-quote-banner" key={item.id}>
              <span className="thumb" style={{ backgroundImage: `url("${heroImageForItem(item)}")` }} />
              <div>
                <strong>{item.name}</strong><br />
                <span>Base price €{item.priceEur.toLocaleString('en-US')} · {item.stay} · {item.category}</span>
              </div>
            </div>
          ))}
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
                Recommended stay (longest of the {selectedItems.length > 1 ? 'selected procedures' : 'selected procedure'}):{' '}
                {longestRecommendedNights > 0 ? `${longestRecommendedNights} nights pre-filled — editable` : 'not specified'}
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
                placeholder={`Auto: ${totals.hotelAuto.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
              <small className="hint">Hotel is not part of the operation price(s). Leave empty to use catalog rate × nights.</small>
            </div>
          </div>
          <label className="inline-check"><input type="checkbox" checked={transferIncluded} onChange={(e) => setTransferIncluded(e.target.checked)} /> Include airport transfer</label>
          <div className="coordinator-pricing">
            <h4>Coordinator price review</h4>
            {selectedItems.length > 1 && (
              <div className="summary-row"><span>Combined surgery price ({selectedItems.length} procedures)</span><strong>{currency} {totals.surgeryTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            )}
            <div className="summary-row"><span>Surgery + hotel + transfer</span><strong>{currency} {totals.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <label htmlFor="plastic-markup">Coordinator markup (%)</label>
            <NumberField id="plastic-markup" min={0} step={0.5} value={markupPercent} onChange={(n) => setMarkupPercent(Math.max(0, n))} />
            <label htmlFor="plastic-total-override">Final total override ({currency}) — optional</label>
            <input id="plastic-total-override" type="number" min={0} step={0.01} value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} placeholder="Leave empty to use markup calculation" />
            <div className="summary-row"><span>Calculated total (subtotal + markup)</span><strong>{currency} {totals.calculated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div className="summary-row summary-total">
              <span>{manualTotal.trim() === '' ? 'Final total' : 'Final total (manual override)'}</span>
              <strong>{currency} {totals.finalTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
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
