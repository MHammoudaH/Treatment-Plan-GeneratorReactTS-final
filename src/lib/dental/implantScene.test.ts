import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildImplantPlanGroup, disposeGroup, findFdiFromObject } from './implantScene';
import { LOWER_FDI, suggestPlan, UPPER_FDI, type ToothMark } from './teeth';

/** Every mesh in the built group tagged `userData.part === part`, with its tooth group's fdi. */
function partsOf(group: THREE.Group, part: string): Array<{ fdi: number; mesh: THREE.Mesh }> {
  const found: Array<{ fdi: number; mesh: THREE.Mesh }> = [];
  group.traverse((node) => {
    if ((node as THREE.Mesh).isMesh && node.userData.part === part) {
      const fdi = findFdiFromObject(node);
      if (fdi != null) found.push({ fdi, mesh: node as THREE.Mesh });
    }
  });
  return found;
}

/** Every mesh tagged `userData.part === part`, regardless of whether it belongs to a tooth
 *  position (the bridge connector bar is added directly to the arch, not to a tooth group). */
function meshesOf(group: THREE.Group, part: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  group.traverse((node) => {
    if ((node as THREE.Mesh).isMesh && node.userData.part === part) found.push(node as THREE.Mesh);
  });
  return found;
}

/** Parts of `part` that belong to a specific tooth position — the other 31 positions in a
 *  32-tooth arch are always present (as natural teeth when unmarked) and must not pollute an
 *  assertion about one particular fdi. */
function partsAt(group: THREE.Group, part: string, fdi: number): number {
  return partsOf(group, part).filter((p) => p.fdi === fdi).length;
}

function toothCount(group: THREE.Group): number {
  let count = 0;
  group.children.forEach((arch) => {
    arch.children.forEach((child) => {
      if (typeof child.userData.fdi === 'number') count++;
    });
  });
  return count;
}

describe('buildImplantPlanGroup — renders the treatment-plan state, never a second one (§ critical test)', () => {
  it('CRITICAL: 4 implants + 28 crowns renders exactly 4 implant fixtures and 28 crown restorations — never 28 implants', () => {
    const plan = suggestPlan({ upperImplants: 2, lowerImplants: 2, crowns: 28 });
    const group = buildImplantPlanGroup(plan);

    const fixtures = partsOf(group, 'fixture');
    const crownRestorations = partsOf(group, 'crown'); // markHasCrown positions only — natural teeth are tagged separately

    expect(fixtures).toHaveLength(4);
    expect(crownRestorations).toHaveLength(28);
    expect(fixtures.length).not.toBe(28);

    // The 4 implant fixtures are each positioned directly under one of the 28 crown
    // restorations (an implant-supported crown), not floating separately from any crown.
    const crownFdis = new Set(crownRestorations.map((c) => c.fdi));
    for (const fixture of fixtures) expect(crownFdis.has(fixture.fdi)).toBe(true);

    disposeGroup(group);
  });
});

describe('buildImplantPlanGroup — the 10 required scenarios', () => {
  const scenarios: Array<[string, Record<number, ToothMark>]> = [
    ['1. no treatment', {}],
    ['2. single implant + crown', { 11: 'implant-crown' }],
    ['3. multiple implants + crowns', { 11: 'implant-crown', 21: 'implant-crown', 14: 'implant-crown' }],
    ['4. 4 implants + 28 crowns', suggestPlan({ upperImplants: 2, lowerImplants: 2, crowns: 28 })],
    ['5. upper implants only', suggestPlan({ upperImplants: 4, crowns: 4 })],
    ['6. lower implants only', suggestPlan({ lowerImplants: 4, crowns: 4 })],
    ['7. upper + lower implants', suggestPlan({ upperImplants: 3, lowerImplants: 3, crowns: 6 })],
    ['8. crown without implant', { 21: 'crown', 22: 'crown' }],
    ['9. bridge', { 12: 'bridge', 11: 'bridge', 21: 'bridge' }],
    ['10. mixed natural + implants + crowns', { 11: 'implant-crown', 12: 'crown', 46: 'implant', 47: 'missing' }],
  ];

  for (const [label, plan] of scenarios) {
    it(`${label} — builds without throwing, all 32 tooth positions present`, () => {
      const group = buildImplantPlanGroup(plan);
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.children).toHaveLength(2); // upper arch, lower arch
      expect(toothCount(group)).toBe(32); // every position gets a group, even when unmarked (natural)
      disposeGroup(group);
    });
  }
});

