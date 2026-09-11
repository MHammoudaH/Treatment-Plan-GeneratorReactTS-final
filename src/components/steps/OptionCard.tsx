import { useMemo } from 'react';
import { PRICING, markupPresetsForPrice, priceFor, type Currency, type PriceValue } from '../../data/pricing';
import { formatMoney } from '../../lib/formatMoney';
import {
  ALL_ON_N_OPTIONS,
  calculateOption,
  createAllOnXConfig,
  deriveAllOnXCounts,
  emptyVisitInput,
  type AllOnN,
  type AllOnXConfig,
  type DentalArch,
  type DentalTreatmentType,
  type HotelSelection,
  type OptionInput,
  type ProcedureSelection,
  type ServiceSelection,
  type VisitInput,
} from '../../lib/pricing/engine';
import type { QuotationVisit } from '../../lib/pdf/types';
import type { DisplaySettings } from '../../types/wizard';
import { NumberField } from '../NumberField';

interface Props {
  option: OptionInput;
  onChange: (next: OptionInput) => void;
  onRemove: () => void;
  display: DisplaySettings;
  removable: boolean;
}

function overrideFromInput(value: string): number | null {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const DEFAULT_BRIDGE_ID = PRICING.bridges[0]?.id ?? null;

export function OptionCard({ option, onChange, onRemove, display, removable }: Props) {
  const fxRate = display.currency === 'USD' ? 1 : display.fxRate;
  const result = useMemo(() => calculateOption(option, display.currency, fxRate), [option, display.currency, fxRate]);
  const implantCatalog = PRICING.implants.find((i) => i.id === option.implant.itemId) ?? null;
  const crownCatalog = PRICING.crowns.find((c) => c.id === option.crown.itemId) ?? null;

  function patch(partial: Partial<OptionInput>) {
    onChange({ ...option, ...partial });
  }

  function patchVisit1(partial: Partial<VisitInput>) {
    patch({ visit1: { ...option.visit1, ...partial } });
  }

  function patchVisit2(partial: Partial<VisitInput>) {
    if (!option.visit2) return;
    patch({ visit2: { ...option.visit2, ...partial } });
  }

  function toggleProcedure(procedureId: string, checked: boolean) {
    if (checked) {
      const next: ProcedureSelection = { procedureId, quantity: 1, finalUnitPriceOverride: null };
      patch({ procedures: [...option.procedures, next] });
    } else {
      patch({ procedures: option.procedures.filter((p) => p.procedureId !== procedureId) });
    }
  }

  function updateProcedure(procedureId: string, partial: Partial<ProcedureSelection>) {
    patch({ procedures: option.procedures.map((p) => (p.procedureId === procedureId ? { ...p, ...partial } : p)) });
  }

  const money = (value: number) => formatMoney(value, display);
  const priceLabel = (price: PriceValue) => {
    const v = priceFor(price, display.currency);
    return v === null ? `${display.currency} price not configured` : money(v);
  };

  // --- All-on-X: derives implant/crown/bridge counts from the confirmed clinical
  // configuration. This never decides clinical suitability — it only turns the
  // doctor-confirmed arch/All-on-N choice into a priced quotation (see engine.ts). ---
  function applyAllOnX(nextConfig: AllOnXConfig) {
    const derived = deriveAllOnXCounts(nextConfig);
    patch({
      allOnX: nextConfig,
      implant: { ...option.implant, count: derived.implants },
      crown: { ...option.crown, count: derived.crowns },
      bridge: { ...option.bridge, itemId: option.bridge.itemId ?? DEFAULT_BRIDGE_ID, count: derived.bridges },
    });
  }

  function setDentalTreatmentType(type: DentalTreatmentType) {
    if (type === 'all-on-x') {
      const config = option.allOnX ?? createAllOnXConfig();
      patch({ dentalTreatmentType: type });
      applyAllOnX(config);
    } else {
      patch({ dentalTreatmentType: type, allOnX: null });
    }
  }

  const isAllOnX = option.dentalTreatmentType === 'all-on-x';

  return (
    <article className="quotation-option">
      <div className="option-header">
        <input className="option-name" value={option.name} onChange={(e) => patch({ name: e.target.value })} />
        {removable && (
          <button type="button" className="secondary remove-option" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      {/* TREATMENT TYPE */}
      <h4>Dental treatment type</h4>
      <label>Treatment type</label>
      <select value={option.dentalTreatmentType} onChange={(e) => setDentalTreatmentType(e.target.value as DentalTreatmentType)}>
        <option value="individual">Individual procedures</option>
        <option value="all-on-x">All-on-X (full-arch fixed bridge)</option>
      </select>
      <small className="hint">
        Select the configuration the doctor has clinically confirmed. This only turns it into a priced quotation — it is not a
        clinical recommendation.
      </small>

      {isAllOnX && option.allOnX && (
        <AllOnXFields config={option.allOnX} onChange={applyAllOnX} />
      )}

      <div className="grid-2">
        {/* IMPLANTS */}
        <div>
          <h4>Implants</h4>
          <label>Total implants{isAllOnX ? ' (auto-calculated from All-on-X)' : ''}</label>
          <NumberField
            min={0}
            value={option.implant.count}
            disabled={isAllOnX}
            onChange={(n) => patch({ implant: { ...option.implant, count: Math.max(0, n) } })}
          />

          <label>Implant system</label>
          <select value={option.implant.itemId ?? ''} onChange={(e) => patch({ implant: { ...option.implant, itemId: e.target.value || null } })}>
            <option value="">Select implant</option>
            {PRICING.implants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName ?? item.name} — {priceLabel(item.price)}
              </option>
            ))}
          </select>
          {implantCatalog && priceFor(implantCatalog.price, display.currency) === null && option.implant.finalUnitPriceOverride === null && (
            <p className="config-warning">
              {display.currency} price not configured for {implantCatalog.displayName ?? implantCatalog.name}. Enter a final unit
              price override below, or configure the {display.currency} price in the pricing catalog.
            </p>
          )}

          <label>Implant markup</label>
          <div className="percentage-input">
            <select
              value={option.implant.markupPercent}
              disabled={option.implant.finalUnitPriceOverride !== null}
              onChange={(e) => patch({ implant: { ...option.implant, markupPercent: Number(e.target.value) } })}
            >
              {markupPresetsForPrice(priceFor(implantCatalog?.price ?? { usd: null, eur: null, aud: null }, display.currency) ?? 0).map((pct) => (
                <option key={pct} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
          </div>

          <label>Final unit price override ({display.currency}) — optional</label>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={String(result.treatment.implants.finalUnitPrice)}
            value={option.implant.finalUnitPriceOverride ?? ''}
            onChange={(e) => patch({ implant: { ...option.implant, finalUnitPriceOverride: overrideFromInput(e.target.value) } })}
          />
        </div>

        {/* CROWNS */}
        <div>
          <h4>Crowns</h4>
          <label>Total crowns{isAllOnX ? ' (auto-calculated from All-on-X)' : ''}</label>
          <NumberField
            min={0}
            value={option.crown.count}
            disabled={isAllOnX}
            onChange={(n) => patch({ crown: { ...option.crown, count: Math.max(0, n) } })}
          />

          <label>Crown system / material</label>
          <select value={option.crown.itemId ?? ''} onChange={(e) => patch({ crown: { ...option.crown, itemId: e.target.value || null } })}>
            <option value="">Select crown material</option>
            {PRICING.crowns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName ?? item.name} — {priceLabel(item.price)}
              </option>
            ))}
          </select>
          {crownCatalog && priceFor(crownCatalog.price, display.currency) === null && option.crown.finalUnitPriceOverride === null && (
            <p className="config-warning">
              {display.currency} price not configured for {crownCatalog.displayName ?? crownCatalog.name}. Enter a final unit price
              override below, or configure the {display.currency} price in the pricing catalog.
            </p>
          )}

          <label>Crown markup</label>
          <div className="percentage-input">
            <select
              value={option.crown.markupPercent}
              disabled={option.crown.finalUnitPriceOverride !== null}
              onChange={(e) => patch({ crown: { ...option.crown, markupPercent: Number(e.target.value) } })}
            >
              {markupPresetsForPrice(priceFor(crownCatalog?.price ?? { usd: null, eur: null, aud: null }, display.currency) ?? 0).map((pct) => (
                <option key={pct} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
          </div>

          <label>Final unit price override ({display.currency}) — optional</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={option.crown.finalUnitPriceOverride ?? ''}
            onChange={(e) => patch({ crown: { ...option.crown, finalUnitPriceOverride: overrideFromInput(e.target.value) } })}
          />
        </div>
      </div>

      {/* BRIDGE */}
      <h4>Full-arch bridge</h4>
      <div className="grid-2">
        <div>
          <label>Bridge quantity (arches){isAllOnX ? ' (auto-calculated from All-on-X)' : ''}</label>
          <NumberField
            min={0}
            value={option.bridge.count}
            disabled={isAllOnX}
            onChange={(n) => patch({ bridge: { ...option.bridge, count: Math.max(0, n) } })}
          />

          <label>Bridge type</label>
          <select value={option.bridge.itemId ?? ''} onChange={(e) => patch({ bridge: { ...option.bridge, itemId: e.target.value || null } })}>
            <option value="">Select bridge</option>
            {PRICING.bridges.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {priceLabel(item.price)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Bridge markup</label>
          <div className="percentage-input">
            <NumberField min={0} value={option.bridge.markupPercent} onChange={(n) => patch({ bridge: { ...option.bridge, markupPercent: Math.max(0, n) } })} />
          </div>

          <label>Final unit price override ({display.currency}) — optional</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={option.bridge.finalUnitPriceOverride ?? ''}
            onChange={(e) => patch({ bridge: { ...option.bridge, finalUnitPriceOverride: overrideFromInput(e.target.value) } })}
          />
        </div>
      </div>
      {option.bridge.count > 0 && !result.treatment.bridge.priceConfigured && (
        <p className="config-warning">
          {display.currency} price not configured for this bridge. Enter a final unit price override above, or configure the{' '}
          {display.currency} price in the pricing catalog.
        </p>
      )}

      {/* PROCEDURES */}
      <h4>Additional procedures</h4>
      <div className="procedure-list">
        {PRICING.procedures.map((proc) => {
          const selection = option.procedures.find((p) => p.procedureId === proc.id);
          const checked = Boolean(selection);
          const configured = priceFor(proc.price, display.currency) !== null;
          return (
            <div className="procedure-item" key={proc.id}>
              <label className="check-item">
                <input type="checkbox" checked={checked} onChange={(e) => toggleProcedure(proc.id, e.target.checked)} />
                {proc.name} — {priceLabel(proc.price)}
                {proc.unit ? ` / ${proc.unit}` : ''}
              </label>
              {checked && selection && (
                <div className="procedure-quantity">
                  {proc.unit && (
                    <>
                      <label>Quantity ({proc.unit})</label>
                      <NumberField
                        min={0}
                        step={0.5}
                        value={selection.quantity}
                        onChange={(n) => updateProcedure(proc.id, { quantity: Math.max(0, n) })}
                      />
                    </>
                  )}
                  {!configured && selection.finalUnitPriceOverride === null && (
                    <p className="config-warning">{display.currency} price not configured — enter an override below.</p>
                  )}
                  <label>Final price override ({display.currency}) — optional</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={selection.finalUnitPriceOverride ?? ''}
                    onChange={(e) => updateProcedure(proc.id, { finalUnitPriceOverride: overrideFromInput(e.target.value) })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VISIT PLAN */}
      <h4>Visit plan</h4>
      <label>Number of visits</label>
      <select
        value={option.visits}
        onChange={(e) => {
          const visits = Number(e.target.value) as 1 | 2;
          patch({ visits, visit2: visits === 2 ? (option.visit2 ?? emptyVisitInput()) : option.visit2 });
        }}
      >
        <option value={2}>2 visits</option>
        <option value={1}>1 visit</option>
      </select>

      {option.visits === 2 && (
        <label>Crowns completed in visit 1 (remainder assigned to visit 2)</label>
      )}
      {option.visits === 2 && (
        <NumberField min={0} max={option.crown.count} value={option.visit1CrownCount} onChange={(n) => patch({ visit1CrownCount: Math.max(0, n) })} />
      )}

      <VisitFields
        title={option.visits === 1 ? 'Visit (single-visit plan)' : 'Visit 1'}
        visit={option.visit1}
        computed={result.visits.visit1}
        onChange={patchVisit1}
        money={money}
        currency={display.currency}
        fxRate={fxRate}
      />

      {option.visits === 2 && option.visit2 && result.visits.visit2 && (
        <VisitFields
          title="Visit 2"
          visit={option.visit2}
          computed={result.visits.visit2}
          onChange={patchVisit2}
          money={money}
          currency={display.currency}
          fxRate={fxRate}
          showProsthesis={false}
        />
      )}

      {/* TREATMENT PLAN TOTAL — always the sum of each visit's own final total */}
      <div className="option-total">
        <span>Calculated total</span>
        <strong>{money(result.totals.calculatedTotal)}</strong>
      </div>
      <div className="option-total">
        <span>Final total{result.totals.finalTotal !== result.totals.calculatedTotal ? ' (after visit overrides)' : ''}</span>
        <strong className="option-subtotal">{money(result.totals.finalTotal)}</strong>
      </div>

      {option.visits === 2 && (
        <div className="payment-breakdown">
          <div className="summary-row">
            <span>Visit 1</span>
            <strong>{money(result.totals.visit1)}</strong>
          </div>
          <div className="summary-row">
            <span>Visit 2</span>
            <strong>{money(result.totals.visit2)}</strong>
          </div>
        </div>
      )}
    </article>
  );
}

function AllOnXFields({ config, onChange }: { config: AllOnXConfig; onChange: (next: AllOnXConfig) => void }) {
  const derived = useMemo(() => deriveAllOnXCounts(config), [config]);
  return (
    <div className="all-on-x-fields">
      <div className="grid-2">
        <div>
          <label>Arch</label>
          <select value={config.arch} onChange={(e) => onChange({ ...config, arch: e.target.value as DentalArch })}>
            <option value="upper">Upper jaw</option>
            <option value="lower">Lower jaw</option>
            <option value="both">Upper + lower</option>
          </select>

          {(config.arch === 'upper' || config.arch === 'both') && (
            <>
              <label>{config.arch === 'both' ? 'Upper — All-on-' : 'All-on-'}</label>
              <select value={config.upperAllOnN} onChange={(e) => onChange({ ...config, upperAllOnN: Number(e.target.value) as AllOnN })}>
                {ALL_ON_N_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    All-on-{n}
                  </option>
                ))}
              </select>
            </>
          )}

          {(config.arch === 'lower' || config.arch === 'both') && (
            <>
              <label>{config.arch === 'both' ? 'Lower — All-on-' : 'All-on-'}</label>
              <select value={config.lowerAllOnN} onChange={(e) => onChange({ ...config, lowerAllOnN: Number(e.target.value) as AllOnN })}>
                {ALL_ON_N_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    All-on-{n}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div>
          <label>Crowns per arch (full-arch bridge configuration)</label>
          <NumberField min={1} value={config.crownsPerArch} onChange={(n) => onChange({ ...config, crownsPerArch: Math.max(1, n) })} />
          <small className="hint">Configurable per clinic/prosthetic design — not a fixed clinical rule.</small>
        </div>
      </div>

      <div className="all-on-x-summary">
        <span>{derived.implants} × Implants</span>
        <span>{derived.crowns} × Crowns</span>
        <span>{derived.bridges} × Full-arch bridge</span>
      </div>
    </div>
  );
}

function VisitFields({
  title,
  visit,
  computed,
  onChange,
  money,
  currency,
  fxRate,
  showProsthesis = true,
}: {
  title: string;
  visit: VisitInput;
  computed: QuotationVisit;
  onChange: (p: Partial<VisitInput>) => void;
  money: (value: number) => string;
  currency: Currency;
  /** USD → `currency` reference rate (1 for USD) — hotel/transfer/prosthesis are USD-only, so
   *  option labels here need converting before formatting (see engine.ts's module doc). */
  fxRate: number;
  /** Visit 2 never carries a prosthesis charge — it's delivered once, on Visit 1. */
  showProsthesis?: boolean;
}) {
  function patchHotel(partial: Partial<HotelSelection>) {
    onChange({ hotel: { ...visit.hotel, ...partial } });
  }
  function patchTransfer(partial: Partial<ServiceSelection>) {
    onChange({ transfer: { ...visit.transfer, ...partial } });
  }
  function patchProsthesis(partial: Partial<ServiceSelection>) {
    onChange({ prosthesis: { ...visit.prosthesis, ...partial } });
  }

  return (
    <div className="visit-template">
      <h4>{title}</h4>

      <label>Hotel</label>
      <select value={visit.hotel.hotelId ?? ''} onChange={(e) => patchHotel({ hotelId: e.target.value || null })}>
        <option value="">Select hotel</option>
        {PRICING.hotels.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {hotel.name}
          </option>
        ))}
      </select>

      <label>Room type</label>
      <select value={visit.hotel.roomType} onChange={(e) => patchHotel({ roomType: e.target.value })}>
        <option value="single">Single</option>
        <option value="double">Double</option>
        <option value="triple">Triple</option>
      </select>

      <label>Number of nights</label>
      <NumberField min={0} value={visit.hotel.nights} onChange={(n) => patchHotel({ nights: Math.max(0, n) })} />

      <label>Nightly rate override (USD) — optional</label>
      <input
        type="number"
        min={0}
        step={0.01}
        placeholder="Standard catalog rate"
        value={visit.hotel.nightlyPriceOverride ?? ''}
        onChange={(e) => patchHotel({ nightlyPriceOverride: overrideFromInput(e.target.value) })}
      />

      <div className="visit-services">
        <label>VIP transfer</label>
        <select value={visit.transfer.selectedUsd} onChange={(e) => patchTransfer({ selectedUsd: Number(e.target.value) })}>
          <option value={0}>Free</option>
          <option value={150}>{money(150 * fxRate)}</option>
        </select>
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="Final override (USD)"
          value={visit.transfer.finalPriceOverride ?? ''}
          onChange={(e) => patchTransfer({ finalPriceOverride: overrideFromInput(e.target.value) })}
        />

        {showProsthesis && (
          <>
            <label>Dental prosthesis</label>
            <select value={visit.prosthesis.selectedUsd} onChange={(e) => patchProsthesis({ selectedUsd: Number(e.target.value) })}>
              <option value={0}>Not offered</option>
              <option value={200}>{money(200 * fxRate)}</option>
            </select>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Final override (USD)"
              value={visit.prosthesis.finalPriceOverride ?? ''}
              onChange={(e) => patchProsthesis({ finalPriceOverride: overrideFromInput(e.target.value) })}
            />
          </>
        )}

        <label>Translator</label>
        <input value="Included — Free" readOnly />
      </div>

      {/* PER-VISIT OVERRIDE — authoritative for this visit only, never a whole-option override */}
      <div className="visit-override">
        <div className="summary-row">
          <span>Calculated total</span>
          <strong>{money(computed.calculatedTotal)}</strong>
        </div>
        <label>Override final price ({currency}) — optional, belongs to this visit only</label>
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="Leave empty to use the calculated total"
          value={visit.overrideTotal ?? ''}
          onChange={(e) => onChange({ overrideTotal: overrideFromInput(e.target.value) })}
        />
        <div className="summary-row visit-final-total">
          <span>Final total</span>
          <strong>{money(computed.finalTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
