"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setHouse, saveCalibrationSignals, updateCalibration } from "../../../../lib/student-session";

// ── House data ────────────────────────────────────────────────────────────────

type HouseId = "Valkryn" | "Lyrion" | "Novari" | "Cytrex";

interface HouseData {
  id: HouseId;
  name: string;
  animal: string;
  motto: string;
  color: string;
  values: string[];
  shadowLesson: string;
  tagline: string;
}

const HOUSES: HouseData[] = [
  {
    id: "Valkryn",
    name: "Valkryn",
    animal: "Storm Griffin",
    motto: "Courage forged through action.",
    color: "#ef4444",
    values: ["Courage", "Discipline", "Movement", "Drive"],
    shadowLesson: "Patience — the greatest challenger is waiting for the right moment.",
    tagline: "Sports, movement, courage, discipline.",
  },
  {
    id: "Lyrion",
    name: "Lyrion",
    animal: "Songweaver Serpent",
    motto: "Expression is the beginning of truth.",
    color: "#a855f7",
    values: ["Creativity", "Storytelling", "Expression", "Empathy"],
    shadowLesson: "Discipline — a song without structure is just noise.",
    tagline: "Music, arts, storytelling, expression.",
  },
  {
    id: "Novari",
    name: "Novari",
    animal: "Ember Phoenix",
    motto: "Discovery begins where certainty ends.",
    color: "#22c55e",
    values: ["Curiosity", "Science", "Nature", "Transformation"],
    shadowLesson: "Patience — transformation cannot be rushed.",
    tagline: "Science, discovery, nature, transformation.",
  },
  {
    id: "Cytrex",
    name: "Cytrex",
    animal: "Circuit Wyvern",
    motto: "Build the system. Change the world.",
    color: "#3b82f6",
    values: ["Logic", "Innovation", "Technology", "Systems Thinking"],
    shadowLesson: "Humility — the most powerful system still serves people.",
    tagline: "Technology, AI, coding, systems.",
  },
];

// ── Trial questions ───────────────────────────────────────────────────────────

interface TraitScores {
  curiosity: number;
  courage: number;
  creativity: number;
  leadership: number;
  collaboration: number;
  resilience: number;
  independence: number;
}

interface TrialChoice {
  label: string;
  delta: Partial<TraitScores>;
}

interface TrialQuestion {
  prompt: string;
  choices: TrialChoice[];
}

const TRIAL_QUESTIONS: TrialQuestion[] = [
  {
    prompt: "A teammate is struggling. You...",
    choices: [
      { label: "Jump in and take over", delta: { leadership: 2 } },
      { label: "Ask what they need", delta: { collaboration: 2 } },
      { label: "Find a creative workaround for them", delta: { creativity: 2 } },
      { label: "Wait and watch to understand the problem", delta: { independence: 2 } },
    ],
  },
  {
    prompt: "You find a faster shortcut — but it skips a step the team needs. You...",
    choices: [
      { label: "Use it yourself, tell the team later", delta: { independence: 2 } },
      { label: "Share it and let the team decide", delta: { collaboration: 2 } },
      { label: "Explore if there's a third way", delta: { curiosity: 2 } },
      { label: "Stick with the plan — the team matters more", delta: { leadership: 2 } },
    ],
  },
  {
    prompt: "You failed a challenge. You...",
    choices: [
      { label: "Try again immediately with a different approach", delta: { resilience: 2 } },
      { label: "Ask what you missed", delta: { curiosity: 2 } },
      { label: "Take a break, then come back stronger", delta: { resilience: 1, independence: 1 } },
      { label: "Help someone else before returning", delta: { collaboration: 2 } },
    ],
  },
  {
    prompt: "You can choose how to learn today. You pick...",
    choices: [
      { label: "Explore it and figure it out", delta: { curiosity: 2 } },
      { label: "Compete and prove yourself", delta: { courage: 2 } },
      { label: "Build or create something from it", delta: { creativity: 2 } },
      { label: "Work with a partner", delta: { collaboration: 2 } },
    ],
  },
  {
    prompt: "Something went wrong in the middle of a mission. You...",
    choices: [
      { label: "Investigate the cause", delta: { curiosity: 2 } },
      { label: "Push through no matter what", delta: { courage: 2 } },
      { label: "Redesign the plan", delta: { creativity: 2 } },
      { label: "Rally the group", delta: { leadership: 2 } },
    ],
  },
  {
    prompt: "Which role feels most like you?",
    choices: [
      { label: "The one who asks questions", delta: { curiosity: 2 } },
      { label: "The one who leads when things get hard", delta: { courage: 2 } },
      { label: "The one who invents the solution", delta: { creativity: 2 } },
      { label: "The one who keeps the team together", delta: { collaboration: 2 } },
    ],
  },
  {
    prompt: "When the journey gets hard, you...",
    choices: [
      { label: "Get more curious — there's always a reason", delta: { curiosity: 2 } },
      { label: "Get fiercer — you don't back down", delta: { courage: 2 } },
      { label: "Get creative — find a new path", delta: { creativity: 2 } },
      { label: "Get humble — ask for what you need", delta: { resilience: 2 } },
    ],
  },
];

