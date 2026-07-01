/**
 * PlayerAvatar — The student's in-world representation.
 *
 * Position is owned by the ECS (core/world.ts Position trait) and advanced
 * by systems/movement.ts inside SimLoop's fixed-timestep tick. This component
 * only reads the entity's Position each frame and writes it onto the ref —
 * it never mutates simulation state itself (spec §6.2: render = mutation
 * through refs, sim lives outside React).
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { HOUSE_COLORS } from '../types';
import { useWorldStore } from '../state/worldStore';
import { Position } from '../core/world';

interface PlayerAvatarProps {
  displayName: string;
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  initialPosition?: [number, number, number];
}

export function PlayerAvatar({
  displayName,
  house,
  initialPosition = [3, 0.9, 3],
}: PlayerAvatarProps) {
  const meshRef = useRef<Group>(null);
  const houseColor = house ? HOUSE_COLORS[house] : '#64748b';
  const world = useWorldStore((s) => s.world);
  const ensurePlayerEntity = useWorldStore((s) => s.ensurePlayerEntity);

  useEffect(() => {
    ensurePlayerEntity(initialPosition, houseColor);
    // Intentionally run once — the entity must not be re-created on re-renders
    // (e.g. when `house` resolves after the verified-identity effect fires).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    world.query(Position).updateEach(([pos]) => {
      meshRef.current!.position.set(pos.x, pos.y, pos.z);
    });
  });

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
      <Html position={[0, 1.4, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
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
