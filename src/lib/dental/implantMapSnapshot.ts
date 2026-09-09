/**
 * Renders the implant-map scene once, off-screen, and returns a PNG data URL for embedding
 * in the Premium Proposal PDF. Uses the same scene builder as the live viewer.
 */
import * as THREE from 'three';
import { addImplantSceneLights, buildImplantPlanGroup, disposeGroup, DEFAULT_CAMERA } from './implantScene';
import type { ToothMark } from './teeth';

export async function renderImplantMapSnapshot(
  plan: Record<number, ToothMark>,
  width = 1600,
  height = 1000,
): Promise<string> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1526');
  addImplantSceneLights(scene);

  const group = buildImplantPlanGroup(plan);
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.copy(DEFAULT_CAMERA.position);
  camera.lookAt(DEFAULT_CAMERA.target);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.render(scene, camera);

  const dataUrl = renderer.domElement.toDataURL('image/png');

  disposeGroup(group);
  renderer.dispose();
  renderer.forceContextLoss();

  return dataUrl;
}
