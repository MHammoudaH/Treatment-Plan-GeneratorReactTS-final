/**
 * Procedural 3D dental-arch scene for the implant map.
 *
 * No model asset: the two arches are built from ~16 stylised teeth each, laid out along a
 * parabola. A marked tooth is drawn as a titanium implant fixture + tinted crown, or as a
 * tinted crown alone. Shared by the live viewer (`ImplantMap3D`) and the PDF snapshot
 * (`renderImplantMapSnapshot`) so both look identical.
 */
import * as THREE from 'three';
import { LOWER_FDI, MARK_COLORS, UPPER_FDI, type ToothMark } from './teeth';

/** Recommended camera framing for a three-quarter presentation view. */
export const DEFAULT_CAMERA = {
  position: new THREE.Vector3(0, 0.72, 2.25),
  target: new THREE.Vector3(0, 0.02, -0.05),
};

const ARCH_HALF_WIDTH = 1.05;
const UPPER_Y = 0.34;
const LOWER_Y = -0.34;

function toothRadius(fdi: number): number {
  const position = fdi % 10;
  if (position >= 6) return 0.075; // molars
  if (position >= 4) return 0.06; // premolars
  if (position === 3) return 0.055; // canine
  return 0.048; // incisors
}

/** Arch-local position of a tooth column (0..15) in the XZ plane. */
function columnPoint(column: number): { x: number; z: number } {
  const u = (column / 15) * 2 - 1; // -1 (right molar) .. 1 (left molar)
  return { x: u * ARCH_HALF_WIDTH, z: u * u * 0.9 - 0.42 };
}

function gumTube(archY: number, radiusSign: number): THREE.Mesh {
  const points: THREE.Vector3[] = [];
  for (let column = 0; column <= 15; column++) {
    const { x, z } = columnPoint(column);
    points.push(new THREE.Vector3(x, archY + radiusSign * 0.11, z));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  const geometry = new THREE.TubeGeometry(curve, 80, 0.055, 12, false);
  const material = new THREE.MeshStandardMaterial({ color: MARK_COLORS.gum, roughness: 0.85, metalness: 0 });
  return new THREE.Mesh(geometry, material);
}

function makeTooth(fdi: number, mark: ToothMark | undefined, archY: number, crownSign: number): THREE.Group {
  const group = new THREE.Group();
  const radius = toothRadius(fdi);
  const crownColor = mark === 'implant' ? MARK_COLORS.implant : mark === 'crown' ? MARK_COLORS.crown : MARK_COLORS.tooth;

  // Crown / visible tooth
  const crown = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, 0.12, 4, 10),
    new THREE.MeshStandardMaterial({
      color: crownColor,
      roughness: mark ? 0.35 : 0.6,
      metalness: 0,
      transparent: !mark,
      opacity: mark ? 1 : 0.82,
    }),
  );
  crown.position.y = crownSign * 0.09;
  group.add(crown);

  if (mark === 'implant') {
    // Titanium fixture, driven into the "bone" behind the gum.
    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.02, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: '#c7ccd4', roughness: 0.3, metalness: 0.9 }),
    );
    fixture.position.y = -crownSign * 0.14;
    group.add(fixture);

    const abutment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: '#d7dbe1', roughness: 0.35, metalness: 0.8 }),
    );
    abutment.position.y = -crownSign * 0.03;
    group.add(abutment);
  }

  const { x, z } = columnPoint(0); // placeholder; real placement done by caller
  group.position.set(x, archY, z);
  return group;
}

function buildArch(fdiList: number[], plan: Record<number, ToothMark>, archY: number, crownSign: number): THREE.Group {
  const arch = new THREE.Group();
  arch.add(gumTube(archY, -crownSign));
  fdiList.forEach((fdi, column) => {
    const tooth = makeTooth(fdi, plan[fdi], archY, crownSign);
    const { x, z } = columnPoint(column);
    tooth.position.set(x, archY, z);
    tooth.userData.fdi = fdi;
    arch.add(tooth);
  });
  return arch;
}

/** Builds the full implant-map group (both arches + all marked teeth) for `plan`. */
export function buildImplantPlanGroup(plan: Record<number, ToothMark>): THREE.Group {
  const group = new THREE.Group();
  group.add(buildArch(UPPER_FDI, plan, UPPER_Y, -1)); // upper crowns point down
  group.add(buildArch(LOWER_FDI, plan, LOWER_Y, 1)); // lower crowns point up
  group.rotation.x = -0.12;
  return group;
}

/** Disposes every geometry and material under `object` (call before dropping a group). */
export function disposeGroup(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else if (material) material.dispose();
  });
}

/** Adds the standard lighting rig used by both the viewer and the snapshot. */
export function addImplantSceneLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3550, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
  fill.position.set(-3, 1, -2);
  scene.add(fill);
}
