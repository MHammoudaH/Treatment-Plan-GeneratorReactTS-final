import { useEffect, useMemo, useState } from 'react';
import { PLASTIC_CATEGORIES, PLASTIC_SURGERIES, recommendedNights, type PlasticSurgeryItem } from '../data/plasticSurgery';
import { galleryForItem } from '../data/plasticGallery';
import { heroImageForItem } from '../data/plasticImagery';
import { PRICING } from '../data/pricing';
import { FALLBACK_EUR_RATES, PLASTIC_CURRENCIES, fetchEurRates, type PlasticCurrency, type RatesResult } from '../lib/currencyRates';
import { QUOTATION_LANGUAGES, type QuotationLanguage } from '../lib/pdf/types';
import { generatePlasticPremiumPdf } from '../lib/pdf/plastic/generatePlasticPremiumPdf';
import { EMPTY_BMI, bmiCategory, calculateBmi, expectedWeight, fromKg, toCm, toKg, type BmiValues } from '../lib/bmi';
import { BmiCalculator } from './BmiCalculator';
import { useNavValue } from '../lib/navigation';
import { plasticItemsFromPlan, recordSaveFor, type OpenedPlan, type PlasticPlan } from '../lib/editablePlan';
import { SaveToRecordsOption } from './records/SaveToRecordsOption';
import { plasticQuoteSnapshot } from '../lib/patientRecords';
import { INITIAL_RECORD_SAVE, useRecordSaver, type RecordSaveState } from '../lib/recordSaver';
import { NumberField } from './NumberField';

