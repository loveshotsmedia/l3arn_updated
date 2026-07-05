/**
 * HallArchitecture — static instanced dressing for the Great Hall (spec §7
 * art direction: premium-stylized readability from composed primitives).
 *
 * Everything here is drawn with drei <Instances> so the entire architecture
 * pass adds ~15 draw calls total (spec §8.1: <100 on LOW is the master gate).
 * No downloaded assets — geometry is procedural, so the Task 9 asset gate and
 * the licensing manifest are untouched.
 *
 * Layout constants are exported so TorchSconces can mount flames on the same
 * columns without duplicating the layout math.
 */
import { Instances, Instance } from '@react-three/drei';
import { AdditiveBlending, DoubleSide } from 'three';
import { HOUSE_COLORS } from '../types';

/** Column centers — two rows lining the side walls. */
export const COLUMN_POSITIONS: [number, number, number][] = [];
for (const x of [-10, 10]) {
  for (let z = -12; z <= 12; z += 6) {
    COLUMN_POSITIONS.push([x, 0, z]);
  }
}

/** Torch mount points — inner face of each column, at sconce height. */
export const TORCH_MOUNTS: [number, number, number][] = COLUMN_POSITIONS.map(([x, , z]) => [
  x - Math.sign(x) * 0.62,
  5.2,
  z,
]);

const STONE = { color: '#8b7d6b', roughness: 0.9, metalness: 0.02 };
const DARK_WOOD = { color: '#4a3628', roughness: 0.85, metalness: 0.02 };

/** Banner colors — the four Houses, in canonical order. */
const BANNER_HOUSES = ['Valkryn', 'Lyrion', 'Novari', 'Cytrex'] as const;
const BANNER_XS = [-9, -3, 3, 9];

