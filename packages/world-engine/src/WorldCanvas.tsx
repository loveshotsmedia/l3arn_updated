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
 * at origin. OrbitControls is included but limited to prevent full free-look
 * (students use click-to-move, not WASD/first-person).
 *
 * Lighting: ambient + directional (three-point lighting placeholder).
 *
 * Scene loading: each SceneKey maps to a scene component. New rooms are added
 * here as new entries in the switch — keep each scene self-contained.
 *
 * Open Question: scene transitions (fade-in/out animation) are not yet
 * implemented. This is a placeholder hard-swap.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import type { SceneKey, WorldEvent } from './types';
import { GreatHall } from './scenes/GreatHall';
import { SimLoop } from './render/SimLoop';
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
      {/* Ambient light — base fill */}
      <ambientLight intensity={0.4} />

      {/* Key light — directional from upper-right */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light — soft opposite side */}
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* SimLoop — the single fixed-timestep simulation tick for the whole world */}
      <SimLoop world={world} />

      {/* OrbitControls — restricted so students can't spin to first-person */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 6}   // ~30 deg — don't go to top-down
        maxPolarAngle={Math.PI / 2.5} // ~72 deg — don't go fully horizontal
        minDistance={8}
        maxDistance={30}
        target={[0, 0, 0]}
      />

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
