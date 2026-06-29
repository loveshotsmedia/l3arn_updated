/**
 * PlayerAvatar — The student's in-world representation.
 *
 * Renders as a capsule mesh tinted by the student's House color.
 * Displays the Academy Display Name (never legal name — ADR-007).
 *
 * Movement: subscribes to worldStore.moveTarget and lerps toward it each frame.
 * Floor clicks dispatch avatar-move-requested → GreatHall → worldStore.setMoveTarget.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import { HOUSE_COLORS } from '../types';
import { useWorldStore } from '../state/worldStore';

interface PlayerAvatarProps {
  displayName: string;
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  initialPosition?: [number, number, number];
}

const LERP_SPEED = 0.05;

export function PlayerAvatar({
  displayName,
  house,
  initialPosition = [3, 0.9, 3],
}: PlayerAvatarProps) {
  const meshRef = useRef<Group>(null);
  const currentPos = useRef(new Vector3(...initialPosition));
  const targetVec = useRef(new Vector3(...initialPosition));

  const moveTarget = useWorldStore((s) => s.moveTarget);

  // Sync targetVec with store's moveTarget
  if (moveTarget) {
    targetVec.current.set(moveTarget.x, initialPosition[1], moveTarget.z);
  }

  useFrame(() => {
    if (!meshRef.current) return;
    currentPos.current.lerp(targetVec.current, LERP_SPEED);
    meshRef.current.position.copy(currentPos.current);
  });

  const houseColor = house ? HOUSE_COLORS[house] : '#64748b';

  return (
    <group ref={meshRef} position={initialPosition}>
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color={houseColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={houseColor} roughness={0.5} />
      </mesh>
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
