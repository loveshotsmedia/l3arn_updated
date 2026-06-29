"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  startMission,
  completeMission,
  updateCalibration,
  type CompleteMissionInput,
} from "../../../../lib/student-session";
import type { StartMissionResponse, CompleteMissionResponse } from "@l3arn/shared-types";

// ── Types ─────────────────────────────────────────────────────────────────────

type GamePhase =
  | "loading"
  | "briefing"
  | "step"
  | "completing"
  | "done"
  | "error"
  | "dev-fallback";

// ── Evidence capture (Agent 14 dependency) ────────────────────────────────────
// captureEvidence() is being built by Agent 14 in apps/web/src/lib/student-session.ts
// We use a dynamic import with try/catch so its absence does not block gameplay.

async function tryCapture(
  missionAttemptId: string,
  taskId: string,
  captureType: string,
  contentJson: object
): Promise<void> {
  try {
    // TODO (Agent 14): captureEvidence will be exported from student-session when Agent 14's work lands
    const mod = await import("../../../../lib/student-session");
    const captureEvidence = (mod as Record<string, unknown>)["captureEvidence"];
    if (typeof captureEvidence === "function") {
      await (captureEvidence as (
        id: string,
        taskId: string,
        type: string,
        content: object
      ) => Promise<void>)(missionAttemptId, taskId, captureType, contentJson);
    }
  } catch {
    // best-effort, non-fatal — gameplay continues regardless
  }
}

// ── Companion Dialogue Component ──────────────────────────────────────────────

function CompanionDialogue({ text }: { text: string }) {
  return (
    <div style={styles.companionPanel}>
      <div style={styles.companionSilhouette} aria-hidden="true">
        <div style={styles.companionHead} />
        <div style={styles.companionBody} />
      </div>
      <p style={styles.companionText}>{text}</p>
    </div>
  );
}

// ── Crystal Sorting Step (steps 0, 1, 2) ─────────────────────────────────────

const CRYSTAL_STEPS = [
  { stepIndex: 0, taskId: "task-sort-red", color: "Red", hex: "#ef4444", glow: "rgba(239,68,68,0.5)", emoji: "🔴" },
  { stepIndex: 1, taskId: "task-sort-blue", color: "Blue", hex: "#3b82f6", glow: "rgba(59,130,246,0.5)", emoji: "🔵" },
  { stepIndex: 2, taskId: "task-sort-green", color: "Green", hex: "#22c55e", glow: "rgba(34,197,94,0.5)", emoji: "🟢" },
] as const;

interface CrystalSortStepProps {
  stepDef: (typeof CRYSTAL_STEPS)[number];
  missionAttemptId: string;
  onComplete: () => void;
}

function CrystalSortStep({ stepDef, missionAttemptId, onComplete }: CrystalSortStepProps) {
  const [sorted, setSorted] = useState(false);

  async function handleSort() {
    setSorted(true);
    await tryCapture(missionAttemptId, stepDef.taskId, "sequence-completion", {
      color: stepDef.color.toLowerCase(),
      sortedAt: Date.now(),
    });
    setTimeout(onComplete, 800);
  }

  return (
    <div style={styles.stepContainer}>
      <div style={styles.locationBadge}>Great Hall Computer Core</div>
      <h1 style={styles.title}>Sort the {stepDef.color} Crystals</h1>

      <CompanionDialogue text="Look closely — what do all the crystals in that group have in common?" />

      <div style={styles.crystalRow} aria-label={`${stepDef.color} crystals`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              ...styles.crystalEmoji,
              opacity: sorted ? 0.3 : 1,
              transition: "opacity 0.4s ease",
            }}
          >
            {stepDef.emoji}
          </span>
        ))}
      </div>

      <button
        style={{
          ...styles.binBtn,
          borderColor: sorted ? stepDef.hex : "rgba(99,102,241,0.4)",
          boxShadow: sorted ? `0 0 20px ${stepDef.glow}` : "none",
          background: sorted
            ? `rgba(${stepDef.hex.replace("#", "").match(/.{2}/g)!.map((h) => parseInt(h, 16)).join(",")}, 0.2)`
            : "rgba(30,41,59,0.95)",
          transition: "all 0.3s ease",
        }}
        onClick={handleSort}
        disabled={sorted}
      >
        {sorted ? `✓ ${stepDef.color} crystals sorted!` : `${stepDef.color} Bin — click to sort`}
      </button>
    </div>
  );
}

