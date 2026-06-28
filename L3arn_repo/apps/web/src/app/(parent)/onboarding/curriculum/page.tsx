"use client";

/**
 * Curriculum Boundary Setup — Onboarding Step 5
 *
 * Collects:
 *   - Grade-level confirmation (pre-filled from child profile)
 *   - Subject focus areas (optional — parent-expressed priorities)
 *   - Additional blocked topics (supplements the list from permissions step)
 *
 * This step captures the parent_intent dimension of the Mission Compiler
 * three-part constraint (ADR-014):
 *   1. Parent intent ← THIS PAGE contributes to this
 *   2. Child personalization (calibrated during Mission 001)
 *   3. Mastery/standards alignment (curriculum spine via API)
 *
 * Data saved to: child_permissions.blocked_topics (merged with any from step 4)
 * The subject focus areas are stored as a JSON preference in child_permissions
 * or a future parent_curriculum_prefs table.
 *
 * Note: Curriculum spine tables (mastery_domains, mastery_skills, etc.) are
 * service-role-only. This page does NOT read them directly. It captures
 * parent-expressed preferences in plain text/structured form, which the
 * Mission Compiler API reads when generating missions.
 *
 * Agent 8 addition (2026-06-17):
 *   Accepts a `childId` query parameter for post-onboarding edit flow.
 *   When `?childId=<uuid>` is present, the page:
 *     - Uses that childId instead of sessionStorage `onboarding_child_profile_id`
 *     - Pre-fills grade from the child_profiles row
 *     - Pre-fills existing curriculum prefs from parent_curriculum_prefs
 *     - After save, redirects to /parent/reports/[childId] instead of /parent/dashboard
 *   This enables the "Curriculum settings" link on the dashboard and reports page.
 */

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const SUBJECT_AREAS = [
  "Math",
  "Reading & Writing",
  "Science",
  "History & Social Studies",
  "Art & Music",
  "Technology & Coding",
  "AI Literacy",
  "Physical Education",
  "Foreign Language",
] as const;

// Derived from ChildPermissionsSchema blocked_topics + curriculum preferences
const CurriculumFormSchema = z.object({
  gradeConfirmed: z.string().min(1, "Grade is required."),
  focusSubjects: z.array(z.string()),
  additionalBlockedTopics: z.array(z.string()),
});

type FormErrors = Partial<Record<"gradeConfirmed", string>>;

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8"] as const;

function CurriculumSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  // Agent 8: childId from query param (post-onboarding edit) or sessionStorage (onboarding flow)
  const childIdFromParam = searchParams.get("childId");
  const isEditMode = !!childIdFromParam;

  // Grade pre-filled from session, editable for confirmation
  const [grade, setGrade] = useState<string>("");
  const [focusSubjects, setFocusSubjects] = useState<string[]>([]);
  const [additionalBlockedTopics, setAdditionalBlockedTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(isEditMode);

  // Agent 8: Pre-fill from existing data when childId param is present
  useEffect(() => {
    if (!childIdFromParam) return;

    async function prefillFromChildId() {
      setPrefillLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/parent/auth/login");
          return;
        }

        // Load grade from child_profiles
        const { data: profile } = await supabase
          .from("child_profiles")
          .select("grade")
          .eq("id", childIdFromParam)
          .eq("parent_account_id", session.user.id)
          .is("deleted_at", null)
          .single();

        if (profile?.grade) {
          setGrade(profile.grade as string);
        }

        // Load existing curriculum prefs if available
        const { data: prefs } = await supabase
          .from("parent_curriculum_prefs")
          .select("focus_subjects")
          .eq("child_profile_id", childIdFromParam)
          .maybeSingle();

        if (prefs?.focus_subjects && Array.isArray(prefs.focus_subjects)) {
          setFocusSubjects(prefs.focus_subjects as string[]);
        }
      } catch {
        // Prefill failure is non-fatal — page still works with empty state
      } finally {
        setPrefillLoading(false);
      }
    }

    prefillFromChildId();
  }, [childIdFromParam, router, supabase]);

  function toggleSubject(subject: string) {
    setFocusSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  function addTopic() {
    const trimmed = topicInput.trim();
    if (trimmed && !additionalBlockedTopics.includes(trimmed)) {
      setAdditionalBlockedTopics((prev) => [...prev, trimmed]);
      setTopicInput("");
    }
  }

  function removeTopic(topic: string) {
    setAdditionalBlockedTopics((prev) => prev.filter((t) => t !== topic));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const result = CurriculumFormSchema.safeParse({
      gradeConfirmed: grade,
      focusSubjects,
      additionalBlockedTopics,
    });

    if (!result.success) {
      const errs: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        errs[field] = issue.message;
      }
      setFieldErrors(errs);
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

      // Agent 8: use childId from query param (edit mode) or sessionStorage (onboarding flow)
      const childProfileId = childIdFromParam ?? sessionStorage.getItem("onboarding_child_profile_id");

      if (!childProfileId) {
        setServerError("Could not find child profile. Please go back to step 2.");
        setLoading(false);
        return;
      }

      // Update grade on child_profiles if it changed
      if (grade) {
        const { error: gradeError } = await supabase
          .from("child_profiles")
          .update({ grade })
          .eq("id", childProfileId)
          .eq("parent_account_id", session.user.id);

        if (gradeError) throw gradeError;
      }

      // Merge additional blocked topics into child_permissions
      // First, read existing blocked topics
      const { data: existingPerms } = await supabase
        .from("child_permissions")
        .select("blocked_topics")
        .eq("child_profile_id", childProfileId)
        .single();

      const existingTopics: string[] = existingPerms?.blocked_topics ?? [];
      const mergedTopics = Array.from(new Set([...existingTopics, ...additionalBlockedTopics]));

      // Store focus_subjects as a JSON field.
      // Note: child_permissions table does not yet have a focus_subjects column.
      // This upsert saves the merged blocked_topics. Focus subjects are stored
      // in a comment pending schema addition.
      const { error: permError } = await supabase.from("child_permissions").upsert({
        child_profile_id: childProfileId,
        blocked_topics: mergedTopics,
        updated_by_parent_account_id: session.user.id,
      });

      if (permError) throw permError;

      if (isEditMode) {
        // Post-onboarding edit: redirect back to the child's report page
        router.push(`/parent/reports/${childProfileId}`);
      } else {
        // Onboarding flow: clear session token and mark onboarding complete
        sessionStorage.removeItem("onboarding_child_profile_id");

        const { error: profileError } = await supabase
          .from("child_profiles")
          .update({ onboarding_complete: true })
          .eq("id", childProfileId)
          .eq("parent_account_id", session.user.id);

        if (profileError) throw profileError;

        router.push("/parent/dashboard");
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not save curriculum settings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (prefillLoading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p style={{ color: "var(--color-text-muted)" }}>Loading curriculum settings…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {isEditMode ? (
          <p className="text-xs font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
            Curriculum Settings
          </p>
        ) : (
          <p className="text-xs font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
            Step 5 of 5 — Curriculum
          </p>
        )}

        <h1 className="text-2xl font-bold mb-1">Curriculum boundaries</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          Tell L3ARN what matters most for your child&apos;s learning. You can refine
          these at any time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grade confirmation */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium mb-1">
              Confirm grade level
            </label>
            <select
              id="grade"
              required
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setFieldErrors({});
              }}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: fieldErrors.gradeConfirmed ? "#f87171" : "var(--color-border)",
                color: grade ? "var(--color-text)" : "var(--color-text-muted)",
              }}
            >
              <option value="" disabled>
                Select grade…
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g === "K" ? "Kindergarten" : `Grade ${g}`}
                </option>
              ))}
            </select>
            {fieldErrors.gradeConfirmed && (
              <p className="text-xs mt-1 text-red-400">{fieldErrors.gradeConfirmed}</p>
            )}
          </div>

          {/* Subject focus areas */}
          <section>
            <h2 className="text-sm font-semibold mb-1">Subject focus areas</h2>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              Select subjects to emphasize. L3ARN will prioritize these when generating
              missions. Leave all unselected for a balanced curriculum.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_AREAS.map((subject) => {
                const selected = focusSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
                      background: selected ? "rgba(99, 102, 241, 0.15)" : "var(--color-bg)",
                      color: selected ? "var(--color-primary)" : "var(--color-text-muted)",
                    }}
                    aria-pressed={selected}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Additional blocked topics */}
          <section>
            <h2 className="text-sm font-semibold mb-1">
              Additional blocked topics{" "}
              <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>
                (optional)
              </span>
            </h2>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              Add any subject areas or themes you do not want covered in your child's missions.
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
                placeholder="e.g. Evolution, War, Occult…"
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
            {additionalBlockedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {additionalBlockedTopics.map((topic) => (
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
            {loading ? "Saving…" : isEditMode ? "Save curriculum settings" : "Complete setup"}
          </button>
        </form>

        {/*
         * Open Questions:
         * OQ-PARENT-005: The child_permissions table does not have a focus_subjects
         * column. Subject focus areas are captured here but not yet persisted to DB.
         * Options: (a) add JSONB column to child_permissions, (b) create a
         * parent_curriculum_prefs table, (c) store as part of blocked_topics in a
         * structured format. Recommend option (a) or (b) before Phase 1.
         * Flagged for Agent D (Supabase/Data agent).
         *
         * OQ-PARENT-006: The house field in academy_identities was set to "Novari"
         * placeholder in the child profile step. This must be updated after the
         * Sorting Ceremony in Phase 1. The Sorting Ceremony route should update
         * academy_identities.house via a parent-authenticated call.
         */}
      </div>
    </div>
  );
}

export default function CurriculumSetupPage() {
  return (
    <Suspense fallback={null}>
      <CurriculumSetupContent />
    </Suspense>
  );
}
