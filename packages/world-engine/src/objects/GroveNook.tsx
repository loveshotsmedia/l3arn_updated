/**
 * GroveNook — a small Companion-Grove corner in the Great Hall: stone
 * planter with a stylized tree, a round rug, and a post lantern with a slow
 * warm pulse. The hall's first organic/green element (ADR-018 names the
 * Companion Grove as a canonical Campus location — this nook foreshadows it
 * without building the full room).
 *
 * Two-modes law (spec §4): the lantern pulse reads worldMode via getState()
 * and freezes in Mission mode — same gate as torches, motes, and hearth.
 * The pulse reuses the unit-tested flickerIntensity() math at quarter speed.
 * Emissive only, no real lights (spec §7.2).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshStandardMaterial } from 'three';
import { useWorldStore } from '../state/worldStore';
import { flickerIntensity } from '../systems/ambientFlicker';

export function GroveNook({ position = [-12.2, 0, -12.2] as [number, number, number] }) {
  const lanternMat = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    // Two-modes law: ambient motion pauses in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    // Quarter-speed time → a slow lantern breath rather than a torch dance.
    if (lanternMat.current) {
      lanternMat.current.emissiveIntensity = flickerIntensity(state.clock.elapsedTime * 0.25, 21, 1.7, 0.35);
    }
  });

  return (
    <group position={position}>
      {/* Round rug under the nook */}
      <mesh position={[0, 0.012, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.0, 28]} />
        <meshStandardMaterial color="#2f6b45" roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[0, 0.018, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.78, 1.95, 28]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Stone planter + soil */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.3, 0.6, 8]} />
        <meshStandardMaterial color="#77685a" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.08, 8]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1.0} />
      </mesh>

      {/* Tree — trunk + clustered foliage */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 1.9, 8]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.85, 0]} castShadow>
        <sphereGeometry args={[1.05, 12, 10]} />
        <meshStandardMaterial color="#3f9d5a" roughness={0.85} />
      </mesh>
      <mesh position={[0.62, 2.35, 0.3]} castShadow>
        <sphereGeometry args={[0.68, 10, 8]} />
        <meshStandardMaterial color="#4fae66" roughness={0.85} />
      </mesh>
      <mesh position={[-0.55, 2.45, -0.28]} castShadow>
        <sphereGeometry args={[0.6, 10, 8]} />
        <meshStandardMaterial color="#358950" roughness={0.85} />
      </mesh>

      {/* Post lantern with slow warm pulse */}
      <group position={[1.75, 0, 1.45]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#2b2b30" roughness={0.6} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.32, 0]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            ref={lanternMat}
            color="#ffd9a0"
            emissive="#ffd9a0"
            emissiveIntensity={1.7}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 2.56, 0]}>
          <coneGeometry args={[0.18, 0.16, 6]} />
          <meshStandardMaterial color="#2b2b30" roughness={0.6} metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
