"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  startMission,
  completeMission,
  type CompleteMissionInput,
} from "../../../../lib/student-session";
import type { StartMissionResponse, CompleteMissionResponse } from "@l3arn/shared-types";

type Phase = "loading" | "briefing" | "completing" | "done" | "error" | "dev-fallback";

const MISSION_TITLES: Record<string, string> = {
  "mission-001": "Repair the Sorting Computer",
};

export default function MissionPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [mission, setMission] = useState<StartMissionResponse | null>(null);
  const [result, setResult] = useState<CompleteMissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const title = MISSION_TITLES[missionId ?? ""] ?? "Mission";

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;

    void startMission(missionId).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        setMission(outcome.data);
        setPhase("briefing");
        return;
      }
      // Dev-only: no verified session outside the real entry flow.
      if (outcome.error === "SESSION_TOKEN_MISSING" && process.env.NODE_ENV !== "production") {
        setPhase("dev-fallback");
        return;
      }
      setErrorMessage(outcome.message);
      setPhase("error");
    });

    return () => {
      cancelled = true;
    };
  }, [missionId]);

  async function handleComplete() {
    if (!mission) return;
    setPhase("completing");
    const input: CompleteMissionInput = {
      missionAttemptId: mission.missionAttemptId,
      completedAllTasks: true,
      masteryThresholdMet: true,
    };
    const outcome = await completeMission(input);
    if (outcome.ok) {
      setResult(outcome.data);
      setPhase("done");
    } else {
      setErrorMessage(outcome.message);
      setPhase("error");
    }
  }

  // ── Loading / completing ───────────────────────────────────────────────────
  if (phase === "loading" || phase === "completing") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.narrative}>
            {phase === "loading" ? "Preparing your mission…" : "Saving your progress…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Mission unavailable</h1>
          <p style={styles.narrative}>{errorMessage}</p>
          <button style={styles.beginBtn} onClick={() => router.push("/student/academy")}>
            Back to the Academy
          </button>
        </div>
      </div>
    );
  }

  // ── Done — reward summary ──────────────────────────────────────────────────
  if (phase === "done" && result) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.locationBadge}>Mission Complete</div>
          <h1 style={styles.title}>Nice work!</h1>
          <p style={styles.narrative}>
            {result.alreadyCompleted
              ? "You already finished this mission — your rewards are safe."
              : "You repaired the Sorting Computer and proved that even powerful AI needs a human partner."}
          </p>
          <div style={styles.rewardGrid}>
            <Reward label="Moolah" value={`+${result.rewards.moolahEarned}`} />
            <Reward label="XP" value={`+${result.rewards.xpEarned}`} />
            <Reward label="House Points" value={`+${result.rewards.housePointsEarned}`} />
            <Reward label="Companion Bond" value={`+${result.rewards.companionBondDelta}`} />
          </div>
          {result.rewards.badgesAwarded.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Badges Earned</h3>
              <ul style={styles.targetList}>
                {result.rewards.badgesAwarded.map((b) => (
                  <li key={b} style={styles.targetItem}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <button style={styles.beginBtn} onClick={() => router.push("/student/academy")}>
            Return to the Academy
          </button>
        </div>
      </div>
    );
  }

  // ── Dev fallback (non-production, no session) ───────────────────────────────
  if (phase === "dev-fallback") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.locationBadge}>Great Hall Computer Core</div>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.devWarning}>
            DEV: no session token — mission not loaded from backend. Enter via a parent-launched
            link to run the real Mission 001 flow.
          </p>
          <button style={styles.beginBtn} onClick={() => router.push("/student/academy")}>
            Back to the Academy
          </button>
        </div>
      </div>
    );
  }

  // ── Briefing (real, from backend) ──────────────────────────────────────────
  if (!mission) return null;
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.locationBadge}>Great Hall Computer Core</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.narrative}>{mission.storyHook}</p>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Your Tasks</h3>
          <ul style={styles.taskList}>
            {mission.tasks.map((t) => (
              <li key={t.id} style={styles.taskItem}>{t.description}</li>
            ))}
          </ul>
        </div>

        <div style={styles.rewardBanner}>
          <span style={styles.rewardLabel}>Rewards</span>
          <span style={styles.rewardValue}>{mission.rewardPreviewLabel}</span>
        </div>

        <button style={styles.beginBtn} onClick={handleComplete}>
          Complete Mission
        </button>
      </div>
    </div>
  );
}

function Reward({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.rewardCell}>
      <span style={styles.rewardCellValue}>{value}</span>
      <span style={styles.rewardCellLabel}>{label}</span>
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
  taskList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" as const, gap: "0.5rem" },
  taskItem: { background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "8px", padding: "0.625rem 0.875rem", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 },
  targetList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" },
  targetItem: { background: "rgba(250, 204, 21, 0.1)", border: "1px solid rgba(250, 204, 21, 0.25)", borderRadius: "6px", padding: "4px 10px", color: "#fde68a", fontSize: "0.85rem" },
  rewardBanner: { background: "rgba(250, 204, 21, 0.08)", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", flexDirection: "column" as const, gap: "0.25rem", marginBottom: "1.5rem" },
  rewardLabel: { fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  rewardValue: { fontSize: "0.9rem", color: "#fde68a" },
  rewardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" },
  rewardCell: { background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: "10px", padding: "0.875rem", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.25rem" },
  rewardCellValue: { fontSize: "1.4rem", fontWeight: 700, color: "#4ade80" },
  rewardCellLabel: { fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  devWarning: { color: "#fbbf24", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "1.5rem", padding: "0.625rem 0.875rem", borderRadius: "8px", background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)" },
  beginBtn: { width: "100%", padding: "0.875rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)" },
};