export function HallArchitecture() {
  return (
    <group>
      {/* ── Columns: base / shaft / capital, instanced (3 draw calls) ── */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.55, 1.0]} />
        <meshStandardMaterial {...STONE} />
        {COLUMN_POSITIONS.map(([x, , z], i) => (
          <Instance key={`base-${i}`} position={[x, 0.275, z]} />
        ))}
      </Instances>
      <Instances castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.42, 7.2, 10]} />
        <meshStandardMaterial {...STONE} />
        {COLUMN_POSITIONS.map(([x, , z], i) => (
          <Instance key={`shaft-${i}`} position={[x, 4.15, z]} />
        ))}
      </Instances>
      <Instances castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.5, 1.05]} />
        <meshStandardMaterial {...STONE} />
        {COLUMN_POSITIONS.map(([x, , z], i) => (
          <Instance key={`cap-${i}`} position={[x, 8.0, z]} />
        ))}
      </Instances>

      {/* ── Gold capital bands — a ring under each capital, tying the gold accents through the room (1 draw call) ── */}
      <Instances>
        <torusGeometry args={[0.4, 0.045, 8, 20]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.7} emissive="#c9a24a" emissiveIntensity={0.15} />
        {COLUMN_POSITIONS.map(([x, , z], i) => (
          <Instance key={`band-${i}`} position={[x, 7.62, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* ── L3ARN crest — back-wall focal emblem between the banners (3 draw calls) ── */}
      <group position={[0, 8.75, -14.35]}>
        <mesh>
          <torusGeometry args={[0.85, 0.09, 10, 32]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={0.75} emissive="#c9a24a" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.8, 32]} />
          <meshStandardMaterial color="#2b2455" roughness={0.6} emissive="#4338ca" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <torusGeometry args={[0.42, 0.04, 8, 24]} />
          <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      </group>

      {/* ── Roof structure: cross rafters + ridge beam, open to the sky (1 + 1 draw calls) ── */}
      <Instances castShadow>
        <boxGeometry args={[30.6, 0.5, 0.8]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {[-13.5, -9.6, -5.7, -1.8, 2.1, 6.0, 9.9, 13.5].map((z, i) => (
          <Instance key={`rafter-${i}`} position={[0, 9.9, z]} />
        ))}
      </Instances>
      <mesh position={[0, 10.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 30.6]} />
        <meshStandardMaterial {...DARK_WOOD} />
      </mesh>

      {/* ── House banners on the back wall, per-instance House color, tilted off the
             wall like hung cloth, gold rod above + gold fringe below (3 draw calls) ── */}
      <Instances>
        <boxGeometry args={[1.9, 4.4, 0.06]} />
        <meshStandardMaterial roughness={0.8} metalness={0.0} emissiveIntensity={0.18} emissive="#ffffff" />
        {BANNER_HOUSES.map((houseName, i) => (
          <Instance
            key={houseName}
            position={[BANNER_XS[i], 6.25, -14.15]}
            rotation={[0.085, 0, 0]}
            color={HOUSE_COLORS[houseName]}
          />
        ))}
      </Instances>
      <Instances castShadow>
        <boxGeometry args={[2.4, 0.13, 0.13]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.7} />
        {BANNER_XS.map((x, i) => (
          <Instance key={`rod-${i}`} position={[x, 8.5, -14.3]} />
        ))}
      </Instances>
      <Instances>
        <boxGeometry args={[1.9, 0.14, 0.08]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.4} metalness={0.65} emissive="#c9a24a" emissiveIntensity={0.12} />
        {BANNER_XS.map((x, i) => (
          <Instance key={`fringe-${i}`} position={[x, 4.05, -13.97]} rotation={[0.085, 0, 0]} />
        ))}
      </Instances>

      {/* ── Benches along the side walls, between the columns (1 draw call) ── */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[0.75, 0.42, 2.6]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {[-9, -3, 3, 9].flatMap((z) => [
          <Instance key={`bench-l-${z}`} position={[-13.7, 0.21, z]} />,
          <Instance key={`bench-r-${z}`} position={[13.7, 0.21, z]} />,
        ])}
      </Instances>

      {/* ── Clerestory window panes on the side walls — warm glow, bloom-friendly (1 draw call) ── */}
      <Instances>
        <boxGeometry args={[0.12, 3.2, 1.4]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={1.05} roughness={0.3} />
        {[-9, -3, 3, 9].flatMap((z) => [
          <Instance key={`win-l-${z}`} position={[-14.4, 6.4, z]} />,
          <Instance key={`win-r-${z}`} position={[14.4, 6.4, z]} />,
        ])}
      </Instances>

      {/* ── Window frames: jambs + sills boxed around each pane (1 draw call via per-instance scale) ── */}
      <Instances castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...DARK_WOOD} />
        {[-9, -3, 3, 9].flatMap((z) =>
          [-14.38, 14.38].flatMap((x) => [
            <Instance key={`jamb-a-${x}-${z}`} position={[x, 6.4, z - 0.78]} scale={[0.2, 3.6, 0.16]} />,
            <Instance key={`jamb-b-${x}-${z}`} position={[x, 6.4, z + 0.78]} scale={[0.2, 3.6, 0.16]} />,
            <Instance key={`sill-top-${x}-${z}`} position={[x, 8.1, z]} scale={[0.2, 0.16, 1.72]} />,
            <Instance key={`sill-bot-${x}-${z}`} position={[x, 4.7, z]} scale={[0.2, 0.16, 1.72]} />,
          ]),
        )}
      </Instances>

      {/* ── Light shafts angling in from the windows — static, additive, very low opacity (1 draw call) ── */}
      <Instances>
        <planeGeometry args={[1.5, 7.5]} />
        <meshBasicMaterial
          color="#ffdfae"
          transparent
          opacity={0.075}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
        {[-9, -3, 3, 9].flatMap((z) => [
          <Instance
            key={`shaft-l-${z}`}
            position={[-11.6, 4.3, z]}
            rotation={[0, Math.PI / 2, 0.62]}
          />,
          <Instance
            key={`shaft-r-${z}`}
            position={[11.6, 4.3, z]}
            rotation={[0, Math.PI / 2, -0.62]}
          />,
        ])}
      </Instances>

      {/* ── Cornice caps along the wall tops — cleans the silhouette (1 draw call via per-instance scale) ── */}
      <Instances castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6f6353" roughness={0.85} metalness={0.02} />
        <Instance position={[0, 10.15, -15]} scale={[30.9, 0.35, 1.35]} />
        <Instance position={[-15, 10.15, 0]} scale={[1.35, 0.35, 30.9]} />
        <Instance position={[15, 10.15, 0]} scale={[1.35, 0.35, 30.9]} />
        <Instance position={[-8, 10.15, 15]} scale={[14.3, 0.35, 1.35]} />
        <Instance position={[8, 10.15, 15]} scale={[14.3, 0.35, 1.35]} />
      </Instances>

      {/* ── Wainscot skirting along all wall bases — grounds the walls to the floor (1 draw call) ── */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3d3450" roughness={0.85} metalness={0.03} />
        <Instance position={[0, 0.5, -14.4]} scale={[30.4, 1.0, 0.26]} />
        <Instance position={[-14.4, 0.5, 0]} scale={[0.26, 1.0, 30.4]} />
        <Instance position={[14.4, 0.5, 0]} scale={[0.26, 1.0, 30.4]} />
        <Instance position={[-8.6, 0.5, 14.4]} scale={[12.8, 1.0, 0.26]} />
        <Instance position={[8.6, 0.5, 14.4]} scale={[12.8, 1.0, 0.26]} />
      </Instances>

      {/* ── Dais glow ring — indigo floor inlay tying the dais to the terminal glow (1 draw call) ── */}
      <mesh position={[0, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.55, 3.8, 48]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={1.5}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* ── Entrance framing: two pillars + lintel over the front gap (2 draw calls) ── */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[0.9, 9.4, 0.9]} />
        <meshStandardMaterial {...STONE} />
        <Instance position={[-1.5, 4.7, 15]} />
        <Instance position={[1.5, 4.7, 15]} />
      </Instances>
      <mesh position={[0, 9.6, 15]} castShadow>
        <boxGeometry args={[4.4, 0.9, 1.1]} />
        <meshStandardMaterial {...STONE} />
      </mesh>

      {/* ── Dais under the Sorting Computer — makes arrival a destination (2 draw calls) ── */}
      <mesh position={[0, 0.11, -10]} receiveShadow castShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.22, 24]} />
        <meshStandardMaterial color="#77685a" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.31, -10]} receiveShadow castShadow>
        <cylinderGeometry args={[2.5, 2.7, 0.18, 24]} />
        <meshStandardMaterial color="#84756a" roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  );
}
