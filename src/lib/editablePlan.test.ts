import { describe, expect, it } from 'vitest';
import { createInitialState } from '../types/wizard';
import { createOptionInput } from './pricing/engine';
import { dentalPlanFromState, plasticItemsFromPlan, wizardStateFromPlan, type PlasticPlan } from './editablePlan';
import type { QuoteSnapshot } from './api';

const quote: QuoteSnapshot = { module: 'dental', pdf: 'premium', currency: 'EUR', language: 'English', options: [{ name: 'Option 1', lines: [], total: 900 }] };

function quotedState() {
  const state = createInitialState();
  state.step = 3;
  state.patient = { ...state.patient, name: 'John Smith', country: 'UK' };
  state.options = [{ ...createOptionInput('opt-1', 'German Implant System'), implant: { itemId: 'medigma', count: 4, markupPercent: 10, finalUnitPriceOverride: null } }];
  state.display = { ...state.display, currency: 'EUR', fxRate: 0.91, fxRateEdited: false };
  state.notes = 'Discussed sinus lift.';
  state.patientPhotos = ['data:image/png;base64,AAAA'];
  return state;
}

describe('dental plan round trip', () => {
  it('saves the quotation inputs but never the photos or app-only state', () => {
    const plan = dentalPlanFromState(quotedState());
    expect(plan.module).toBe('dental');
    expect(plan.options[0].implant.count).toBe(4);
    expect(plan.notes).toBe('Discussed sinus lift.');
    expect(JSON.stringify(plan)).not.toContain('base64');
    expect('liveRates' in plan || 'recordSave' in plan || 'step' in plan).toBe(false);
  });

  it('re-opens on the Options step with everything filled, saving back to the same record', () => {
    const plan = dentalPlanFromState(quotedState());
    const state = wizardStateFromPlan({ recordId: 7, patientName: 'John Smith', quote, plan });
    expect(state.step).toBe(2);
    expect(state.patient.name).toBe('John Smith');
    expect(state.options[0].name).toBe('German Implant System');
    expect(state.options[0].implant).toEqual({ itemId: 'medigma', count: 4, markupPercent: 10, finalUnitPriceOverride: null });
    expect(state.notes).toBe('Discussed sinus lift.');
    expect(state.patientPhotos).toEqual([]);
    expect(state.recordSave).toEqual({ enabled: true, record: { id: 7, patientName: 'John Smith', lastQuote: quote, pinned: true } });
  });

  it("keeps the quoted exchange rate (marked as typed) so prices don't move with today's rate", () => {
    const state = wizardStateFromPlan({ recordId: 1, patientName: 'x', quote, plan: dentalPlanFromState(quotedState()) });
    expect(state.display.currency).toBe('EUR');
    expect(state.display.fxRate).toBe(0.91);
    expect(state.display.fxRateEdited).toBe(true);
  });

  it('fills option fields missing from an older saved plan', () => {
    const plan = dentalPlanFromState(quotedState());
    // Simulate a plan saved before some option field existed.
    const { visit2: _dropped, ...older } = plan.options[0];
    void _dropped;
    plan.options = [older as typeof plan.options[number]];
    const state = wizardStateFromPlan({ recordId: 1, patientName: 'x', quote, plan });
    expect(state.options[0]).toHaveProperty('visit2');
  });
});

describe('plasticItemsFromPlan', () => {
  it('restores procedures in order and drops ids no longer in the catalog', () => {
    const plan = { itemIds: ['three-area-lipo', 'no-such-procedure', 'rhinoplasty'] } as PlasticPlan;
    expect(plasticItemsFromPlan(plan).map((item) => item.id)).toEqual(['three-area-lipo', 'rhinoplasty']);
  });
});
