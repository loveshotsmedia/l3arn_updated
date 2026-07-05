/**
 * StudyTables — two long study tables flanking the ceremonial runner, with
 * benches, stacked books, and lit candles. Fills the hall's biggest empty
 * floor area with the "children learn here" read (spec §7 art direction:
 * composed primitives, everything instanced).
 *
 * Draw calls: tops(1) + legs(1) + benches(1) + books(1) + candle sticks(1)
 * + flames(2 phase groups) = 7.
 *
 * Two-modes law (spec §4): candle flames flicker via the unit-tested
 * flickerIntensity() math and freeze the moment worldMode === 'mission' —
 * the same gate as torches, motes, hearth, and the grove lantern.
 * Emissive only, no real lights (spec §7.2).
 *
 * Determinism: book stacks use fixed index-derived sizes/colors, never
 * Math.random — screenshot diffs stay meaningful.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import type { MeshStandardMaterial } from 'three';
import { useWorldStore } from '../state/worldStore';
import { flickerIntensity } from '../systems/ambientFlicker';

const DARK_WOOD = { color: '#4a3628', roughness: 0.85, metalness: 0.02 };
const SPINE_PALETTE = ['#b8452f', '#c9a24a', '#3f7fae', '#4fae66', '#7a4fae', '#3fae9d'];

/** Table centers — one either side of the runner (runner spans x ∈ [-1.7, 1.7]). */
const TABLE_XS = [-5.5, 5.5];
const TABLE_LEN = 8; // along z, centered at z = 2
const TABLE_Z = 2;

/** Deterministic book stacks: [dx, dz, count] per table. */
const BOOK_STACKS: [number, number, number][] = [
  [-0.35, -2.6, 3],
  [0.3, -0.4, 2],
  [-0.2, 1.8, 4],
  [0.35, 3.1, 2],
];

/** Candle spots per table (dz offsets). */
const CANDLE_ZS = [-1.5, 0.8, 2.6];

export function StudyTables() {
  const flameMatA = useRef<MeshStandardMaterial>(null);
  const flameMatB = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    // Two-modes law: ambient motion pauses in Mission mode (spec §4).
    if (useWorldStore.getState().worldMode === 'mission') return;
    const t = state.clock.elapsedTime;
    if (flameMatA.current) flameMatA.current.emissiveIntensity = flickerIntensity(t, 31, 2.1, 0.55);
    if (flameMatB.current) flameMatB.current.emissiveIntensity = flickerIntensity(t, 32, 2.0, 0.5);
  });

  return (
    <group>
      {/* Table tops */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.12, TABLE_LEN]} />
        <meshStandardMaterial color="#5a4432" roughness={0.75} metalness={0.02} />
        {TABLE_XS.map((x) => (
          <Instance key={`top-${x}`} position={[x, 0.92, TABLE_Z]} />
        ))}
      </Instances>

      {/* Table legs — chunky trestle ends */}
      <Instances castShadow>
        <boxGeometry args={[1.2, 0.86, 0.22]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {TABLE_XS.flatMap((x) => [
          <Instance key={`leg-a-${x}`} position={[x, 0.43, TABLE_Z - TABLE_LEN / 2 + 0.5]} />,
          <Instance key={`leg-b-${x}`} position={[x, 0.43, TABLE_Z + TABLE_LEN / 2 - 0.5]} />,
          <Instance key={`leg-c-${x}`} position={[x, 0.43, TABLE_Z]} />,
        ])}
      </Instances>

      {/* Benches — one along each side of each table */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.42, TABLE_LEN - 0.8]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {TABLE_XS.flatMap((x) => [
          <Instance key={`tbench-in-${x}`} position={[x - Math.sign(x) * 1.25, 0.21, TABLE_Z]} />,
          <Instance key={`tbench-out-${x}`} position={[x + Math.sign(x) * 1.25, 0.21, TABLE_Z]} />,
        ])}
      </Instances>

      {/* Book stacks — deterministic sizes and palette colors */}
      <Instances castShadow>
        <boxGeometry args={[0.34, 0.07, 0.24]} />
        <meshStandardMaterial roughness={0.75} metalness={0.0} />
        {TABLE_XS.flatMap((x, ti) =>
          BOOK_STACKS.flatMap(([dx, dz, count], si) =>
            Array.from({ length: count }, (_, bi) => (
              <Instance
                key={`book-${ti}-${si}-${bi}`}
                position={[x + dx, 1.02 + bi * 0.075, TABLE_Z + dz]}
                rotation={[0, ((ti * 13 + si * 7 + bi * 3) % 9) * 0.09 - 0.36, 0]}
                color={SPINE_PALETTE[(ti * 5 + si * 3 + bi) % SPINE_PALETTE.length]}
              />
            )),
          ),
        )}
      </Instances>

      {/* Candle sticks */}
      <Instances castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.28, 8]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        {TABLE_XS.flatMap((x, ti) =>
          CANDLE_ZS.map((dz, ci) => (
            <Instance
              key={`candle-${ti}-${ci}`}
              position={[x - Math.sign(x) * 0.45, 1.12, TABLE_Z + dz]}
            />
          )),
        )}
      </Instances>

      {/* Candle flames — two flicker phase groups (A: left table, B: right table) */}
      <Instances frustumCulled={false}>
        <coneGeometry args={[0.035, 0.12, 6]} />
        <meshStandardMaterial
          ref={flameMatA}
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={2.1}
          toneMapped={false}
        />
        {CANDLE_ZS.map((dz, ci) => (
          <Instance key={`flame-l-${ci}`} position={[TABLE_XS[0] + 0.45, 1.32, TABLE_Z + dz]} />
        ))}
      </Instances>
      <Instances frustumCulled={false}>
        <coneGeometry args={[0.035, 0.12, 6]} />
        <meshStandardMaterial
          ref={flameMatB}
          color="#ffc46b"
          emissive="#ffc46b"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
        {CANDLE_ZS.map((dz, ci) => (
          <Instance key={`flame-r-${ci}`} position={[TABLE_XS[1] - 0.45, 1.32, TABLE_Z + dz]} />
        ))}
      </Instances>
    </group>
  );
}
