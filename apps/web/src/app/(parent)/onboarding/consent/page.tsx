"use client";

/**
 * Consent & Privacy Setup — Onboarding Step 3
 *
 * Collects:
 *   1. COPPA consent (required, explicit checkbox)
 *   2. Model improvement opt-in (optional, default OFF — must be turned ON)
 *
 * Rules enforced here:
 *   - COPPA consent checkbox must be checked to proceed (blocking)
 *   - Model improvement toggle is OFF by default (ADR-029: safe default = opted out)
 *   - Consent rows are INSERT-only in parent_consents table (immutable ledger)
 *   - Revocation is a new INSERT with granted: false (handled in settings)
 *
 * Uses:
 *   - ConsentTypeSchema from identity.schema.ts: "coppa-data-collection" | "model-improvement"
 *   - ModelImprovementConsentSchema from ai.schema.ts for the model improvement opt-in
 *   - ParentConsentSchema from identity.schema.ts for the consent record shape
 *
 * Privacy commitment text (plain language, per COPPA best-practice readability):
 *   - What data we collect
 *   - What "model improvement" means in plain terms
 *   - Default is opted out of model improvement
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ConsentPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // COPPA consent — required; blocking
  const [coppaChecked, setCoppaChecked] = useState(false);
  // Model improvement opt-in — optional, default OFF (ADR-029)
  const [modelImprovementOptIn, setModelImprovementOptIn] = useState(false);

  const [coppaError, setCoppaError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCoppaError(null);
    setServerError(null);

    if (!coppaChecked) {
      setCoppaError("You must acknowledge and consent to proceed.");
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

      // Insert COPPA consent row (always inserted; granted = true here since
      // the checkbox was required to proceed)
      const { error: coppaError } = await supabase.from("parent_consents").insert({
        parent_account_id: session.user.id,
        child_profile_id: childProfileId ?? null,
        consent_type: "coppa-data-collection",
        granted: true,
      });

      if (coppaError) throw coppaError;

      // Insert model improvement consent row (granted = user's choice)
      // Default is false per ADR-029. This is an explicit record either way.
      const { error: modelError } = await supabase.from("parent_consents").insert({
        parent_account_id: session.user.id,
        child_profile_id: childProfileId ?? null,
        consent_type: "model-improvement",
        granted: modelImprovementOptIn,
      });

      if (modelError) throw modelError;

      // Update child_permissions model_improvement_opt_in to match consent
      if (childProfileId) {
        const { error: permError } = await supabase
          .from("child_permissions")
          .upsert({
            child_profile_id: childProfileId,
            model_improvement_opt_in: modelImprovementOptIn,
            updated_by_parent_account_id: session.user.id,
          });
        // Non-fatal if this fails — permissions are created in the next step
        if (permError) {
          console.warn("[L3ARN] Could not pre-set model_improvement_opt_in:", permError.message);
        }
      }

      router.push("/parent/onboarding/permissions");
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not save consent. Please try again."
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
          Step 3 of 5 — Privacy & Consent
        </p>

        <h1 className="text-2xl font-bold mb-1">Privacy & consent</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          L3ARN is built for children. Your consent controls what we collect and how we use it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── COPPA Consent ───────────────────────────────────────────── */}
          <section
            className="rounded-lg border p-5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          >
            <h2 className="text-base font-semibold mb-2">What data L3ARN collects</h2>
            <div className="text-sm space-y-2" style={{ color: "var(--color-text-muted)" }}>
              <p>
                <strong className="text-white">For your child's account:</strong> We collect an
                Academy display name (the fun name your child uses inside L3ARN), grade level,
                and date of birth. We keep legal name and date of birth private — only you can
                see them.
              </p>
              <p>
                <strong className="text-white">During learning:</strong> We record structured
                activity signals — things like which steps were completed, whether your child
                asked for help, and how long they spent on tasks. This powers the learner model
                that personalizes missions.
              </p>
              <p>
                <strong className="text-white">What we do NOT collect:</strong> No webcam. No
                face capture. No facial recognition. No always-on microphone. No voice
                biometrics. No child location data.
              </p>
              <p>
                <strong className="text-white">Your rights:</strong> You can view, export, or
                delete your child's data at any time from your parent dashboard. Consent can be
                withdrawn at any time.
              </p>
            </div>

            {/* Required COPPA checkbox */}
            <label className="flex items-start gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={coppaChecked}
                onChange={(e) => {
                  setCoppaChecked(e.target.checked);
                  if (e.target.checked) setCoppaError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
                aria-describedby="coppa-error"
              />
              <span className="text-sm font-medium">
                I am the parent or legal guardian of this child and I consent to L3ARN
                collecting the data described above to provide the learning service.
              </span>
            </label>

            {coppaError && (
              <p id="coppa-error" className="text-xs mt-2 text-red-400">
                {coppaError}
              </p>
            )}
          </section>

          {/* ── Model Improvement Opt-In ─────────────────────────────────── */}
          <section
            className="rounded-lg border p-5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-base font-semibold mb-1">
                  Help improve L3ARN{" "}
                  <span
                    className="text-xs font-normal ml-1 px-1.5 py-0.5 rounded"
                    style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                  >
                    Optional — OFF by default
                  </span>
                </h2>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  <strong className="text-white">What this means:</strong> If you opt in, we may
                  use de-identified, privacy-filtered signals from your child's sessions to
                  improve how L3ARN generates and personalizes missions.
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
                  <strong className="text-white">What is de-identified:</strong> We replace your
                  child's ID with a rotating anonymous key before any signal enters our
                  improvement pipeline. Raw names, legal names, dates of birth, free-text
                  responses, audio, and chat content are NEVER included.
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
                  <strong className="text-white">Default is OFF.</strong> You must actively
                  turn this on. You can change your choice at any time in Parent Settings.
                </p>
              </div>

              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={modelImprovementOptIn}
                onClick={() => setModelImprovementOptIn((prev) => !prev)}
                className="flex-shrink-0 mt-0.5 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: modelImprovementOptIn ? "var(--color-primary)" : "#374151",
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: modelImprovementOptIn ? "translateX(1.375rem)" : "translateX(0.25rem)",
                  }}
                />
              </button>
            </div>

            <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>
              Currently:{" "}
              <strong className={modelImprovementOptIn ? "text-green-400" : "text-slate-400"}>
                {modelImprovementOptIn ? "Opted IN" : "Opted OUT (default)"}
              </strong>
            </p>
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
      </div>
    </div>
  );
}
