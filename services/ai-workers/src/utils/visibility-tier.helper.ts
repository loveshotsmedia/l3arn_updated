/**
 * resolveDefaultVisibilityTier
 *
 * Authority: Railway backend ONLY. Do NOT derive from DB DEFAULT or compute in frontend.
 * Call at child-profile creation and onboarding completion to assign the initial
 * parentVisibilityTier for a child's ChildPermissions row.
 *
 * Default rules (product decision 2026-06-17, CONTEXT.md §6 decision #9):
 *   K–5                  → "full"    (parent sees complete session detail)
 *   Grades 6–8           → "summary" (student privacy increases with age)
 *   hasActiveSafetyFlag  → always "full" regardless of grade band
 *   Parent may override to *stricter* visibility in ChildPermissions, never looser
 *
 * Grounded in:
 *   - ADR-008 (parent-visibility-model)
 *   - CONTEXT.md §6 decision #9
 *   - packages/shared-types/src/identity.schema.ts (VisibilityTierSchema)
 */

export type VisibilityTier = "full" | "summary" | "safety-override";

export function resolveDefaultVisibilityTier(
  gradeLevel: string,
  hasActiveSafetyFlag = false
): VisibilityTier {
  if (hasActiveSafetyFlag) return "full";
  const grade = gradeLevel === "K" ? 0 : parseInt(gradeLevel, 10);
  return grade <= 5 ? "full" : "summary";
}
