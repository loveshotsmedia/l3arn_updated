"use client";

/**
 * Child Profile Creation — Onboarding Step 2
 *
 * Collects:
 *   - Display name (academy name, not legal name) → goes to academy_identities
 *   - Legal first name, last name → goes to child_profiles (PII, parent-eyes only)
 *   - Grade level (K–8 selector) → child_profiles.grade
 *   - Date of birth → child_profiles.date_of_birth (COPPA age verification only)
 *
 * Under-13 flag: DOB is captured but NOT shown to child or other students.
 * The under-13 determination affects COPPA consent requirements.
 *
 * Validated against ChildProfileSchema from identity.schema.ts:
 *   - legalFirstName: min 1, max 100
 *   - legalLastName: min 1, max 100
 *   - grade: "K" | "1" | ... | "8"
 *   - dateOfBirth: YYYY-MM-DD
 *
 * AcademyIdentitySchema for display name:
 *   - displayName: min 2, max 32
 *
 * Note: Legal name + DOB are stored in child_profiles (Critical PII).
 * Display name is stored in academy_identities (Low PII).
 * The two are joined by child_profile_id but the join is parent-eyes only (RLS).
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8"] as const;

// Derived from ChildProfileSchema + AcademyIdentitySchema in identity.schema.ts
const ChildFormSchema = z.object({
  legalFirstName: z
    .string()
    .min(1, "Legal first name is required.")
    .max(100, "Must be 100 characters or fewer."),
  legalLastName: z
    .string()
    .min(1, "Legal last name is required.")
    .max(100, "Must be 100 characters or fewer."),
  displayName: z
    .string()
    .min(2, "Academy name must be at least 2 characters.")
    .max(32, "Academy name must be 32 characters or fewer."),
  grade: z.enum(GRADES, { errorMap: () => ({ message: "Please select a grade." }) }),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format.")
    .refine((dob) => {
      const date = new Date(dob);
      const now = new Date();
      // Must be at least 4 years old (lowest K entry) and no older than 18
      const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 4 && age <= 18;
    }, "Date of birth must be for a child aged 4–18."),
});

type FormErrors = Partial<Record<keyof z.infer<typeof ChildFormSchema>, string>>;

function isUnder13(dateOfBirth: string): boolean {
  const date = new Date(dateOfBirth);
  const now = new Date();
  const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age < 13;
}

export default function ChildProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [legalFirstName, setLegalFirstName] = useState("");
  const [legalLastName, setLegalLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState<(typeof GRADES)[number] | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const result = ChildFormSchema.safeParse({
      legalFirstName,
      legalLastName,
      displayName,
      grade,
      dateOfBirth,
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

      // Find the household for this parent
      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("id")
        .eq("parent_account_id", session.user.id)
        .single();

      if (householdError || !household) {
        setServerError("Could not find your household. Please go back and set it up.");
        setLoading(false);
        return;
      }

      // Insert child_profiles row (Critical PII)
      const { data: childProfile, error: profileError } = await supabase
        .from("child_profiles")
        .insert({
          household_id: household.id,
          parent_account_id: session.user.id,
          legal_first_name: result.data.legalFirstName,
          legal_last_name: result.data.legalLastName,
          date_of_birth: result.data.dateOfBirth,
          grade: result.data.grade,
        })
        .select("id")
        .single();

      if (profileError || !childProfile) {
        throw profileError ?? new Error("Failed to create child profile.");
      }

      // Store child_profile_id in session storage for the rest of onboarding
      // This is a temporary convenience — not security-critical.
      // The actual consent and permissions pages will look up the child by parent_account_id.
      sessionStorage.setItem("onboarding_child_profile_id", childProfile.id);

      // Insert academy_identities row (Low PII — display name only)
      const { error: identityError } = await supabase.from("academy_identities").insert({
        child_profile_id: childProfile.id,
        display_name: result.data.displayName,
        // house is set during Sorting Ceremony in Phase 1
        house: "Novari", // placeholder — overwritten during Sorting
      });

      if (identityError) throw identityError;

      router.push("/parent/onboarding/consent");
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not save child profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function FieldError({ field }: { field: keyof FormErrors }) {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs mt-1 text-red-400">{fieldErrors[field]}</p>;
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
          Step 2 of 5 — Child Profile
        </p>

        <h1 className="text-2xl font-bold mb-1">Add your child</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          Legal name and date of birth are kept private — only you can see them.
          Your child's Academy name is what they'll use inside L3ARN.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Academy display name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              Academy name{" "}
              <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>
                (shown to other students)
              </span>
            </label>
            <input
              id="displayName"
              type="text"
              maxLength={32}
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: fieldErrors.displayName ? "#f87171" : "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="e.g. StarBlazer7"
            />
            <FieldError field="displayName" />
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {displayName.length}/32 — No real name here. Choose something fun.
            </p>
          </div>

          {/* Legal name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="legalFirstName" className="block text-sm font-medium mb-1">
                Legal first name{" "}
                <span style={{ color: "var(--color-text-muted)" }}>(private)</span>
              </label>
              <input
                id="legalFirstName"
                type="text"
                maxLength={100}
                required
                value={legalFirstName}
                onChange={(e) => setLegalFirstName(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--color-bg)",
                  borderColor: fieldErrors.legalFirstName ? "#f87171" : "var(--color-border)",
                  color: "var(--color-text)",
                }}
                placeholder="First"
              />
              <FieldError field="legalFirstName" />
            </div>

            <div>
              <label htmlFor="legalLastName" className="block text-sm font-medium mb-1">
                Legal last name{" "}
                <span style={{ color: "var(--color-text-muted)" }}>(private)</span>
              </label>
              <input
                id="legalLastName"
                type="text"
                maxLength={100}
                required
                value={legalLastName}
                onChange={(e) => setLegalLastName(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--color-bg)",
                  borderColor: fieldErrors.legalLastName ? "#f87171" : "var(--color-border)",
                  color: "var(--color-text)",
                }}
                placeholder="Last"
              />
              <FieldError field="legalLastName" />
            </div>
          </div>

          {/* Grade level */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium mb-1">
              Grade level
            </label>
            <select
              id="grade"
              required
              value={grade}
              onChange={(e) => setGrade(e.target.value as (typeof GRADES)[number] | "")}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: fieldErrors.grade ? "#f87171" : "var(--color-border)",
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
            <FieldError field="grade" />
          </div>

          {/* Date of birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-1">
              Date of birth{" "}
              <span style={{ color: "var(--color-text-muted)" }}>
                (used for age verification only — never shown to your child or other students)
              </span>
            </label>
            <input
              id="dateOfBirth"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: fieldErrors.dateOfBirth ? "#f87171" : "var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <FieldError field="dateOfBirth" />
            {/* Under-13 indicator */}
            {dateOfBirth && !fieldErrors.dateOfBirth && isUnder13(dateOfBirth) && (
              <p className="text-xs mt-1 text-amber-400">
                This child is under 13. COPPA consent is required in the next step.
              </p>
            )}
          </div>

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
         * Open Questions:
         * OQ-PARENT-001: The house field in academy_identities requires a valid
         * house_name enum value at INSERT time (DB constraint). This page sets a
         * placeholder "Novari" to satisfy the constraint. The Sorting Ceremony
         * (Phase 1) will update this. A nullable house column or a separate
         * pre-sorting state would be cleaner. Flag for ADR review.
         *
         * OQ-PARENT-002: sessionStorage is used to pass child_profile_id through
         * the onboarding flow. This is fragile (lost on tab close/refresh).
         * A better pattern would be a URL param or a server-side onboarding
         * session state. Low priority for Hero Slice but should be resolved
         * before Phase 1 launch.
         */}
      </div>
    </div>
  );
}
