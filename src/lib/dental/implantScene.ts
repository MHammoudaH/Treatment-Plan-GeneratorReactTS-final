/**
 * Procedural 3D dental-arch scene for the implant map.
 *
 * Deliberately a PLAIN Three.js module (no React) — it is the single geometry source of
 * truth, reused by both the live viewer (`ImplantMap3D`, built on @react-three/fiber via a
 * `<primitive>`) and the off-screen PDF snapshot (`renderImplantMapSnapshot`), so the two
 * always look identical and there is exactly one place tooth geometry is defined.
 *
 * No model asset: each arch is built from 16 procedurally-shaped teeth (a different silhouette
 * per tooth type — incisor / canine / premolar / molar, not a repeated primitive) laid out
 * along a proper parametric arch curve, plus a continuous swept gingiva ridge (not a tube).
 * Every tooth position renders according to its `ToothMark` (see `teeth.ts`):
 *
 *   natural tooth            — ivory crown + a root hinted below the gumline.
 *   crown on natural tooth   — amber crown + the same natural root beneath it.
 *   implant, no crown yet    — titanium fixture + abutment + a small metal healing cap.
 *   implant-supported crown  — fixture + abutment + a full crown (violet — distinct from both
 *                               the natural-tooth crown colour and the bare-implant metal).
 *   bridge unit               — a teal crown; adjacent bridge positions are additionally
 *                                joined by a connecting bar, since a bridge spans several teeth.
 *   missing                   — no crown/root/implant; a flat healed-ridge marker only.
 *
 * This is a representation of the coordinator's entered treatment plan for coordinators and
 * patients, not a clinically diagnostic model.
 */
import * as THREE from 'three';
import { LOWER_FDI, MARK_COLORS, markHasCrown, markHasImplant, UPPER_FDI, type ToothMark } from './teeth';

/** Recommended camera framing for a three-quarter presentation view. */
export const DEFAULT_CAMERA = {
  position: new THREE.Vector3(0, 0.78, 2.1),
  target: new THREE.Vector3(0, 0.02, 0),
};

/** Shared lighting rig config — consumed by `addImplantSceneLights` (vanilla / snapshot path)
 *  and mirrored as JSX in `ImplantMap3D` (live @react-three/fiber path) so both match. */
export const LIGHT_RIG = {
  hemisphere: { skyColor: 0xffffff, groundColor: 0x39302f, intensity: 0.9 },
  key: { color: 0xfff4e6, intensity: 1.4, position: [2, 4, 3] as [number, number, number] },
  fill: { color: 0xdfe8ff, intensity: 0.55, position: [-2.5, 1.5, -1.5] as [number, number, number] },
  rim: { color: 0xffffff, intensity: 0.35, position: [0, 1.5, -3] as [number, number, number] },
};

// ---------------------------------------------------------------------------------------
// Arch geometry: a proper parametric curve (not an ad-hoc quadratic) so teeth get even
// arc-length spacing (no crowding/giant-gaps) AND an outward-facing rotation for free.
// ---------------------------------------------------------------------------------------

const ARCH_HALF_WIDTH = 1.0;
const ARCH_DEPTH = 0.85;
/** Half-sweep angle (radians) each side of the midline — tuned for a natural, not
 *  exaggerated, arch (~66° each side, ~132° total, within normal dental-arch proportions). */
const ARCH_SWEEP = 1.15;
const UPPER_GUM_Y = 0.33;
const LOWER_GUM_Y = -0.33;

interface ArchPoint {
  x: number;
  z: number;
  /** Rotation (radians) around Y so a tooth at this point faces outward along the curve,
   *  instead of every tooth facing the same global direction. */
  rotationY: number;
}

/** `t` in [-1, 1]: -1 = right-most molar, 0 = central incisors, 1 = left-most molar. */
function archPoint(t: number): ArchPoint {
  const angle = t * ARCH_SWEEP;
  return {
    x: Math.sin(angle) * ARCH_HALF_WIDTH,
    z: ARCH_DEPTH * (1 - Math.cos(angle)) - ARCH_DEPTH * 0.32,
    rotationY: angle,
  };
}

