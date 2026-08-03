"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  startMission,
  completeMission,
  updateCalibration,
  fetchMissionLesson,
  updateTaskIndex,
  type CompleteMissionInput,
} from "../../../../lib/student-session";
import type {
  StartMissionResponse,
  CompleteMissionResponse,
  MissionLessonTask,
} from "@l3arn/shared-types";
import { SortTrayTask } from "./components/SortTrayTask";
import { OptionListTask } from "./components/OptionListTask";
import { HintButton } from "./components/HintButton";
import { SpeakerButton } from "./components/SpeakerButton";

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

// ── Reflection Step (final, ungraded — not a content-contract task type) ─────

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
  const [mission, setMission] = useState<StartMissionResponse | null>(null);
  const [result, setResult] = useState<CompleteMissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Adaptive lesson runtime state — the real content-contract task sequence
  // fetched from GET .../lesson, and the child's current position in it.
  const [lessonTasks, setLessonTasks] = useState<MissionLessonTask[]>([]);
  const [taskIndex, setTaskIndex] = useState(0);
  // Non-resumed path only: true once the background lesson fetch (kicked off
  // right after the briefing renders) has failed. Lets "Begin the Mission"
  // avoid handing the child a blank gameplay screen (lessonTasks would still
  // be [] at that point) without yanking them out of the briefing the moment
  // the failure happens in the background.
  const [lessonFetchFailed, setLessonFetchFailed] = useState(false);
  const [isTransferStep, setIsTransferStep] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
        // Resuming an existing in-progress attempt: the original briefing
        // content isn't retrievable (only a UUID envelope reference is
        // persisted), so the backend returns generic placeholders and we
        // skip straight to gameplay instead of showing a bogus briefing.
        // Stay on "loading" until the lesson fetch below resolves so we can
        // jump straight to "step" with lessonTasks already populated.
        const resumed = outcome.data.resumed === true;
        if (!resumed) setPhase("briefing");
        void fetchMissionLesson(missionId, outcome.data.missionAttemptId).then((lessonOutcome) => {
          if (cancelled) return;
          if (!lessonOutcome.ok) {
            // On the resumed path, phase is still "loading" at this point
            // (we deliberately didn't set it to "briefing" above) — if we
            // silently returned here like the non-resumed path does, the
            // child would be stuck on "Preparing your mission…" forever
            // with no retry route. The non-resumed path doesn't have this
            // problem because phase was already set to "briefing"
            // synchronously before this fetch was kicked off.
            if (resumed) {
              setErrorMessage(lessonOutcome.message);
              setPhase("error");
              return;
            }
            // Non-resumed: the child may still be reading the briefing
            // screen (built entirely from the earlier startMission
            // response, so it's unaffected by this failure) — don't yank
            // them into the error screen mid-read. Stash the failure so
            // "Begin the Mission" can guard against handing them a blank
            // gameplay screen (lessonTasks is still [] here, and the
            // gameplay-step render requires lessonTasks.length > 0) and
            // route to the same error phase only if/when they actually
            // try to proceed.
            setErrorMessage(lessonOutcome.message);
            setLessonFetchFailed(true);
            return;
          }
          setLessonTasks(lessonOutcome.data.tasks);
          setTaskIndex(lessonOutcome.data.resumeFromTaskIndex);
          if (resumed) setPhase("step");
        });
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

  // ── Decision log on task entry ───────────────────────────────────────────────
  // Driven by taskIndex/lessonTasks (the real content-contract sequence) rather
  // than the old hardcoded stepIndex — logs the real taskInstanceId for each
  // content-contract task the child enters. No entry is logged once taskIndex
  // reaches the end of lessonTasks (the final ReflectionStep is not a
  // content-contract task and has its own "reflection" evidence capture).
  useEffect(() => {
    if (phase !== "step" || !mission || lessonTasks.length === 0) return;
    const currentTask = lessonTasks[taskIndex];
    if (!currentTask) return;
    void tryCapture(mission.missionAttemptId, "task-decision-log", "decision-log", {
      taskInstanceId: currentTask.taskInstanceId,
      taskIndex,
      enteredAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, taskIndex, lessonTasks, mission]);

  // ── Final completion ─────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!mission) return;
    setPhase("completing");

    // Structured replay before completing
    await tryCapture(mission.missionAttemptId, "task-structured-replay", "structured-replay", {
      totalSteps: lessonTasks.length + 1, // + 1 for the final ReflectionStep
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
  }, [mission, lessonTasks.length, totalAttempts, hintsUsed]);

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
    // Neither failed nor populated yet == the background lesson fetch is
    // still in flight. Missions always ship with at least one task, so a
    // non-empty lessonTasks reliably means the fetch already succeeded.
    const lessonPending = !lessonFetchFailed && lessonTasks.length === 0;
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
            style={{
              ...styles.beginBtn,
              ...(lessonPending ? { opacity: 0.6, cursor: "wait" } : {}),
            }}
            disabled={lessonPending}
            onClick={() => {
              // The lesson fetch already failed in the background — proceeding
              // would flip phase to "step" with lessonTasks still [], which
              // fails the gameplay-step render guard and falls through to a
              // blank screen. Route to the same error phase/message used
              // elsewhere in this file instead.
              if (lessonFetchFailed) {
                setPhase("error");
                return;
              }
              setPhase("step");
            }}
          >
            {lessonPending ? "Preparing your mission…" : "Begin the Mission"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Gameplay steps (content-contract tasks) ─────────────────────────
  if (phase === "step" && mission && lessonTasks.length > 0) {
    const missionAttemptId = mission.missionAttemptId;
    const currentTask = lessonTasks[taskIndex];

    if (currentTask) {
      const handleTaskCorrect = async () => {
        // ai-mistake-check keeps its own existing, more specific evidence
        // type (already valid pre-sub-project-2) rather than being folded
        // into the new generic discrimination-check.
        const captureType =
          currentTask.skeleton.taskType === "apply-to-new"
            ? "transfer-check"
            : currentTask.skeleton.taskType === "ai-mistake-check"
              ? "ai-mistake-check"
              : "discrimination-check";
        await tryCapture(missionAttemptId, currentTask.taskInstanceId, captureType, {
          taskType: currentTask.skeleton.taskType,
          correct: true,
        });
        const next = taskIndex + 1;
        setTaskIndex(next);
        void updateTaskIndex(missionAttemptId, next);
      };
      const handleTaskWrong = () => {
        setTotalAttempts((p) => p + 1);
      };

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <ProgressBar current={taskIndex} total={lessonTasks.length + 1} />
            <button style={styles.exitBtn} onClick={() => setShowExitConfirm(true)}>
              Exit mission
            </button>
            {showExitConfirm && (
              <div style={styles.exitConfirmBox}>
                <p>Leave this mission? Your progress on this task is saved.</p>
                <button
                  onClick={async () => {
                    await updateTaskIndex(missionAttemptId, taskIndex);
                    router.push("/student/academy");
                  }}
                >
                  Leave
                </button>
                <button onClick={() => setShowExitConfirm(false)}>Stay</button>
              </div>
            )}
            <SpeakerButton text={currentTask.fill.storyFlavor} />
            {currentTask.skeleton.taskType === "sort-categorize" && (
              <SortTrayTask
                key={currentTask.taskInstanceId}
                skeleton={currentTask.skeleton}
                fill={currentTask.fill}
                onCorrect={handleTaskCorrect}
                onWrong={handleTaskWrong}
              />
            )}
            {currentTask.skeleton.taskType === "apply-to-new" && (
              <SortTrayTask
                key={currentTask.taskInstanceId}
                skeleton={currentTask.skeleton}
                fill={currentTask.fill}
                onCorrect={handleTaskCorrect}
                onWrong={handleTaskWrong}
                isTransferStep
              />
            )}
            {currentTask.skeleton.taskType === "ai-mistake-check" && (
              <OptionListTask
                key={currentTask.taskInstanceId}
                skeleton={currentTask.skeleton}
                fill={currentTask.fill}
                onCorrect={handleTaskCorrect}
                onWrong={handleTaskWrong}
              />
            )}
            <HintButton
              hintLadder={currentTask.skeleton.hintLadder}
              onEscalate={() => setHintsUsed((p) => p + 1)}
            />
          </div>
        </div>
      );
    }

    // All content-contract tasks done — fall through to the existing
    // ReflectionStep (unchanged, kept exactly as today).
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ProgressBar current={lessonTasks.length} total={lessonTasks.length + 1} />
          <ReflectionStep missionAttemptId={missionAttemptId} onComplete={() => void handleComplete()} />
        </div>
      </div>
    );
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
  exitBtn: {
    alignSelf: "flex-end",
    padding: "0.5rem 1rem",
    minHeight: "52px",
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "transparent",
    color: "#94a3b8",
    fontSize: "0.85rem",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  exitConfirmBox: {
    padding: "1rem",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    marginBottom: "1rem",
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
  stepContainer: {
    display: "flex",
    flexDirection: "column" as const,
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