// ── House scoring ─────────────────────────────────────────────────────────────

function computeRecommendedHouse(traits: TraitScores): HouseId {
  const scores: Record<HouseId, number> = {
    Valkryn: traits.courage + traits.leadership,
    Lyrion: traits.creativity + traits.collaboration,
    Novari: traits.curiosity + traits.independence,
    Cytrex: traits.curiosity + traits.creativity,
  };

  const maxScore = Math.max(...Object.values(scores));
  const tied = (Object.keys(scores) as HouseId[]).filter((h) => scores[h] === maxScore);

  if (tied.length === 1) return tied[0];

  // Tie-break: Cytrex gets secondary independence boost; others use full trait sum
  const tieBreak = (h: HouseId): number => {
    const full = Object.values(traits).reduce((a, b) => a + b, 0);
    if (h === "Cytrex") return scores[h] + traits.independence + full;
    return scores[h] + full;
  };

  return tied.reduce((best, h) => (tieBreak(h) >= tieBreak(best) ? h : best), tied[0]);
}

function houseExplanation(house: HouseData): string {
  const v = house.values.slice(0, 2).join(" and ");
  return (
    `Your trial revealed a deep connection to ${v} — the defining strengths of ${house.name}. ` +
    `Remember your growth challenge: ${house.shadowLesson}`
  );
}

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | "3" | "3b" | 4 | 5;

// ── Main component ────────────────────────────────────────────────────────────