function columnT(column: number): number {
  return (column / 15) * 2 - 1;
}

function toothTypeFor(fdi: number): 'incisor' | 'canine' | 'premolar' | 'molar' {
  const position = fdi % 10;
  if (position <= 2) return 'incisor';
  if (position === 3) return 'canine';
  if (position <= 5) return 'premolar';
  return 'molar';
}

function toothRadius(fdi: number): number {
  switch (toothTypeFor(fdi)) {
    case 'molar':
      return 0.08;
    case 'premolar':
      return 0.062;
    case 'canine':
      return 0.052;
    default:
      return 0.045;
  }
}

// ---------------------------------------------------------------------------------------
// Materials — created once and reused across every tooth (cheap, avoids per-mesh churn).
// ---------------------------------------------------------------------------------------

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function material(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const cached = materialCache.get(key);
  if (cached) return cached;
  const mat = new THREE.MeshStandardMaterial(params);
  materialCache.set(key, mat);
  return mat;
}

function crownMaterial(mark: ToothMark | undefined): THREE.MeshStandardMaterial {
  if (mark === 'crown') return material('crown', { color: MARK_COLORS.crown, roughness: 0.22, metalness: 0.05 });
  if (mark === 'implant-crown') return material('implantCrown', { color: MARK_COLORS.implantCrown, roughness: 0.22, metalness: 0.05 });
  if (mark === 'bridge') return material('bridge', { color: MARK_COLORS.bridge, roughness: 0.22, metalness: 0.05 });
  return material('naturalTooth', { color: MARK_COLORS.tooth, roughness: 0.32, metalness: 0 });
}

const rootMaterial = () => material('root', { color: '#eee4d3', roughness: 0.55, metalness: 0 });
const gumMaterial = () => material('gum', { color: MARK_COLORS.gum, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
const fixtureMaterial = () => material('fixture', { color: MARK_COLORS.metal, roughness: 0.28, metalness: 0.9 });
const abutmentMaterial = () => material('abutment', { color: '#dfe2e6', roughness: 0.3, metalness: 0.85 });
const missingMaterial = () => material('missing', { color: MARK_COLORS.missing, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.5 });

// ---------------------------------------------------------------------------------------
// Per-tooth-type crown geometry. Built from tapered cylinders (inherently smooth/rounded
// cross-sections) with type-specific proportions and a non-uniform scale — recognizable
// tooth silhouettes without needing hand-authored anatomical meshes.
// ---------------------------------------------------------------------------------------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function cachedGeometry(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const geo = build();
  geometryCache.set(key, geo);
  return geo;
}

// Every part below is built with its REAL final dimensions baked directly into the
// geometry's constructor args (radius/height in world units), never a unit placeholder
// stretched afterward via a mismatched non-uniform `.scale()` — mixing a base geometry's own
// proportions with unrelated per-axis scale factors is exactly what produced needle-thin,
// wildly oversized spikes in an earlier version of this file. Geometries are still cached,
// keyed by tooth TYPE (not by individual fdi) — `toothRadius` is already a pure function of
// tooth type, so every tooth of the same type shares one real-size geometry instance.

const CROWN_HEIGHT: Record<'incisor' | 'canine' | 'premolar' | 'molar', number> = {
  incisor: 0.15,
  canine: 0.185,
  premolar: 0.15,
  molar: 0.135,
};
const ROOT_HEIGHT = 0.09;
const ABUTMENT_HEIGHT = 0.045;
// A stylised, stout post rather than a literal-mm-scale implant — a thin, tall cylinder
// reads as a "floating spike" at this model's size, which is exactly the look to avoid.
// Kept, together with ABUTMENT_HEIGHT, shorter than the gingiva ridge's own base depth (see
// `gingivaCrossSection`) so the fixture stays embedded inside the ridge instead of poking out
// the far side into open air, which reads as a disconnected floating spike above/below the arch.
const FIXTURE_HEIGHT = 0.075;

function crownGeometryFor(fdi: number, variant: 'natural' | 'bridge' = 'natural'): { geometry: THREE.BufferGeometry; height: number } {
  const type = toothTypeFor(fdi);
  const radius = toothRadius(fdi);
  const height = CROWN_HEIGHT[type];
  const cacheKey = variant === 'bridge' ? `bridge-crown-${type}` : `crown-${type}`;
  const geometry = cachedGeometry(cacheKey, () => {
    if (variant === 'bridge') {
      // A bridge/pontic unit reads better as a solid, fuller block than a natural tooth's
      // sharp cusp taper — the incisor/canine shapes below are thin enough (a blade, a
      // pointed cusp) that combined with a connecting bar they read as spindly "table legs"
      // rather than a connected restoration. Every bridge unit shares one wide, un-flattened
      // profile regardless of tooth type, so the whole span reads as one fused structure.
      return new THREE.CylinderGeometry(radius * 0.92, radius * 0.78, height, 12);
    }
    switch (type) {
      case 'incisor': {
        // Narrow, blade-like: a tapered cylinder flattened mesio-distally.
        const geo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.42, height, 10);
        geo.scale(1, 1, 0.55);
        return geo;
      }
      case 'canine': {
        // Single pointed cusp, taller than the incisors, slightly flattened.
        const geo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.58, height, 10);
        geo.scale(1, 1, 0.82);
        return geo;
      }
      case 'premolar':
        return new THREE.CylinderGeometry(radius * 0.82, radius * 0.68, height, 10);
      case 'molar':
      default:
        return new THREE.CylinderGeometry(radius * 1.0, radius * 0.8, height, 12);
    }
  });
  return { geometry, height };
}

