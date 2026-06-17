"use client";

/**
 * Child Permissions Setup — Onboarding Step 4
 *
 * Collects parent-controlled settings per child:
 *   - Push-to-talk audio toggle (optional, default OFF per ADR-027)
 *   - NO webcam/face controls (must NOT appear — hard rule from CONTEXT.md)
 *   - Daily screen time limit (optional)
 *   - Blocked topics (add/remove list)
 *
 * Uses ChildPermissionsSchema from identity.schema.ts:
 *   - audioEnabled: boolean (default false)
 *   - aiInteractionEnabled: boolean (default true)
 *   - allowedDeliveryModes: array of DeliveryMode (default all three)
 *   - curriculumApprovalMode: "high-control" | "balanced" | "autopilot" (default "balanced")
 *   - screenLimitMinutesPerDay: optional positive integer
 *   - blockedTopics: string[] (default empty)
 *
 * Note: model_improvement_opt_in is set in the previous consent step.
 * chat_mode and parentVisibilityTier default by grade (K-5: quick-chat + full;
 * 6-8: moderated-free-text + summary) and are configurable in parent settings.
 *
 * Audio consent insert: if audioEnabled = true, insert "audio-push-to-talk" consent.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const DELIVERY_MODES = ["3d", "interactive-lite", "text-audio-offline"] as const;
const APPROVAL_MODES = [
  {
    value: "high-control",
    label: "High Control",
    description: "You review and approve every mission before your child sees it.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "L3ARN generates missions aligned to your settings. You review summaries.",
  },
  {
    value: "autopilot",
    label: "Autopilot",
    description: "L3ARN manages the curriculum automatically within your boundaries.",
  },
] as const;

// Validation derived from ChildPermissionsSchema in identity.schema.ts
const PermissionsFormSchema = z.object({
  audioEnabled: z.boolean(),
  screenLimitMinutesPerDay: z
    .number()
    .int()
    .positive("Screen limit must be a positive number.")
    .nullable(),
  curriculumApprovalMode: z.enum(["high-control", "balanced", "autopilot"]),
});

export default function PermissionsSetupPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Audio — default OFF (ADR-027)
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Curriculum approval mode — default "balanced" (ADR-012)
  const [approvalMode, setApprovalMode] = useState<"high-control" | "balanced" | "autopilot">(
    "balanced"
  );

  // Screen limit — optional
  const [hasScreenLimit, setHasScreenLimit] = useState(false);
  const [screenLimitMinutes, setScreenLimitMinutes] = useState("120");

  // Blocked topics
  const [blockedTopics, setBlockedTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addTopic() {
    const trimmed = topicInput.trim();
    if (trimmed && !blockedTopics.includes(trimmed)) {
      setBlockedTopics((prev) => [...prev, trimmed]);
      setTopicInput("");
    }
  }

  function removeTopic(topic: string) {
    setBlockedTopics((prev) => prev.filter((t) => t !== topic));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const screenLimit = hasScreenLimit ? parseInt(screenLimitMinutes, 10) : null;

    const result = PermissionsFormSchema.safeParse({
      audioEnabled,
      screenLimitMinutesPerDay: screenLimit,
      curriculumApprovalMode: approvalMode,
    });

    if (!result.success) {
      setServerError(result.error.issues[0]?.message ?? "Validation error.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/parent/auth/login");
        return;
      }

      const childProfileId = sessionStorage.getItem("onboarding_child_profile_id");

      if (!childProfileId) {
        setServerError("Could not find child profile. Please go back and re-enter child details.");
        setLoading(false);
        return;
      }

      // Upsert child_permissions
      const { error: permError } = await supabase.from("child_permissions").upsert({
        child_profile_id: childProfileId,
        audio_enabled: audioEnabled,
        ai_interaction_enabled: true, // default true; configurable in settings later
        allowed_delivery_modes: [...DELIVERY_MODES], // all three modes allowed by default
        curriculum_approval_mode: approvalMode,
        // model_improvement_opt_in was set in consent step — preserve it
        screen_limit_minutes_per_day: screenLimit,
        blocked_topics: blockedTopics,
        updated_by_parent_account_id: session.user.id,
      });

      if (permError) throw permError;

      // If audio enabled, insert audio consent
      if (audioEnabled) {
        const { error: audioConsentError } = await supabase.from("parent_consents").insert({
          parent_account_id: session.user.id,
          child_profile_id: childProfileId,
          consent_type: "audio-push-to-talk",
          granted: true,
        });
        if (audioConsentError) throw audioConsentError;
      }

      router.push("/parent/onboarding/curriculum");
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not save permissions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
          Step 4 of 5 — Permissions
        </p>

        <h1 className="text-2xl font-bold mb-1">Set permissions</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          You're in control. Change any of these at any time from your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Curriculum Approval Mode ──────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Curriculum approval mode</h2>
            <div className="space-y-2">
              {APPROVAL_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor:
                      approvalMode === mode.value ? "var(--color-primary)" : "var(--color-border)",
                    background:
                      approvalMode === mode.value
                        ? "rgba(99, 102, 241, 0.1)"
                        : "var(--color-bg)",
                  }}
                >
                  <input
                    type="radio"
                    name="approvalMode"
                    value={mode.value}
                    checked={approvalMode === mode.value}
                    onChange={() => setApprovalMode(mode.value)}
                    className="mt-0.5 accent-indigo-500 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {mode.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* ── Audio — Push-to-Talk ─────────────────────────────── */}
          <section
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">
                  Push-to-talk audio{" "}
                  <span
                    className="text-xs font-normal ml-1 px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--color-surface)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Optional — OFF by default
                  </span>
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Allows your child to speak responses by holding a button. No
                  always-on microphone. No voice biometrics or emotion detection.
                  Push-to-talk only.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audioEnabled}
                onClick={() => setAudioEnabled((prev) => !prev)}
                className="flex-shrink-0 mt-0.5 relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  background: audioEnabled ? "var(--color-primary)" : "#374151",
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: audioEnabled ? "translateX(1.375rem)" : "translateX(0.25rem)",
                  }}
                />
              </button>
            </div>
          </section>

          {/* ── Screen Time Limit ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Daily screen time limit</h2>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasScreenLimit}
                  onChange={(e) => setHasScreenLimit(e.target.checked)}
                  className="accent-indigo-500"
                />
                Enable limit
              </label>
            </div>
            {hasScreenLimit && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={screenLimitMinutes}
                  onChange={(e) => setScreenLimitMinutes(e.target.value)}
                  className="w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  minutes per day
                </span>
              </div>
            )}
          </section>

          {/* ── Blocked Topics ─────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold mb-2">Blocked topics</h2>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              L3ARN will not generate missions covering these topics for this child.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
                placeholder="e.g. Violence, Horror…"
              />
              <button
                type="button"
                onClick={addTopic}
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                Add
              </button>
            </div>
            {blockedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeTopic(topic)}
                      className="ml-1 text-slate-400 hover:text-red-400"
                      aria-label={`Remove ${topic}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {serverError && (
            <p className="rounded-lg px-4 py-2.5 text-sm bg-red-900/30 text-red-300 border border-red-800">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>

        {/*
         * HARD RULE COMPLIANCE NOTE:
         * No webcam or face detection UI is present on this page.
         * No "camera" or "video" permission toggle exists anywhere in the parent app.
         * This page intentionally omits any face/webcam controls per CONTEXT.md
         * non-negotiable rule #4.
         *
         * Open Questions:
         * OQ-PARENT-003: ai_interaction_enabled defaults to true here. Should the
         * parent be given explicit control over AI interaction during onboarding,
         * or is this better surfaced in the child settings page post-onboarding?
         * Current approach: default true, configurable later. Low risk for Hero Slice.
         *
         * OQ-PARENT-004: parentVisibilityTier defaults to "full" (K-5) or "summary"
         * (6-8) based on grade. This page does not implement grade-based default logic
         * because the grade is on child_profiles which requires a join. This defaulting
         * logic should be implemented in a DB trigger or Railway function that runs
         * after child_profile INSERT and sets privacy_settings accordingly.
         */}
      </div>
    </div>
  );
}
