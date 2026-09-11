/**
 * Procedural 3D dental-arch scene for the implant map.
 *
 * No model asset: the two arches are built from ~16 stylised teeth each, laid out along a
 * parabola. Each tooth position is rendered according to its `ToothMark` (see `teeth.ts`) so
 * the five concepts a treatment plan can contain are visually distinct:
 *
 *   natural tooth        — tooth-coloured crown cap + a hinted root, matte/translucent.
 *   crown on natural      — coloured crown cap (amber) + the same natural root beneath it.
 *   implant, no crown yet — titanium fixture + abutment + a small metal healing cap.
 *   implant-supported crown — fixture + abutment + a full crown cap (violet — distinct from
 *                              both the natural-tooth crown colour and the bare-implant metal).
 *   bridge unit            — a teal crown cap; adjacent bridge positions are additionally
 *                             joined by a connecting bar, since a bridge spans several teeth.
 *
 * Shared by the live viewer (`ImplantMap3D`) and the PDF snapshot (`renderImplantMapSnapshot`)
 * so both look identical. This is a representation of the coordinator's entered treatment
 * plan, not a clinical determination of exact tooth positions.
 */
import * as THREE from 'three';
import { LOWER_FDI, MARK_COLORS, markHasCrown, markHasImplant, UPPER_FDI, type ToothMark } from './teeth';

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

/** A tooth-like crown silhouette: wider at the biting surface, tapering toward the gumline —
 *  reads as a tooth, not a uniform pill/capsule. */
function crownGeometry(radius: number): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(radius, radius * 0.62, 0.13, 12);
}

/** A hinted natural root beneath the gumline. Only drawn for un-implanted positions — an
 *  implant's metal fixture takes this role instead, which is itself part of the "implant vs
 *  natural tooth" visual distinction. */
function rootGeometry(radius: number): THREE.ConeGeometry {
  return new THREE.ConeGeometry(radius * 0.55, 0.16, 10);
}

/** Low dome over a bare (not yet crowned) implant abutment — a "healing cap", not a crown. */
function healingCapGeometry(radius: number): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius * 0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
}

function crownColorFor(mark: ToothMark | undefined): string {
  if (mark === 'crown') return MARK_COLORS.crown;
  if (mark === 'implant-crown') return MARK_COLORS.implantCrown;
  if (mark === 'bridge') return MARK_COLORS.bridge;
  return MARK_COLORS.tooth;
}

function makeTooth(fdi: number, mark: ToothMark | undefined, archY: number, crownSign: number): THREE.Group {
  const group = new THREE.Group();
  const radius = toothRadius(fdi);
  const implanted = markHasImplant(mark);
  const crowned = markHasCrown(mark) || mark === 'bridge';

  if (crowned || !mark) {
    // Crown / visible cap: natural tooth, crown-on-natural, implant-supported crown, or a
    // bridge unit. Colour + gloss are the primary way the five states read apart at a glance.
    const crown = new THREE.Mesh(
      crownGeometry(radius),
      new THREE.MeshStandardMaterial({
        color: crownColorFor(mark),
        roughness: mark ? 0.28 : 0.6,
        metalness: 0,
        transparent: !mark,
        opacity: mark ? 1 : 0.82,
      }),
    );
    crown.position.y = crownSign * 0.09;
    crown.userData.crownCap = true;
    group.add(crown);
  }

  if (implanted) {
    // Titanium fixture, driven into the "bone" behind the gum.
    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.02, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: MARK_COLORS.metal, roughness: 0.3, metalness: 0.9 }),
    );
    fixture.position.y = -crownSign * 0.14;
    group.add(fixture);

    const abutment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: '#d7dbe1', roughness: 0.35, metalness: 0.8 }),
    );
    abutment.position.y = -crownSign * 0.03;
    group.add(abutment);

    if (mark === 'implant') {
      // No crown yet — a small metal healing cap, not a coloured crown, communicates
      // "implant placed, not yet restored" (distinct from an implant-supported crown).
      const healingCap = new THREE.Mesh(
        healingCapGeometry(radius),
        new THREE.MeshStandardMaterial({ color: MARK_COLORS.metal, roughness: 0.25, metalness: 0.85 }),
      );
      healingCap.rotation.x = crownSign > 0 ? Math.PI : 0;
      healingCap.position.y = crownSign * 0.05;
      group.add(healingCap);
    }
  } else if (mark !== 'bridge') {
    // Natural root — reinforces "this is a real tooth", not an implant fixture. Bridge units
    // are pontics (no root of their own), so they skip this.
    const root = new THREE.Mesh(
      rootGeometry(radius),
      new THREE.MeshStandardMaterial({ color: '#e9e2d3', roughness: 0.7, metalness: 0 }),
    );
    root.rotation.x = crownSign > 0 ? 0 : Math.PI;
    root.position.y = -crownSign * 0.13;
    group.add(root);
  }

  const { x, z } = columnPoint(0); // placeholder; real placement done by caller
  group.position.set(x, archY, z);
  return group;
}

/** Adjacent `'bridge'`-marked positions are visually joined by a connecting bar, since a real
 *  bridge spans several teeth rather than being isolated restorations. A run of length 1 gets
 *  no bar (nothing to connect to) — it still renders as a bridge-coloured crown cap. */
function bridgeConnectorBars(fdiList: number[], plan: Record<number, ToothMark>, archY: number, crownSign: number): THREE.Mesh[] {
  const bars: THREE.Mesh[] = [];
  let runStart: number | null = null;

  const closeRun = (runEndExclusive: number) => {
    if (runStart === null) return;
    const runEnd = runEndExclusive - 1;
    if (runEnd > runStart) {
      const a = columnPoint(runStart);
      const b = columnPoint(runEnd);
      const length = Math.hypot(b.x - a.x, b.z - a.z) + toothRadius(fdiList[runStart]);
      const angle = Math.atan2(b.z - a.z, b.x - a.x);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.045, 0.05),
        new THREE.MeshStandardMaterial({ color: MARK_COLORS.bridge, roughness: 0.3, metalness: 0 }),
      );
      bar.position.set((a.x + b.x) / 2, archY + crownSign * 0.09, (a.z + b.z) / 2);
      bar.rotation.y = -angle;
      bars.push(bar);
    }
    runStart = null;
  };

  fdiList.forEach((fdi, column) => {
    if (plan[fdi] === 'bridge') {
      if (runStart === null) runStart = column;
    } else {
      closeRun(column);
    }
  });
  closeRun(fdiList.length);

  return bars;
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
  for (const bar of bridgeConnectorBars(fdiList, plan, archY, crownSign)) arch.add(bar);
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
