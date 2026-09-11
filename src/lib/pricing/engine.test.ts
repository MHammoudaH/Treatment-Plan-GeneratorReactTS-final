import { describe, expect, it } from 'vitest';
import { PRICING } from '../../data/pricing';
import {
  calculateOption,
  createAllOnXConfig,
  createOptionInput,
  deriveAllOnXCounts,
  emptyVisitInput,
  type AllOnXConfig,
  type OptionInput,
} from './engine';

function baseOption(overrides: Partial<OptionInput> = {}): OptionInput {
  return { ...createOptionInput('opt-1', 'Test Option'), ...overrides };
}

// ===========================================================================
// §18 — per-visit override
// ===========================================================================

describe('per-visit price override (§18)', () => {
  it('TEST 1: visit1 calculated 6500, override 5900 -> final 5900', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 },
      visit1: { ...emptyVisitInput(), overrideTotal: 5900 },
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.visits.visit1.calculatedTotal).toBe(6500);
    expect(result.visits.visit1.overrideTotal).toBe(5900);
    expect(result.visits.visit1.finalTotal).toBe(5900);
  });

  it('TEST 2: visit1 calculated 6500, override null -> final 6500', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 },
      visit1: { ...emptyVisitInput(), overrideTotal: null },
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.visits.visit1.calculatedTotal).toBe(6500);
    expect(result.visits.visit1.overrideTotal).toBeNull();
    expect(result.visits.visit1.finalTotal).toBe(6500);
  });

  it('TEST 3: two visits, both overridden -> finals 5900/3200, treatment total 9100', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 }, // visit 1
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 3500 }, // visit 2 (default split)
      visit1CrownCount: 0,
      visit1: { ...emptyVisitInput(), overrideTotal: 5900 },
      visit2: { ...emptyVisitInput(), overrideTotal: 3200 },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.visits.visit1.calculatedTotal).toBe(6500);
    expect(result.visits.visit2!.calculatedTotal).toBe(3500);
    expect(result.visits.visit1.finalTotal).toBe(5900);
    expect(result.visits.visit2!.finalTotal).toBe(3200);
    expect(result.totals.calculatedTotal).toBe(10000);
    expect(result.totals.finalTotal).toBe(9100);
    expect(result.totals.total).toBe(9100);
  });

  it('TEST 4: only visit1 overridden -> treatment total 9400 (visit2 keeps its calculated price)', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 },
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 3500 },
      visit1CrownCount: 0,
      visit1: { ...emptyVisitInput(), overrideTotal: 5900 },
      visit2: { ...emptyVisitInput(), overrideTotal: null },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.totals.finalTotal).toBe(9400);
  });

  it('TEST 5: AUD override — no currency conversion applied', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 10000 },
      visit1: { ...emptyVisitInput(), overrideTotal: 8500 },
      visit2: null,
    });
    // A deliberately "wrong" fxRate — must have zero effect on dental amounts.
    const result = calculateOption(option, 'AUD', 2.5);
    expect(result.visits.visit1.calculatedTotal).toBe(10000);
    expect(result.visits.visit1.finalTotal).toBe(8500);
  });

  it('TEST 6: the printed total (what the PDF renders) is always the sum of FINAL visit totals, never calculated', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 },
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 3500 },
      visit1CrownCount: 0,
      visit1: { ...emptyVisitInput(), overrideTotal: 5900 },
      visit2: { ...emptyVisitInput(), overrideTotal: 3200 },
    });
    const result = calculateOption(option, 'EUR', 1);
    // This is exactly what generateSimpleQuotationPdf / generatePremiumQuotationPdf print:
    // visit1.finalTotal, visit2.finalTotal and option.totals.total (== totals.finalTotal).
    expect(result.totals.total).toBe(result.visits.visit1.finalTotal + result.visits.visit2!.finalTotal);
    expect(result.totals.total).not.toBe(result.totals.calculatedTotal);
  });

  it('partial overrides: both null uses both calculated prices', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 1000 },
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 500 },
      visit1CrownCount: 0,
      visit1: emptyVisitInput(),
      visit2: emptyVisitInput(),
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.totals.finalTotal).toBe(result.totals.calculatedTotal);
  });
});

