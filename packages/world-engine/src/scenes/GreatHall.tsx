/**
 * GreatHall — Main arrival scene for the L3ARN Academy.
 *
 * Visual pass (Explore-mode enhancement, spec §7): procedural stone-tile
 * floor, instanced column rows + rafters open to the visible dawn sky,
 * four House banners, glowing clerestory windows, entrance framing, a dais
 * under the Sorting Computer, torch sconces with live (mission-gated)
 * flicker, and warm depth fog. Geometry is still all procedural primitives —
 * composed for readability rather than replaced by shipped models, so the
 * asset pipeline/licensing gate stays untouched.
 *
 * On SortingComputer click: dispatches WorldEvent { type: "object-interact",
 * objectId: "sorting-computer" } AND calls enterMissionMode() directly, so
 * the world visibly quiets (spec §4) the instant the student commits to a
 * mission, before the mission UI even mounts.
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Fog } from 'three';
import { SortingComputer } from '../objects/SortingComputer';
import { PlayerAvatar } from '../objects/PlayerAvatar';
import { MasteryBuilding } from '../objects/MasteryBuilding';
import { HallArchitecture, TORCH_MOUNTS } from '../objects/HallArchitecture';
import { TorchSconces } from '../objects/TorchSconces';
import { createStoneTileTexture } from '../art/proceduralTextures';
import type { SceneProps } from '../types';
import { useWorldStore } from '../state/worldStore';

export function GreatHall({ onEvent, displayName = 'Explorer', house }: SceneProps) {
  const setMoveTarget = useWorldStore((s) => s.setMoveTarget);
  const scene = useThree((s) => s.scene);

  // Warm depth fog — softens the far corners without touching the sky
  // (three.js scene fog never applies to the environment background).
  useEffect(() => {
    scene.fog = new Fog('#c8b49a', 32, 95);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Runtime-generated stone floor (deterministic; null during SSR — material
  // then falls back to its flat color, which only ever happens off-client).
  const floorTexture = useMemo(() => createStoneTileTexture(), []);
  useEffect(() => () => floorTexture?.dispose(), [floorTexture]);

  function handleFloorClick(e: { stopPropagation: () => void; point?: { x: number; y: number; z: number } }) {
    e.stopPropagation();
    const pt = e.point ?? { x: 0, y: 0, z: 0 };
    setMoveTarget(pt.x, 0, pt.z);
    onEvent({
      type: 'avatar-move-requested',
      targetPosition: { x: pt.x, y: 0, z: pt.z },
    });
  }

  return (
    <group>
      {/* Floor — procedural warm stone tiles; high roughness scatters the IBL softly. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleFloorClick as any}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color={floorTexture ? '#ffffff' : '#5b5147'}
          map={floorTexture ?? undefined}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -15]} receiveShadow castShadow>
        <boxGeometry args={[30, 10, 1]} />
        <meshStandardMaterial color="#4d4560" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#4d4560" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#4d4560" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Front wall — split to leave entrance gap */}
      <mesh position={[-8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#4d4560" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#4d4560" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Architecture dressing — columns, rafters, banners, windows, entrance, dais (instanced). */}
      <HallArchitecture />

      {/* Torch sconces — ambient life; flicker freezes in Mission mode (two-modes law). */}
      <TorchSconces mounts={TORCH_MOUNTS} />

      {/* Sorting Computer — Mission 001 trigger (ADR-027 / hero slice), raised onto the dais. */}
      <SortingComputer position={[0, 1.15, -10]} onEvent={onEvent} />

      {/* Mastery-gated holding — appears once the student unlocks it (Task 14). Renders nothing until then. */}
      <MasteryBuilding position={[6, 0, -8]} holdingId="fractions-observatory" />

      {/* Player avatar */}
      <PlayerAvatar displayName={displayName} house={house} initialPosition={[0, 0.9, 8]} />
    </group>
  );
}
