/**
 * SortingComputer — Interactive object in the Great Hall.
 *
 * Placeholder box mesh with emissive glow. Clicking triggers a WorldEvent
 * of type "object-interact" with objectId "sorting-computer".
 *
 * Future: replace BoxGeometry with imported 3D model asset when art is ready.
 */

import { useRef } from 'react';
import { Mesh } from 'three';
import { Html } from '@react-three/drei';
import type { WorldEvent } from '../types';

interface SortingComputerProps {
  position?: [number, number, number];
  onEvent: (event: WorldEvent) => void;
}

export function SortingComputer({ position = [0, 0.75, 0], onEvent }: SortingComputerProps) {
  const meshRef = useRef<Mesh>(null);

  function handleClick(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    onEvent({
      type: 'object-interact',
      objectId: 'sorting-computer',
      roomId: 'great-hall',
    });
  }

  return (
    <group position={position}>
      {/* Glowing box representing the Sorting Computer terminal */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
      >
        <boxGeometry args={[1.2, 1.5, 0.8]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive="#6366f1"
          emissiveIntensity={0.6}
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* Screen face — bright panel on the front */}
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#818cf8"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Label above the computer (Html from @react-three/drei) */}
      <Html
        position={[0, 1.2, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
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
    </group>
  );
}