export default function HouseCallingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Trial
  const [trialIndex, setTrialIndex] = useState(0);
  const [traitScores, setTraitScores] = useState<TraitScores>({
    curiosity: 0,
    courage: 0,
    creativity: 0,
    leadership: 0,
    collaboration: 0,
    resilience: 0,
    independence: 0,
  });

  // Result
  const [recommendedHouse, setRecommendedHouse] = useState<HouseId | null>(null);
  const [finalHouse, setFinalHouse] = useState<HouseId | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Trial answer handler ─────────────────────────────────────────────────────

  function handleTrialAnswer(delta: Partial<TraitScores>) {
    const updated = { ...traitScores };
    for (const key of Object.keys(delta) as (keyof TraitScores)[]) {
      updated[key] = (updated[key] ?? 0) + (delta[key] ?? 0);
    }
    setTraitScores(updated);

    const nextIndex = trialIndex + 1;
    if (nextIndex >= TRIAL_QUESTIONS.length) {
      const rec = computeRecommendedHouse(updated);
      setRecommendedHouse(rec);
      setFinalHouse(rec);
      setStep("3");
    } else {
      setTrialIndex(nextIndex);
    }
  }

  // ── Oath handler (save calibration signals, then go to companion unlock) ──

  async function handleAcceptOath() {
    if (!finalHouse || !recommendedHouse) return;
    setSaving(true);
    setError(null);

    // Best-effort: save trial signals. Non-fatal if it fails.
    try {
      await saveCalibrationSignals({
        traitScores,
        recommendedHouse,
        selectedHouse: finalHouse,
        overrideUsed: finalHouse !== recommendedHouse,
      });
      updateCalibration().catch(() => {}); // best-effort: snapshot sorting-ceremony stage
    } catch {
      // Non-fatal — proceed to companion unlock regardless
    }

    setSaving(false);
    setStep(5);
  }

  // ── Final write: persist house, then navigate ────────────────────────────────

  async function handleEnterCompanionChamber() {
    if (!finalHouse) return;
    setSaving(true);
    setError(null);

    const outcome = await setHouse(finalHouse);

    if (outcome.ok) {
      setSaving(false);
      router.push("/student/onboarding/companion");
      return;
    }

    // Dev-only escape hatch: no session token outside the verified entry flow.
    // Preserve local UI development behind a loud warning; never in production.
    if (
      outcome.error === "SESSION_TOKEN_MISSING" &&
      process.env.NODE_ENV !== "production"
    ) {
      localStorage.setItem("l3arn_house", finalHouse);
      console.warn(
        "[L3ARN DEV] No session token — house NOT persisted to Supabase. " +
          "Enter via a parent-launched link to test the real write. house:",
        finalHouse,
      );
      setSaving(false);
      router.push("/student/onboarding/companion");
      return;
    }

    setError(outcome.message);
    setSaving(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const houseMap = Object.fromEntries(HOUSES.map((h) => [h.id, h])) as Record<HouseId, HouseData>;

  return (
    <div style={s.shell}>
      {step === 0 && <StepInvitation onReady={() => setStep(1)} />}

      {step === 1 && <StepHouseLore onContinue={() => setStep(2)} />}

      {step === 2 && (
        <StepTrial
          question={TRIAL_QUESTIONS[trialIndex]}
          questionNumber={trialIndex + 1}
          totalQuestions={TRIAL_QUESTIONS.length}
          onAnswer={handleTrialAnswer}
        />
      )}

      {step === "3" && recommendedHouse && (
        <StepRecommendation
          house={houseMap[recommendedHouse]}
          onAccept={() => setStep(4)}
          onChooseDifferently={() => setStep("3b")}
        />
      )}

      {step === "3b" && recommendedHouse && finalHouse && (
        <StepOverride
          houses={HOUSES}
          recommendedHouseId={recommendedHouse}
          selectedHouseId={finalHouse}
          onSelect={(id) => setFinalHouse(id)}
          onContinue={() => setStep(4)}
        />
      )}

      {step === 4 && finalHouse && (
        <StepOath
          house={houseMap[finalHouse]}
          saving={saving}
          error={error}
          onAccept={handleAcceptOath}
        />
      )}

      {step === 5 && finalHouse && (
        <StepCompanionUnlock
          house={houseMap[finalHouse]}
          saving={saving}
          error={error}
          onEnter={handleEnterCompanionChamber}
        />
      )}
    </div>
  );
}

// ── Step 0: Pre-Ceremony Invitation ──────────────────────────────────────────

function StepInvitation({ onReady }: { onReady: () => void }) {
  return (
    <div style={s.centeredScreen}>
      <div style={s.ceremonyCard}>
        <p style={s.eyebrow}>The House Calling</p>
        <p style={s.bodyText}>
          Today you will be called into your House. Your House is not just a team — it is your
          community, your legacy, your challenges, and your story inside L3ARN. Some days will be
          easy. Some days will test you. But members of a House do not quit. They learn, adapt, and
          rise.
        </p>
        <p
          style={{
            ...s.bodyText,
            marginTop: "1.5rem",
            fontStyle: "italic",
            color: "#c4b5fd",
          }}
        >
          Step forward. The House Calling begins.
        </p>
        <button style={s.primaryBtn} onClick={onReady}>
          I&apos;m Ready
        </button>
      </div>
    </div>
  );
}

// ── Step 1: House Lore ────────────────────────────────────────────────────────

function StepHouseLore({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={s.scrollScreen}>
      <h1 style={s.pageTitle}>The Four Houses</h1>
      <p style={{ ...s.bodyText, marginBottom: "2rem" }}>
        Study each House. Understand what they stand for. Your Trial comes next.
      </p>
      <div style={s.loreGrid}>
        {HOUSES.map((house) => (
          <LoreCard key={house.id} house={house} />
        ))}
      </div>
      <button
        style={{ ...s.primaryBtn, marginTop: "2.5rem", marginBottom: "2rem" }}
        onClick={onContinue}
      >
        Continue to the Trial
      </button>
    </div>
  );
}

function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function LoreCard({ house }: { house: HouseData }) {
  const rgb = hexToRgb(house.color);

  return (
    <div
      style={{
        ...s.houseCard,
        borderColor: house.color + "66",
        boxShadow: `0 0 32px ${house.color}22`,
      }}
    >
      {/* Companion silhouettes — 3 blurred CSS shapes, no images */}
      <div style={s.silhouetteRow}>
        {([38, 52, 38] as number[]).map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: w + (i === 1 ? 20 : 18),
              borderRadius: "50% 50% 45% 45%",
              border: `1px solid ${house.color}33`,
              filter: "blur(3px)",
              flexShrink: 0,
              background: `rgba(${rgb},0.07)`,
            }}
          />
        ))}
      </div>

      <h2 style={{ ...s.houseName, color: house.color }}>{house.name}</h2>
      <p style={s.animalLabel}>{house.animal}</p>
      <p style={s.mottoText}>&ldquo;{house.motto}&rdquo;</p>

      <div style={s.chipRow}>
        {house.values.map((v) => (
          <span
            key={v}
            style={{
              ...s.chip,
              borderColor: house.color + "55",
              color: house.color,
              background: house.color + "15",
            }}
          >
            {v}
          </span>
        ))}
      </div>

      <div style={s.shadowBox}>
        <span style={s.shadowLabel}>Growth Challenge:</span>
        <span style={s.shadowText}>{house.shadowLesson}</span>
      </div>
    </div>
  );
}

