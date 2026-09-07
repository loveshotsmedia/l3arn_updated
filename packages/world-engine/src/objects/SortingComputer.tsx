/**
 * SortingComputer — Interactive object in the Great Hall.
 *
 * Visual pass 2: composed hero terminal (plinth, angled console, screen with
 * glowing bezel, twin side pylons, floating holo ring) replacing the single
 * placeholder box. Still all procedural geometry. The interaction contract
 * is unchanged: clicking anywhere on the terminal enters Mission mode,
 * requests the camera settle, and dispatches the same "object-interact"
 * WorldEvent — the click handler now lives on the <group>, so every part is
 * clickable (bigger, friendlier hit target than the old single box).
 *
 * The group's origin is at FLOOR level (y = 0 at the base of the plinth) —
 * place it directly on whatever surface it stands on.
 *
 * The holo ring is deliberately static (no idle spin): idle animation here
 * would be ambient motion, and this object is the doorway into Mission mode
 * where motion must be quiet (spec §4). Emissive-only glow, no real lights.
 */

import { Html } from '@react-three/drei';
import type { WorldEvent } from '../types';
import { useWorldStore } from '../state/worldStore';

interface SortingComputerProps {
  position?: [number, number, number];
  onEvent: (event: WorldEvent) => void;
}

const DARK_METAL = { color: '#1e293b', roughness: 0.35, metalness: 0.85 };

export function SortingComputer({ position = [0, 0, 0], onEvent }: SortingComputerProps) {
  // World labels are Explore-mode chrome: they hide the moment a mission starts
  // (spec §4 — the world quiets), which also stops drei's high-z-index Html from
  // bleeding through the mission overlay.
  const worldMode = useWorldStore((s) => s.worldMode);

  function handleClick(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    useWorldStore.getState().enterMissionMode();
    useWorldStore.getState().requestSettle(position);
    onEvent({
      type: 'object-interact',
      objectId: 'sorting-computer',
      roomId: 'great-hall',
    });
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Plinth */}
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.18, 20]} />
        <meshStandardMaterial color="#2b3345" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Console pedestal */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.7, 0.75, 0.5]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>

      {/* Angled console head */}
      <group position={[0, 1.1, 0.05]} rotation={[-0.32, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.35, 0.95, 0.16]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
        {/* Screen — bright indigo panel */}
        <mesh position={[0, 0.02, 0.085]}>
          <planeGeometry args={[1.15, 0.72]} />
          <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={1.7} roughness={0.2} />
        </mesh>
        {/* Bezel underglow strip */}
        <mesh position={[0, -0.44, 0.085]}>
          <planeGeometry args={[1.2, 0.05]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>

      {/* Twin side pylons with emissive strips */}
      {[-0.95, 0.95].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[0.16, 1.6, 0.16]} />
            <meshStandardMaterial {...DARK_METAL} />
          </mesh>
          <mesh position={[0, 0.8, 0.085]}>
            <planeGeometry args={[0.05, 1.35]} />
            <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2.0} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Floating holo ring — static by design (see header note) */}
      <mesh position={[0, 2.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.028, 10, 40]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>

      {/* Label above the terminal — Explore mode only (see note at top) */}
      {worldMode === 'explore' && (
      <Html position={[0, 2.55, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#818cf8',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: '1px solid #6366f1',
            letterSpacing: '0.05em',
          }}
        >
          Sorting Computer
        </div>
      </Html>
      )}
    </group>
  );
}
