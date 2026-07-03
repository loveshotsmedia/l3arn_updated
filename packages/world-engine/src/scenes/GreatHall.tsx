/**
 * GreatHall — Main arrival scene for the L3ARN Academy.
 *
 * Phase 1 pass: PBR-tuned materials (varied roughness/metalness instead of
 * flat slabs) and IBL-reactive surfaces (Task 10's HDRI now visibly informs
 * every reflection here). Geometry remains primitive boxes/planes — real
 * models are a follow-on art-production task (see Phase 1 preamble).
 *
 * On SortingComputer click: dispatches WorldEvent { type: "object-interact",
 * objectId: "sorting-computer" } AND calls enterMissionMode() directly, so
 * the world visibly quiets (spec §4) the instant the student commits to a
 * mission, before the mission UI even mounts.
 */
import { SortingComputer } from '../objects/SortingComputer';
import { PlayerAvatar } from '../objects/PlayerAvatar';
import { MasteryBuilding } from '../objects/MasteryBuilding';
import type { SceneProps } from '../types';
import { useWorldStore } from '../state/worldStore';

export function GreatHall({ onEvent, displayName = 'Explorer', house }: SceneProps) {
  const setMoveTarget = useWorldStore((s) => s.setMoveTarget);

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
      {/* Floor — warm stone, higher roughness so it scatters the IBL softly rather than mirroring it. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleFloorClick as any}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#5b5147" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -15]} receiveShadow castShadow>
        <boxGeometry args={[30, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Front wall — split to leave entrance gap */}
      <mesh position={[-8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sorting Computer — Mission 001 trigger (ADR-027 / hero slice) */}
      <SortingComputer position={[0, 0.75, -10]} onEvent={onEvent} />

      {/* Mastery-gated holding — appears once the student unlocks it (Task 14). Renders nothing until then. */}
      <MasteryBuilding position={[6, 0, -8]} holdingId="fractions-observatory" />

      {/* Player avatar */}
      <PlayerAvatar displayName={displayName} house={house} initialPosition={[0, 0.9, 8]} />
    </group>
  );
}
