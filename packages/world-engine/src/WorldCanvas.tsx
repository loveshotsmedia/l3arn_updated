/**
 * WorldCanvas — Root R3F canvas wrapper for the L3ARN 3D Academy.
 *
 * Props:
 *   scene       — which scene to render (SceneKey)
 *   onEvent     — callback for world events (object-interact, avatar-move, etc.)
 *   displayName — student's Academy Display Name (ADR-007: never legal name)
 *   house       — student's House selection (drives avatar color)
 *
 * Camera: isometric-ish fixed angle (Sims-style), position [10, 10, 10] looking
 * at origin. CameraRig (camera-controls) constrains zoom/angle to prevent full
 * free-look (students use click-to-move, not WASD/first-person).
 *
 * Lighting: single rig (Lighting.tsx) — IBL environment map, one shadow-
 * casting sun, soft fill, ACES filmic tone mapping (spec §7.2). Post-
 * processing (PostProfiles.tsx) swaps between a full explore-mode look
 * (bloom + AO) and a stripped-back quiet mode for missions.
 *
 * Scene loading: each SceneKey maps to a scene component. New rooms are added
 * here as new entries in the switch — keep each scene self-contained.
 *
 * Open Question: scene transitions (fade-in/out animation) are not yet
 * implemented. This is a placeholder hard-swap.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { SceneKey, WorldEvent } from './types';
import { GreatHall } from './scenes/GreatHall';
import { CameraRig } from './render/CameraRig';
import { SimLoop } from './render/SimLoop';
import { Lighting } from './render/Lighting';
import { PostProfiles } from './render/PostProfiles';
import { useWorldStore } from './state/worldStore';

interface WorldCanvasProps {
  scene: SceneKey;
  onEvent: (event: WorldEvent) => void;
  displayName?: string;
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
}

function SceneLoader({ scene, onEvent, displayName, house }: WorldCanvasProps) {
  switch (scene) {
    case 'great-hall':
      return <GreatHall onEvent={onEvent} displayName={displayName} house={house} />;
    case 'mission-room':
      // Open Question: mission-room scene is not yet implemented.
      // Placeholder until Agent E (Mission Compiler) delivers mission scene contracts.
      return (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      );
    case 'sorting-computer-room':
      // Open Question: dedicated sorting computer room scene pending art direction.
      // For Phase 1, Mission 001 triggers from the Great Hall directly.
      return (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
        </mesh>
      );
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = scene;
      console.error('[L3ARN/WorldCanvas] Unknown SceneKey:', _exhaustive);
      return null;
    }
  }
}

export function WorldCanvas({ scene, onEvent, displayName, house }: WorldCanvasProps) {
  const world = useWorldStore((s) => s.world);

  return (
    <Canvas
      shadows
      camera={{
        // Sims-style isometric angle (ADR — camera model decision)
        position: [10, 10, 10],
        fov: 45,
        near: 0.1,
        far: 200,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Lighting />

      {/* SimLoop — the single fixed-timestep simulation tick for the whole world */}
      <SimLoop world={world} />

      {/* CameraRig — Sims-style constrained camera (ADR-004) */}
      <CameraRig />

      <PostProfiles />

      {/* Scene content */}
      <Suspense fallback={null}>
        <SceneLoader
          scene={scene}
          onEvent={onEvent}
          displayName={displayName}
          house={house}
        />
      </Suspense>
    </Canvas>
  );
}