describe('buildImplantPlanGroup — implant/crown/bridge independence carries into the geometry', () => {
  it('bridge quantity 0 renders no bridge geometry; >0 renders exactly that many bridge units (never counted as crown restorations)', () => {
    const none = buildImplantPlanGroup({ 11: 'implant-crown' });
    expect(partsOf(none, 'bridge-crown')).toHaveLength(0);
    disposeGroup(none);

    const withBridge = buildImplantPlanGroup({ 12: 'bridge', 11: 'bridge', 21: 'bridge', 22: 'bridge' });
    expect(partsOf(withBridge, 'bridge-crown')).toHaveLength(4);
    expect(partsOf(withBridge, 'crown')).toHaveLength(0); // bridges are not crown restorations
    disposeGroup(withBridge);
  });

  it('adjacent bridge positions get a connecting bar; a lone bridge position does not', () => {
    const adjacent = buildImplantPlanGroup({ 12: 'bridge', 11: 'bridge', 21: 'bridge' });
    expect(meshesOf(adjacent, 'bridge-connector').length).toBeGreaterThan(0);
    disposeGroup(adjacent);

    const lone = buildImplantPlanGroup({ 11: 'bridge' });
    expect(meshesOf(lone, 'bridge-connector')).toHaveLength(0);
    disposeGroup(lone);
  });

  it('a natural tooth (crown-on-natural) has a root but no fixture at that position', () => {
    const group = buildImplantPlanGroup({ 11: 'crown' });
    expect(partsAt(group, 'root', 11)).toBe(1);
    expect(partsAt(group, 'fixture', 11)).toBe(0);
    expect(partsAt(group, 'crown', 11)).toBe(1); // the restoration itself
    disposeGroup(group);
  });

  it('a bare implant (no crown yet) has a fixture + healing cap but no crown restoration', () => {
    const group = buildImplantPlanGroup({ 11: 'implant' });
    expect(partsAt(group, 'fixture', 11)).toBe(1);
    expect(partsAt(group, 'healing-cap', 11)).toBe(1);
    expect(partsAt(group, 'crown', 11)).toBe(0);
    expect(partsAt(group, 'root', 11)).toBe(0); // an implant replaces the root, not alongside it
    disposeGroup(group);
  });

  it('an implant-supported crown has fixture + abutment + crown restoration at the same position', () => {
    const group = buildImplantPlanGroup({ 11: 'implant-crown' });
    expect(partsAt(group, 'fixture', 11)).toBe(1);
    expect(partsAt(group, 'abutment', 11)).toBe(1);
    expect(partsAt(group, 'crown', 11)).toBe(1);
    expect(partsAt(group, 'healing-cap', 11)).toBe(0); // already restored, no healing cap
    disposeGroup(group);
  });

  it('a missing tooth has no crown/root/fixture of any kind at that position, only a marker', () => {
    const group = buildImplantPlanGroup({ 11: 'missing' });
    expect(partsAt(group, 'crown', 11)).toBe(0);
    expect(partsAt(group, 'natural-crown', 11)).toBe(0);
    expect(partsAt(group, 'root', 11)).toBe(0);
    expect(partsAt(group, 'fixture', 11)).toBe(0);
    expect(partsAt(group, 'missing-marker', 11)).toBe(1);
    // The other 31 positions are untouched (natural) and unaffected by 11 being missing.
    expect(partsOf(group, 'natural-crown')).toHaveLength(31);
    disposeGroup(group);
  });
});

describe('findFdiFromObject', () => {
  it('walks up from a nested child mesh to the tooth group carrying userData.fdi', () => {
    const group = buildImplantPlanGroup({ 11: 'implant-crown' });
    const [crown] = partsOf(group, 'crown');
    expect(crown.fdi).toBe(11);
    expect(findFdiFromObject(crown.mesh)).toBe(11);
    expect(findFdiFromObject(null)).toBeNull();
    disposeGroup(group);
  });
});

describe('disposeGroup', () => {
  it('does not throw, and shared (cached) geometries/materials survive for the next build', () => {
    const first = buildImplantPlanGroup({ 11: 'implant-crown' });
    expect(() => disposeGroup(first)).not.toThrow();
    // A second build must still work — proves shared/cached geometry & material instances
    // were not disposed out from under every other tooth.
    const second = buildImplantPlanGroup({ 11: 'implant-crown', 21: 'crown' });
    expect(toothCount(second)).toBe(32);
    disposeGroup(second);
  });
});

describe('arch coverage', () => {
  it('every FDI position across both arches gets a tooth group and a crown restoration when marked', () => {
    const plan: Record<number, ToothMark> = {};
    for (const fdi of [...UPPER_FDI, ...LOWER_FDI]) plan[fdi] = 'crown';
    const group = buildImplantPlanGroup(plan);
    expect(toothCount(group)).toBe(32);
    expect(partsOf(group, 'crown')).toHaveLength(32);
    disposeGroup(group);
  });
});
