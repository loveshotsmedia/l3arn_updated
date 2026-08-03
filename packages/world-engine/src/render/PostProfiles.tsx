/**
 * PostProfiles — the visual half of the two-modes law (spec §4). Explore
 * mode gets the full stylized-PBR look (bloom + AO); Mission mode strips it
 * back to just tone-mapped output so the task surface reads clearly and
 * doesn't compete with instruction (Mayer's Coherence Principle — spec §5.2 /
 * research report 05 §1).
 */
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';
import { useWorldStore } from '../state/worldStore';

export function PostProfiles() {
  const worldMode = useWorldStore((s) => s.worldMode);

  if (worldMode === 'mission') {
    // Deliberately no <EffectComposer> at all in Mission mode — cheapest
    // possible path, and there is nothing to "turn off" that could leak.
    return null;
  }

  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.5} intensity={1.2} />
      <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.2} intensity={0.4} />
    </EffectComposer>
  );
}
