/**
 * AcademyScene — Great Hall 3D scene page.
 *
 * Renders the WorldCanvas component from @l3arn/world-engine with the
 * "great-hall" SceneKey. This is the student's main world view.
 *
 * World event routing:
 * - "object-interact" with objectId "sorting-computer" → navigate to
 *   Mission 001 briefing (/student/mission/mission-001)
 * - "avatar-move-requested" → logged to console (click-to-move placeholder)
 * - "scene-transition" → future: swap scene prop
 *
 * Open Question: scene prop is currently hardcoded to "great-hall". When
 * multi-room navigation is implemented, SceneKey state will be managed here
 * and driven by "scene-transition" WorldEvents from the Railway server.
 *
 * Open Question: The WorldCanvas import assumes @l3arn/world-engine is
 * available as a workspace package. This requires pnpm-workspace.yaml to
 * include "packages/world-engine" AND a pnpm install run.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldCanvas } from '@l3arn/world-engine';
import type { SceneKey, WorldEvent } from '@l3arn/world-engine';
import StudentLayout from './StudentLayout';

export default function AcademyScene() {
  const navigate = useNavigate();
  const [currentScene] = useState<SceneKey>('great-hall');

  // Placeholder: read from session/localStorage until Supabase session is wired.
  const displayName = localStorage.getItem('l3arn_display_name') ?? 'Explorer';
  const house = (localStorage.getItem('l3arn_house') ?? undefined) as
    | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex'
    | undefined;

  function handleWorldEvent(event: WorldEvent) {
    switch (event.type) {
      case 'object-interact':
        if (event.objectId === 'sorting-computer') {
          // Trigger Mission 001 entry transition
          navigate('/student/mission/mission-001');
        }
        break;

      case 'avatar-move-requested':
        // Placeholder: position is logged. In full implementation,
        // this will also broadcast to the Railway realtime server.
        console.log(
          '[L3ARN] Avatar move requested to:',
          event.targetPosition,
        );
        break;

      case 'scene-transition':
        // Placeholder: future multi-room navigation
        console.log(
          '[L3ARN] Scene transition:',
          event.fromScene,
          '→',
          event.toScene,
        );
        break;

      case 'mission-trigger':
        navigate(`/student/mission/${event.missionId}`);
        break;

      default: {
        const _exhaustive: never = event;
        console.warn('[L3ARN] Unhandled world event:', _exhaustive);
      }
    }
  }

  return (
    <StudentLayout displayName={displayName}>
      <div style={styles.canvasContainer}>
        <WorldCanvas
          scene={currentScene}
          onEvent={handleWorldEvent}
          displayName={displayName}
          house={house}
        />

        {/* HUD overlay — minimal, student-appropriate */}
        <div style={styles.hudOverlay}>
          <div style={styles.hudHint}>
            Click anywhere to move · Click the Sorting Computer to begin
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  canvasContainer: {
    flex: 1,
    position: 'relative',
    height: 'calc(100vh - 52px)', // subtract header height
  },
  hudOverlay: {
    position: 'absolute',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  hudHint: {
    background: 'rgba(15, 23, 42, 0.75)',
    color: '#94a3b8',
    padding: '6px 16px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    border: '1px solid #1e293b',
    whiteSpace: 'nowrap',
  },
};