function rootGeometryFor(fdi: number): THREE.BufferGeometry {
  const type = toothTypeFor(fdi);
  return cachedGeometry(`root-${type}`, () => new THREE.ConeGeometry(toothRadius(fdi) * 0.55, ROOT_HEIGHT, 10));
}

function fixtureGeometryFor(fdi: number): THREE.BufferGeometry {
  const type = toothTypeFor(fdi);
  const r = toothRadius(fdi) * 0.5;
  return cachedGeometry(`fixture-${type}`, () => new THREE.CylinderGeometry(r * 0.8, r, FIXTURE_HEIGHT, 14));
}

function abutmentGeometryFor(fdi: number): THREE.BufferGeometry {
  const type = toothTypeFor(fdi);
  const r = toothRadius(fdi) * 0.42;
  return cachedGeometry(`abutment-${type}`, () => new THREE.CylinderGeometry(r * 0.65, r, ABUTMENT_HEIGHT, 12));
}

function healingCapRadius(fdi: number): number {
  return toothRadius(fdi) * 0.5;
}

function healingCapGeometryFor(fdi: number): THREE.BufferGeometry {
  const type = toothTypeFor(fdi);
  return cachedGeometry(`healingCap-${type}`, () => new THREE.SphereGeometry(healingCapRadius(fdi), 12, 8, 0, Math.PI * 2, 0, Math.PI / 2));
}

function missingMarkerGeometryFor(fdi: number): THREE.BufferGeometry {
  const type = toothTypeFor(fdi);
  const radius = toothRadius(fdi);
  return cachedGeometry(`missing-${type}`, () => new THREE.CylinderGeometry(radius * 0.85, radius * 0.65, 0.012, 16));
}

// ---------------------------------------------------------------------------------------
// One tooth position: composes crown / root / implant stack directly on top of one another
// (no gaps), oriented so the crown always sits at the gumline and never floats independently
// of its implant.
// ---------------------------------------------------------------------------------------

/** `flip` mirrors an asymmetric mesh (root/crown taper, healing cap) so its "away from the
 *  gumline" end still points away from the gumline on both the upper and lower arch. */
function orient(mesh: THREE.Object3D, flip: boolean): void {
  if (flip) mesh.rotation.x = Math.PI;
}

