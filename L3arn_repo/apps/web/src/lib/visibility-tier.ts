/**
 * visibility-tier.ts — Frontend re-export of the visibility tier helper.
 *
 * This module re-exports `resolveDefaultVisibilityTier` and `VisibilityTier`
 * for use in Next.js App Router server/client components.
 *
 * The canonical implementation lives in:
 *   services/ai-workers/src/utils/visibility-tier.helper.ts
 *
 * IMPORTANT: This function is for DISPLAY FALLBACK ONLY.
 * The frontend MUST NOT store the derived value to Supabase.
 * Derivation is only used when `privacy_settings.parent_visibility_tier` is NULL
 * (i.e., legacy rows created before the Railway backend wired the assignment).
 *
 * Override direction enforcement:
 *   full → summary        (allowed)
 *   full → safety-override (allowed)
 *   summary → safety-override (allowed)
 *   summary → full         (NEVER allowed from frontend)
 *
 * Grounded in:
 *   - ADR-008 (parent-visibility-model)
 *   - OQ-C resolution (2026-06-17): parentVisibilityTier is backend-assigned
 *   - CONTEXT.md §6 decision #9
 */

export type VisibilityTier = "full" | "summary" | "safety-override";

/**
 * Derives the default visibility tier based on grade level and safety flag.
 *
 * Rules:
 *   K–5 → "full"
 *   6–8 → "summary"
 *   hasActiveSafetyFlag = true → always "full"
 *
 * @param gradeLevel — one of "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
 * @param hasActiveSafetyFlag — if true, always returns "full" regardless of grade
 * @returns VisibilityTier
 */
export function resolveDefaultVisibilityTier(
  gradeLevel: string,
  hasActiveSafetyFlag = false
): VisibilityTier {
  if (hasActiveSafetyFlag) return "full";
  const grade = gradeLevel === "K" ? 0 : parseInt(gradeLevel, 10);
  return grade <= 5 ? "full" : "summary";
}

/**
 * Returns the list of visibility tier options available to a parent,
 * given the grade-level default.
 *
 * Parents may only change to a STRICTER tier — never to a looser one.
 * If the grade default is "summary", "full" is not shown as an option.
 *
 * @param gradeLevel — child's current grade
 * @returns array of VisibilityTier values the parent may select
 */
export function getAvailableVisibilityTiers(gradeLevel: string): VisibilityTier[] {
  const defaultTier = resolveDefaultVisibilityTier(gradeLevel, false);
  if (defaultTier === "summary") {
    // Grade 6–8: parent may only choose summary or stricter
    return ["summary", "safety-override"];
  }
  // Grade K–5: parent may choose any tier (full is default, stricter options also available)
  return ["full", "summary", "safety-override"];
}

/**
 * Returns a human-readable label for a visibility tier.
 */
export function visibilityTierLabel(tier: VisibilityTier): string {
  switch (tier) {
    case "full":
      return "Full View";
    case "summary":
      return "Summary View";
    case "safety-override":
      return "Safety Override";
  }
}

/**
 * Returns the CSS color token for a visibility tier badge.
 */
export function visibilityTierColor(tier: VisibilityTier): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tier) {
    case "full":
      return {
        bg: "rgba(16, 185, 129, 0.15)",
        text: "#10b981",
        border: "rgba(16, 185, 129, 0.3)",
      };
    case "summary":
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        text: "#f59e0b",
        border: "rgba(245, 158, 11, 0.3)",
      };
    case "safety-override":
      return {
        bg: "rgba(239, 68, 68, 0.15)",
        text: "#ef4444",
        border: "rgba(239, 68, 68, 0.3)",
      };
  }
}
