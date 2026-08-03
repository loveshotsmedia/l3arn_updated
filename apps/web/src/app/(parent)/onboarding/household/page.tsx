"use client";

/**
 * Household Setup — Onboarding Step 1
 *
 * Collects household name.
 * Validates against HouseholdSchema from identity.schema.ts:
 *   - name: min 1, max 100 chars
 *
 * On submit: inserts into `households` table in Supabase,
 * then routes to /parent/onboarding/child.
 *
 * Note: parent_account_id is set server-side from auth.uid()
 * via RLS INSERT policy (households_owner_insert).
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// Local Zod validation derived from HouseholdSchema in identity.schema.ts
const HouseholdFormSchema = z.object({
  name: z
    .string()
    .min(1, "Household name is required.")
    .max(100, "Household name must be 100 characters or fewer."),
});

type FormErrors = Partial<Record<keyof z.infer<typeof HouseholdFormSchema>, string>>;

export default function HouseholdSetupPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unsavedWarning, setUnsavedWarning] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (unsavedWarning) setUnsavedWarning(false);
    // Clear field error on change
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    // Client-side validation
    const result = HouseholdFormSchema.safeParse({ name });
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

      // Insert household — parent_account_id is enforced by RLS (equals auth.uid())
      const { error: insertError } = await supabase.from("households").insert({
        parent_account_id: session.user.id,
        name: result.data.name,
      });

      if (insertError) throw insertError;

      router.push("/parent/onboarding/child");
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not save household. Please try again."
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
        {/* Progress indicator */}
        <p className="text-xs font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
          Step 1 of 5 — Household
        </p>

        <h1 className="text-2xl font-bold mb-1">Name your household</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          This is how your family will appear in L3ARN. You can change it later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="householdName" className="block text-sm font-medium mb-1">
              Household name
            </label>
            <input
              id="householdName"
              type="text"
              autoComplete="off"
              required
              maxLength={100}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: fieldErrors.name ? "#f87171" : "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="e.g. The Johnson Academy"
            />
            {fieldErrors.name && (
              <p className="text-xs mt-1 text-red-400">{fieldErrors.name}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {name.length}/100 characters
            </p>
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
      </div>
    </div>
  );
}
