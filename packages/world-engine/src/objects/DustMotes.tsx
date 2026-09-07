/**
 * DustMotes — drifting warm dust in the hall air (spec §6.10 ambient,
 * Explore-only). Same two-modes gate as TorchSconces: the useFrame reads
 * worldMode via getState() and freezes all drift the instant a mission
 * starts (spec §4 — ambient motion pauses; the motes stay visible but
 * still).
 *
 * One draw call: a single drei <Instances> whose per-instance positions are
 * mutated through refs from the pure, unit-tested motePosition() math
 * (systems/ambientMotes.ts). No per-frame React state.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import type { Object3D } from 'three';
import { useWorldStore } from '../state/worldStore';
import { motePosition } from '../systems/ambientMotes';

const MOTE_COUNT = 48;

export function DustMotes() {
  const moteRefs = useRef<(Object3D | null)[]>([]);
  const indices = useMemo(() => Array.from({ length: MOTE_COUNT }, (_, i) => i), []);

  useFrame((state) => {
    // Two-modes law: ambient motion pauses in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const mote = moteRefs.current[i];
      if (!mote) continue;
      const [x, y, z] = motePosition(i, t);
      mote.position.set(x, y, z);
    }
  });

  return (
    <Instances frustumCulled={false}>
      <sphereGeometry args={[0.022, 6, 6]} />
      <meshStandardMaterial
        color="#ffe9c4"
        emissive="#ffe9c4"
        emissiveIntensity={1.1}
        transparent
        opacity={0.32}
        depthWrite={false}
        toneMapped={false}
      />
      {indices.map((i) => (
        <Instance
          key={i}
          ref={(el: Object3D | null) => {
            moteRefs.current[i] = el;
          }}
          position={motePosition(i, 0)}
        />
      ))}
    </Instances>
  );
}
