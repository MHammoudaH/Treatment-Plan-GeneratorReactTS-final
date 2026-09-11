import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyTreatmentState, TOOTH_PART_NAMES } from './TreatmentVisualization';
import { indexToothNodes } from './ToothInteraction';

/** A "full compliance" fixture tooth: a group with the four documented named sub-parts. */
function buildFullToothFixture(fdi: number): THREE.Group {
  const tooth = new THREE.Group();
  tooth.name = `tooth_${fdi}`;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  crown.name = TOOTH_PART_NAMES.crown;
  const root = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  root.name = TOOTH_PART_NAMES.root;
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  fixture.name = TOOTH_PART_NAMES.implantFixture;
  const abutment = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  abutment.name = TOOTH_PART_NAMES.implantAbutment;
  tooth.add(crown, root, fixture, abutment);
  return tooth;
}

/** A "minimal compliance" fixture tooth: one unified mesh, no named sub-parts. */
function buildMinimalToothFixture(fdi: number): THREE.Group {
  const tooth = new THREE.Group();
  tooth.name = `tooth_${fdi}`;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
  tooth.add(mesh);
  return tooth;
}

function partsOf(tooth: THREE.Group) {
  return {
    crown: tooth.children.find((c) => c.name === TOOTH_PART_NAMES.crown)!,
    root: tooth.children.find((c) => c.name === TOOTH_PART_NAMES.root)!,
    fixture: tooth.children.find((c) => c.name === TOOTH_PART_NAMES.implantFixture)!,
    abutment: tooth.children.find((c) => c.name === TOOTH_PART_NAMES.implantAbutment)!,
  };
}

describe('applyTreatmentState — full compliance (named sub-parts)', () => {
  it('CRITICAL: an implant-supported crown shows fixture + abutment + crown, never a bare root', () => {
    const tooth = buildFullToothFixture(11);
    const index = indexToothNodes(tooth);
    applyTreatmentState(index, { 11: 'implant-crown' });
    const { crown, root, fixture, abutment } = partsOf(tooth);
    expect(fixture.visible).toBe(true);
    expect(abutment.visible).toBe(true);
    expect(crown.visible).toBe(true);
    expect(root.visible).toBe(false);
  });

  it('CRITICAL: 4 implant-crowns + 24 other crowns never turns a plain crown position into an implant', () => {
    const plan: Record<number, 'implant-crown' | 'crown'> = {};
    const implantFdis = [11, 21, 36, 46];
    for (const fdi of implantFdis) plan[fdi] = 'implant-crown';
    const otherFdis = [12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43];
    for (const fdi of otherFdis) plan[fdi] = 'crown';

    const teeth = [...implantFdis, ...otherFdis].map((fdi) => buildFullToothFixture(fdi));
    const root = new THREE.Group();
    root.add(...teeth);
    const index = indexToothNodes(root);
    applyTreatmentState(index, plan);

    for (const fdi of implantFdis) {
      const { fixture } = partsOf(index.get(fdi) as THREE.Group);
      expect(fixture.visible).toBe(true);
    }
    for (const fdi of otherFdis) {
      const { fixture, crown } = partsOf(index.get(fdi) as THREE.Group);
      expect(fixture.visible).toBe(false); // never an implant just because it's crowned
      expect(crown.visible).toBe(true);
    }
  });

  it('a bare implant (no crown yet) shows the fixture but hides the crown', () => {
    const tooth = buildFullToothFixture(11);
    const index = indexToothNodes(tooth);
    applyTreatmentState(index, { 11: 'implant' });
    const { crown, fixture } = partsOf(tooth);
    expect(fixture.visible).toBe(true);
    expect(crown.visible).toBe(false);
  });

  it('a natural (unmarked) tooth shows its crown and root, no implant parts', () => {
    const tooth = buildFullToothFixture(11);
    const index = indexToothNodes(tooth);
    applyTreatmentState(index, {});
    const { crown, root, fixture, abutment } = partsOf(tooth);
    expect(crown.visible).toBe(true);
    expect(root.visible).toBe(true);
    expect(fixture.visible).toBe(false);
    expect(abutment.visible).toBe(false);
  });

  it('a missing tooth hides the whole tooth node', () => {
    const tooth = buildFullToothFixture(11);
    const index = indexToothNodes(tooth);
    applyTreatmentState(index, { 11: 'missing' });
    expect(tooth.visible).toBe(false);
  });
});

describe('applyTreatmentState — minimal compliance (unified mesh, no named sub-parts)', () => {
  it('tints the tooth per its mark without touching an unrelated tooth', () => {
    const marked = buildMinimalToothFixture(11);
    const unmarked = buildMinimalToothFixture(21);
    const root = new THREE.Group();
    root.add(marked, unmarked);
    const index = indexToothNodes(root);
    applyTreatmentState(index, { 11: 'crown' });

    const markedMesh = marked.children[0] as THREE.Mesh;
    const unmarkedMesh = unmarked.children[0] as THREE.Mesh;
    expect((markedMesh.material as THREE.MeshStandardMaterial).color.getHexString()).not.toBe('ffffff');
    expect((unmarkedMesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ffffff');
  });
});
