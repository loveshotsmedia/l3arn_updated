/**
 * WallTapestries — two rich hanging tapestries on the left wall, in the
 * gaps between the clerestory windows (windows sit at z = -9/-3/3/9; the
 * hearth owns z = 6, so tapestries take z = -6 and 0). Adds color and cloth
 * to the biggest camera-facing stone expanse (pass-7 dead-zone lesson: the
 * -x half is what the player actually sees). Static — no gating needed.
 *
 * Draw calls: cloth(1) + rods(1) + trim(1) + medallions(2) = 5.
 */
import { Instances, Instance } from '@react-three/drei';

const TAPESTRY_ZS = [-6, 0];
const CLOTH_COLORS = ['#5a3a7a', '#8a4a32']; // royal violet, warm terracotta

export function WallTapestries() {
  return (
    <group>
      {/* Cloth panels — tilted slightly off the wall like the House banners */}
      <Instances>
        <boxGeometry args={[0.06, 3.4, 2.15]} />
        <meshStandardMaterial roughness={0.85} metalness={0.0} emissive="#ffffff" emissiveIntensity={0.12} />
        {TAPESTRY_ZS.map((z, i) => (
          <Instance
            key={`cloth-${z}`}
            position={[-14.32, 4.7, z]}
            rotation={[0, 0, -0.07]}
            color={CLOTH_COLORS[i]}
          />
        ))}
      </Instances>

      {/* Hanging rods */}
      <Instances castShadow>
        <boxGeometry args={[0.11, 0.11, 2.6]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.7} />
        {TAPESTRY_ZS.map((z) => (
          <Instance key={`rod-${z}`} position={[-14.35, 6.55, z]} />
        ))}
      </Instances>

      {/* Gold trim bar along each bottom edge */}
      <Instances>
        <boxGeometry args={[0.07, 0.13, 2.15]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.4} metalness={0.65} emissive="#c9a24a" emissiveIntensity={0.12} />
        {TAPESTRY_ZS.map((z) => (
          <Instance key={`trim-${z}`} position={[-14.19, 3.02, z]} rotation={[0, 0, -0.07]} />
        ))}
      </Instances>

      {/* Center medallions — one gold ring per tapestry */}
      {TAPESTRY_ZS.map((z) => (
        <mesh key={`med-${z}`} position={[-14.22, 4.8, z]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.42, 0.05, 8, 24]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.35} metalness={0.7} emissive="#c9a24a" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}