// ── AI Mistake Check Step (step 3) ────────────────────────────────────────────

const AI_MISTAKE_OPTIONS = [
  { label: "A red crystal in the blue bin", correct: true },
  { label: "A blue crystal in the blue bin", correct: false },
  { label: "A green crystal in the green bin", correct: false },
  { label: "A purple crystal in the purple bin", correct: false },
];

interface AIMistakeStepProps {
  missionAttemptId: string;
  onComplete: () => void;
  onHintUsed: () => void;
}

function AIMistakeStep({ missionAttemptId, onComplete, onHintUsed }: AIMistakeStepProps) {
  const [attempts, setAttempts] = useState(0);
  const [companionLine, setCompanionLine] = useState(
    "The AI sorted most crystals correctly, but it made one mistake. Can you find it?"
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);

  async function handleChoice(idx: number) {
    if (correct) return;
    setSelected(idx);
    const isCorrect = AI_MISTAKE_OPTIONS[idx].correct;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (isCorrect) {
      setCorrect(true);
      setCompanionLine("You caught it! AI can make mistakes — that's why we need humans to check.");
      await tryCapture(missionAttemptId, "task-ai-mistake-check", "ai-mistake-check", {
        answeredCorrectly: true,
        attempts: newAttempts,
      });
      setTimeout(onComplete, 1200);
    } else {
      onHintUsed();
      setCompanionLine("Almost! Try looking at the colors again — which crystal doesn't match its bin?");
    }
  }

  return (
    <div style={styles.stepContainer}>
      <div style={styles.locationBadge}>Great Hall Computer Core</div>
      <h1 style={styles.title}>The AI Made a Mistake!</h1>
      <p style={styles.narrative}>
        The Sorting Computer sorted most crystals correctly, but it put one in the WRONG bin.
      </p>

      <CompanionDialogue text={companionLine} />

      <p style={styles.questionLabel}>Which crystal is in the wrong bin?</p>

      <div style={styles.optionList}>
        {AI_MISTAKE_OPTIONS.map((opt, idx) => {
          const isSelected = selected === idx;
          const showCorrect = isSelected && opt.correct;
          const showWrong = isSelected && !opt.correct;
          return (
            <button
              key={idx}
              style={{
                ...styles.optionBtn,
                background: showCorrect
                  ? "rgba(34,197,94,0.2)"
                  : showWrong
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(30,41,59,0.95)",
                borderColor: showCorrect
                  ? "rgba(34,197,94,0.6)"
                  : showWrong
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(99,102,241,0.3)",
                cursor: correct ? "default" : "pointer",
              }}
              onClick={() => handleChoice(idx)}
              disabled={correct}
            >
              <span style={styles.optionLetter}>{String.fromCharCode(65 + idx)})</span>{" "}
              {opt.label}
              {showCorrect && <span style={styles.optionCheck}> ✓</span>}
              {showWrong && <span style={styles.optionX}> ✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Explain Rule Step (step 4) ────────────────────────────────────────────────

const EXPLAIN_OPTIONS = [
  { label: "I looked at the color.", correct: true },
  { label: "I looked at the size.", correct: false },
  { label: "I guessed.", correct: false },
  { label: "I followed the AI's instructions exactly.", correct: false },
];

interface ExplainRuleStepProps {
  missionAttemptId: string;
  onComplete: () => void;
  onHintUsed: () => void;
}

function ExplainRuleStep({ missionAttemptId, onComplete, onHintUsed }: ExplainRuleStepProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [companionLine, setCompanionLine] = useState(
    "Think carefully — what did you actually look at when you sorted the crystals?"
  );

  async function handleChoice(idx: number) {
    if (correct) return;
    setSelected(idx);
    const isCorrect = EXPLAIN_OPTIONS[idx].correct;

    if (isCorrect) {
      setCorrect(true);
      setCompanionLine("Exactly right! You used a clear, simple rule — that's how great sorters think.");
      await tryCapture(missionAttemptId, "task-explain-rule", "explanation", {
        answer: EXPLAIN_OPTIONS[idx].label,
        correct: true,
      });
      setTimeout(onComplete, 1200);
    } else {
      onHintUsed();
      setCompanionLine("Hmm, think again! What was the one thing that was different between the crystals?");
    }
  }

  return (
    <div style={styles.stepContainer}>
      <div style={styles.locationBadge}>Great Hall Computer Core</div>
      <h1 style={styles.title}>Explain the Sorting Rule</h1>
      <p style={styles.narrative}>You sorted all three bins perfectly! Now tell me how you did it.</p>

      <CompanionDialogue text={companionLine} />

      <p style={styles.questionLabel}>How did you know where each crystal goes?</p>

      <div style={styles.optionList}>
        {EXPLAIN_OPTIONS.map((opt, idx) => {
          const isSelected = selected === idx;
          const showCorrect = isSelected && opt.correct;
          const showWrong = isSelected && !opt.correct;
          return (
            <button
              key={idx}
              style={{
                ...styles.optionBtn,
                background: showCorrect
                  ? "rgba(34,197,94,0.2)"
                  : showWrong
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(30,41,59,0.95)",
                borderColor: showCorrect
                  ? "rgba(34,197,94,0.6)"
                  : showWrong
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(99,102,241,0.3)",
                cursor: correct ? "default" : "pointer",
              }}
              onClick={() => handleChoice(idx)}
              disabled={correct}
            >
              <span style={styles.optionLetter}>{String.fromCharCode(65 + idx)})</span>{" "}
              {opt.label}
              {showCorrect && <span style={styles.optionCheck}> ✓</span>}
              {showWrong && <span style={styles.optionX}> ✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reflection Step (step 5) ──────────────────────────────────────────────────

const REFLECTION_OPTIONS = [
  { label: "AI is always right.", best: false },
  { label: "Humans should check AI output.", best: true },
  { label: "Sorting is easy.", best: false },
  { label: "The Sorting Computer is broken forever.", best: false },
];

interface ReflectionStepProps {
  missionAttemptId: string;
  onComplete: () => void;
}

function ReflectionStep({ missionAttemptId, onComplete }: ReflectionStepProps) {
  const [selected, setSelected] = useState<number | null>(null);

  async function handleChoice(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    await tryCapture(missionAttemptId, "task-reflection", "reflection", {
      answer: REFLECTION_OPTIONS[idx].label,
      reflectionIndex: idx,
    });
    setTimeout(onComplete, 1000);
  }

  return (
    <div style={styles.stepContainer}>
      <div style={styles.locationBadge}>Mission Reflection</div>
      <h1 style={styles.title}>What Did You Learn?</h1>
      <p style={styles.narrative}>
        You fixed the Sorting Computer and caught an AI mistake. Take a moment to think about what this mission taught you.
      </p>

      <CompanionDialogue text="You fixed the Sorting Machine! The Academy is saved! What do you think this mission was really about?" />

      <p style={styles.questionLabel}>What does this mission teach you?</p>

      <div style={styles.optionList}>
        {REFLECTION_OPTIONS.map((opt, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              style={{
                ...styles.optionBtn,
                background: isSelected
                  ? "rgba(99,102,241,0.2)"
                  : opt.best && selected !== null
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(30,41,59,0.95)",
                borderColor: isSelected
                  ? "rgba(99,102,241,0.7)"
                  : opt.best && selected !== null
                  ? "rgba(34,197,94,0.35)"
                  : "rgba(99,102,241,0.3)",
                cursor: selected !== null ? "default" : "pointer",
              }}
              onClick={() => handleChoice(idx)}
              disabled={selected !== null}
            >
              <span style={styles.optionLetter}>{String.fromCharCode(65 + idx)})</span>{" "}
              {opt.label}
              {opt.best && selected !== null && (
                <span style={{ color: "#4ade80", marginLeft: 6, fontSize: "0.8rem" }}>
                  (great insight!)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mission 001 Titles ─────────────────────────────────────────────────────────

const MISSION_TITLES: Record<string, string> = {
  "mission-001": "Repair the Sorting Computer",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MissionPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<GamePhase>("loading");
  const [stepIndex, setStepIndex] = useState(0); // 0–5 for the 6 gameplay steps
  const [mission, setMission] = useState<StartMissionResponse | null>(null);
  const [result, setResult] = useState<CompleteMissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Telemetry accumulators
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const title = MISSION_TITLES[missionId ?? ""] ?? "Mission";

  // ── Load mission on mount ────────────────────────────────────────────────────
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

  // ── Decision log on step entry ───────────────────────────────────────────────
  const STEP_TASK_IDS = [
    "task-sort-red",
    "task-sort-blue",
    "task-sort-green",
    "task-ai-mistake-check",
    "task-explain-rule",
    "task-reflection",
  ];

  useEffect(() => {
    if (phase !== "step" || !mission) return;
    void tryCapture(mission.missionAttemptId, "task-decision-log", "decision-log", {
      stepId: STEP_TASK_IDS[stepIndex] ?? `step-${stepIndex}`,
      stepIndex,
      enteredAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  // ── Step advancement ─────────────────────────────────────────────────────────
  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next > 5) return prev; // guard
      return next;
    });
  }, []);

  const handleHintUsed = useCallback(() => {
    setTotalAttempts((p) => p + 1);
    setHintsUsed((p) => p + 1);
  }, []);

  const handleWrongAnswer = useCallback(() => {
    setTotalAttempts((p) => p + 1);
  }, []);

  // ── Final completion ─────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!mission) return;
    setPhase("completing");

    // Structured replay before completing
    await tryCapture(mission.missionAttemptId, "task-structured-replay", "structured-replay", {
      totalSteps: 6,
      totalAttempts,
      hintsUsed,
      completedAt: Date.now(),
    });

    const input: CompleteMissionInput = {
      missionAttemptId: mission.missionAttemptId,
      completedAllTasks: true,
      masteryThresholdMet: true,
    };
    const outcome = await completeMission(input);
    if (outcome.ok) {
      setResult(outcome.data);
      setPhase("done");
      updateCalibration().catch(() => {}); // best-effort: update calibration snapshot
    } else {
      setErrorMessage(outcome.message);
      setPhase("error");
    }
  }, [mission, totalAttempts, hintsUsed]);

  // When stepIndex advances past 5, kick off completion
  useEffect(() => {
    if (phase === "step" && stepIndex > 5) {
      void handleComplete();
    }
  }, [phase, stepIndex, handleComplete]);

  // ── Render: Loading / Completing ─────────────────────────────────────────────
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

  // ── Render: Error ─────────────────────────────────────────────────────────────
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

  // ── Render: Done — reward summary ─────────────────────────────────────────────
  if (phase === "done" && result) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.locationBadge}>Mission Complete</div>
          <h1 style={styles.title}>Nice work!</h1>
          <CompanionDialogue text="You fixed the Sorting Machine! The Academy is saved!" />
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
                  <li key={b} style={styles.targetItem}>
                    {b}
                  </li>
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

  // ── Render: Dev fallback ──────────────────────────────────────────────────────
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

  // ── Render: Briefing ──────────────────────────────────────────────────────────
  if (phase === "briefing") {
    if (!mission) return null;
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.locationBadge}>Great Hall Computer Core</div>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.narrative}>{mission.storyHook}</p>

          <CompanionDialogue text="Let's figure this out together! Which crystal should go first?" />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Your Tasks</h3>
            <ul style={styles.taskList}>
              {mission.tasks.map((t) => (
                <li key={t.id} style={styles.taskItem}>
                  {t.description}
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.rewardBanner}>
            <span style={styles.rewardLabel}>Rewards</span>
            <span style={styles.rewardValue}>{mission.rewardPreviewLabel}</span>
          </div>

          <button
            style={styles.beginBtn}
            onClick={() => {
              setStepIndex(0);
              setPhase("step");
            }}
          >
            Begin the Mission
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Gameplay steps ────────────────────────────────────────────────────
  if (phase === "step" && mission) {
    const missionAttemptId = mission.missionAttemptId;

    // Steps 0, 1, 2 — Crystal sorting
    if (stepIndex <= 2) {
      const crystalStep = CRYSTAL_STEPS[stepIndex];
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            {/* Progress indicator */}
            <ProgressBar current={stepIndex} total={6} />
            <CrystalSortStep
              key={crystalStep.taskId}
              stepDef={crystalStep}
              missionAttemptId={missionAttemptId}
              onComplete={advanceStep}
            />
          </div>
        </div>
      );
    }

    // Step 3 — AI Mistake Check
    if (stepIndex === 3) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <ProgressBar current={stepIndex} total={6} />
            <AIMistakeStep
              missionAttemptId={missionAttemptId}
              onComplete={advanceStep}
              onHintUsed={handleHintUsed}
            />
          </div>
        </div>
      );
    }

    // Step 4 — Explain Rule
    if (stepIndex === 4) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <ProgressBar current={stepIndex} total={6} />
            <ExplainRuleStep
              missionAttemptId={missionAttemptId}
              onComplete={advanceStep}
              onHintUsed={handleWrongAnswer}
            />
          </div>
        </div>
      );
    }

    // Step 5 — Reflection
    if (stepIndex === 5) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <ProgressBar current={stepIndex} total={6} />
            <ReflectionStep
              missionAttemptId={missionAttemptId}
              onComplete={() => setStepIndex(6)} // triggers completion useEffect
            />
          </div>
        </div>
      );
    }
  }

  return null;
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${pct}%` }} />
      </div>
      <span style={styles.progressLabel}>
        Step {current + 1} of {total}
      </span>
    </div>
  );
}

// ── Reward Cell ───────────────────────────────────────────────────────────────

function Reward({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.rewardCell}>
      <span style={styles.rewardCellValue}>{value}</span>
      <span style={styles.rewardCellLabel}>{label}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    minHeight: "calc(100vh - 52px)",
  },
  card: {
    background: "rgba(30, 41, 59, 0.95)",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "2rem",
    maxWidth: "600px",
    width: "100%",
  },
  locationBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "#818cf8",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginBottom: "1rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#f1f5f9",
    marginBottom: "1rem",
  },
  narrative: {
    color: "#94a3b8",
    lineHeight: 1.7,
    marginBottom: "1.5rem",
  },
  section: { marginBottom: "1.5rem" },
  sectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "0.5rem",
  },
  taskList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  taskItem: {
    background: "rgba(99, 102, 241, 0.08)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    borderRadius: "8px",
    padding: "0.625rem 0.875rem",
    color: "#cbd5e1",
    fontSize: "0.9rem",
    lineHeight: 1.5,
  },
  targetList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  targetItem: {
    background: "rgba(250, 204, 21, 0.1)",
    border: "1px solid rgba(250, 204, 21, 0.25)",
    borderRadius: "6px",
    padding: "4px 10px",
    color: "#fde68a",
    fontSize: "0.85rem",
  },
  rewardBanner: {
    background: "rgba(250, 204, 21, 0.08)",
    border: "1px solid rgba(250, 204, 21, 0.2)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    marginBottom: "1.5rem",
  },
  rewardLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#fbbf24",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  rewardValue: { fontSize: "0.9rem", color: "#fde68a" },
  rewardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  rewardCell: {
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: "10px",
    padding: "0.875rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.25rem",
  },
  rewardCellValue: { fontSize: "1.4rem", fontWeight: 700, color: "#4ade80" },
  rewardCellLabel: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  devWarning: {
    color: "#fbbf24",
    fontSize: "0.8rem",
    lineHeight: 1.5,
    marginBottom: "1.5rem",
    padding: "0.625rem 0.875rem",
    borderRadius: "8px",
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
  },
  beginBtn: {
    width: "100%",
    padding: "0.875rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
  },
  // Companion dialogue panel
  companionPanel: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    background: "rgba(99, 102, 241, 0.08)",
    border: "1px solid rgba(99, 102, 241, 0.25)",
    borderRadius: "12px",
    padding: "0.875rem 1rem",
    marginBottom: "1.5rem",
  },
  companionSilhouette: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 3,
    filter: "blur(0.5px)",
    opacity: 0.7,
  },
  companionHead: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
  },
  companionBody: {
    width: 18,
    height: 28,
    borderRadius: "6px 6px 3px 3px",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
  },
  companionText: {
    color: "#c7d2fe",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
    fontStyle: "italic",
  },
  // Crystal sort step
  stepContainer: {
    display: "flex",
    flexDirection: "column" as const,
  },
  crystalRow: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginBottom: "1.5rem",
    padding: "1rem",
  },
  crystalEmoji: {
    fontSize: "2.5rem",
  },
  binBtn: {
    width: "100%",
    padding: "1.25rem",
    borderRadius: "12px",
    border: "2px solid",
    background: "rgba(30,41,59,0.95)",
    color: "#f1f5f9",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "0",
  },
  // Multiple choice
  questionLabel: {
    color: "#e2e8f0",
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: "1rem",
  },
  optionList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.625rem",
  },
  optionBtn: {
    width: "100%",
    padding: "0.875rem 1rem",
    borderRadius: "10px",
    border: "1px solid",
    textAlign: "left" as const,
    color: "#e2e8f0",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: 1.5,
  },
  optionLetter: {
    color: "#818cf8",
    fontWeight: 700,
  },
  optionCheck: { color: "#4ade80", fontWeight: 700 },
  optionX: { color: "#f87171", fontWeight: 700 },
  // Progress bar
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    background: "rgba(99,102,241,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #6366f1, #818cf8)",
    transition: "width 0.4s ease",
  },
  progressLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
};
