import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitCameraToObject } from './DentalMapCamera';

describe('fitCameraToObject', () => {
  it('targets the bounding box centre of the object, not the world origin', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.position.set(5, 2, -3);
    const { target } = fitCameraToObject(mesh, 40);
    expect(target.x).toBeCloseTo(5, 5);
    expect(target.y).toBeCloseTo(2, 5);
    expect(target.z).toBeCloseTo(-3, 5);
  });

  it('moves the camera further back for a larger model, so it never ends up inside/cropped', () => {
    const small = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const large = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
    const fitSmall = fitCameraToObject(small, 40);
    const fitLarge = fitCameraToObject(large, 40);
    const distanceSmall = fitSmall.position.distanceTo(fitSmall.target);
    const distanceLarge = fitLarge.position.distanceTo(fitLarge.target);
    expect(distanceLarge).toBeGreaterThan(distanceSmall);
  });

  it('produces an off-axis, elevated position by default — a three-quarter view, not dead-on', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const { position, target } = fitCameraToObject(mesh, 40);
    expect(position.y).toBeGreaterThan(target.y); // elevated
    expect(position.x).not.toBeCloseTo(target.x, 2); // off-axis, not a flat frontal shot
  });
});
