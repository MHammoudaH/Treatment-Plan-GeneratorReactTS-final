import { useMemo } from 'react';
import { PRICING, markupPresetsForPrice } from '../../data/pricing';
import { formatMoney } from '../../lib/formatMoney';
import { calculateOption, emptyVisitInput, type HotelSelection, type OptionInput, type ProcedureSelection, type ServiceSelection, type VisitInput } from '../../lib/pricing/engine';
import type { DisplaySettings } from '../../types/wizard';

interface Props {
  option: OptionInput;
  onChange: (next: OptionInput) => void;
  onRemove: () => void;
  display: DisplaySettings;
  removable: boolean;
}

function numberOrZero(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function overrideFromInput(value: string): number | null {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function OptionCard({ option, onChange, onRemove, display, removable }: Props) {
  const result = useMemo(() => calculateOption(option), [option]);
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

  const money = (usd: number) => formatMoney(usd, display);

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

      <div className="grid-2">
        {/* IMPLANTS */}
        <div>
          <h4>Implants</h4>
          <label>Total implants</label>
          <input type="number" min={0} value={option.implant.count} onChange={(e) => patch({ implant: { ...option.implant, count: numberOrZero(e.target.value) } })} />

          <label>Implant system</label>
          <select value={option.implant.itemId ?? ''} onChange={(e) => patch({ implant: { ...option.implant, itemId: e.target.value || null } })}>
            <option value="">Select implant</option>
            {PRICING.implants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName ?? item.name} — {money(item.price)}
              </option>
            ))}
          </select>

          <label>Implant markup</label>
          <div className="percentage-input">
            <select
              value={option.implant.markupPercent}
              disabled={option.implant.finalUnitPriceOverride !== null}
              onChange={(e) => patch({ implant: { ...option.implant, markupPercent: Number(e.target.value) } })}
            >
              {markupPresetsForPrice(implantCatalog?.price ?? 0).map((pct) => (
                <option key={pct} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
          </div>

          <label>Final unit price override (USD) — optional</label>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={`Standard: ${(implantCatalog?.price ?? 0) * (1 + option.implant.markupPercent / 100)}`}
            value={option.implant.finalUnitPriceOverride ?? ''}
            onChange={(e) => patch({ implant: { ...option.implant, finalUnitPriceOverride: overrideFromInput(e.target.value) } })}
          />
        </div>

        {/* CROWNS */}
        <div>
          <h4>Crowns</h4>
          <label>Total crowns</label>
          <input type="number" min={0} value={option.crown.count} onChange={(e) => patch({ crown: { ...option.crown, count: numberOrZero(e.target.value) } })} />

          <label>Crown system / material</label>
          <select value={option.crown.itemId ?? ''} onChange={(e) => patch({ crown: { ...option.crown, itemId: e.target.value || null } })}>
            <option value="">Select crown material</option>
            {PRICING.crowns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName ?? item.name} — {money(item.price)}
              </option>
            ))}
          </select>

          <label>Crown markup</label>
          <div className="percentage-input">
            <select
              value={option.crown.markupPercent}
              disabled={option.crown.finalUnitPriceOverride !== null}
              onChange={(e) => patch({ crown: { ...option.crown, markupPercent: Number(e.target.value) } })}
            >
              {markupPresetsForPrice(crownCatalog?.price ?? 0).map((pct) => (
                <option key={pct} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
          </div>

          <label>Final unit price override (USD) — optional</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={option.crown.finalUnitPriceOverride ?? ''}
            onChange={(e) => patch({ crown: { ...option.crown, finalUnitPriceOverride: overrideFromInput(e.target.value) } })}
          />
        </div>
      </div>

      {/* PROCEDURES */}
      <h4>Additional procedures</h4>
      <div className="procedure-list">
        {PRICING.procedures.map((proc) => {
          const selection = option.procedures.find((p) => p.procedureId === proc.id);
          const checked = Boolean(selection);
          return (
            <div className="procedure-item" key={proc.id}>
              <label className="check-item">
                <input type="checkbox" checked={checked} onChange={(e) => toggleProcedure(proc.id, e.target.checked)} />
                {proc.name} — {money(proc.price)}
                {proc.unit ? ` / ${proc.unit}` : ''}
              </label>
              {checked && selection && (
                <div className="procedure-quantity">
                  {proc.unit && (
                    <>
                      <label>Quantity ({proc.unit})</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={selection.quantity}
                        onChange={(e) => updateProcedure(proc.id, { quantity: numberOrZero(e.target.value) })}
                      />
                    </>
                  )}
                  <label>Final price override (USD) — optional</label>
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
        <input type="number" min={0} max={option.crown.count} value={option.visit1CrownCount} onChange={(e) => patch({ visit1CrownCount: numberOrZero(e.target.value) })} />
      )}

      <VisitFields
        title={option.visits === 1 ? 'Visit (single-visit plan)' : 'Visit 1'}
        visit={option.visit1}
        onChange={patchVisit1}
        money={money}
      />

      {option.visits === 2 && option.visit2 && (
        <VisitFields title="Visit 2" visit={option.visit2} onChange={patchVisit2} money={money} showProsthesis={false} />
      )}

      {/* WHOLE-OPTION OVERRIDE */}
      <div className="manual-final-price">
        <label>Final price — whole-option override ({display.currency}, optional)</label>
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="Leave empty to use the calculated total"
          value={option.finalTotalOverride === null ? '' : option.finalTotalOverride * (display.currency === 'USD' ? 1 : display.fxRate)}
          onChange={(e) => {
            const displayValue = overrideFromInput(e.target.value);
            const usd = displayValue === null ? null : display.currency === 'USD' ? displayValue : displayValue / display.fxRate;
            patch({ finalTotalOverride: usd });
          }}
        />
        <small>Proportionally scales every line above to hit this total. Leave empty for granular control.</small>
      </div>

      <div className="option-total">
        <span>Option subtotal</span>
        <strong className="option-subtotal">{money(result.totals.total)}</strong>
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

function VisitFields({
  title,
  visit,
  onChange,
  money,
  showProsthesis = true,
}: {
  title: string;
  visit: VisitInput;
  onChange: (p: Partial<VisitInput>) => void;
  money: (usd: number) => string;
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
      <input type="number" min={0} value={visit.hotel.nights} onChange={(e) => patchHotel({ nights: numberOrZero(e.target.value) })} />

      <div className="visit-services">
        <label>VIP transfer</label>
        <select value={visit.transfer.selectedUsd} onChange={(e) => patchTransfer({ selectedUsd: Number(e.target.value) })}>
          <option value={0}>Free</option>
          <option value={150}>{money(150)}</option>
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
              <option value={200}>{money(200)}</option>
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
    </div>
  );
}
