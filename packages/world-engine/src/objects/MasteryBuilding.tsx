/**
 * MasteryBuilding — placeholder until Task 14 wires the real mastery-gated
 * unlock (Supabase `world_holdings` table, spec §3.4). Renders nothing.
 */
interface MasteryBuildingProps {
  position?: [number, number, number];
  holdingId: string;
}

export function MasteryBuilding(_props: MasteryBuildingProps) {
  return null;
}
