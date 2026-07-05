/**
 * Chandeliers — two wrought-iron candle rings hanging from the rafters over
 * the ceremonial runner. Fills the hall's empty upper air with warm hanging
 * light (spec §7 art direction; emissive only, no real lights — §7.2).
 *
 * Each hangs from an actual rafter line (z = 6.0 and z = -1.8 match
 * HallArchitecture's rafter positions) so the support rods read as attached,
 * not floating.
 *
 * Two-modes law (spec §4): candle flames flicker via the unit-tested
 * flickerIntensity() math (two phase groups, one per chandelier) and freeze
 * the moment worldMode === 'mission'.
 *
 * Draw calls: rods(1) + rings(1) + candles(1) + flames(2) = 5.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import type { MeshStandardMaterial } from 'three';
import { useWorldStore } from '../state/worldStore';
import { flickerIntensity } from '../systems/ambientFlicker';

const IRON = { color: '#26262c', roughness: 0.55, metalness: 0.8 };

/** Hang points — over the runner, on real rafter lines. */
const CHANDELIER_ZS = [6.0, -1.8];
const RING_Y = 7.4;
const RING_R = 0.95;
const CANDLES_PER_RING = 6;

function candleAngle(i: number): number {
  return (i / CANDLES_PER_RING) * Math.PI * 2;
}

export function Chandeliers() {
  const flameMatA = useRef<MeshStandardMaterial>(null);
  const flameMatB = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    // Two-modes law: ambient motion pauses in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    const t = state.clock.elapsedTime;
    if (flameMatA.current) flameMatA.current.emissiveIntensity = flickerIntensity(t, 41, 2.2, 0.5);
    if (flameMatB.current) flameMatB.current.emissiveIntensity = flickerIntensity(t, 42, 2.1, 0.55);
  });

  return (
    <group>
      {/* Support rods — from the rafter underside down to each ring */}
      <Instances castShadow>
        <cylinderGeometry args={[0.035, 0.035, 2.3, 6]} />
        <meshStandardMaterial {...IRON} />
        {CHANDELIER_ZS.map((z) => (
          <Instance key={`rod-${z}`} position={[0, 8.55, z]} />
        ))}
      </Instances>

      {/* Iron rings */}
      <Instances castShadow>
        <torusGeometry args={[RING_R, 0.055, 8, 28]} />
        <meshStandardMaterial {...IRON} />
        {CHANDELIER_ZS.map((z) => (
          <Instance key={`ring-${z}`} position={[0, RING_Y, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Candles around each ring */}
      <Instances castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.26, 6]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        {CHANDELIER_ZS.flatMap((z, ci) =>
          Array.from({ length: CANDLES_PER_RING }, (_, i) => (
            <Instance
              key={`candle-${ci}-${i}`}
              position={[Math.cos(candleAngle(i)) * RING_R, RING_Y + 0.16, z + Math.sin(candleAngle(i)) * RING_R]}
            />
          )),
        )}
      </Instances>

      {/* Flames — one flicker phase group per chandelier */}
      <Instances frustumCulled={false}>
        <coneGeometry args={[0.045, 0.15, 6]} />
        <meshStandardMaterial
          ref={flameMatA}
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={2.2}
          toneMapped={false}
        />
        {Array.from({ length: CANDLES_PER_RING }, (_, i) => (
          <Instance
            key={`flame-a-${i}`}
            position={[
              Math.cos(candleAngle(i)) * RING_R,
              RING_Y + 0.37,
              CHANDELIER_ZS[0] + Math.sin(candleAngle(i)) * RING_R,
            ]}
          />
        ))}
      </Instances>
      <Instances frustumCulled={false}>
        <coneGeometry args={[0.045, 0.15, 6]} />
        <meshStandardMaterial
          ref={flameMatB}
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={2.1}
          toneMapped={false}
        />
        {Array.from({ length: CANDLES_PER_RING }, (_, i) => (
          <Instance
            key={`flame-b-${i}`}
            position={[
              Math.cos(candleAngle(i)) * RING_R,
              RING_Y + 0.37,
              CHANDELIER_ZS[1] + Math.sin(candleAngle(i)) * RING_R,
            ]}
          />
        ))}
      </Instances>
    </group>
  );
}
