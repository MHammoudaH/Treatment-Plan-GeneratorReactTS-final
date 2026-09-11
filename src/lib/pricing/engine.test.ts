import { describe, expect, it } from 'vitest';
import { PRICING } from '../../data/pricing';
import { calculateOption, createOptionInput, emptyVisitInput, type OptionInput } from './engine';

function baseOption(overrides: Partial<OptionInput> = {}): OptionInput {
  return { ...createOptionInput('opt-1', 'Test Option'), ...overrides };
}

/** A single-visit option with implant/crown/bridge quantities and (optionally) manual
 *  per-unit overrides so totals are exact, round numbers regardless of catalog markup. */
function treatmentOption(input: {
  implants: number;
  crowns: number;
  bridges?: number;
  implantUnitPrice?: number;
  crownUnitPrice?: number;
  bridgeUnitPrice?: number;
}): OptionInput {
  return baseOption({
    visits: 1,
    implant: { itemId: null, count: input.implants, markupPercent: 0, finalUnitPriceOverride: input.implantUnitPrice ?? 0 },
    crown: { itemId: null, count: input.crowns, markupPercent: 0, finalUnitPriceOverride: input.crownUnitPrice ?? 0 },
    bridge: { itemId: null, count: input.bridges ?? 0, markupPercent: 0, finalUnitPriceOverride: input.bridgeUnitPrice ?? 0 },
    visit1: emptyVisitInput(),
    visit2: null,
  });
}

// ===========================================================================
// §1-4 — no All-on-X, implants/crowns/bridge fully independent
// ===========================================================================

