import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { indexToothNodes, resolveToothNumber } from './ToothInteraction';

/** A minimal synthetic "asset" — no real GLB is needed to test the resolution contract itself,
 *  only that it correctly reads the documented naming convention. */
function buildFixtureModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'dental_arch';

  const tooth11 = new THREE.Group();
  tooth11.name = 'tooth_11';
  const crown11 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  crown11.name = 'crown';
  tooth11.add(crown11);
  root.add(tooth11);

  // Named via userData.toothNumber instead of the node name — both conventions must resolve.
  const tooth46 = new THREE.Group();
  tooth46.userData.toothNumber = 46;
  const crown46 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  crown46.name = 'crown';
  tooth46.add(crown46);
  root.add(tooth46);

  // A non-tooth node (e.g. the gingiva) must never resolve to a false FDI.
  const gum = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  gum.name = 'gingiva';
  root.add(gum);

  return root;
}

describe('resolveToothNumber', () => {
  it('resolves a nested mesh up to its tooth group via the node-name convention', () => {
    const model = buildFixtureModel();
    const tooth11 = model.getObjectByName('tooth_11')!;
    const crown = tooth11.children[0];
    expect(resolveToothNumber(crown)).toBe(11);
  });

  it('resolves via userData.toothNumber when the node name does not match', () => {
    const model = buildFixtureModel();
    const tooth46 = [...model.children].find((c) => c.userData.toothNumber === 46)!;
    const crown = tooth46.children[0];
    expect(resolveToothNumber(crown)).toBe(46);
  });

  it('returns null for a non-tooth node and for null', () => {
    const model = buildFixtureModel();
    const gum = model.getObjectByName('gingiva')!;
    expect(resolveToothNumber(gum)).toBeNull();
    expect(resolveToothNumber(null)).toBeNull();
  });
});

describe('indexToothNodes', () => {
  it('indexes every resolvable tooth node by FDI, ignoring non-tooth nodes', () => {
    const model = buildFixtureModel();
    const index = indexToothNodes(model);
    expect(index.size).toBe(2);
    expect(index.get(11)?.name).toBe('tooth_11');
    expect(index.get(46)?.userData.toothNumber).toBe(46);
  });

  it('keeps the outermost node per FDI, not a deeper sub-part that also matches the pattern', () => {
    const root = new THREE.Group();
    const tooth = new THREE.Group();
    tooth.name = 'tooth_21';
    const innerNamedAlike = new THREE.Group();
    innerNamedAlike.name = 'tooth_21_crown'; // still matches the pattern, must not win
    tooth.add(innerNamedAlike);
    root.add(tooth);

    const index = indexToothNodes(root);
    expect(index.get(21)).toBe(tooth);
  });
});