function makeTooth(fdi: number, mark: ToothMark | undefined, gumY: number, crownSign: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const flip = crownSign < 0; // upper arch: meshes' natural "outward" end points +Y, needs flipping to point down

  if (mark === 'missing') {
    // Healed ridge marker — flat, low-profile, semi-transparent. Still a real mesh (not
    // nothing) so the position remains clickable and reads as an intentional "no tooth here"
    // rather than a rendering gap.
    const marker = new THREE.Mesh(missingMarkerGeometryFor(fdi), missingMaterial());
    marker.userData.part = 'missing-marker';
    group.add(marker);
    group.userData.fdi = fdi;
    group.position.y = gumY;
    return group;
  }

  const implanted = markHasImplant(mark);
  const crowned = markHasCrown(mark) || mark === 'bridge';

  // Every part in the stack grows from Y=0 (the gumline): the crown grows OUTWARD in the
  // `crownSign` direction (into the mouth), while the abutment/fixture/root grow INWARD in
  // the opposite (`-crownSign`) direction (into the bone) — so the crown's cervical edge,
  // the abutment's coronal end and the root's cervical end all meet at exactly Y=0, with no
  // gap and nothing floating apart from anything else in the stack.
  if (crowned || !mark) {
    const { geometry, height } = crownGeometryFor(fdi, mark === 'bridge' ? 'bridge' : 'natural');
    const crown = new THREE.Mesh(geometry, crownMaterial(mark));
    orient(crown, flip);
    crown.position.y = crownSign * (height / 2);
    if (!mark) {
      crown.material = (crown.material as THREE.MeshStandardMaterial).clone();
      (crown.material as THREE.MeshStandardMaterial).transparent = true;
      (crown.material as THREE.MeshStandardMaterial).opacity = 0.88;
    }
    // Distinguish an actual crown RESTORATION (markHasCrown) from a bridge unit's cap and
    // from a natural, untouched tooth's own (visible but unrestored) crown — every tooth has
    // a "clinical crown" mesh here, but only the first is a billable/planned crown.
    crown.userData.part = mark === 'bridge' ? 'bridge-crown' : markHasCrown(mark) ? 'crown' : 'natural-crown';
    group.add(crown);
  }

  if (implanted) {
    const abutment = new THREE.Mesh(abutmentGeometryFor(fdi), abutmentMaterial());
    orient(abutment, flip);
    // Its narrow (coronal) end sits exactly at Y=0, touching the crown's cervical edge.
    abutment.position.y = -crownSign * (ABUTMENT_HEIGHT / 2);
    abutment.userData.part = 'abutment';
    group.add(abutment);

    const fixture = new THREE.Mesh(fixtureGeometryFor(fdi), fixtureMaterial());
    orient(fixture, flip);
    // Continues from the abutment's far (bone-side) end — never appears below/apart from
    // the crown, since it is anchored relative to the SAME Y=0 reference, not an estimate.
    fixture.position.y = -crownSign * (ABUTMENT_HEIGHT + FIXTURE_HEIGHT / 2);
    fixture.userData.part = 'fixture';
    group.add(fixture);

    if (mark === 'implant') {
      // No crown yet — a small metal healing cap pokes through the gum instead.
      const cap = new THREE.Mesh(healingCapGeometryFor(fdi), material('healingCap', { color: MARK_COLORS.metal, roughness: 0.25, metalness: 0.85 }));
      orient(cap, flip);
      cap.position.y = crownSign * (healingCapRadius(fdi) * 0.5);
      cap.userData.part = 'healing-cap';
      group.add(cap);
    }
  } else if (mark !== 'bridge') {
    // Natural root: its wide (cervical) end sits at Y=0, continuing from the crown, tapering
    // to a point further into the gum/bone in the opposite direction from the crown.
    const root = new THREE.Mesh(rootGeometryFor(fdi), rootMaterial());
    orient(root, !flip); // a cone's apex/base convention is inverted relative to the cylinders above
    root.position.y = -crownSign * (ROOT_HEIGHT / 2);
    root.userData.part = 'root';
    group.add(root);
  }

  group.userData.fdi = fdi;
  group.position.y = gumY;
  return group;
}

// ---------------------------------------------------------------------------------------
// Gingiva: a continuous swept ridge, built as a manual loft rather than
// THREE.ExtrudeGeometry's `extrudePath` (which orients its cross-section using automatically
// computed Frenet frames — a mechanism that is well-behaved for many curves but can twist
// unpredictably, and cannot be visually re-checked in this environment). Lofting by hand
// keeps the cross-section's vertical axis pinned to world Y explicitly, so the result is
// deterministic: a continuous gum-tissue ridge, not a pipe, that never twists along the arch.
// ---------------------------------------------------------------------------------------

