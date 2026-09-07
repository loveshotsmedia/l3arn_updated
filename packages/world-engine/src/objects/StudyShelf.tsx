/**
 * StudyShelf — a bookshelf against the back wall with rows of colorful book
 * spines: the hall's first explicit "school" prop. Static dressing.
 *
 * The case is one instanced unit-box (per-instance scale) and every book
 * spine is one instance with a deterministic per-instance color cycled from
 * a fixed palette — 2 draw calls total. No Math.random (determinism keeps
 * screenshot diffs meaningful).
 */
import { Instances, Instance } from '@react-three/drei';

const SPINE_PALETTE = [
  '#b8452f', '#c9a24a', '#3f7fae', '#4fae66',
  '#7a4fae', '#ae4f7f', '#3fae9d', '#d97b3c',
];

interface StudyShelfProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function StudyShelf({ position = [10.5, 0, -14.1], rotation = [0, 0, 0] }: StudyShelfProps) {
  const shelfYs = [0.55, 1.35, 2.15];
  const books: { x: number; y: number; h: number; w: number; c: string }[] = [];
  for (let s = 0; s < shelfYs.length; s++) {
    let x = -1.28;
    let i = 0;
    while (x < 1.22) {
      const w = 0.1 + ((s * 7 + i * 3) % 4) * 0.02; // deterministic width variation
      const h = 0.5 + ((s * 5 + i * 2) % 5) * 0.035; // deterministic height variation
      books.push({ x: x + w / 2, y: shelfYs[s] + h / 2, h, w, c: SPINE_PALETTE[(s * 3 + i) % SPINE_PALETTE.length] });
      x += w + 0.025;
      i++;
    }
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Case: two sides, top, back, three shelf boards — one instanced unit box */}
      <Instances castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a3628" roughness={0.85} metalness={0.02} />
        <Instance position={[-1.45, 1.45, 0]} scale={[0.12, 2.9, 0.5]} />
        <Instance position={[1.45, 1.45, 0]} scale={[0.12, 2.9, 0.5]} />
        <Instance position={[0, 2.86, 0]} scale={[3.02, 0.12, 0.5]} />
        <Instance position={[0, 1.45, -0.21]} scale={[2.9, 2.9, 0.08]} />
        <Instance position={[0, 0.5, 0]} scale={[2.9, 0.1, 0.48]} />
        <Instance position={[0, 1.3, 0]} scale={[2.9, 0.1, 0.48]} />
        <Instance position={[0, 2.1, 0]} scale={[2.9, 0.1, 0.48]} />
      </Instances>

      {/* Book spines — deterministic sizes and palette colors */}
      <Instances>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.75} metalness={0.0} />
        {books.map((b, i) => (
          <Instance key={i} position={[b.x, b.y, 0.02]} scale={[b.w, b.h, 0.34]} color={b.c} />
        ))}
      </Instances>
    </group>
  );
}
