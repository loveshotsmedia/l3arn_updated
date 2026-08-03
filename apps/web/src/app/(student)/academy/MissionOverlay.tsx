"use client";

/**
 * MissionOverlay — renders the Mission 001 experience as a fullscreen
 * overlay ON TOP OF the (now-quieted, per the two-modes law) 3D Great Hall,
 * instead of navigating away to /student/mission/[missionId]. This is what
 * "Mission 001 pulled in-world" means in Phase 1: the world stays mounted
 * and visible-but-quiet behind the mission UI; the mission's own pedagogy,
 * telemetry (tryCapture), and Railway calls are entirely unchanged.
 */
import dynamic from "next/dynamic";

// Import the dual-mode MissionExperience (NOT page.tsx's default export — a
// Next page default export must satisfy PageProps and cannot carry the
// forcedMissionId/onExit props this overlay passes). ssr:false keeps this
// client-only, mounted on demand over the (quieted) 3D Great Hall.
const MissionPageInner = dynamic(
  () => import("../mission/[missionId]/MissionExperience").then((mod) => mod.MissionExperience),
  { ssr: false },
);

interface MissionOverlayProps {
  missionId: string;
  onClose: () => void;
}

export function MissionOverlay({ missionId, onClose }: MissionOverlayProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(8, 10, 20, 0.55)", // lets the quieted world read faintly behind the mission card
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: "720px", margin: "2rem" }}>
        <MissionPageInner forcedMissionId={missionId} onExit={onClose} />
      </div>
    </div>
  );
}
