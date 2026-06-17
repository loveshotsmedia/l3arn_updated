/**
 * GreatHall — Main arrival scene for the L3ARN Academy.
 *
 * Contains:
 * - Stone floor plane (color placeholder — no texture asset yet)
 * - Wall box meshes defining the room boundary
 * - SortingComputer at a fixed position (Mission 001 trigger point)
 * - PlayerAvatar rendered at spawn position
 * - Click-to-move: clicking the floor logs the target position and will
 *   eventually drive avatar movement via the PlayerAvatar component.
 *
 * On SortingComputer click: dispatches WorldEvent { type: "object-interact",
 * objectId: "sorting-computer" }. The parent (WorldCanvas) routes this event
 * up to the student app, which triggers the mission entry transition.
 *
 * Future living-world hooks:
 * - House banners (driven by House Influence system, ADR-019)
 * - Seasonal event decorations
 * - NPC presence (scheduled by Railway)
 */

import { SortingComputer } from '../objects/SortingComputer';
import { PlayerAvatar } from '../objects/PlayerAvatar';
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
      {/* Floor — gray stone placeholder */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleFloorClick as any}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -15]} receiveShadow castShadow>
        <boxGeometry args={[30, 10, 1]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Front wall — split to leave entrance gap */}
      <mesh position={[-8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Sorting Computer — Mission 001 trigger (ADR-027 / hero slice) */}
      <SortingComputer position={[0, 0.75, -10]} onEvent={onEvent} />

      {/* Player avatar */}
      <PlayerAvatar
        displayName={displayName}
        house={house}
        initialPosition={[0, 0.9, 8]}
      />
    </group>
  );
}
