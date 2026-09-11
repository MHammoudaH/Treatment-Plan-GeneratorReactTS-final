import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useCursor } from '@react-three/drei';
import type * as THREE from 'three';
import { loadDentalModel } from '../lib/dental/gltf/DentalModelLoader';
import { indexToothNodes, resolveToothNumber } from '../lib/dental/gltf/ToothInteraction';
import { applyTreatmentState } from '../lib/dental/gltf/TreatmentVisualization';
import { fitCameraToObject } from '../lib/dental/gltf/DentalMapCamera';
import { DENTAL_MODEL_URL } from '../lib/dental/gltf/DentalModelConfig';
import type { ToothMark } from '../lib/dental/teeth';
// The existing procedural renderer — kept completely unchanged, and used as the visual
// fallback for as long as no GLB asset exists at DENTAL_MODEL_URL. See DENTAL_MODEL_ASSET.md.
import ImplantMap3D from './ImplantMap3D';

const FOV = 40;

type LoadState = { status: 'loading' } | { status: 'ready'; model: THREE.Group } | { status: 'missing' };

function useDentalModel(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadDentalModel(DENTAL_MODEL_URL)
      .then(({ scene }) => {
        if (!cancelled) setState({ status: 'ready', model: scene });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

function ModelGroup({
  model,
  plan,
  onToggle,
}: {
  model: THREE.Group;
  plan: Record<number, ToothMark>;
  onToggle?: (fdi: number) => void;
}) {
  const toothNodes = useMemo(() => indexToothNodes(model), [model]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(onToggle));

  useEffect(() => {
    applyTreatmentState(toothNodes, plan);
  }, [toothNodes, plan]);

  if (!onToggle) return <primitive object={model} />;

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const fdi = resolveToothNumber(event.object);
    if (fdi != null) onToggle?.(fdi);
  }

  return (
    <primitive
      object={model}
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
 * GLB/GLTF-backed dental arch viewer — the intended replacement for the procedural
 * `ImplantMap3D` once a real asset exists. Loads the configured model (`DENTAL_MODEL_URL`);
 * `plan` (the wizard's `toothPlan`, same source of truth as the 2D chart) drives which parts of
 * the model are shown via `applyTreatmentState` — this component makes no clinical or pricing
 * decisions of its own. `onToggle`, when provided, routes a tooth click to the same
 * `CYCLE_TOOTH` action the 2D chart and the procedural 3D view use.
 *
 * Until a GLB is placed at `DENTAL_MODEL_URL`, this renders the existing procedural view
 * unchanged — see `DENTAL_MODEL_ASSET.md` for exactly what asset is needed and where it goes.
 */
export function DentalMap3D({ plan, onToggle }: { plan: Record<number, ToothMark>; onToggle?: (fdi: number) => void }) {
  const state = useDentalModel();

  if (state.status === 'missing') return <ImplantMap3D plan={plan} onToggle={onToggle} />;
  if (state.status === 'loading') return <div className="implant-map-3d" />;

  const { position, target } = fitCameraToObject(state.model, FOV);

  return (
    <div className="implant-map-3d">
      <Canvas camera={{ position: position.toArray(), fov: FOV, near: 0.01, far: 100 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#0d1526']} />
        <hemisphereLight args={[0xffffff, 0x39302f, 0.9]} />
        <directionalLight position={[2, 4, 3]} color={0xfff4e6} intensity={1.4} />
        <directionalLight position={[-2.5, 1.5, -1.5]} color={0xdfe8ff} intensity={0.55} />
        <directionalLight position={[0, 1.5, -3]} color={0xffffff} intensity={0.35} />
        <ambientLight intensity={0.18} />
        <ModelGroup model={state.model} plan={plan} onToggle={onToggle} />
        <OrbitControls target={target.toArray()} enableDamping minDistance={0.05} maxDistance={50} maxPolarAngle={Math.PI * 0.9} />
      </Canvas>
    </div>
  );
}

export default DentalMap3D;
