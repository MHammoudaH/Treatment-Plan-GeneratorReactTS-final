/**
 * Resolves a rendered node in the loaded dental model to its FDI tooth number, and indexes a
 * whole model by FDI once so `TreatmentVisualization` doesn't need to re-walk the scene graph
 * on every plan change. Never guesses from screen coordinates — see `DENTAL_MODEL_ASSET.md`
 * for the naming convention an asset must follow for this to resolve correctly.
 */
import * as THREE from 'three';

const NODE_NAME_PATTERN = /(?:tooth|fdi)[_-]?(\d{2})/i;

function fdiFromNode(node: THREE.Object3D): number | null {
  const fromUserData = node.userData?.toothNumber;
  if (typeof fromUserData === 'number' && fromUserData >= 11 && fromUserData <= 48) return fromUserData;
  const match = node.name.match(NODE_NAME_PATTERN);
  if (match) {
    const fdi = Number(match[1]);
    if (fdi >= 11 && fdi <= 48) return fdi;
  }
  return null;
}

/**
 * Walks up from a raycast-hit object to find the FDI number of the tooth it belongs to.
 * Checks `userData.toothNumber` first (from the glTF node's `extras.toothNumber` — the most
 * robust option, since it survives the node being renamed), then falls back to parsing the
 * node's own name against the documented `tooth_<FDI>` / `FDI_<FDI>` convention.
 */
export function resolveToothNumber(object: THREE.Object3D | null): number | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const fdi = fdiFromNode(node);
    if (fdi != null) return fdi;
    node = node.parent;
  }
  return null;
}

/**
 * Indexes every tooth-identifiable node under `root` by its FDI number — the first (outermost)
 * matching node per FDI wins, since that's the tooth's own group `TreatmentVisualization`
 * should attach overlays to, not a deeper sub-part that happens to share the pattern.
 */
export function indexToothNodes(root: THREE.Object3D): Map<number, THREE.Object3D> {
  const index = new Map<number, THREE.Object3D>();
  root.traverse((node) => {
    const fdi = fdiFromNode(node);
    if (fdi != null && !index.has(fdi)) index.set(fdi, node);
  });
  return index;
}
