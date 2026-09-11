/**
 * Loads the configured dental arch GLB/GLTF asset. This is the single place the app reaches
 * into `three`'s loaders — both the live viewer (`DentalMap3D`) and the PDF snapshot
 * (`DentalMapSnapshot`) call through here, so there is exactly one loading/caching/disposal
 * code path, mirroring how `implantScene.ts` is the single source of truth for the procedural
 * geometry it replaces.
 *
 * No DRACOLoader is wired in — with no asset in the project yet (Draco-compressed or not),
 * statically importing it pulls its decoder wasm/js into the build as dead weight nobody
 * fetches. If the sourced asset turns out to use Draco compression, add it back here (import
 * `DRACOLoader` from `three/examples/jsm/loaders/DRACOLoader.js`, `setDecoderPath` to
 * `DENTAL_MODEL_DRACO_DECODER_PATH` from `./DentalModelConfig`, and `loader.setDRACOLoader(...)`
 * below) — a few lines, not an architecture change.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let cachedLoader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (cachedLoader) return cachedLoader;
  cachedLoader = new GLTFLoader();
  return cachedLoader;
}

export interface DentalModelHandle {
  /** The loaded model's root — add this directly to a scene (vanilla) or mount it via
   *  `<primitive object={scene} />` (React Three Fiber). */
  scene: THREE.Group;
  /** Disposes every geometry/material under `scene`. Call once the model is no longer shown
   *  (unmount, or before loading a replacement) — GLTFLoader does not track this for you. */
  dispose: () => void;
}

/**
 * Loads `url` and resolves with the model's root group. Rejects (never resolves with a
 * substitute) when the asset is missing or fails to parse — callers must handle that
 * explicitly (see `DentalMap3D`'s fallback) rather than this function silently degrading to a
 * fabricated model.
 */
export function loadDentalModel(url: string): Promise<DentalModelHandle> {
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        resolve({ scene, dispose: () => disposeObject3D(scene) });
      },
      undefined,
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}
