/**
 * Lighting — the single lighting rig for every scene (spec §7.2).
 * One directional sun with cascaded-quality shadow settings, an environment
 * map for image-based lighting, and ACES filmic tone mapping. Real HDRI
 * asset is wired in Phase 1 Task 10; until then <Environment preset> gives
 * a reasonable built-in IBL so this task is independently verifiable.
 */
import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

export function Lighting() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl]);

  return (
    <>
      <Environment preset="dawn" background={false} />

      <ambientLight intensity={0.25} />

      {/* Key light / "sun" — the ONE real-time shadow-casting light (spec §8.1: <=1 real-time light on LOW tier). */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />

      {/* Soft fill — no shadow, cheap. */}
      <directionalLight position={[-5, 10, -5]} intensity={0.25} />
    </>
  );
}
