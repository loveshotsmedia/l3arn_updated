/**
 * GreatHall — Main arrival scene for the L3ARN Academy.
 *
 * Visual pass 2 (Explore-mode enhancement, spec §7): coursed stone-block
 * walls, ceremonial carpet runner from the entrance to the dais, hero
 * Sorting Computer terminal, wall benches, drifting dust motes — on top of
 * pass 1's tiled floor, columns + rafters, House banners, windows, torches,
 * and warm fog. Everything remains procedural primitives — no shipped
 * assets, so the asset pipeline/licensing gate stays untouched.
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
import { DustMotes } from '../objects/DustMotes';
import { Hearth } from '../objects/Hearth';
import { GroveNook } from '../objects/GroveNook';
import { StudyShelf } from '../objects/StudyShelf';
import { StudyTables } from '../objects/StudyTables';
import { Chandeliers } from '../objects/Chandeliers';
import { HearthChairs } from '../objects/HearthChairs';
import { WallTapestries } from '../objects/WallTapestries';
import {
  createStoneTileTexture,
  createStoneBlockTexture,
  createRunnerTexture,
} from '../art/proceduralTextures';
import type { SceneProps } from '../types';
import { useWorldStore } from '../state/worldStore';

const WALL_MATERIAL_PROPS = { roughness: 0.85, metalness: 0.05 } as const;

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

  // Runtime-generated textures (deterministic; null during SSR — materials
  // then fall back to their flat colors, which only ever happens off-client).
  const floorTexture = useMemo(() => createStoneTileTexture(), []);
  const wallTexture = useMemo(() => createStoneBlockTexture(), []);
  const runnerTexture = useMemo(() => createRunnerTexture(), []);
  useEffect(
    () => () => {
      floorTexture?.dispose();
      wallTexture?.dispose();
      runnerTexture?.dispose();
    },
    [floorTexture, wallTexture, runnerTexture],
  );

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

      {/* Ceremonial runner — entrance to dais. Clicks pass through to the floor
          logic via the same handler, so click-to-move works on the carpet too. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 3.2]}
        receiveShadow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleFloorClick as any}
      >
        <planeGeometry args={[3.4, 20.4]} />
        <meshStandardMaterial
          color={runnerTexture ? '#ffffff' : '#2b2455'}
          map={runnerTexture ?? undefined}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -15]} receiveShadow castShadow>
        <boxGeometry args={[30, 10, 1]} />
        <meshStandardMaterial
          color={wallTexture ? '#ffffff' : '#4d4560'}
          map={wallTexture ?? undefined}
          {...WALL_MATERIAL_PROPS}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial
          color={wallTexture ? '#ffffff' : '#4d4560'}
          map={wallTexture ?? undefined}
          {...WALL_MATERIAL_PROPS}
        />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial
          color={wallTexture ? '#ffffff' : '#4d4560'}
          map={wallTexture ?? undefined}
          {...WALL_MATERIAL_PROPS}
        />
      </mesh>

      {/* Front wall — split to leave entrance gap */}
      <mesh position={[-8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial
          color={wallTexture ? '#ffffff' : '#4d4560'}
          map={wallTexture ?? undefined}
          {...WALL_MATERIAL_PROPS}
        />
      </mesh>
      <mesh position={[8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial
          color={wallTexture ? '#ffffff' : '#4d4560'}
          map={wallTexture ?? undefined}
          {...WALL_MATERIAL_PROPS}
        />
      </mesh>

      {/* Architecture dressing — columns, rafters, banners, windows, entrance, dais, benches (instanced). */}
      <HallArchitecture />

      {/* Torch sconces — ambient life; flicker freezes in Mission mode (two-modes law). */}
      <TorchSconces mounts={TORCH_MOUNTS} />

      {/* Dust motes — drifting warm dust; drift freezes in Mission mode (two-modes law). */}
      <DustMotes />

      {/* Grand hearth — left wall; fire freezes in Mission mode (two-modes law). */}
      <Hearth />

      {/* Companion Grove nook — far corner; lantern pulse freezes in Mission mode (two-modes law). */}
      <GroveNook />

      {/* Study shelf — colorful book spines on the left wall (static). */}
      <StudyShelf position={[-14.15, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* Study tables flanking the runner — candle flicker freezes in Mission mode (two-modes law). */}
      <StudyTables />

      {/* Chandeliers over the runner — candle flicker freezes in Mission mode (two-modes law). */}
      <Chandeliers />

      {/* Armchairs by the hearth — static (no gating needed). */}
      <HearthChairs />

      {/* Tapestries between the left-wall windows — static (no gating needed). */}
      <WallTapestries />

      {/* Sorting Computer — Mission 001 trigger (ADR-027 / hero slice), standing on the dais.
          The terminal's group origin is at its base, so y = the dais top surface (0.4). */}
      <SortingComputer position={[0, 0.4, -10]} onEvent={onEvent} />

      {/* Mastery-gated holding — appears once the student unlocks it (Task 14). Renders nothing until then. */}
      <MasteryBuilding position={[6, 0, -8]} holdingId="fractions-observatory" />

      {/* Player avatar */}
      <PlayerAvatar displayName={displayName} house={house} initialPosition={[0, 0.9, 8]} />
    </group>
  );
}
