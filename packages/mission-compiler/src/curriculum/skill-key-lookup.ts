/**
 * Mission 001 Skill Key Lookup
 *
 * Usage:
 *   Import this lookup anywhere the Mission Compiler needs to resolve a
 *   canonical app-layer skill key (lowercase dot-notation) to the DB code
 *   stored in mastery_skills.code (uppercase), or vice versa.
 *
 *   Primary injection point:
 *     packages/mission-compiler/src/compiler.ts
 *     — when building mastery_records inserts, call resolveSkillDbCode(appKey)
 *       to get the DB code, then SELECT id FROM mastery_skills WHERE code = dbCode
 *       to get the UUID.
 *
 *   Secondary injection point:
 *     apps/api/src/routes/mastery/mastery-records.ts (Railway API)
 *     — when reading mastery_records rows, call resolveSkillAppKey(dbCode)
 *       to surface the canonical app key in API responses.
 *
 * Mapping source:
 *   Migration 002 seed data (infra/supabase/migrations/002_curriculum_mastery_spine.sql)
 *   OQ-A10-003 resolved: canonical keys confirmed from curriculum seed data.
 *
 * IMPORTANT — key for `learner.calibration_initial_profile`:
 *   DB code is `LEARNER_CALIBRATION.INITIAL_PROFILE` (domain = LEARNER_CALIBRATION),
 *   NOT `LEARNER.CALIBRATION_INITIAL_PROFILE`. The domain code is LEARNER_CALIBRATION
 *   (see mastery_domains seed in Migration 002). The app-layer canonical key uses
 *   the shorthand `learner.*` for readability; the DB uses the full domain code.
 *
 * Grounded in:
 *   packages/mission-compiler/src/evidence/mission-001-evidence-capture.ts
 *   infra/supabase/migrations/002_curriculum_mastery_spine.sql (seed data)
 *   ADR-021 (curriculum grounding layer)
 *   ADR-024 (first hero mission: Repair the Sorting Computer)
 */

// ─── App-layer canonical skill keys ──────────────────────────────────────────
// These are the 5 canonical masterySkillTarget keys for Mission 001.
// Defined here and re-exported so skill-key-lookup.ts is the single source of
// truth for the mapping. mission-001-evidence-capture.ts also declares
// Mission001SkillKey — both definitions are identical and intentional.

export type Mission001SkillKey =
  | 'ai_literacy.verify_ai_output'
  | 'logic.sequence_steps'
  | 'comprehension.follow_multistep_instructions'
  | 'reasoning.use_evidence_to_decide'
  | 'learner.calibration_initial_profile';

// ─── DB code type ─────────────────────────────────────────────────────────────
// The mastery_skills.code column stores uppercase dot-notation codes.
// The CHECK constraint requires: ^[A-Z][A-Z0-9_.]{1,49}$

export type MasterySkillDbCode =
  | 'AI_LITERACY.VERIFY_AI_OUTPUT'
  | 'LOGIC.SEQUENCE_STEPS'
  | 'COMPREHENSION.FOLLOW_MULTISTEP_INSTRUCTIONS'
  | 'REASONING.USE_EVIDENCE_TO_DECIDE'
  | 'LEARNER_CALIBRATION.INITIAL_PROFILE';

// ─── Canonical mapping: app key → DB code ────────────────────────────────────
//
// Source: Migration 002 seed data (002_curriculum_mastery_spine.sql)
//
// App key                                        | DB code (mastery_skills.code)
// ───────────────────────────────────────────────┼──────────────────────────────
// ai_literacy.verify_ai_output                   | AI_LITERACY.VERIFY_AI_OUTPUT
// logic.sequence_steps                           | LOGIC.SEQUENCE_STEPS
// comprehension.follow_multistep_instructions    | COMPREHENSION.FOLLOW_MULTISTEP_INSTRUCTIONS
// reasoning.use_evidence_to_decide               | REASONING.USE_EVIDENCE_TO_DECIDE
// learner.calibration_initial_profile            | LEARNER_CALIBRATION.INITIAL_PROFILE
//
// NOTE: `learner.calibration_initial_profile` maps to LEARNER_CALIBRATION.INITIAL_PROFILE
// The domain code is LEARNER_CALIBRATION (not LEARNER). The app shorthand `learner.*`
// was chosen for concision but does NOT match the DB domain code.

export const SKILL_KEY_MAP: Record<Mission001SkillKey, MasterySkillDbCode> = {
  'ai_literacy.verify_ai_output':                 'AI_LITERACY.VERIFY_AI_OUTPUT',
  'logic.sequence_steps':                         'LOGIC.SEQUENCE_STEPS',
  'comprehension.follow_multistep_instructions':  'COMPREHENSION.FOLLOW_MULTISTEP_INSTRUCTIONS',
  'reasoning.use_evidence_to_decide':             'REASONING.USE_EVIDENCE_TO_DECIDE',
  'learner.calibration_initial_profile':          'LEARNER_CALIBRATION.INITIAL_PROFILE',
} as const;

// ─── Reverse map: DB code → app key ──────────────────────────────────────────

const DB_CODE_TO_APP_KEY = Object.fromEntries(
  Object.entries(SKILL_KEY_MAP).map(([appKey, dbCode]) => [dbCode, appKey as Mission001SkillKey]),
) as Record<MasterySkillDbCode, Mission001SkillKey>;

// ─── Lookup functions ─────────────────────────────────────────────────────────

/**
 * Resolves a canonical app-layer skill key to the DB code stored in
 * mastery_skills.code.
 *
 * Usage:
 *   const dbCode = resolveSkillDbCode('ai_literacy.verify_ai_output');
 *   // → 'AI_LITERACY.VERIFY_AI_OUTPUT'
 *   const { data } = await supabase
 *     .from('mastery_skills')
 *     .select('id')
 *     .eq('code', dbCode)
 *     .single();
 */
export function resolveSkillDbCode(appKey: Mission001SkillKey): MasterySkillDbCode {
  return SKILL_KEY_MAP[appKey];
}

/**
 * Resolves a DB mastery_skills.code value back to the canonical app-layer key.
 * Returns null if the DB code is not a known Mission 001 skill (e.g. from a
 * different mission set).
 *
 * Usage:
 *   const appKey = resolveSkillAppKey('LEARNER_CALIBRATION.INITIAL_PROFILE');
 *   // → 'learner.calibration_initial_profile'
 */
export function resolveSkillAppKey(dbCode: MasterySkillDbCode): Mission001SkillKey | null {
  return DB_CODE_TO_APP_KEY[dbCode] ?? null;
}