describe('implant/crown/bridge quantities are independent (§1-4, §23 #1-6)', () => {
  it('1: 4 implants + 28 crowns is valid', () => {
    const result = calculateOption(treatmentOption({ implants: 4, crowns: 28, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(4);
    expect(result.treatment.crowns.quantity).toBe(28);
  });

  it('2: 4 implants + 12 crowns is valid', () => {
    const result = calculateOption(treatmentOption({ implants: 4, crowns: 12, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(4);
    expect(result.treatment.crowns.quantity).toBe(12);
  });

  it('3: 6 implants + 24 crowns is valid', () => {
    const result = calculateOption(treatmentOption({ implants: 6, crowns: 24, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(6);
    expect(result.treatment.crowns.quantity).toBe(24);
  });

  it('4: 8 implants + 28 crowns is valid', () => {
    const result = calculateOption(treatmentOption({ implants: 8, crowns: 28, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(8);
    expect(result.treatment.crowns.quantity).toBe(28);
  });

  it('10 implants + 28 crowns is valid (no coupling caps the ratio)', () => {
    const result = calculateOption(treatmentOption({ implants: 10, crowns: 28, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(result.treatment.implants.quantity).toBe(10);
    expect(result.treatment.crowns.quantity).toBe(28);
  });

  it('5: crown quantity never equals or derives from implant quantity', () => {
    const a = calculateOption(treatmentOption({ implants: 4, crowns: 12, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    const b = calculateOption(treatmentOption({ implants: 4, crowns: 28, implantUnitPrice: 300, crownUnitPrice: 150 }), 'USD', 1);
    expect(a.treatment.implants.quantity).toBe(b.treatment.implants.quantity); // same implants
    expect(a.treatment.crowns.quantity).not.toBe(b.treatment.crowns.quantity); // different crowns
    expect(a.treatment.crowns.quantity).not.toBe(a.treatment.implants.quantity); // never forced equal
  });

  it('6: bridge quantity is set independently and never auto-added because implants exist', () => {
    const noBridge = calculateOption(treatmentOption({ implants: 4, crowns: 12, bridges: 0, implantUnitPrice: 300 }), 'USD', 1);
    expect(noBridge.treatment.bridge.quantity).toBe(0);
    expect(noBridge.treatment.bridge.total).toBe(0);

    const withBridge = calculateOption(treatmentOption({ implants: 6, crowns: 24, bridges: 2, bridgeUnitPrice: 1000 }), 'USD', 1);
    expect(withBridge.treatment.bridge.quantity).toBe(2);

    // A brand-new option (nothing entered) never has a bridge — it is never created
    // automatically just because implants/crowns are present.
    const fresh = createOptionInput('fresh', 'Fresh');
    expect(fresh.bridge.count).toBe(0);
    expect(fresh.bridge.itemId).toBeNull();
  });

  it('valid combinations from the brief: 4+12+1, 4+28+0, 6+24+2', () => {
    for (const c of [
      { implants: 4, crowns: 12, bridges: 1 },
      { implants: 4, crowns: 28, bridges: 0 },
      { implants: 6, crowns: 24, bridges: 2 },
    ]) {
      const result = calculateOption(treatmentOption({ ...c, implantUnitPrice: 300, crownUnitPrice: 150, bridgeUnitPrice: 1000 }), 'USD', 1);
      expect(result.treatment.implants.quantity).toBe(c.implants);
      expect(result.treatment.crowns.quantity).toBe(c.crowns);
      expect(result.treatment.bridge.quantity).toBe(c.bridges);
    }
  });

  it('7/8/9: implant, crown and bridge totals are each quantity x their own unit price', () => {
    const result = calculateOption(
      treatmentOption({ implants: 5, crowns: 18, bridges: 2, implantUnitPrice: 640, crownUnitPrice: 155, bridgeUnitPrice: 1000 }),
      'USD',
      1,
    );
    expect(result.treatment.implants.total).toBe(5 * 640);
    expect(result.treatment.crowns.total).toBe(18 * 155);
    expect(result.treatment.bridge.total).toBe(2 * 1000);
    // Changing crown quantity must not move implant/bridge totals.
    const changedCrowns = calculateOption(
      treatmentOption({ implants: 5, crowns: 99, bridges: 2, implantUnitPrice: 640, crownUnitPrice: 155, bridgeUnitPrice: 1000 }),
      'USD',
      1,
    );
    expect(changedCrowns.treatment.implants.total).toBe(result.treatment.implants.total);
    expect(changedCrowns.treatment.bridge.total).toBe(result.treatment.bridge.total);
  });
});

// ===========================================================================
// §10-11, §23 #10 — multi-currency independence
// ===========================================================================

describe('multi-currency independence (§10-11)', () => {
  it('10: USD/EUR/AUD prices are independent — never converted from one another', () => {
    const medigma = PRICING.implants.find((i) => i.id === 'medigma')!;
    expect(medigma.price.usd).toBe(300);
    expect(medigma.price.eur).toBeNull(); // not configured — must not be invented

    const option = treatmentOption({ implants: 2, crowns: 0 });
    option.implant.itemId = 'medigma';
    option.implant.finalUnitPriceOverride = null;

    const eur = calculateOption(option, 'EUR', 1.1567); // a real-looking rate — must be ignored
    expect(eur.treatment.implants.priceConfigured).toBe(false);
    expect(eur.treatment.implants.total).toBe(0);
    expect(eur.treatment.implants.total).not.toBeCloseTo(2 * 300 * 1.1567, 2);
  });

  it('a manual override belongs to the selected currency and is never converted', () => {
    const option = treatmentOption({ implants: 1, crowns: 0, implantUnitPrice: 900 }); // AUD override
    const result = calculateOption(option, 'AUD', 1.52);
    expect(result.treatment.implants.finalUnitPrice).toBe(900);
    expect(result.treatment.implants.total).toBe(900);
  });

  it('11: USD equivalent (fxRate) never changes the primary calculated amount', () => {
    const option = treatmentOption({ implants: 3, crowns: 0, implantUnitPrice: 550 }); // EUR price
    const cheap = calculateOption(option, 'EUR', 0.0001);
    const expensive = calculateOption(option, 'EUR', 999);
    expect(cheap.treatment.implants.total).toBe(1650);
    expect(expensive.treatment.implants.total).toBe(1650);
  });
});

// ===========================================================================
// §12 — procedure/unit price overrides
// ===========================================================================

describe('procedure/unit price overrides (§12, §23 #11)', () => {
  it('11: override REPLACES the calculated unit price — never added to it', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: 'medigma', count: 2, markupPercent: 25, finalUnitPriceOverride: 280 }, // catalog $300*1.25=375, override 280
      visit1: emptyVisitInput(),
      visit2: null,
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.treatment.implants.finalUnitPrice).toBe(280); // not 375, and not 375+280
    expect(result.treatment.implants.total).toBe(2 * 280); // lineTotal = quantity * finalUnitPrice
  });
});

// ===========================================================================
// §13-14, §23 #12-14 — per-visit overrides
// ===========================================================================

describe('per-visit overrides (§13-14)', () => {
  it('12/13: visit1 override affects visit1 only; visit2 override affects visit2 only', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 6500 }, // visit 1 (default split)
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 3500 }, // visit 2 (default split)
      visit1CrownCount: 0,
      visit1: { ...emptyVisitInput(), overrideTotal: 5900 },
      visit2: { ...emptyVisitInput(), overrideTotal: null },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.visits.visit1.calculatedTotal).toBe(6500);
    expect(result.visits.visit1.finalTotal).toBe(5900); // overridden
    expect(result.visits.visit2!.calculatedTotal).toBe(3500);
    expect(result.visits.visit2!.finalTotal).toBe(3500); // untouched by visit1's override

    const onlyVisit2 = baseOption({
      ...option,
      visit1: { ...emptyVisitInput(), overrideTotal: null },
      visit2: { ...emptyVisitInput(), overrideTotal: 3200 },
    });
    const result2 = calculateOption(onlyVisit2, 'EUR', 1);
    expect(result2.visits.visit1.finalTotal).toBe(6500); // untouched by visit2's override
    expect(result2.visits.visit2!.finalTotal).toBe(3200);
  });

  it('14: plan total = sum of FINAL visit totals, never calculated totals, never a whole-plan override', () => {
    const option = baseOption({
      visits: 2,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 7000 },
      crown: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 4000 },
      visit1CrownCount: 0,
      visit1: { ...emptyVisitInput(), overrideTotal: 6000 },
      visit2: { ...emptyVisitInput(), overrideTotal: null },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.totals.calculatedTotal).toBe(11000);
    expect(result.totals.finalTotal).toBe(10000); // 6000 + 4000
    expect(result.totals.total).toBe(result.visits.visit1.finalTotal + result.visits.visit2!.finalTotal);
  });
});

// ===========================================================================
// §14-19, §23 #15-21 — flight ticket
// ===========================================================================

describe('flight ticket (§14-19)', () => {
  it('15/16: can be entered, and is optional (no field means no cost)', () => {
    const withTicket = baseOption({ visits: 1, visit1: emptyVisitInput(), visit2: null, flightTicket: { amount: 650 } });
    const withoutTicket = baseOption({ visits: 1, visit1: emptyVisitInput(), visit2: null, flightTicket: { amount: null } });
    expect(calculateOption(withTicket, 'EUR', 1).totals.flightTicket).toBe(650);
    expect(calculateOption(withoutTicket, 'EUR', 1).totals.flightTicket).toBe(0);
  });

  it('17: flight ticket is added to the final quotation total', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 9500 },
      visit1: emptyVisitInput(),
      visit2: null,
      flightTicket: { amount: 650 },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.totals.calculatedTotal).toBe(10150);
    expect(result.totals.finalTotal).toBe(10150);
  });

  it('18/19: flight ticket uses the selected currency directly — no conversion', () => {
    const eurOption = baseOption({ visits: 1, visit1: emptyVisitInput(), visit2: null, flightTicket: { amount: 650 } });
    const audOption = baseOption({ visits: 1, visit1: emptyVisitInput(), visit2: null, flightTicket: { amount: 1050 } });
    const usdOption = baseOption({ visits: 1, visit1: emptyVisitInput(), visit2: null, flightTicket: { amount: 700 } });

    expect(calculateOption(eurOption, 'EUR', 1).totals.flightTicket).toBe(650);
    expect(calculateOption(audOption, 'AUD', 1).totals.flightTicket).toBe(1050);
    expect(calculateOption(usdOption, 'USD', 1).totals.flightTicket).toBe(700);

    // A deliberately "wrong" fxRate must have zero effect on the entered amount.
    expect(calculateOption(eurOption, 'EUR', 999).totals.flightTicket).toBe(650);
    expect(calculateOption(eurOption, 'EUR', 0.0001).totals.flightTicket).toBe(650);
  });

  it('20: no flight ticket entered means no additional cost, and generation is never blocked', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 1000 },
      visit1: emptyVisitInput(),
      visit2: null,
      flightTicket: { amount: null },
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.totals.flightTicket).toBe(0);
    expect(result.totals.finalTotal).toBe(1000); // unchanged by the absent flight ticket
  });

  it('21: the printed total (what the PDF renders) reflects the flight ticket', () => {
    // generateSimpleQuotationPdf / generatePremiumQuotationPdf render option.totals.total and,
    // when > 0, a dedicated "Flight ticket" row from option.totals.flightTicket (see those
    // files) — this asserts the exact numbers those templates consume.
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 9500 },
      visit1: emptyVisitInput(),
      visit2: null,
      flightTicket: { amount: 650 },
    });
    const result = calculateOption(option, 'EUR', 1);
    expect(result.totals.flightTicket).toBe(650);
    expect(result.totals.total).toBe(10150);
  });

  it('flight ticket is never confused with a procedure/visit override or a discount', () => {
    const option = baseOption({
      visits: 1,
      implant: { itemId: null, count: 1, markupPercent: 0, finalUnitPriceOverride: 1000 },
      visit1: { ...emptyVisitInput(), overrideTotal: 800 }, // an unrelated visit override
      visit2: null,
      flightTicket: { amount: 200 },
    });
    const result = calculateOption(option, 'USD', 1);
    expect(result.visits.visit1.finalTotal).toBe(800); // visit override still just replaces
    expect(result.totals.finalTotal).toBe(1000); // 800 (visit final) + 200 (flight ticket), additive
  });
});

// ===========================================================================
// Regression: bridge quantity x unit price, currency-independent (still true)
// ===========================================================================

describe('bridge pricing (§2 previously, still applicable)', () => {
  it('bridgeTotal = bridgeUnitPrice x bridgeQuantity, and AUD is never assumed from USD/EUR', () => {
    const bridge = PRICING.bridges.find((b) => b.id === 'full-arch-bridge')!;
    expect(bridge.price).toEqual({ usd: 1000, eur: 1000, aud: null });

    const twoArches = treatmentOption({ implants: 0, crowns: 0, bridges: 2 });
    twoArches.bridge.itemId = 'full-arch-bridge';
    twoArches.bridge.finalUnitPriceOverride = null;

    expect(calculateOption(twoArches, 'USD', 1).treatment.bridge.total).toBe(2000);
    expect(calculateOption(twoArches, 'EUR', 1).treatment.bridge.total).toBe(2000);
    expect(calculateOption(twoArches, 'AUD', 1).treatment.bridge.total).toBe(0);
    expect(calculateOption(twoArches, 'AUD', 1).treatment.bridge.priceConfigured).toBe(false);
  });
});
