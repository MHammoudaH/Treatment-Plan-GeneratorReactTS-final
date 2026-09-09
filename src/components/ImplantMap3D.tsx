import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addImplantSceneLights, buildImplantPlanGroup, disposeGroup, DEFAULT_CAMERA } from '../lib/dental/implantScene';
import type { ToothMark } from '../lib/dental/teeth';

/** Live, orbit-controllable 3D view of the implant plan. `plan` is the wizard's `toothPlan`
 *  (a fresh object on every edit), so the marker group rebuilds whenever it changes. */
export function ImplantMap3D({ plan }: { plan: Record<number, ToothMark> }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const planGroupRef = useRef<THREE.Group | null>(null);

  // One-time scene / renderer / controls setup.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1526');
    addImplantSceneLights(scene);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(DEFAULT_CAMERA.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_CAMERA.target);
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI * 0.95;
    controls.update();

    let frame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (planGroupRef.current) {
        scene.remove(planGroupRef.current);
        disposeGroup(planGroupRef.current);
        planGroupRef.current = null;
      }
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // Rebuild the marker group whenever the plan changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (planGroupRef.current) {
      scene.remove(planGroupRef.current);
      disposeGroup(planGroupRef.current);
    }
    const group = buildImplantPlanGroup(plan);
    planGroupRef.current = group;
    scene.add(group);
  }, [plan]);

  return <div ref={mountRef} className="implant-map-3d" />;
}

export default ImplantMap3D;