// ===========================================================================
// §1/§2 — multi-currency independence
// ===========================================================================

describe('multi-currency independence (§1, §2, §18 TEST 8/9)', () => {
  it('TEST 8: missing EUR price is NOT derived from USD — reported as not configured', () => {
    const medigma = PRICING.implants.find((i) => i.id === 'medigma')!;
    expect(medigma.price.usd).toBe(300);
    expect(medigma.price.eur).toBeNull(); // not configured — must not be invented

    const option = baseOption({
      visits: 1,
      implant: { itemId: 'medigma', count: 2, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1.1567); // a real-looking rate — must be ignored
    expect(result.treatment.implants.priceConfigured).toBe(false);
    expect(result.treatment.implants.baseUnitPrice).toBe(0);
    expect(result.treatment.implants.finalUnitPrice).toBe(0);
    expect(result.treatment.implants.total).toBe(0);
    // Specifically: never 300 * 1.1567 (the forbidden USD*rate conversion).
    expect(result.treatment.implants.total).not.toBeCloseTo(2 * 300 * 1.1567, 2);
  });

  it('TEST 9: missing AUD bridge price is NOT derived from USD or EUR', () => {
    const bridge = PRICING.bridges.find((b) => b.id === 'full-arch-bridge')!;
    expect(bridge.price.usd).toBe(1000);
    expect(bridge.price.eur).toBe(1000);
    expect(bridge.price.aud).toBeNull(); // explicitly left unconfigured

    const option = baseOption({
      visits: 1,
      bridge: { itemId: 'full-arch-bridge', count: 2, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'AUD', 1.52);
    expect(result.treatment.bridge.priceConfigured).toBe(false);
    expect(result.treatment.bridge.total).toBe(0);
    expect(result.treatment.bridge.total).not.toBeCloseTo(2 * 1000 * 1.52, 2);
    expect(result.treatment.bridge.total).not.toBeCloseTo(2 * 1000, 2);
  });

  it('EUR price, when configured (catalog or override), is used directly — never USD * rate', () => {
    // Mirrors the brief's own example: Implant EUR 550, Crown EUR 120, Bridge EUR 1000.
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 550 },
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 120 },
      bridge: { itemId: 'full-arch-bridge', count: 1, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    // Absurd fxRate — if the engine were (wrongly) converting, totals would move. They must not.
    const cheap = calculateOption(option, 'EUR', 0.0001);
    const expensive = calculateOption(option, 'EUR', 999);
    expect(cheap.treatment.implants.total).toBe(550);
    expect(cheap.treatment.crowns.total).toBe(120);
    expect(cheap.treatment.bridge.total).toBe(1000); // catalog EUR price, direct
    expect(cheap.totals.finalTotal).toBe(expensive.totals.finalTotal);
    expect(cheap.totals.finalTotal).toBe(1670);
  });

  it('a manual override belongs to the selected currency and is never converted', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: 'medigma', count: 1, markupPercent: 0, finalUnitPriceOverride: 900 }, // AUD override
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'AUD', 1.52);
    expect(result.treatment.implants.finalUnitPrice).toBe(900);
    expect(result.treatment.implants.total).toBe(900);
  });
});

// ===========================================================================
// §5-§7, §20 — All-on-X
// ===========================================================================

