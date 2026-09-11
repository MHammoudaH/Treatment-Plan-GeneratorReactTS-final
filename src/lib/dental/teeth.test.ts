import { describe, expect, it } from 'vitest';
import { countMarks, cycleMark, suggestPlan } from './teeth';

describe('suggestPlan / countMarks — deterministic visualization of entered quantities (§6-9)', () => {
  it('28 crowns -> exactly 28 restored positions, never more', () => {
    const plan = suggestPlan({ crowns: 28 });
    expect(countMarks(plan).crowns).toBe(28);
  });

  it('24 crowns -> exactly 24 restored positions', () => {
    expect(countMarks(suggestPlan({ crowns: 24 })).crowns).toBe(24);
  });

  it('12 crowns -> exactly 12 restored positions', () => {
    expect(countMarks(suggestPlan({ crowns: 12 })).crowns).toBe(12);
  });

  it('4 implants + 28 crowns: shows 4 implants and 28 crowns, NEVER 28 implants', () => {
    const plan = suggestPlan({ upperImplants: 2, lowerImplants: 2, crowns: 28 });
    const marks = countMarks(plan);
    expect(marks.implants).toBe(4);
    expect(marks.crowns).toBe(28);
  });

  it('implant positions are associated with (a subset of) the crowned positions, not doubled', () => {
    const plan = suggestPlan({ upperImplants: 2, lowerImplants: 2, crowns: 28 });
    // Every implant position must also carry a crown (implant-supported), i.e. be
    // 'implant-crown' — the visualization never leaves a bare 'implant' unrestored when
    // enough crowns were entered to cover it, and never invents a second separate crown
    // position for the same tooth.
    const implantFdis = Object.entries(plan)
      .filter(([, mark]) => mark === 'implant' || mark === 'implant-crown')
      .map(([fdi]) => Number(fdi));
    expect(implantFdis).toHaveLength(4);
    for (const fdi of implantFdis) expect(plan[fdi]).toBe('implant-crown');

    // Total distinct marked positions = 28 (the crown count), not 32 (28 + 4) — implants
    // are a subset of the crowned positions here, not additional ones.
    expect(Object.keys(plan)).toHaveLength(28);
  });

  it('does not assume every crown requires an implant: most crowns sit on natural teeth', () => {
    const plan = suggestPlan({ upperImplants: 2, lowerImplants: 2, crowns: 28 });
    const naturalCrownCount = Object.values(plan).filter((mark) => mark === 'crown').length;
    expect(naturalCrownCount).toBe(24); // 28 crowns - 4 implant-supported
  });

  it('does not assume every implant needs its own separate crown position when crowns < implants', () => {
    const plan = suggestPlan({ upperImplants: 3, lowerImplants: 3, crowns: 4 });
    const marks = countMarks(plan);
    expect(marks.implants).toBe(6); // all 6 implants still placed
    expect(marks.crowns).toBe(4); // only 4 crowns, as entered — never fabricated
    // Every implant is either restored (implant-crown) or bare (implant) — none invented,
    // none dropped, and no more than 4 of them consumed a crown.
    const implantCrownCount = Object.values(plan).filter((mark) => mark === 'implant-crown').length;
    const bareImplantCount = Object.values(plan).filter((mark) => mark === 'implant').length;
    expect(implantCrownCount + bareImplantCount).toBe(6);
    expect(implantCrownCount).toBeLessThanOrEqual(4);
  });

  it('bridge quantity is independent — never derived from implants or crowns', () => {
    const withoutBridge = suggestPlan({ upperImplants: 4, crowns: 12 });
    expect(countMarks(withoutBridge).bridges).toBe(0);

    const withBridge = suggestPlan({ upperImplants: 4, crowns: 12, bridges: 2 });
    expect(countMarks(withBridge).bridges).toBe(2);
    expect(countMarks(withBridge).implants).toBe(4); // unaffected
    expect(countMarks(withBridge).crowns).toBe(12); // unaffected
  });

  it('bridge quantity 0 places no bridge marks', () => {
    const plan = suggestPlan({ crowns: 10, bridges: 0 });
    expect(Object.values(plan).some((mark) => mark === 'bridge')).toBe(false);
  });

  it('is deterministic — same input always produces the same plan', () => {
    const a = suggestPlan({ upperImplants: 3, lowerImplants: 3, crowns: 20, bridges: 1 });
    const b = suggestPlan({ upperImplants: 3, lowerImplants: 3, crowns: 20, bridges: 1 });
    expect(a).toEqual(b);
  });
});

describe('cycleMark — manual tooth-chart click cycle covers all 5 concepts', () => {
  it('none -> implant -> crown -> implant-crown -> bridge -> none', () => {
    let mark = cycleMark(undefined);
    expect(mark).toBe('implant');
    mark = cycleMark(mark ?? undefined);
    expect(mark).toBe('crown');
    mark = cycleMark(mark ?? undefined);
    expect(mark).toBe('implant-crown');
    mark = cycleMark(mark ?? undefined);
    expect(mark).toBe('bridge');
    mark = cycleMark(mark ?? undefined);
    expect(mark).toBeNull();
  });
});