// ── Step 2: The Trial ─────────────────────────────────────────────────────────

function StepTrial({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: {
  question: TrialQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (delta: Partial<TraitScores>) => void;
}) {
  return (
    <div style={s.centeredScreen}>
      <div style={{ ...s.ceremonyCard, maxWidth: 620 }}>
        <p style={s.eyebrow}>
          The Trial — Question {questionNumber} of {totalQuestions}
        </p>

        <div style={s.progressTrack}>
          <div
            style={{
              ...s.progressFill,
              width: `${(questionNumber / totalQuestions) * 100}%`,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        <p
          style={{
            ...s.bodyText,
            fontSize: "1.15rem",
            fontWeight: 600,
            marginTop: "1.25rem",
            marginBottom: "1.25rem",
            color: "#f1f5f9",
          }}
        >
          {question.prompt}
        </p>

        <div style={s.choicesGrid}>
          {question.choices.map((choice, idx) => (
            <ChoiceButton
              key={idx}
              label={choice.label}
              letter={String.fromCharCode(65 + idx)}
              onClick={() => onAnswer(choice.delta)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({
  label,
  letter,
  onClick,
}: {
  label: string;
  letter: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.choiceBtn,
        background: hovered ? "rgba(99,102,241,0.18)" : "rgba(30,41,59,0.8)",
        borderColor: hovered ? "#6366f1" : "rgba(99,102,241,0.3)",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.choiceLabel}>{letter}.</span>
      {label}
    </button>
  );
}

// ── Step 3: Recommendation ────────────────────────────────────────────────────

function StepRecommendation({
  house,
  onAccept,
  onChooseDifferently,
}: {
  house: HouseData;
  onAccept: () => void;
  onChooseDifferently: () => void;
}) {
  return (
    <div style={s.centeredScreen}>
      <div style={s.ceremonyCard}>
        <p style={s.eyebrow}>Your Calling</p>
        <p style={{ ...s.bodyText, color: "#94a3b8" }}>
          Based on your trial, your calling points toward&hellip;
        </p>
        <h2 style={{ ...s.bigHouseName, color: house.color }}>{house.name}</h2>
        <p style={{ ...s.animalLabel, fontSize: "1rem" }}>{house.animal}</p>

        <div
          style={{
            ...s.houseCard,
            borderColor: house.color + "66",
            boxShadow: `0 0 40px ${house.color}33`,
            width: "100%",
          }}
        >
          <p style={s.mottoText}>&ldquo;{house.motto}&rdquo;</p>
          <p
            style={{
              ...s.bodyText,
              fontSize: "0.92rem",
              lineHeight: 1.75,
              color: "#cbd5e1",
              textAlign: "left" as const,
            }}
          >
            {houseExplanation(house)}
          </p>
        </div>

        <p style={{ ...s.bodyText, color: "#94a3b8" }}>Does this feel right?</p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button style={s.primaryBtn} onClick={onAccept}>
            Yes, Accept My House
          </button>
          <button style={s.secondaryBtn} onClick={onChooseDifferently}>
            I want to choose differently
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3b: Override Chooser ─────────────────────────────────────────────────

function StepOverride({
  houses,
  recommendedHouseId,
  selectedHouseId,
  onSelect,
  onContinue,
}: {
  houses: HouseData[];
  recommendedHouseId: HouseId;
  selectedHouseId: HouseId;
  onSelect: (id: HouseId) => void;
  onContinue: () => void;
}) {
  return (
    <div style={s.scrollScreen}>
      <h1 style={s.pageTitle}>Choose Your House</h1>
      <p
        style={{
          ...s.bodyText,
          marginBottom: "2rem",
          color: "#94a3b8",
        }}
      >
        Select the House that calls to you.
      </p>
      <div style={s.loreGrid}>
        {houses.map((house) => {
          const isSelected = house.id === selectedHouseId;
          const isRec = house.id === recommendedHouseId;
          return (
            <button
              key={house.id}
              style={{
                ...s.houseCard,
                cursor: "pointer",
                borderColor: isSelected ? house.color : house.color + "33",
                boxShadow: isSelected
                  ? `0 0 32px ${house.color}55`
                  : `0 0 16px ${house.color}11`,
                outline: "none",
                position: "relative" as const,
              }}
              onClick={() => onSelect(house.id)}
            >
              {isRec && (
                <span
                  style={{
                    position: "absolute" as const,
                    top: 10,
                    right: 10,
                    background: house.color + "25",
                    color: house.color,
                    border: `1px solid ${house.color}66`,
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  Recommended
                </span>
              )}
              <h2 style={{ ...s.houseName, color: house.color }}>{house.name}</h2>
              <p style={s.animalLabel}>{house.animal}</p>
              <p style={s.mottoText}>&ldquo;{house.motto}&rdquo;</p>
              <div style={s.chipRow}>
                {house.values.map((v) => (
                  <span
                    key={v}
                    style={{
                      ...s.chip,
                      borderColor: house.color + "55",
                      color: house.color,
                      background: house.color + "15",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <button
        style={{ ...s.primaryBtn, marginTop: "2rem", marginBottom: "2rem" }}
        onClick={onContinue}
      >
        Continue with {selectedHouseId}
      </button>
    </div>
  );
}

// ── Step 4: The Oath ──────────────────────────────────────────────────────────

function StepOath({
  house,
  saving,
  error,
  onAccept,
}: {
  house: HouseData;
  saving: boolean;
  error: string | null;
  onAccept: () => void;
}) {
  return (
    <div
      style={{
        ...s.centeredScreen,
        background: `radial-gradient(ellipse at center, ${house.color}22 0%, #0a0f1e 70%)`,
      }}
    >
      <div style={s.ceremonyCard}>
        <div
          style={{
            width: "100%",
            padding: "1.25rem",
            background: house.color + "22",
            border: `1px solid ${house.color}55`,
            borderRadius: 12,
            textAlign: "center" as const,
          }}
        >
          <h2 style={{ ...s.bigHouseName, color: house.color, margin: 0 }}>
            House {house.name}
          </h2>
        </div>

        <p
          style={{
            ...s.bodyText,
            fontSize: "1.2rem",
            fontWeight: 600,
            color: "#e2e8f0",
          }}
        >
          You have been called.
        </p>

        <blockquote style={s.oathBox}>
          <p style={s.oathText}>
            &ldquo;I accept my House. I will grow with it, compete with it, struggle with it, and
            represent it. I understand my House is part of my L3ARN journey — and I will not quit
            simply because the road gets hard.&rdquo;
          </p>
        </blockquote>

        {error && <p style={s.errorText}>{error}</p>}

        <button style={s.primaryBtn} disabled={saving} onClick={onAccept}>
          {saving ? "Recording your oath..." : "I Accept the Calling"}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Companion Unlock Gateway ──────────────────────────────────────────

function StepCompanionUnlock({
  house,
  saving,
  error,
  onEnter,
}: {
  house: HouseData;
  saving: boolean;
  error: string | null;
  onEnter: () => void;
}) {
  return (
    <div
      style={{
        ...s.centeredScreen,
        background: `radial-gradient(ellipse at center, ${house.color}33 0%, #0a0f1e 60%)`,
      }}
    >
      <div style={s.ceremonyCard}>
        <div
          style={{
            width: "100%",
            padding: "1.5rem",
            background: house.color + "2a",
            border: `2px solid ${house.color}`,
            borderRadius: 16,
            boxShadow: `0 0 60px ${house.color}44`,
            textAlign: "center" as const,
          }}
        >
          <h2 style={{ ...s.bigHouseName, color: house.color, margin: 0 }}>
            House {house.name}
          </h2>
        </div>

        <p
          style={{
            ...s.bodyText,
            fontSize: "1.15rem",
            fontWeight: 600,
            color: "#e2e8f0",
          }}
        >
          Your House has been accepted.
        </p>
        <p style={{ ...s.bodyText, color: "#94a3b8" }}>Now meet your companion.</p>

        {error && <p style={s.errorText}>{error}</p>}

        <button style={s.primaryBtn} disabled={saving} onClick={onEnter}>
          {saving ? "Opening the Chamber..." : "Enter the Companion Chamber →"}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, #0a0f1e 0%, #1e1b4b 50%, #0f172a 100%)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
  },
  centeredScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  scrollScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1.5rem",
  },
  ceremonyCard: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 20,
    padding: "2.5rem 2rem",
    maxWidth: 560,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 64px rgba(0,0,0,0.5)",
  },
  eyebrow: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#818cf8",
    margin: 0,
  },
  pageTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#f1f5f9",
    margin: "0 0 0.5rem",
    textAlign: "center",
  },
  bodyText: {
    fontSize: "1rem",
    lineHeight: 1.75,
    color: "#cbd5e1",
    margin: 0,
    textAlign: "center",
  },
  primaryBtn: {
    padding: "0.875rem 2.25rem",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  secondaryBtn: {
    padding: "0.875rem 1.75rem",
    borderRadius: 12,
    border: "1px solid rgba(99,102,241,0.4)",
    background: "transparent",
    color: "#a5b4fc",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  loreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.25rem",
    width: "100%",
    maxWidth: 980,
  },
  houseCard: {
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid transparent",
    borderRadius: 16,
    padding: "1.75rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    position: "relative",
  },
  silhouetteRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: "0.25rem",
  },
  houseName: {
    fontSize: "1.4rem",
    fontWeight: 700,
    margin: 0,
    textAlign: "center",
  },
  bigHouseName: {
    fontSize: "2.25rem",
    fontWeight: 800,
    margin: "0.5rem 0",
    textAlign: "center",
    letterSpacing: "0.02em",
  },
  animalLabel: {
    fontSize: "0.85rem",
    color: "#64748b",
    fontStyle: "italic",
    margin: 0,
    textAlign: "center",
  },
  mottoText: {
    fontSize: "0.9rem",
    color: "#94a3b8",
    fontStyle: "italic",
    margin: 0,
    textAlign: "center",
    lineHeight: 1.6,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  chip: {
    fontSize: "0.68rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    border: "1px solid transparent",
    borderRadius: 6,
    padding: "2px 8px",
    textTransform: "uppercase",
  },
  shadowBox: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    padding: "0.6rem 0.9rem",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  shadowLabel: {
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#475569",
  },
  shadowText: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    background: "rgba(99,102,241,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #a78bfa)",
    borderRadius: 4,
  },
  choicesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "100%",
  },
  choiceBtn: {
    width: "100%",
    padding: "0.875rem 1.25rem",
    background: "rgba(30,41,59,0.8)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: "0.95rem",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  choiceLabel: {
    fontWeight: 700,
    color: "#818cf8",
    flexShrink: 0,
    minWidth: 20,
  },
  oathBox: {
    width: "100%",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(99,102,241,0.4)",
    borderLeft: "4px solid #6366f1",
    borderRadius: 10,
    padding: "1.25rem 1.5rem",
    margin: "0.5rem 0 0.75rem",
  },
  oathText: {
    fontSize: "1rem",
    lineHeight: 1.8,
    color: "#e2e8f0",
    margin: 0,
    fontStyle: "italic",
    textAlign: "left",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.9rem",
    textAlign: "center",
    margin: "0.25rem 0",
  },
};