interface CrossSectionPoint {
  /** Lateral offset, perpendicular to the arch direction. */
  u: number;
  /** Vertical offset ALONG THE TOOTH'S OWN AXIS: positive = toward the crown (the crest
   *  nearest the tooth), negative = away from the crown, into the bone. Combined with
   *  `crownSign` this maps correctly to world Y for both arches — see `buildGingivaRidge`. */
  v: number;
}

/** A rounded ridge profile — wider than tall, a small crest nearest the tooth tapering into a
 *  broader base. Closed loop, lateral (u) symmetric. The base reaches deeper (v: -0.15) than
 *  ABUTMENT_HEIGHT + FIXTURE_HEIGHT combined, so a full implant stack stays embedded inside the
 *  ridge's own volume instead of poking out the far side into open air. */
function gingivaCrossSection(): CrossSectionPoint[] {
  return [
    { u: -0.1, v: 0.015 },
    { u: -0.085, v: 0.045 },
    { u: -0.03, v: 0.055 },
    { u: 0, v: 0.058 },
    { u: 0.03, v: 0.055 },
    { u: 0.085, v: 0.045 },
    { u: 0.1, v: 0.015 },
    { u: 0.11, v: -0.11 },
    { u: 0, v: -0.15 },
    { u: -0.11, v: -0.11 },
  ];
}

function buildGingivaRidge(fdiList: readonly number[], gumY: number, crownSign: 1 | -1): THREE.Mesh {
  // Sample the arch curve (in the XZ plane) a couple of columns past each end so the ridge
  // extends slightly beyond the last molar.
  const controlPoints: THREE.Vector3[] = [];
  const columns = [-0.6, ...fdiList.map((_, i) => i), fdiList.length - 1 + 0.6];
  for (const column of columns) {
    const { x, z } = archPoint(columnT(column));
    controlPoints.push(new THREE.Vector3(x, 0, z));
  }
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);

  const cross = gingivaCrossSection();
  const ringCount = cross.length;
  const steps = 96;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    // 90° rotation of the (planar, XZ) tangent — the lateral direction of the ridge.
    const sideX = tangent.z;
    const sideZ = -tangent.x;

    for (const cp of cross) {
      positions.push(point.x + sideX * cp.u, gumY + crownSign * cp.v, point.z + sideZ * cp.u);
    }

    if (step > 0) {
      const prevBase = (step - 1) * ringCount;
      const base = step * ringCount;
      for (let i = 0; i < ringCount; i++) {
        const next = (i + 1) % ringCount;
        indices.push(prevBase + i, base + i, base + next, prevBase + i, base + next, prevBase + next);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, gumMaterial());
  mesh.userData.part = 'gingiva';
  return mesh;
}

// ---------------------------------------------------------------------------------------
// Bridge connector bars — join adjacent 'bridge' positions since a bridge spans several teeth.
// ---------------------------------------------------------------------------------------

