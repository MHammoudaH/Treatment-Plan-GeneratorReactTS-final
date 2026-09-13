import { useQuotation } from '../../context/QuotationContext';
import { calculateFinancing, calculateOption } from '../../lib/pricing/engine';
import { formatMoney } from '../../lib/formatMoney';
import { PRICING } from '../../data/pricing';
import { CURRENCY_META, type DisplayCurrency } from '../../types/wizard';
import { OptionCard } from './OptionCard';
import { NumberField } from '../NumberField';

const CURRENCY_CODES = Object.keys(CURRENCY_META) as DisplayCurrency[];

const PAYMENT_METHODS: { value: 'visit-payments' | 'installments'; label: string }[] = [
  { value: 'visit-payments', label: 'Pay per visit' },
  { value: 'installments', label: 'Installment plan (US / Canada)' },
];

export function Step3Options() {
  const { state, dispatch } = useQuotation();
  const { display } = state;

  return (
    <section className="wizard-step">
      <h2>Quotation options</h2>
      <p className="step-intro">Add one or more priced options for the patient to compare. Every field can be manually overridden by the coordinator.</p>

      <div className="option-toolbar">
        <div className="coordinator-control">
          <label>Display currency</label>
          <select
            value={display.currency}
            onChange={(e) => {
              const currency = e.target.value as DisplayCurrency;
              dispatch({ type: 'SET_DISPLAY', display: { currency, fxRate: CURRENCY_META[currency].defaultUsdRate } });
            }}
          >
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {CURRENCY_META[code].label}
              </option>
            ))}
          </select>
          {display.currency !== 'USD' && (
            <div className="eur-rate-wrap">
              <label>1 USD = {display.currency}</label>
              <NumberField min={0.0001} step={0.0001} value={display.fxRate} onChange={(rate) => dispatch({ type: 'SET_DISPLAY', display: { fxRate: rate } })} />
              <small>
                Used only for hotel/transfer/prosthesis (USD-only pricing) and the optional USD-equivalent line below.
                Implant, crown, bridge and procedure prices use the clinic's own {display.currency} price — never converted from USD.
              </small>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={display.showUsdEquivalent}
                  onChange={(e) => dispatch({ type: 'SET_DISPLAY', display: { showUsdEquivalent: e.target.checked } })}
                />
                Also show the USD equivalent next to each amount
              </label>
            </div>
          )}
        </div>

        <div>
          <label>Payment method</label>
          <select value={state.paymentMethod} onChange={(e) => dispatch({ type: 'SET_PAYMENT_METHOD', method: e.target.value as 'visit-payments' | 'installments' })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="coordinator-visibility">
        <strong>Patient PDF price details</strong>
        <label className="inline-check">
          <input type="checkbox" checked={display.showProductPrices} onChange={(e) => dispatch({ type: 'SET_DISPLAY', display: { showProductPrices: e.target.checked } })} />
          Show product / treatment price details
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={display.showHotelPrices} onChange={(e) => dispatch({ type: 'SET_DISPLAY', display: { showHotelPrices: e.target.checked } })} />
          Show hotel price details
        </label>
        <small className="hint">Applies to the Premium Proposal. The Simple Quotation always shows full pricing.</small>
      </div>

      <div id="quotationOptions">
        {state.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            display={display}
            removable={state.options.length > 1}
            onChange={(next) => dispatch({ type: 'UPDATE_OPTION', id: option.id, option: next })}
            onRemove={() => dispatch({ type: 'REMOVE_OPTION', id: option.id })}
          />
        ))}
      </div>

      <button type="button" className="secondary" onClick={() => dispatch({ type: 'ADD_OPTION' })}>
        + Add another option
      </button>

      {state.paymentMethod === 'installments' && (
        <div className="rule-note">
          {state.patient.country && ['United States', 'Canada'].includes(state.patient.country)
            ? 'This patient is eligible for the US / Canada installment plan — see the breakdown per option below.'
            : 'Installment plans are available only for patients from the United States or Canada.'}
        </div>
      )}

      {state.paymentMethod === 'installments' && state.patient.country && ['United States', 'Canada'].includes(state.patient.country) && (
        <>
          <div className="coordinator-control">
            <label>Approved installment amount</label>
            <NumberField
              min={0}
              max={PRICING.financing.installmentAmount}
              step={50}
              value={state.installmentAmount ?? PRICING.financing.installmentAmount}
              onChange={(amount) => dispatch({ type: 'SET_INSTALLMENT_AMOUNT', amount })}
            />
            <small className="hint">
              The clinic finances up to {formatMoney(PRICING.financing.installmentAmount, display)} — a lower amount may be
              entered when a patient's US/CA credit check approves less. The {PRICING.financing.markupPercent}% financing fee
              applies only to this amount, never to the whole treatment total.
            </small>
          </div>

          <div className="financing-summary">
            {state.options.map((input) => {
              const fxRate = display.currency === 'USD' ? 1 : display.fxRate;
              const result = calculateOption(input, display.currency, fxRate);
              const financing = calculateFinancing(result, state.patient.country, state.paymentMethod, state.installmentAmount);
              if (!financing.eligible) return null;
              return (
                <div className="financing-box" key={input.id}>
                  <h4>{input.name} — installment plan</h4>
                  <div className="summary-row">
                    <span>Financed amount</span>
                    <strong>{formatMoney(financing.installmentBase, display)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Installment (incl. {PRICING.financing.markupPercent}% fee)</span>
                    <strong>{formatMoney(financing.installment, display)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Maximum term</span>
                    <strong>{financing.maximumTermMonths} months</strong>
                  </div>
                  <div className="summary-row">
                    <span>Remaining cash</span>
                    <strong>{formatMoney(financing.cashRemaining, display)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Cash per visit</span>
                    <strong>{formatMoney(financing.cashPerVisit, display)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total (installment + cash)</span>
                    <strong>{formatMoney(financing.financedPackage, display)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>
          Back
        </button>
        <button type="button" disabled={state.options.length === 0} onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}>
          Continue to confirmation
        </button>
      </div>
    </section>
  );
}