describe('All-on-X automatic dental calculation (§5-§7, §20 TEST 1-3)', () => {
  it('deriveAllOnXCounts: upper All-on-4', () => {
    const config: AllOnXConfig = { arch: 'upper', upperAllOnN: 4, lowerAllOnN: 6, crownsPerArch: 12 };
    expect(deriveAllOnXCounts(config)).toEqual({ implants: 4, crowns: 12, bridges: 1 });
  });

  it('deriveAllOnXCounts: lower All-on-6', () => {
    const config: AllOnXConfig = { arch: 'lower', upperAllOnN: 4, lowerAllOnN: 6, crownsPerArch: 12 };
    expect(deriveAllOnXCounts(config)).toEqual({ implants: 6, crowns: 12, bridges: 1 });
  });

  it('deriveAllOnXCounts: upper + lower All-on-4 (both arches, same N)', () => {
    const config: AllOnXConfig = { arch: 'both', upperAllOnN: 4, lowerAllOnN: 4, crownsPerArch: 12 };
    expect(deriveAllOnXCounts(config)).toEqual({ implants: 8, crowns: 24, bridges: 2 });
  });

  it('deriveAllOnXCounts: upper All-on-6 + lower All-on-4 (mixed per-arch N)', () => {
    const config: AllOnXConfig = { arch: 'both', upperAllOnN: 6, lowerAllOnN: 4, crownsPerArch: 12 };
    expect(deriveAllOnXCounts(config)).toEqual({ implants: 10, crowns: 24, bridges: 2 });
  });

  it('TEST 1: USD + All-on-4 + one upper arch', () => {
    const config: AllOnXConfig = { ...createAllOnXConfig(), arch: 'upper', upperAllOnN: 4 };
    const derived = deriveAllOnXCounts(config);
    expect(derived).toEqual({ implants: 4, crowns: 12, bridges: 1 });

    const option = baseOption({
      dentalTreatmentType: 'all-on-x',
      allOnX: config,
      visits: 1,
      implant: { itemId: 'medigma', count: derived.implants, markupPercent: 0, finalUnitPriceOverride: null },
      crown: { itemId: 'emax', count: derived.crowns, markupPercent: 0, finalUnitPriceOverride: null },
      bridge: { itemId: 'full-arch-bridge', count: derived.bridges, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(4);
    expect(result.treatment.crowns.quantity).toBe(12);
    expect(result.treatment.bridge.quantity).toBe(1);
    expect(result.treatment.implants.total).toBe(4 * 300);
    expect(result.treatment.crowns.total).toBe(12 * 150);
    expect(result.treatment.bridge.total).toBe(1 * 1000);
  });

  it('TEST 2: EUR + All-on-6 + one upper arch — uses EUR prices directly', () => {
    const config: AllOnXConfig = { ...createAllOnXConfig(), arch: 'upper', upperAllOnN: 6 };
    const derived = deriveAllOnXCounts(config);
    expect(derived).toEqual({ implants: 6, crowns: 12, bridges: 1 });

    const option = baseOption({
      dentalTreatmentType: 'all-on-x',
      allOnX: config,
      visits: 1,
      // No EUR catalog price for implants/crowns yet -> coordinator enters the clinic's
      // own independent EUR price via override (still "the selected currency's price",
      // never a conversion).
      implant: { itemId: 'medigma', count: derived.implants, markupPercent: 0, finalUnitPriceOverride: 550 },
      crown: { itemId: 'emax', count: derived.crowns, markupPercent: 0, finalUnitPriceOverride: 120 },
      bridge: { itemId: 'full-arch-bridge', count: derived.bridges, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.treatment.implants.total).toBe(6 * 550);
    expect(result.treatment.crowns.total).toBe(12 * 120);
    expect(result.treatment.bridge.total).toBe(1 * 1000); // real catalog EUR bridge price
    expect(result.totals.finalTotal).toBe(6 * 550 + 12 * 120 + 1000);
  });

  it('TEST 3: AUD + All-on-6 + both arches', () => {
    const config: AllOnXConfig = { arch: 'both', upperAllOnN: 6, lowerAllOnN: 6, crownsPerArch: 12 };
    const derived = deriveAllOnXCounts(config);
    expect(derived).toEqual({ implants: 12, crowns: 24, bridges: 2 });

    const option = baseOption({
      dentalTreatmentType: 'all-on-x',
      allOnX: config,
      visits: 1,
      implant: { itemId: 'medigma', count: derived.implants, markupPercent: 0, finalUnitPriceOverride: 900 },
      crown: { itemId: 'emax', count: derived.crowns, markupPercent: 0, finalUnitPriceOverride: 200 },
      bridge: { itemId: 'full-arch-bridge', count: derived.bridges, markupPercent: 0, finalUnitPriceOverride: 1500 },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'AUD', 1);
    expect(result.treatment.implants.quantity).toBe(12);
    expect(result.treatment.crowns.quantity).toBe(24);
    expect(result.treatment.bridge.quantity).toBe(2);
    expect(result.treatment.implants.total).toBe(12 * 900);
    expect(result.treatment.crowns.total).toBe(24 * 200);
    expect(result.treatment.bridge.total).toBe(2 * 1500);
  });

  it('TEST 4: USD + individual procedures — existing manual-count calculation still works', () => {
    const option = baseOption({
      dentalTreatmentType: 'individual',
      allOnX: null,
      visits: 1,
      implant: { itemId: 'medigma', count: 4, markupPercent: 25, finalUnitPriceOverride: null },
      crown: { itemId: 'emax', count: 6, markupPercent: 25, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.treatment.implants.finalUnitPrice).toBe(300 * 1.25);
    expect(result.treatment.implants.total).toBe(4 * 300 * 1.25);
    expect(result.treatment.crowns.finalUnitPrice).toBe(150 * 1.25);
    expect(result.treatment.crowns.total).toBe(6 * 150 * 1.25);
  });

  it('TEST 5: EUR + individual procedures — no USD conversion (same as TEST 8)', () => {
    const option = baseOption({
      dentalTreatmentType: 'individual',
      allOnX: null,
      visits: 1,
      implant: { itemId: 'medigma', count: 4, markupPercent: 25, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1.1567);
    expect(result.treatment.implants.priceConfigured).toBe(false);
    expect(result.treatment.implants.total).toBe(0);
  });

  it('TEST 6: EUR calculated 9500 override 8500 -> final 8500', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 9500 },
      visit1: { ...emptyVisitInput(), overrideTotal: 8500 },
      visit2: null,
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.totals.finalTotal).toBe(8500);
  });

  it('TEST 7: AUD calculated 15000 override 13500 -> final 13500', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 15000 },
      visit1: { ...emptyVisitInput(), overrideTotal: 13500 },
      visit2: null,
    });
    const result = calculateOption(option, 'AUD', 1);
    expect(result.totals.finalTotal).toBe(13500);
  });
});

// ===========================================================================
// Bridge quantity / currency independence (§4)
// ===========================================================================

describe('bridge pricing (§4)', () => {
  it('bridgeTotal = bridgeUnitPrice x bridgeQuantity, and AUD is never assumed from USD/EUR', () => {
    const bridge = PRICING.bridges.find((b) => b.id === 'full-arch-bridge')!;
    expect(bridge.price).toEqual({ usd: 1000, eur: 1000, aud: null });

    const twoArches = baseOption({
      visits: 1,
      bridge: { itemId: 'full-arch-bridge', count: 2, markupPercent: 0, finalUnitPriceOverride: null },
      visit1: emptyVisitInput(),
      visit2: null,
    });
    expect(calculateOption(twoArches, 'USD', 1).treatment.bridge.total).toBe(2000);
    expect(calculateOption(twoArches, 'EUR', 1).treatment.bridge.total).toBe(2000);
    // AUD has no independent price and no override -> 0, not 2000.
    expect(calculateOption(twoArches, 'AUD', 1).treatment.bridge.total).toBe(0);
    expect(calculateOption(twoArches, 'AUD', 1).treatment.bridge.priceConfigured).toBe(false);
  });
});
