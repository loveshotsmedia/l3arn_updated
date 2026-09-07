/**
 * HearthChairs — two upholstered armchairs angled toward the hearth fire on
 * the left wall, with a small side table between them. Gives the fireplace a
 * "sit and warm up" read (spec §7: composed primitives, camera-visible -x
 * half of the hall per the pass-7 dead-zone lesson). Fully static — no
 * animation, no mission gating needed.
 *
 * Draw calls: seats(1) + backs(1) + arms(1) + legs(1) + side table(2) = 6.
 * Deterministic — fixed positions/colors.
 */
import { Instances, Instance } from '@react-three/drei';

const FABRIC = { color: '#8a4a32', roughness: 0.9, metalness: 0.0 };
const DARK_WOOD = { color: '#4a3628', roughness: 0.85, metalness: 0.02 };

/** Chair positions + yaw, angled to face the hearth at [-14.3, 0, 6]. */
const CHAIRS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [-12.1, 0, 4.1], yaw: (-3 * Math.PI) / 4 + 0.35 },
  { pos: [-12.1, 0, 7.9], yaw: (-Math.PI) / 4 - 0.35 + Math.PI / 2 },
];

export function HearthChairs() {
  return (
    <group>
      {/* Seats */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.42, 0.9]} />
        <meshStandardMaterial {...FABRIC} />
        {CHAIRS.map(({ pos, yaw }, i) => (
          <Instance key={`seat-${i}`} position={[pos[0], 0.34, pos[2]]} rotation={[0, yaw, 0]} />
        ))}
      </Instances>

      {/* Backs — tilted slightly */}
      <Instances castShadow>
        <boxGeometry args={[0.95, 1.0, 0.18]} />
        <meshStandardMaterial {...FABRIC} />
        {CHAIRS.map(({ pos, yaw }, i) => (
          <Instance
            key={`back-${i}`}
            position={[
              pos[0] - Math.sin(yaw) * 0.42,
              0.95,
              pos[2] - Math.cos(yaw) * 0.42,
            ]}
            rotation={[-0.12, yaw, 0]}
          />
        ))}
      </Instances>

      {/* Armrests */}
      <Instances castShadow>
        <boxGeometry args={[0.16, 0.3, 0.85]} />
        <meshStandardMaterial {...FABRIC} />
        {CHAIRS.flatMap(({ pos, yaw }, i) =>
          [-0.46, 0.46].map((side) => (
            <Instance
              key={`arm-${i}-${side}`}
              position={[
                pos[0] + Math.cos(yaw) * side,
                0.68,
                pos[2] - Math.sin(yaw) * side,
              ]}
              rotation={[0, yaw, 0]}
            />
          )),
        )}
      </Instances>

      {/* Chunky wooden feet */}
      <Instances castShadow>
        <boxGeometry args={[0.85, 0.14, 0.8]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {CHAIRS.map(({ pos, yaw }, i) => (
          <Instance key={`feet-${i}`} position={[pos[0], 0.07, pos[2]]} rotation={[0, yaw, 0]} />
        ))}
      </Instances>

      {/* Small side table between the chairs */}
      <mesh position={[-12.7, 0.3, 6]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.6, 10]} />
        <meshStandardMaterial {...DARK_WOOD} />
      </mesh>
      <mesh position={[-12.7, 0.66, 6]} castShadow>
        <boxGeometry args={[0.3, 0.07, 0.22]} />
        <meshStandardMaterial color="#3f7fae" roughness={0.75} />
      </mesh>
    </group>
  );
}