function bridgeConnectorBars(fdiList: readonly number[], plan: Record<number, ToothMark>, gumY: number, crownSign: number): THREE.Mesh[] {
  const bars: THREE.Mesh[] = [];
  let runStart: number | null = null;

  const closeRun = (runEndExclusive: number) => {
    if (runStart === null) return;
    const runEnd = runEndExclusive - 1;
    if (runEnd > runStart) {
      const a = archPoint(columnT(runStart));
      const b = archPoint(columnT(runEnd));
      const startRadius = toothRadius(fdiList[runStart]);
      const endRadius = toothRadius(fdiList[runEnd]);
      const avgRadius = (startRadius + endRadius) / 2;
      const avgHeight = (CROWN_HEIGHT[toothTypeFor(fdiList[runStart])] + CROWN_HEIGHT[toothTypeFor(fdiList[runEnd])]) / 2;
      const length = Math.hypot(b.x - a.x, b.z - a.z) + avgRadius * 1.8;
      const angle = Math.atan2(b.z - a.z, b.x - a.x);
      // Chunky enough (height/depth scaled off the crowns' own radius) to visually fuse with
      // the wide bridge-crown units it connects, and centred low — near the gumline, where a
      // real bridge's connector sits — rather than floating above them like a tabletop over
      // separate legs. It overlaps well into each crown's own cervical mass, so the whole
      // span reads as one connected restoration.
      const bar = new THREE.Mesh(
        cachedGeometry('bridgeBar', () => new THREE.BoxGeometry(1, 1, 1)),
        material('bridge', { color: MARK_COLORS.bridge, roughness: 0.22, metalness: 0.05 }),
      );
      bar.scale.set(length, avgRadius * 1.5, avgRadius * 1.3);
      bar.position.set((a.x + b.x) / 2, gumY + crownSign * avgHeight * 0.3, (a.z + b.z) / 2);
      bar.userData.part = 'bridge-connector';
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

// ---------------------------------------------------------------------------------------
// Whole-arch / whole-plan assembly
// ---------------------------------------------------------------------------------------

function buildArch(fdiList: readonly number[], plan: Record<number, ToothMark>, gumY: number, crownSign: 1 | -1): THREE.Group {
  const arch = new THREE.Group();
  arch.add(buildGingivaRidge(fdiList, gumY, crownSign));

  fdiList.forEach((fdi, column) => {
    const tooth = makeTooth(fdi, plan[fdi], gumY, crownSign);
    const { x, z, rotationY } = archPoint(columnT(column));
    tooth.position.x = x;
    tooth.position.z = z;
    tooth.rotation.y = rotationY;
    arch.add(tooth);
  });

  for (const bar of bridgeConnectorBars(fdiList, plan, gumY, crownSign)) arch.add(bar);
  return arch;
}

/** Builds the full implant-map group (both arches + all marked teeth) for `plan`. */
export function buildImplantPlanGroup(plan: Record<number, ToothMark>): THREE.Group {
  const group = new THREE.Group();
  group.add(buildArch(UPPER_FDI, plan, UPPER_GUM_Y, -1)); // upper crowns hang down
  group.add(buildArch(LOWER_FDI, plan, LOWER_GUM_Y, 1)); // lower crowns point up
  return group;
}

/** Walks up from a raycast-hit object to find the tooth group's FDI number, or null if the
 *  hit wasn't part of a tooth (e.g. the gingiva mesh). Used to route 3D clicks to the same
 *  `CYCLE_TOOTH` action the 2D tooth chart uses — one interaction, one state. */
export function findFdiFromObject(object: THREE.Object3D | null): number | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const fdi = node.userData?.fdi;
    if (typeof fdi === 'number') return fdi;
    node = node.parent;
  }
  return null;
}

/** Disposes every geometry and material under `object` that ISN'T one of the shared cached
 *  instances (geometry/material are reused across teeth — see the caches above — so only the
 *  per-instance clones, e.g. the natural-tooth translucency clone, actually need disposing;
 *  disposing a shared cached resource here would break every other still-visible tooth). */
export function disposeGroup(object: THREE.Object3D): void {
  const sharedGeometries = new Set(geometryCache.values());
  const sharedMaterials = new Set(materialCache.values());
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && !sharedGeometries.has(mesh.geometry)) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const disposeOne = (m: THREE.Material) => {
      if (!sharedMaterials.has(m as THREE.MeshStandardMaterial)) m.dispose();
    };
    if (Array.isArray(mat)) mat.forEach(disposeOne);
    else if (mat) disposeOne(mat);
  });
}

/** Adds the standard lighting rig used by the off-screen PDF snapshot (the live viewer uses
 *  the same values as JSX lights — see `LIGHT_RIG`). */
export function addImplantSceneLights(scene: THREE.Scene): void {
  const { hemisphere, key, fill, rim } = LIGHT_RIG;
  scene.add(new THREE.HemisphereLight(hemisphere.skyColor, hemisphere.groundColor, hemisphere.intensity));
  const keyLight = new THREE.DirectionalLight(key.color, key.intensity);
  keyLight.position.set(...key.position);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(fill.color, fill.intensity);
  fillLight.position.set(...fill.position);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(rim.color, rim.intensity);
  rimLight.position.set(...rim.position);
  scene.add(rimLight);
}
