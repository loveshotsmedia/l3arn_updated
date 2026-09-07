/**
 * Lighting — the single lighting rig for every scene (spec §7.2).
 *
 * Visual-pass update: the dawn HDRI is now the visible sky (background), not
 * just IBL — the hall's open roof reads as a skylit atrium. A hemisphere
 * light replaces the old flat ambient + fill pair: cool sky bounce from
 * above, warm ground bounce from below, which is what lifts shadows into
 * color instead of crushing them to black (spec §7.2 QA rule: no pure-black
 * shadows). The sun stays the ONE real-time shadow-casting light
 * (spec §8.1: ≤1 shadow light on LOW tier).
 *
 * Pass 9 — warm grade: amber sun color, higher exposure, warmer ground
 * bounce. The sun's ANGLE stays steep ([10, 20, 10]) on purpose: two
 * lower-sun attempts (y 9, then y 15) both left most of the floor inside
 * the 10-unit walls' cast shadow — an enclosed hall needs a steep sun or
 * the room reads as dusk. Warmth comes from color/exposure, not elevation.
 * Shadow floors stay lifted and colored, never crushed (spec §7.2).
 */
import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

export function Lighting() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.18;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl]);

  return (
    <>
      {/* IBL + visible sky. Slight blur keeps the 1k HDRI painterly rather than pixelated. */}
      <Environment files="/env/great-hall-dawn.hdr" background backgroundBlurriness={0.06} />

      {/* Hemisphere bounce — cool sky above, warm stone below. Lifts shadow floors into color. */}
      <hemisphereLight args={['#c3cdec', '#b08356', 0.6]} />

      {/* Key light / "sun" — the ONE real-time shadow-casting light, dawn-warm. */}
      <directionalLight
        color="#ffd9a4"
        position={[10, 20, 10]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />
    </>
  );
}
