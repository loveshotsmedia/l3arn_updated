/**
 * PlayerAvatar — The student's in-world representation.
 *
 * Renders as a capsule mesh tinted by the student's House color.
 * Displays the Academy Display Name (never legal name — ADR-007).
 *
 * Movement: on-scene-click, avatar lerps toward the clicked position.
 * This is a single-player placeholder. Multiplayer presence state will
 * be driven by the Railway realtime server in a future sprint.
 *
 * Open Question: lerp speed and animation curve are placeholder values.
 * Final values should be decided in the game feel/UX pass.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, Mesh } from 'three';
import { HOUSE_COLORS } from '../types';

interface PlayerAvatarProps {
  displayName: string;
  house?: 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  initialPosition?: [number, number, number];
}

const LERP_SPEED = 0.05;

export function PlayerAvatar({
  displayName,
  house,
  initialPosition = [3, 0.9, 3],
}: PlayerAvatarProps) {
  const meshRef = useRef<Mesh>(null);
  const [targetPos] = useState(new Vector3(...initialPosition));
  const currentPos = useRef(new Vector3(...initialPosition));

  // Smooth movement via lerp each frame
  useFrame(() => {
    if (!meshRef.current) return;
    currentPos.current.lerp(targetPos, LERP_SPEED);
    meshRef.current.position.copy(currentPos.current);
  });

  // Expose a method to move the avatar — called by scene click handlers
  // The scene passes new target via the targetPos Vector3 reference.
  function moveTo(x: number, y: number, z: number) {
    targetPos.set(x, y, z);
  }

  // Attach moveTo to the group element so the parent scene can call it
  // Open Question: cleaner approach is a zustand store or ref callback pattern.
  // This is a scaffold placeholder.
  void moveTo; // suppress unused warning — will be wired in scene integration

  const houseColor = house ? HOUSE_COLORS[house] : '#64748b';

  return (
    <group ref={meshRef} position={initialPosition}>
      {/* Body: capsule geometry placeholder for avatar */}
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color={houseColor} roughness={0.6} />
      </mesh>

      {/* Head sphere */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={houseColor} roughness={0.5} />
      </mesh>

      {/* Display name label — Academy Display Name only (ADR-007) */}
      <Html
        position={[0, 1.4, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#f1f5f9',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: `1px solid ${houseColor}`,
          }}
        >
          {displayName}
        </div>
      </Html>
    </group>
  );
}
