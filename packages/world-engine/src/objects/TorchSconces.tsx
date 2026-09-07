/**
 * TorchSconces — wall-torch flames with a live flicker, the first "ambient
 * life" system (spec §6.10: ambient is Explore-only).
 *
 * Two-modes law compliance (spec §4): the useFrame below reads worldMode via
 * getState() (no React subscription, no re-render) and freezes the flicker
 * the moment the world enters Mission mode — ambient motion pauses so the
 * task surface gets visual quiet. Flames stay lit (steady), they just stop
 * dancing.
 *
 * Cost: 3 draw calls total (brackets + two flame phase-groups). No real
 * lights — the "light" is emissive + bloom (spec §7.2: fake local lights
 * with emissive; the sun stays the only shadow-caster).
 *
 * The flicker itself is pure math (systems/ambientFlicker.ts, unit-tested);
 * this component only writes the result onto two shared materials through
 * refs — render = mutation through refs, sim math stays outside React
 * (spec §6.2).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import type { MeshStandardMaterial } from 'three';
import { useWorldStore } from '../state/worldStore';
import { flickerIntensity } from '../systems/ambientFlicker';

interface TorchSconcesProps {
  mounts: [number, number, number][];
}

export function TorchSconces({ mounts }: TorchSconcesProps) {
  // Two phase groups so neighboring flames don't pulse in sync — reads as
  // individual fires at the cost of exactly one extra draw call.
  const flameMatA = useRef<MeshStandardMaterial>(null);
  const flameMatB = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    // Two-modes law: ambient motion pauses in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    const t = state.clock.elapsedTime;
    if (flameMatA.current) flameMatA.current.emissiveIntensity = flickerIntensity(t, 1);
    if (flameMatB.current) flameMatB.current.emissiveIntensity = flickerIntensity(t, 2);
  });

  const groupA = mounts.filter((_, i) => i % 2 === 0);
  const groupB = mounts.filter((_, i) => i % 2 === 1);

  return (
    <group>
      {/* Brackets — small dark-iron holders */}
      <Instances castShadow>
        <boxGeometry args={[0.16, 0.5, 0.16]} />
        <meshStandardMaterial color="#2b2b30" roughness={0.6} metalness={0.8} />
        {mounts.map(([x, y, z], i) => (
          <Instance key={`bracket-${i}`} position={[x, y - 0.32, z]} />
        ))}
      </Instances>

      {/* Flames — phase group A */}
      <Instances>
        <coneGeometry args={[0.11, 0.34, 6]} />
        <meshStandardMaterial
          ref={flameMatA}
          color="#ff9a3c"
          emissive="#ff9a3c"
          emissiveIntensity={2.2}
          roughness={0.4}
          toneMapped={false}
        />
        {groupA.map(([x, y, z], i) => (
          <Instance key={`flame-a-${i}`} position={[x, y, z]} />
        ))}
      </Instances>

      {/* Flames — phase group B */}
      <Instances>
        <coneGeometry args={[0.11, 0.34, 6]} />
        <meshStandardMaterial
          ref={flameMatB}
          color="#ffb45e"
          emissive="#ffb45e"
          emissiveIntensity={2.2}
          roughness={0.4}
          toneMapped={false}
        />
        {groupB.map(([x, y, z], i) => (
          <Instance key={`flame-b-${i}`} position={[x, y, z]} />
        ))}
      </Instances>
    </group>
  );
}
