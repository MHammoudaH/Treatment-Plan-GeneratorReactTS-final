/**
 * Renders the GLB-backed dental model once, off-screen, and returns a PNG data URL for the
 * Premium Proposal PDF — the GLB-based counterpart to `../implantMapSnapshot.ts`. Uses the same
 * deterministic presentation camera (`fitCameraToObject`) the live viewer uses, so the PDF never
 * shows a different orientation, a random leftover angle, or a cropped model.
 *
 * Rejects when the configured asset can't be loaded — callers (see `Step4Confirm.tsx`) fall
 * back to the procedural snapshot rather than this function fabricating a substitute image.
 */
import * as THREE from 'three';
import { loadDentalModel } from './DentalModelLoader';
import { indexToothNodes } from './ToothInteraction';
import { applyTreatmentState } from './TreatmentVisualization';
import { fitCameraToObject } from './DentalMapCamera';
import { DENTAL_MODEL_URL } from './DentalModelConfig';
import type { ToothMark } from '../teeth';

const SNAPSHOT_FOV = 40;

function addDentalSceneLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x39302f, 0.9));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.4);
  key.position.set(2, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55);
  fill.position.set(-2.5, 1.5, -1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0, 1.5, -3);
  scene.add(rim);
}

export async function renderDentalMapSnapshot(plan: Record<number, ToothMark>, width = 1600, height = 1000): Promise<string> {
  const { scene: model, dispose } = await loadDentalModel(DENTAL_MODEL_URL);
  const toothNodes = indexToothNodes(model);
  applyTreatmentState(toothNodes, plan);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1526');
  addDentalSceneLights(scene);
  scene.add(model);

  const { position, target } = fitCameraToObject(model, SNAPSHOT_FOV);
  const camera = new THREE.PerspectiveCamera(SNAPSHOT_FOV, width / height, 0.01, 100);
  camera.position.copy(position);
  camera.lookAt(target);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.render(scene, camera);

  const dataUrl = renderer.domElement.toDataURL('image/png');

  dispose();
  renderer.dispose();
  renderer.forceContextLoss();

  return dataUrl;
}
