/**
 * Computes a camera position/target that frames a loaded model's full bounding box from a
 * fixed, slightly-elevated three-quarter angle. Used for BOTH the live viewer's default camera
 * and the PDF snapshot's presentation camera, so the two are never out of sync — and the
 * framing is always correct for the model's actual size, not a hardcoded guess tuned for one
 * specific asset (which is exactly the "random/back-facing/sideways" risk a fixed constant
 * camera runs if the eventual asset's scale or pivot differs from what was assumed).
 */
import * as THREE from 'three';

export interface CameraFit {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface CameraFitOptions {
  /** Radians above the horizontal — 0 is a flat frontal view, PI/2 is straight down. */
  elevation?: number;
  /** Radians off the centre axis — 0 is dead-on, nonzero gives a three-quarter view. */
  azimuth?: number;
  /** Extra breathing room around the model's bounding box (1 = exactly touching the frame). */
  padding?: number;
}

const DEFAULT_OPTIONS: Required<CameraFitOptions> = {
  elevation: 0.32,
  azimuth: 0.55,
  padding: 1.25,
};

/** Frames `object`'s full bounding box for a camera with vertical field-of-view `fovDegrees`. */
export function fitCameraToObject(object: THREE.Object3D, fovDegrees: number, options?: CameraFitOptions): CameraFit {
  const { elevation, azimuth, padding } = { ...DEFAULT_OPTIONS, ...options };

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const fitDistance = (maxDim * padding) / (2 * Math.tan((fovDegrees * Math.PI) / 360));

  const direction = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  );

  const position = center.clone().add(direction.multiplyScalar(fitDistance));
  return { position, target: center };
}
