"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorldCanvas } from "@l3arn/world-engine";
import type { SceneKey, WorldEvent } from "@l3arn/world-engine";
import { getVerifiedIdentity } from "../../../lib/student-session";

type RealHouse = "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
const REAL_HOUSES: RealHouse[] = ["Valkryn", "Lyrion", "Novari", "Cytrex"];
const asRealHouse = (h: string | null | undefined): RealHouse | undefined =>
  h && (REAL_HOUSES as string[]).includes(h) ? (h as RealHouse) : undefined;

export default function AcademyPage() {
  const router = useRouter();
  const [currentScene] = useState<SceneKey>("great-hall");

  // Identity authority is the verified session (sessionStorage), never localStorage.
  // Loaded in an effect to avoid SSR/hydration mismatch. Dev-only localStorage
  // fallback keeps local UI work going when entering outside the real flow.
  const [displayName, setDisplayName] = useState("Explorer");
  const [house, setHouse] = useState<RealHouse | undefined>(undefined);

  useEffect(() => {
    const verified = getVerifiedIdentity();
    if (verified) {
      setDisplayName(verified.displayName);
      setHouse(asRealHouse(verified.house));
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      const dn = localStorage.getItem("l3arn_display_name");
      if (dn) setDisplayName(dn);
      setHouse(asRealHouse(localStorage.getItem("l3arn_house")));
    }
  }, []);

  function handleWorldEvent(event: WorldEvent) {
    switch (event.type) {
      case "object-interact":
        if (event.objectId === "sorting-computer") {
          router.push("/student/mission/mission-001");
        }
        break;
      case "avatar-move-requested":
        console.log("[L3ARN] Avatar move requested to:", event.targetPosition);
        break;
      case "scene-transition":
        console.log("[L3ARN] Scene transition:", event.fromScene, "→", event.toScene);
        break;
      case "mission-trigger":
        router.push(`/student/mission/${event.missionId}`);
        break;
      default: {
        const _exhaustive: never = event;
        console.warn("[L3ARN] Unhandled world event:", _exhaustive);
      }
    }
  }

  return (
    <div style={styles.canvasContainer}>
      <WorldCanvas
        scene={currentScene}
        onEvent={handleWorldEvent}
        displayName={displayName}
        house={house}
      />
      <div style={styles.hudOverlay}>
        <div style={styles.hudHint}>
          Click anywhere to move · Click the Sorting Computer to begin
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  canvasContainer: {
    flex: 1,
    position: "relative",
    height: "calc(100vh - 52px)",
  },
  hudOverlay: {
    position: "absolute",
    bottom: "1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
    zIndex: 10,
  },
  hudHint: {
    background: "rgba(15, 23, 42, 0.75)",
    color: "#94a3b8",
    padding: "6px 16px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    border: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
};
