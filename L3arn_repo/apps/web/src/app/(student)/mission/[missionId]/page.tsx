"use client";

import { useParams, useRouter } from "next/navigation";

const MISSION_001_PLACEHOLDER = {
  id: "mission-001",
  title: "Repair the Sorting Computer",
  narrative: "The Sorting Computer glitched right after your ceremony! Your companion needs your help to find the bug, fix the logic, and prove that even the most powerful AI needs a human partner to check its work.",
  objective: "Use logic, sequencing, and pattern recognition to repair the Sorting Computer. Learn that AI is powerful — but must be checked.",
  academicTargets: ["AI literacy", "Logic and sequencing", "Reading/listening comprehension", "Evidence-based reasoning"],
  rewardPreview: "Starter Moolah · AI Literacy Badge · Companion Bond +10 · House Points",
  estimatedMinutes: 20,
  location: "Great Hall Computer Core",
};

type MissionData = typeof MISSION_001_PLACEHOLDER;

function getMissionData(missionId: string): MissionData | null {
  if (missionId === "mission-001") return MISSION_001_PLACEHOLDER;
  return null;
}

export default function MissionBriefingPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();

  if (!missionId) {
    return <div style={{ color: "#f87171", padding: "2rem" }}>Missing mission ID.</div>;
  }

  const mission = getMissionData(missionId);

  if (!mission) {
    return (
      <div style={styles.container}>
        <p style={{ color: "#f87171" }}>Mission not found. It may still be loading or awaiting parent approval.</p>
      </div>
    );
  }

  function handleBeginMission() {
    // Placeholder: Sprint 2 — dispatch mission.started WorldEvent to Railway
    console.log("[L3ARN] Placeholder: Begin Mission →", missionId);
    router.push("/student/academy");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.locationBadge}>{mission.location}</div>
        <h1 style={styles.title}>{mission.title}</h1>
        <p style={styles.narrative}>{mission.narrative}</p>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>What You&apos;ll Learn</h3>
          <ul style={styles.targetList}>
            {mission.academicTargets.map((t) => <li key={t} style={styles.targetItem}>{t}</li>)}
          </ul>
        </div>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Mission Objective</h3>
          <p style={styles.objectiveText}>{mission.objective}</p>
        </div>
        <div style={styles.rewardBanner}>
          <span style={styles.rewardLabel}>Rewards</span>
          <span style={styles.rewardValue}>{mission.rewardPreview}</span>
        </div>
        <div style={styles.meta}>About {mission.estimatedMinutes} minutes</div>
        <button style={styles.beginBtn} onClick={handleBeginMission}>Begin Mission</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", minHeight: "calc(100vh - 52px)" },
  card: { background: "rgba(30, 41, 59, 0.95)", border: "1px solid #1e293b", borderRadius: "16px", padding: "2rem", maxWidth: "600px", width: "100%" },
  locationBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "999px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#818cf8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "1rem", letterSpacing: "0.06em", textTransform: "uppercase" as const },
  title: { fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "1rem" },
  narrative: { color: "#94a3b8", lineHeight: 1.7, marginBottom: "1.5rem" },
  section: { marginBottom: "1.5rem" },
  sectionTitle: { fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.5rem" },
  targetList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" },
  targetItem: { background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "6px", padding: "4px 10px", color: "#a5b4fc", fontSize: "0.85rem" },
  objectiveText: { color: "#cbd5e1", lineHeight: 1.6 },
  rewardBanner: { background: "rgba(250, 204, 21, 0.08)", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", flexDirection: "column" as const, gap: "0.25rem", marginBottom: "1rem" },
  rewardLabel: { fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  rewardValue: { fontSize: "0.9rem", color: "#fde68a" },
  meta: { color: "#64748b", fontSize: "0.85rem", marginBottom: "1.5rem" },
  beginBtn: { width: "100%", padding: "0.875rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)" },
};
