import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useCursor } from '@react-three/drei';
import {
  buildImplantPlanGroup,
  DEFAULT_CAMERA,
  disposeGroup,
  findFdiFromObject,
  LIGHT_RIG,
} from '../lib/dental/implantScene';
import type { ToothMark } from '../lib/dental/teeth';

/** The same lighting rig used by the off-screen PDF snapshot (see `LIGHT_RIG` in
 *  `implantScene.ts`), expressed as JSX so the live view and the snapshot match. */
function SceneLights() {
  const { hemisphere, key, fill, rim } = LIGHT_RIG;
  return (
    <>
      <hemisphereLight args={[hemisphere.skyColor, hemisphere.groundColor, hemisphere.intensity]} />
      <directionalLight position={key.position} color={key.color} intensity={key.intensity} />
      <directionalLight position={fill.position} color={fill.color} intensity={fill.intensity} />
      <directionalLight position={rim.position} color={rim.color} intensity={rim.intensity} />
      <ambientLight intensity={0.18} />
    </>
  );
}

/** Builds the plan group via the shared vanilla-Three.js builder (the same one the PDF
 *  snapshot uses) and mounts it into the R3F scene graph as a `<primitive>` — this keeps
 *  tooth geometry defined in exactly one place instead of a second, React-only copy. */
function PlanGroup({ plan, onToggle }: { plan: Record<number, ToothMark>; onToggle?: (fdi: number) => void }) {
  const group = useMemo(() => buildImplantPlanGroup(plan), [plan]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(onToggle));

  // Dispose the previous group's geometries/materials whenever a new one replaces it, and on
  // unmount — mirrors the disposal the old imperative viewer did explicitly.
  useEffect(() => () => disposeGroup(group), [group]);

  if (!onToggle) return <primitive object={group} />;

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const fdi = findFdiFromObject(event.object);
    if (fdi != null) onToggle?.(fdi);
  }

  return (
    <primitive
      object={group}
      onClick={handleClick}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    />
  );
}

/**
 * Live, orbit-controllable 3D view of the implant plan, built on @react-three/fiber +
 * @react-three/drei. `plan` is the wizard's `toothPlan` — the single source of truth also
 * driving the 2D tooth chart — so the marker group rebuilds whenever it changes.
 *
 * `onToggle`, when provided, lets clicking a tooth IN the 3D view cycle its state exactly like
 * clicking its button in the 2D chart (same `CYCLE_TOOTH` action) — one interaction, one state.
 */
export function ImplantMap3D({ plan, onToggle }: { plan: Record<number, ToothMark>; onToggle?: (fdi: number) => void }) {
  return (
    <div className="implant-map-3d">
      <Canvas
        camera={{ position: DEFAULT_CAMERA.position.toArray(), fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0d1526']} />
        <SceneLights />
        <PlanGroup plan={plan} onToggle={onToggle} />
        <OrbitControls
          target={DEFAULT_CAMERA.target.toArray()}
          enableDamping
          minDistance={1.1}
          maxDistance={5}
          maxPolarAngle={Math.PI * 0.9}
        />
      </Canvas>
    </div>
  );
}

export default ImplantMap3D;