interface Props {
  onBack: () => void;
  /** A saved quote re-opened from My Patients ("Open & update"). */
  opened?: OpenedPlan & { plan: PlasticPlan };
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

export function PlasticSurgeryModule({ onBack, opened }: Props) {
  const plan = opened?.plan;
  const [category, setCategory] = useState<(typeof PLASTIC_CATEGORIES)[number]>('All');
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<PlasticSurgeryItem[]>(() => (plan ? plasticItemsFromPlan(plan) : []));
  const [patientName, setPatientName] = useState(plan?.patientName ?? '');
  const [language, setLanguage] = useState<QuotationLanguage>(plan?.language ?? 'English');
  const [travelDate, setTravelDate] = useState(plan?.travelDate ?? '');
  const [coordinatorNote, setCoordinatorNote] = useState(plan?.coordinatorNote ?? '');
  const [doctorName, setDoctorName] = useState(plan?.doctorName ?? '');
  const [currency, setCurrency] = useState<PlasticCurrency>(plan?.currency ?? 'EUR');
  // Live EUR-based rates (Frankfurter → currency-api → hardcoded fallback); the hardcoded
  // rates are used until the first fetch answers, so totals are never blank.
  const [rateInfo, setRateInfo] = useState<RatesResult>({ rates: FALLBACK_EUR_RATES, source: 'fallback', date: null });
  const [hotelId, setHotelId] = useState(plan?.hotelId ?? '');
  const [hotelNights, setHotelNights] = useState(plan?.hotelNights ?? 0);
  const [nightsEdited, setNightsEdited] = useState(plan?.nightsEdited ?? false);
  const [hotelPriceOverride, setHotelPriceOverride] = useState(plan?.hotelPriceOverride ?? '');
  const [transferIncluded, setTransferIncluded] = useState(plan?.transferIncluded ?? true);
  const [packagePrice, setPackagePrice] = useState(plan?.packagePrice ?? false);
  const [manualTotal, setManualTotal] = useState(plan?.manualTotal ?? '');
  const [page, setPage] = useNavValue<1 | 2>('plasticPage', 1);
  const [submitted, setSubmitted] = useState(false);
  // Per-item final price for procedures with no catalog price (`priceEur === null`) — entered
  // directly in the quotation's selected `currency`, keyed by procedure id. Never defaults to
  // €0/$0: an unpriced item without an entry here contributes nothing to the total AND blocks
  // proposal generation (see `unpricedWithoutOverride` below).
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>(plan?.priceOverrides ?? {});
  // Patient weight/height (appointment page) → expected weight & BMI (quotation page) → PDF.
  const [bmiValues, setBmiValues] = useState<BmiValues>(plan?.bmi ?? EMPTY_BMI);
  // Coordinator's own expected weight, typed in `bmiValues.units`; '' = use the estimate.
  const [expectedWeightOverride, setExpectedWeightOverride] = useState(plan?.expectedWeightOverride ?? '');
  const [includeWeightInPdf, setIncludeWeightInPdf] = useState(plan?.includeWeightInPdf ?? true);
  const [recordSave, setRecordSave] = useState<RecordSaveState>(() => (opened ? recordSaveFor(opened) : INITIAL_RECORD_SAVE));
  const recordSaver = useRecordSaver(recordSave, setRecordSave);

  const cards = useMemo(() => {
    const list = category === 'All' ? PLASTIC_SURGERIES : PLASTIC_SURGERIES.filter((item) => item.category === category);
    const q = search.trim().toLowerCase();
    const filtered = q ? list.filter((item) => item.name.toLowerCase().includes(q)) : list;
    return filtered.map((item) => ({ item, image: heroImageForItem(item) }));
  }, [category, search]);

  const isSelected = (id: string) => selectedItems.some((item) => item.id === id);

  const weightUnit = bmiValues.units === 'metric' ? 'kg' : 'lb';
  const currentKg = toKg(Number(bmiValues.weight), bmiValues.units);
  const heightCm = toCm(Number(bmiValues.height), bmiValues.units);
  const currentBmi = calculateBmi(currentKg, heightCm, 'metric');
  const weightEstimate = expectedWeight(currentKg, heightCm, selectedItems.map((item) => item.id));
  const overrideValue = Number(expectedWeightOverride);
  const expectedKg =
    expectedWeightOverride.trim() !== '' && overrideValue > 0 ? toKg(overrideValue, bmiValues.units) : (weightEstimate?.weightKg ?? null);
  const expectedBmi = currentBmi !== null && expectedKg !== null ? calculateBmi(expectedKg, heightCm, 'metric') : null;
  const estimateProcedure = weightEstimate ? selectedItems.find((item) => item.id === weightEstimate.procedureId) : undefined;

  function changeBmi(next: BmiValues) {
    // An override typed in kg means nothing in lb — clear it when the units switch.
    if (next.units !== bmiValues.units) setExpectedWeightOverride('');
    setBmiValues(next);
  }

  useEffect(() => {
    let cancelled = false;
    fetchEurRates().then((result) => {
      if (!cancelled) setRateInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSurgery(item: PlasticSurgeryItem) {
    if (item.available === false) return; // not currently offered — never selectable
    setSelectedItems((prev) => (prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item]));
    setSubmitted(false);
  }

  function removeSurgery(id: string) {
    setSelectedItems((prev) => prev.filter((p) => p.id !== id));
  }

  /** A positive, coordinator-entered override for an unpriced item, in `currency` — or null
   *  when nothing valid has been entered yet. */
  function priceOverrideFor(itemId: string): number | null {
    const raw = priceOverrides[itemId];
    if (raw === undefined || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** True once every selected procedure has either a catalog price or a valid coordinator
   *  override — gates proposal generation so an unpriced item can never silently bill as 0. */
  const allSelectedPriced = selectedItems.every((item) => item.priceEur !== null || priceOverrideFor(item.id) !== null);

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
    const { rates } = rateInfo;
    // Hotel and transfer prices are in USD: USD → `currency` goes through the EUR base.
    const displayRate = rates[currency] / rates.USD;
    // Catalog EUR prices are converted with `rates`; a coordinator override (for an unpriced
    // item) was already typed directly in `currency`, so it is used as-is, never converted.
    const surgeryItems = selectedItems.map((item) => ({
      name: item.name,
      amount: item.priceEur !== null ? item.priceEur * rates[currency] : (priceOverrideFor(item.id) ?? 0),
    }));
    const surgeryTotal = surgeryItems.reduce((sum, s) => sum + s.amount, 0);
    // Hotels are quoted on top of the operation price(s). The coordinator can override the
    // computed hotel cost (catalog nightly rate × nights) with a negotiated figure.
    const hotelAuto = hotelPriceUsd() * displayRate;
    const hotel = hotelPriceOverride !== '' ? Math.max(0, Number(hotelPriceOverride) || 0) : hotelAuto;
    const transfer = transferIncluded ? 150 * displayRate : 0;
    const subtotal = surgeryTotal + hotel + transfer;
    const calculated = subtotal;
    // A non-empty "Final total override" wins over the calculated total — this is the number
    // that goes on the proposal.
    const finalTotal = manualTotal.trim() === '' ? calculated : Math.max(0, Number(manualTotal) || 0);
    return { surgeryItems, surgeryTotal, hotel, hotelAuto, transfer, subtotal, calculated, finalTotal };
  }

  function generateProposal() {
    if (selectedItems.length === 0 || !allSelectedPriced) return;
    const hotel = PRICING.hotels.find((item) => item.id === hotelId);
    const totals = quotationTotals();
    const total = totals.finalTotal;

    const pdfInput: Parameters<typeof generatePlasticPremiumPdf>[0] = {
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
      packagePrice,
      weight:
        includeWeightInPdf && currentBmi !== null
          ? {
              unit: weightUnit,
              current: fromKg(currentKg, bmiValues.units),
              bmi: currentBmi,
              expected: expectedKg !== null ? fromKg(expectedKg, bmiValues.units) : null,
              expectedBmi,
              // The timeframe belongs to the estimate — not shown for a coordinator's own figure.
              months: weightEstimate && expectedWeightOverride.trim() === '' ? { from: weightEstimate.monthsFrom, to: weightEstimate.monthsTo } : null,
            }
          : null,
      amounts: {
        surgeryItems: totals.surgeryItems,
        hotel: totals.hotel,
        transfer: totals.transfer,
        total,
      },
      gallery: combinedGallery(selectedItems),
    };
    generatePlasticPremiumPdf(pdfInput);
    const editablePlan: PlasticPlan = {
      module: 'plastic',
      version: 1,
      itemIds: selectedItems.map((item) => item.id),
      patientName,
      language,
      travelDate,
      coordinatorNote,
      doctorName,
      currency,
      hotelId,
      hotelNights,
      nightsEdited,
      hotelPriceOverride,
      transferIncluded,
      packagePrice,
      manualTotal,
      priceOverrides,
      bmi: bmiValues,
      expectedWeightOverride,
      includeWeightInPdf,
    };
    void recordSaver.save(patientName, plasticQuoteSnapshot(pdfInput), editablePlan);

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

      {plan?.rebuilt && (
        <p className="rule-note">Rebuilt from this patient's saved quote summary (it was saved before full plans were kept). Products, procedures, quantities, hotels and the quoted prices are filled in — please check the hotel, transfer, dates and anything else before generating.</p>
      )}
      {page === 1 ? <section className="plastic-catalog">
        <div className="plastic-toolbar">
          <div>
            <h3>Operations and prices</h3>
            <p className="hint">
              Click as many procedures as needed — they combine into one quotation. Final suitability and package details are
              confirmed by the medical team.
            </p>
          </div>
          <div className="plastic-toolbar-controls">
            <input
              type="search"
              className="plastic-search"
              aria-label="Search procedures"
              placeholder="Search procedures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select aria-label="Filter plastic surgery category" value={category} onChange={(e) => setCategory(e.target.value as (typeof PLASTIC_CATEGORIES)[number])}>
              {PLASTIC_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <p className="rule-note">
          <strong>Hotel stays are not included</strong> in the operation prices below. On the quotation step the
          coordinator selects a hotel and number of nights (and can override the hotel price) so it is added to the total.
        </p>
        <div className="plastic-grid">
          {cards.map(({ item, image }) => (
            <button
              type="button"
              className={`plastic-card${isSelected(item.id) ? ' selected' : ''}${item.available === false ? ' unavailable' : ''}`}
              key={item.id}
              disabled={item.available === false}
              onClick={() => toggleSurgery(item)}
            >
              <span className="plastic-card-media" style={{ backgroundImage: `url("${image}")` }}>
                <span className="plastic-card-price">{item.priceEur !== null ? `€${item.priceEur.toLocaleString('en-US')}` : item.available === false ? 'Not offered' : 'Price on request'}</span>
                {isSelected(item.id) && <span className="plastic-card-check">✓ Added</span>}
              </span>
              <span className="plastic-card-body">
                <span className="plastic-category">{item.category}</span>
                <strong>{item.name}</strong>
                <small>{item.stay} · Hospital: {item.hospitalStay}</small>
                {item.note && <small className="plastic-card-note">{item.note}</small>}
              </span>
            </button>
          ))}
          {cards.length === 0 && <p className="hint">No procedures match your search.</p>}
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
                  <span>{item.priceEur !== null ? `€${item.priceEur.toLocaleString('en-US')}` : 'Price set by coordinator'} · {item.stay} · {item.category}</span>
                  {item.note && <p className="plastic-note">{item.note}</p>}
                </div>
                <button type="button" className="secondary remove-item" onClick={() => removeSurgery(item.id)} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </div>
            ))}
            {selectedItems.length > 1 && (
              <div className="plastic-combined-total">
                <span>Combined surgery price{selectedItems.some((i) => i.priceEur === null) ? ' (priced items only — some prices are set by the coordinator)' : ''}</span>
                <strong>€{selectedItems.reduce((sum, i) => sum + (i.priceEur ?? 0), 0).toLocaleString('en-US')}</strong>
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
              {QUOTATION_LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <BmiCalculator value={bmiValues} onChange={changeBmi} />
        <label htmlFor="plastic-coordinator-note">Coordinator notes</label>
        <textarea id="plastic-coordinator-note" rows={3} value={coordinatorNote} onChange={(e) => setCoordinatorNote(e.target.value)} placeholder="Medical details, requested combinations, or questions for the coordinator" />
        <div className="wizard-actions">
          <button type="button" disabled={selectedItems.length === 0 || !patientName.trim()} onClick={() => setPage(2)}>Continue to quotation details</button>
        </div>
        {submitted && (
          <div className="success-note">
            <p>Request prepared for {patientName}. The coordinator will confirm the doctor name and final quotation manually.</p>
            {(recordSaver.status.kind === 'saved' || recordSaver.status.kind === 'error') && <p className="hint">{recordSaver.status.message}</p>}
            {recordSaver.status.kind === 'saving' && <p className="hint">Saving to My Patients…</p>}
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
                setPackagePrice(false);
                setManualTotal('');
                setPriceOverrides({});
                setBmiValues(EMPTY_BMI);
                setExpectedWeightOverride('');
                setIncludeWeightInPdf(true);
                setRecordSave({ enabled: recordSave.enabled, record: null });
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
                {item.priceEur !== null ? (
                  <span>Base price €{item.priceEur.toLocaleString('en-US')} · {item.stay} · {item.category}</span>
                ) : (
                  <>
                    <span>No catalog price · {item.stay} · {item.category}</span>
                    <div className="plastic-price-override">
                      <label htmlFor={`plastic-price-${item.id}`}>Final price ({currency}) — required</label>
                      <input
                        id={`plastic-price-${item.id}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={priceOverrides[item.id] ?? ''}
                        onChange={(e) => setPriceOverrides((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Enter final price"
                      />
                    </div>
                  </>
                )}
                {item.note && <p className="plastic-note">{item.note}</p>}
              </div>
            </div>
          ))}
          {!allSelectedPriced && (
            <p className="config-warning">
              One or more selected procedures have no catalog price — enter a final price above for each before generating the
              proposal.
            </p>
          )}
          <div className="grid-2">
            <div>
              <label htmlFor="plastic-currency">Quotation currency</label>
              <select id="plastic-currency" value={currency} onChange={(e) => setCurrency(e.target.value as PlasticCurrency)}>
                {PLASTIC_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <small className="hint">
                {currency === 'EUR'
                  ? 'Catalog prices are in EUR.'
                  : `1 EUR = ${rateInfo.rates[currency].toFixed(4)} ${currency}`}{' '}
                {rateInfo.source === 'fallback'
                  ? '· Live rates unavailable — using the standard fallback rates.'
                  : `· Live rate (${rateInfo.source === 'frankfurter' ? 'Frankfurter / ECB' : 'currency-api'}${rateInfo.date ? `, ${rateInfo.date}` : ''}).`}
              </small>
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
          <label className="inline-check">
            <input type="checkbox" checked={packagePrice} onChange={(e) => setPackagePrice(e.target.checked)} /> Full package price — hide the
            procedure, hotel and transfer prices in the PDF (each line shows "Included"; only the total is shown)
          </label>
          <div className="coordinator-pricing">
            <h4>Coordinator price review</h4>
            {selectedItems.length > 1 && (
              <div className="summary-row"><span>Combined surgery price ({selectedItems.length} procedures)</span><strong>{currency} {totals.surgeryTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            )}
            <div className="summary-row"><span>Surgery + hotel + transfer</span><strong>{currency} {totals.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <label htmlFor="plastic-total-override">Final total override ({currency}) — optional</label>
            <input id="plastic-total-override" type="number" min={0} step={0.01} value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} placeholder="Leave empty to use the calculated total" />
            <div className="summary-row"><span>Calculated total</span><strong>{currency} {totals.calculated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div className="summary-row summary-total">
              <span>{manualTotal.trim() === '' ? 'Final total' : 'Final total (manual override)'}</span>
              <strong>{currency} {totals.finalTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <div className="bmi-calculator">
            <h4>Weight &amp; BMI outlook</h4>
            {currentBmi === null ? (
              <p className="hint">No weight / height entered on the appointment page — go back to add them if you want this in the proposal.</p>
            ) : (
              <>
                <div className="summary-row">
                  <span>Current</span>
                  <strong>
                    {fromKg(currentKg, bmiValues.units)} {weightUnit} · BMI {currentBmi.toFixed(1)} ({bmiCategory(currentBmi)})
                  </strong>
                </div>
                {expectedKg !== null && expectedBmi !== null ? (
                  <div className="summary-row summary-total">
                    <span>Expected{weightEstimate && expectedWeightOverride.trim() === '' ? ` in ${weightEstimate.monthsFrom === weightEstimate.monthsTo ? weightEstimate.monthsFrom : `${weightEstimate.monthsFrom}–${weightEstimate.monthsTo}`} months` : ''}</span>
                    <strong>
                      {fromKg(expectedKg, bmiValues.units)} {weightUnit} · BMI {expectedBmi.toFixed(1)} ({bmiCategory(expectedBmi)})
                    </strong>
                  </div>
                ) : (
                  <p className="hint">The selected procedures reshape the body rather than reduce weight — no significant change in weight or BMI is expected. You can still enter an expected weight below.</p>
                )}
                {estimateProcedure && (
                  <small className="hint">
                    Estimate based on typical average results for {estimateProcedure.name}
                    {currentBmi < 25 && ' (little expected change — the patient is already in the healthy BMI range)'}. These are estimations — the doctor confirms them in the one-to-one consultation (this note is printed in the PDF too).
                  </small>
                )}
                <label htmlFor="plastic-expected-weight">Expected weight override ({weightUnit}) — optional</label>
                <input
                  id="plastic-expected-weight"
                  type="number"
                  min={0}
                  step={0.1}
                  value={expectedWeightOverride}
                  onChange={(e) => setExpectedWeightOverride(e.target.value)}
                  placeholder={weightEstimate ? `Estimate: ${fromKg(weightEstimate.weightKg, bmiValues.units)}` : 'Leave empty for no expected weight'}
                />
                <label className="inline-check">
                  <input type="checkbox" checked={includeWeightInPdf} onChange={(e) => setIncludeWeightInPdf(e.target.checked)} /> Include weight &amp; BMI in the PDF
                </label>
              </>
            )}
          </div>
          <label htmlFor="plastic-final-note">Final quotation notes</label>
          <textarea id="plastic-final-note" rows={3} value={coordinatorNote} onChange={(e) => setCoordinatorNote(e.target.value)} />
          <SaveToRecordsOption state={recordSave} onChange={setRecordSave} status={recordSaver.status} />
          <div className="wizard-actions">
            <button type="button" className="secondary" onClick={() => setPage(1)}>Back to appointment</button>
            <button type="button" disabled={!allSelectedPriced} onClick={generateProposal}>Generate Premium Proposal PDF</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
