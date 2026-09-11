/**
 * Applies the treatment plan — the app's single source of truth, see `../teeth.ts` — onto an
 * already-loaded dental model as a pure visualization step. No clinical or pricing logic lives
 * here: it only toggles/tints what the asset itself provides, per the documented contract in
 * `DENTAL_MODEL_ASSET.md`.
 *
 * Two compliance levels, so a first-pass asset doesn't need to be maximally rigged to be usable:
 *
 *  - Full: a tooth node with named `crown` / `root` / `implant_fixture` / `implant_abutment`
 *    children gets those toggled visible/hidden per its mark (mirrors the relationship the
 *    procedural model enforces: fixture + abutment + crown for an implant-supported crown, a
 *    root only on a natural/crowned tooth, never an implant floating apart from its crown).
 *  - Minimal: a tooth node with no such children (a single unified mesh) instead gets a
 *    restrained material-colour nudge per state, applied via a per-instance cloned material so
 *    neighbouring, differently-marked teeth are never affected.
 */
import * as THREE from 'three';
import { markHasCrown, markHasImplant, MARK_COLORS, type ToothMark } from '../teeth';

/** Optional named child nodes under each tooth's root node — see `DENTAL_MODEL_ASSET.md`. */
export const TOOTH_PART_NAMES = {
  crown: 'crown',
  root: 'root',
  implantFixture: 'implant_fixture',
  implantAbutment: 'implant_abutment',
} as const;

const TINT_BY_MARK: Partial<Record<ToothMark, string>> = {
  crown: MARK_COLORS.crown,
  implant: MARK_COLORS.implant,
  'implant-crown': MARK_COLORS.implantCrown,
  bridge: MARK_COLORS.bridge,
};

function childNamed(node: THREE.Object3D, name: string): THREE.Object3D | undefined {
  return node.children.find((c) => c.name === name);
}

function applyMinimalTint(node: THREE.Object3D, mark: ToothMark | undefined): void {
  const tint = mark ? TINT_BY_MARK[mark] : undefined;
  node.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (!material || !('color' in material)) return;
    if (!mesh.userData.baseColor) mesh.userData.baseColor = (material.color as THREE.Color).clone();
    if (!mesh.userData.tintedMaterial) mesh.userData.tintedMaterial = material.clone();
    mesh.material = mesh.userData.tintedMaterial as THREE.MeshStandardMaterial;
    const targetColor = tint ? new THREE.Color(tint) : (mesh.userData.baseColor as THREE.Color);
    (mesh.material as THREE.MeshStandardMaterial).color.copy(targetColor);
  });
}

/** Applies `plan` to every indexed tooth node (see `indexToothNodes`). Safe to call repeatedly
 *  (e.g. from a React effect keyed on `plan`) — it only ever toggles visibility/colour, never
 *  rebuilds geometry. */
export function applyTreatmentState(toothNodes: Map<number, THREE.Object3D>, plan: Record<number, ToothMark>): void {
  for (const [fdi, node] of toothNodes) {
    const mark = plan[fdi];
    const crown = childNamed(node, TOOTH_PART_NAMES.crown);
    const root = childNamed(node, TOOTH_PART_NAMES.root);
    const fixture = childNamed(node, TOOTH_PART_NAMES.implantFixture);
    const abutment = childNamed(node, TOOTH_PART_NAMES.implantAbutment);
    const hasNamedParts = Boolean(crown || root || fixture || abutment);

    node.visible = mark !== 'missing';

    if (hasNamedParts) {
      if (fixture) fixture.visible = markHasImplant(mark);
      if (abutment) abutment.visible = markHasImplant(mark);
      if (crown) crown.visible = mark === undefined || markHasCrown(mark) || mark === 'bridge';
      if (root) root.visible = !markHasImplant(mark) && mark !== 'bridge' && mark !== 'missing';
    } else {
      applyMinimalTint(node, mark);
    }
  }
}
