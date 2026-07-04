/**
 * PlayerAvatar — The student's in-world representation.
 *
 * Visual pass 3: composed chunky explorer character (house-tinted body +
 * hood + cape, cream head with eyes, gold belt, leather backpack) replacing
 * the bare capsule — and the avatar now turns to face where it's walking,
 * driven by the pure, unit-tested yawToward() math (systems/avatarHeading).
 *
 * Position is owned by the ECS (core/world.ts Position trait) and advanced
 * by systems/movement.ts inside SimLoop's fixed-timestep tick. This component
 * only reads the entity's Position/MoveTarget each frame and writes onto the
 * ref — it never mutates simulation state itself (spec §6.2: render =
 * mutation through refs, sim lives outside React). Facing convention:
 * yaw 0 = +z; the face (eyes) sits on the +z side of the head.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { HOUSE_COLORS } from '../types';
import { useWorldStore } from '../state/worldStore';
import { Position, MoveTarget } from '../core/world';
import { yawToward } from '../systems/avatarHeading';

interface PlayerAvatarProps {
  displayName: string;
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  initialPosition?: [number, number, number];
}

/** Max turn rate — radians per frame at 60fps ≈ a snappy but smooth pivot. */
const TURN_STEP = 0.14;

/** Darken a #rrggbb color by a factor (0..1). */
function darken(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function PlayerAvatar({
  displayName,
  house,
  initialPosition = [3, 0.9, 3],
}: PlayerAvatarProps) {
  const meshRef = useRef<Group>(null);
  const houseColor = house ? HOUSE_COLORS[house] : '#64748b';
  const hoodColor = darken(houseColor, 0.72);
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
    const group = meshRef.current;
    world.query(Position, MoveTarget).updateEach(([pos, target]) => {
      group.position.set(pos.x, pos.y, pos.z);
      if (target.active) {
        group.rotation.y = yawToward(pos.x, pos.z, target.x, target.z, group.rotation.y, TURN_STEP);
      }
    });
  });

  return (
    <group ref={meshRef} position={initialPosition}>
      {/* Body — house-tinted tunic */}
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.72, 4, 12]} />
        <meshStandardMaterial color={houseColor} roughness={0.6} />
      </mesh>

      {/* Gold belt */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.08, 12]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Head — warm cream */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.27, 16, 16]} />
        <meshStandardMaterial color="#f2e2c9" roughness={0.55} />
      </mesh>

      {/* Hood — darker house tone, capping the back of the head */}
      <mesh position={[0, 0.88, -0.045]} rotation={[0.35, 0, 0]} castShadow>
        <sphereGeometry args={[0.295, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={hoodColor} roughness={0.7} />
      </mesh>

      {/* Eyes — the face lives on +z (the yaw-0 heading) */}
      <mesh position={[-0.09, 0.84, 0.235]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial color="#1f2430" roughness={0.3} />
      </mesh>
      <mesh position={[0.09, 0.84, 0.235]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial color="#1f2430" roughness={0.3} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.36, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#f2e2c9" roughness={0.55} />
      </mesh>
      <mesh position={[0.36, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#f2e2c9" roughness={0.55} />
      </mesh>

      {/* Cape — hangs on the -z (back) side */}
      <mesh position={[0, 0.18, -0.31]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.85, 0.05]} />
        <meshStandardMaterial color={hoodColor} roughness={0.75} />
      </mesh>

      {/* Backpack — little leather pack over the cape */}
      <mesh position={[0, 0.28, -0.38]} castShadow>
        <boxGeometry args={[0.34, 0.4, 0.18]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.28, -0.475]}>
        <boxGeometry args={[0.3, 0.07, 0.02]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.4} metalness={0.6} />
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
