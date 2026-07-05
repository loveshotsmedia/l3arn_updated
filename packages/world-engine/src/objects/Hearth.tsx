/**
 * Hearth — grand fireplace on the left wall of the Great Hall.
 *
 * Chimney breast, firebox, mantel, logs, and a living fire: three flame
 * cones on two flicker phase-groups plus an ember-glow plane, all driven by
 * the existing unit-tested flickerIntensity() math (same as the torches).
 * Two-modes law (spec §4): the useFrame reads worldMode via getState() and
 * freezes the fire the moment a mission starts — flames stay lit, they stop
 * dancing. No real lights — emissive + bloom only (spec §7.2).
 *
 * Positioned between the z=3 and z=9 windows/benches on the x=-15 wall
 * (gap z ∈ [4.4, 7.6]) so it's fully visible from the default camera.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshStandardMaterial } from 'three';
import { useWorldStore } from '../state/worldStore';
import { flickerIntensity } from '../systems/ambientFlicker';

const BRICK = { color: '#5d5474', roughness: 0.85, metalness: 0.03 };
const HEARTHSTONE = { color: '#77685a', roughness: 0.9, metalness: 0.02 };

export function Hearth() {
  const flameMatA = useRef<MeshStandardMaterial>(null);
  const flameMatB = useRef<MeshStandardMaterial>(null);
  const emberMat = useRef<MeshStandardMaterial>(null);
  const mantelFlameMat = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    // Two-modes law: fire freezes in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    const t = state.clock.elapsedTime;
    if (flameMatA.current) flameMatA.current.emissiveIntensity = flickerIntensity(t, 11, 2.5, 0.7);
    if (flameMatB.current) flameMatB.current.emissiveIntensity = flickerIntensity(t, 12, 2.3, 0.6);
    if (emberMat.current) emberMat.current.emissiveIntensity = flickerIntensity(t, 13, 1.1, 0.25);
    if (mantelFlameMat.current) mantelFlameMat.current.emissiveIntensity = flickerIntensity(t, 14, 1.9, 0.45);
  });

  return (
    <group position={[-14.3, 0, 6]}>
      {/* Chimney breast — full-height, protruding from the wall */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 10, 3.2]} />
        <meshStandardMaterial {...BRICK} />
      </mesh>

      {/* Hearthstone base slab */}
      <mesh position={[0.85, 0.09, 0]} receiveShadow>
        <boxGeometry args={[1.7, 0.18, 3.8]} />
        <meshStandardMaterial {...HEARTHSTONE} />
      </mesh>

      {/* Mantel shelf */}
      <mesh position={[0.75, 2.25, 0]} castShadow>
        <boxGeometry args={[0.55, 0.22, 3.6]} />
        <meshStandardMaterial color="#4a3628" roughness={0.8} metalness={0.02} />
      </mesh>

      {/* Firebox — dark opening in the breast */}
      <mesh position={[0.62, 0.95, 0]}>
        <boxGeometry args={[0.25, 1.55, 2.0]} />
        <meshStandardMaterial color="#150f0c" roughness={1.0} />
      </mesh>

      {/* Logs */}
      <mesh position={[0.72, 0.32, -0.35]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 1.3, 8]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
      </mesh>
      <mesh position={[0.72, 0.32, 0.35]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 1.3, 8]} />
        <meshStandardMaterial color="#33241a" roughness={0.9} />
      </mesh>

      {/* Ember bed — warm glow under the flames */}
      <mesh position={[0.72, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 1.9]} />
        <meshStandardMaterial
          ref={emberMat}
          color="#ff6a1f"
          emissive="#ff6a1f"
          emissiveIntensity={1.1}
          roughness={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Flames — two flickering phase groups (the small third flame stays steady between them) */}
      <mesh position={[0.72, 0.75, 0]}>
        <coneGeometry args={[0.3, 0.95, 8]} />
        <meshStandardMaterial
          ref={flameMatA}
          color="#ff9a3c"
          emissive="#ff9a3c"
          emissiveIntensity={2.5}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.72, 0.62, -0.5]}>
        <coneGeometry args={[0.19, 0.6, 7]} />
        <meshStandardMaterial
          ref={flameMatB}
          color="#ffb45e"
          emissive="#ffb45e"
          emissiveIntensity={2.3}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.72, 0.6, 0.48]}>
        <coneGeometry args={[0.17, 0.55, 7]} />
        <meshStandardMaterial
          color="#ffb45e"
          emissive="#ffb45e"
          emissiveIntensity={2.3}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>
      {/* ── Mantel dressing (pass 9) ── */}
      {/* Brass candlesticks at each end of the mantel shelf */}
      {[-1.4, 1.4].map((z) => (
        <group key={`mstick-${z}`} position={[0.75, 2.36, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.08, 0.3, 8]} />
            <meshStandardMaterial color="#b08d3e" roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.18, 8]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Shared flickering flames for both candlesticks (one material ref, one draw call) */}
      <mesh position={[0.75, 2.78, -1.4]}>
        <coneGeometry args={[0.04, 0.13, 6]} />
        <meshStandardMaterial
          ref={mantelFlameMat}
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={1.9}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.75, 2.78, 1.4]}>
        <coneGeometry args={[0.04, 0.13, 6]} />
        <meshStandardMaterial
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={1.9}
          toneMapped={false}
        />
      </mesh>

      {/* Framed portrait on the chimney breast above the mantel */}
      <group position={[0.68, 3.75, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 1.25, 0.95]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.65} />
        </mesh>
        <mesh position={[0.045, 0, 0]}>
          <boxGeometry args={[0.02, 1.05, 0.75]} />
          <meshStandardMaterial color="#2b2455" roughness={0.7} emissive="#4338ca" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0.06, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.22, 0.03, 8, 20]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.7} emissive="#c9a24a" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}
