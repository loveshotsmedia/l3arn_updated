/**
 * MasteryBuilding — a holding that appears only once the student has
 * demonstrated the mastery that unlocks it (spec §3.4 "Mastery Makes the
 * World"). Renders nothing until unlocked — the building's absence IS the
 * "not yet mastered" state; there is no locked/greyed-out placeholder,
 * because a visible-but-locked building would read as a purchasable reward,
 * which is exactly the framing this feature exists to avoid.
 */
import { useWorldStore } from '../state/worldStore';

interface MasteryBuildingProps {
  position: [number, number, number];
  holdingId: string;
}

export function MasteryBuilding({ position, holdingId }: MasteryBuildingProps) {
  const unlockedHoldingIds = useWorldStore((s) => s.unlockedHoldingIds);
  if (!unlockedHoldingIds.includes(holdingId)) return null;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 2, 8]} />
        <meshStandardMaterial color="#c4a35a" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 2.3, 0]}>
        <coneGeometry args={[1.5, 1.2, 8]} />
        <meshStandardMaterial color="#6366f1" roughness={0.4} metalness={0.3} emissive="#6366f1" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
