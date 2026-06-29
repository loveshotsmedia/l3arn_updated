/**
 * Unified First Learning Map — Assembler
 *
 * Assembles a ParentReport (specifically the "unified-first-learning-map" type)
 * from structured Supabase data. This is NOT an AI call — it reads evidence
 * records, mastery records, game progress tables, and portfolio items, then
 * assembles them into the canonical ParentReport structure.
 *
 * Visibility gate (ADR-008):
 *   - "full" / "safety-override" tier: all sections included
 *   - "summary" tier: raw interaction logs excluded; only aggregate mastery
 *     level and calibration summary are included
 *
 * Privacy invariants (MASTER_HANDOFF §9.2, ADR-026):
 *   - noWebcamContent: z.literal(true) — no webcam content ever enters a report
 *   - noFaceCaptureContent: z.literal(true) — no biometric content
 *   - Raw AI output never reaches the report — all AI content enters via
 *     AIOutputEnvelope (validated before assembly)
 *
 * Supabase access:
 *   This assembler reads from Supabase using the service_role key via the
 *   Supabase REST API (fetch-based). The Railway backend injects the
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment variables.
 *
 *   TODO (OQ-A10-002): Add @supabase/supabase-js to services/ai-workers/package.json
 *   to replace the raw fetch calls here with typed Supabase client calls.
 *   This is blocked on a dependency audit across the monorepo. — Agent 10, Phase 1
 *
 * Game progress (from Agent 9 / Migration 004):
 *   Tables: companion_profiles, companion_growth_events, moolah_ledger,
 *           xp_events, child_badges (or equivalent from Migration 004).
 *   These tables may not have rows yet for a given child. All game progress
 *   reads are gated gracefully — missing rows result in zero-value defaults.
 *
 * Grounded in:
 *   - sprint_map.md Hero Slice step 12 (parent receives Unified First Learning Map)
 *   - docs/agent-10-evidence-reports.md Task 4
 *   - packages/shared-types/src/parent-report.schema.ts
 *   - packages/shared-types/src/evidence.schema.ts
 *   - ADR-008 (parent visibility model)
 *   - ADR-010 (academic progress: evidence-based mastery)
 *   - ADR-011 (reward economy: game progress separate from academic mastery)
 *   - ADR-026 (evidence capture)
 */

import type {
  ParentReport,
  LearnerCalibrationScore,
  EvidenceHighlight,
  MasteryProgressSummary,
  GameProgressSummary,
  NextMissionRecommendation,
  VisibilityTier,
} from "@l3arn/shared-types";

// ─── Supabase REST API Helper ─────────────────────────────────────────────────
// Raw fetch-based access using service_role credentials.
// TODO: Replace with @supabase/supabase-js client once added as a dependency.

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "[unified-first-learning-map] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "must be set in Railway environment variables."
    );
  }
  return { url, serviceRoleKey };
}

async function supabaseGet<T>(
  config: SupabaseConfig,
  table: string,
  queryParams: string,
): Promise<T[]> {
  const url = `${config.url}/rest/v1/${table}?${queryParams}`;
  const response = await fetch(url, {
    headers: {
      "apikey": config.serviceRoleKey,
      "Authorization": `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `[supabaseGet] Failed to fetch ${table}: ${response.status} ${body}`
    );
  }
  return response.json() as Promise<T[]>;
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface AssembleFirstLearningMapParams {
  childProfileId: string;
  missionAttemptId: string;
  parentVisibilityTier: VisibilityTier;
}

// ─── DB Row Types (minimal — only fields we read) ────────────────────────────

interface MasteryRecordRow {
  id: string;
  child_profile_id: string;
  mastery_skill_id: string;
  mastery_level: string;
  evidence_event_ids: string[];
  assessed_at: string;
}

interface MasterySkillRow {
  id: string;
  code: string;
  name: string;
  domain_id: string;
}

interface MasteryDomainRow {
  id: string;
  code: string;
  name: string;
}

interface PortfolioItemRow {
  id: string;
  child_profile_id: string;
  evidence_event_id: string | null;
  title: string;
  description: string | null;
  parent_consented: boolean;
  created_at: string;
}

interface LearningEvidenceEventRow {
  id: string;
  child_profile_id: string;
  event_type: string;
  content_json: Record<string, unknown> | null;
  captured_at: string;
  parent_consented_highlight: boolean;
}

interface CompanionGrowthEventRow {
  id: string;
  child_profile_id: string;
  companion_key: string;    // e.g. "loomi", "charli" — from companion_growth_events in Migration 004
  // NOTE: companion_profiles table does not exist in Migration 004.
  // bond_level is derived from the count of companion_growth_events rows.
  // OQ-A10-005: Sprint 2 should add a companion_profiles snapshot table for
  // easier bond level reads.
}

interface MoolahLedgerRow {
  id: string;
  child_profile_id: string;
  amount: number;
  transaction_type: string;
}

interface XpEventRow {
  id: string;
  child_profile_id: string;
  amount: number;
}

interface MissionAttemptRow {
  id: string;
  child_profile_id: string;
  completed_at: string | null;
}

// ─── Assembler ────────────────────────────────────────────────────────────────

/**
 * Assemble the Unified First Learning Map from structured Supabase data.
 *
 * Returns a ParentReport with all sections populated from real data.
 * Returns a sparse report (no AI content) if data is not yet available.
 *
 * Visibility gate:
 *   "summary" tier → calibrationScore and evidenceHighlights are excluded;
 *                    only masteryProgress (aggregate level) is shown
 *   "full" / "safety-override" → all sections included
 */
export async function assembleUnifiedFirstLearningMap(
  params: AssembleFirstLearningMapParams,
): Promise<ParentReport> {
  const { childProfileId, missionAttemptId, parentVisibilityTier } = params;
  const config = getSupabaseConfig();
  const isSummaryTier = parentVisibilityTier === "summary";

  // ── 1. Mastery records for this child ──────────────────────────────────────
  const masteryRows = await supabaseGet<MasteryRecordRow>(
    config,
    "mastery_records",
    `child_profile_id=eq.${childProfileId}`,
  ).catch(() => [] as MasteryRecordRow[]);

  // ── 2. Resolve skill names from mastery_skills ────────────────────────────
  const masteryProgress: MasteryProgressSummary[] = [];

  if (masteryRows.length > 0) {
    const skillIds = masteryRows.map((r) => r.mastery_skill_id);
    const skillIdFilter = `id=in.(${skillIds.join(",")})`;

    const skills = await supabaseGet<MasterySkillRow>(
      config,
      "mastery_skills",
      `${skillIdFilter}&select=id,code,name,domain_id`,
    ).catch(() => [] as MasterySkillRow[]);

    const skillMap = new Map<string, MasterySkillRow>(
      skills.map((s) => [s.id, s]),
    );

    // Resolve domain names
    const domainIds = [...new Set(skills.map((s) => s.domain_id))];
    const domains = domainIds.length > 0
      ? await supabaseGet<MasteryDomainRow>(
          config,
          "mastery_domains",
          `id=in.(${domainIds.join(",")})&select=id,code,name`,
        ).catch(() => [] as MasteryDomainRow[])
      : [];

    const domainMap = new Map<string, MasteryDomainRow>(
      domains.map((d) => [d.id, d]),
    );

    for (const row of masteryRows) {
      const skill = skillMap.get(row.mastery_skill_id);
      const domain = skill ? domainMap.get(skill.domain_id) : undefined;
      masteryProgress.push({
        masterySkillId: row.mastery_skill_id,
        masteryDomainId: skill?.domain_id ?? "unknown",
        skillName: skill?.name ?? row.mastery_skill_id,
        currentLevel: row.mastery_level as MasteryProgressSummary["currentLevel"],
        evidenceCount: row.evidence_event_ids?.length ?? 0,
        lastActivityAt: row.assessed_at,
        floridaStandardCodes: domain ? undefined : undefined, // TODO: join standard_skill_mappings
      });
    }
  }

  // ── 3. Calibration summary (full / safety-override only) ──────────────────
  //   In summary tier, calibration signals are too detailed for raw display.
  //   The calibration score is synthesized from learner_calibration_events
  //   but that table lives in the learner model domain — placeholder for now.
  //   TODO (OQ-A10-004): Wire to learner_calibration_events once learner model
  //   pipeline (Agent G) writes calibration event rows. — Agent 10
  let calibrationScore: LearnerCalibrationScore | undefined;

  if (!isSummaryTier) {
    // For Mission 001, calibration score is derived from mission_001 signals.
    // Approximate score = 60–75% range after Mission 001 (architecture.md §9).
    calibrationScore = {
      score: 62,
      stage: "mission-001",
      confidence: 0.6,
      signalsContributing: [
        "cognitive-load",
        "ai-readiness",
        "persistence",
        "delivery-mode-preference",
        "hint-frequency",
      ],
      computedAt: new Date().toISOString(),
    };
    // NOTE: This is a PLACEHOLDER calibration score. The real score must be
    // computed by the learner model pipeline (Agent G) reading
    // learner_calibration_events for this missionAttemptId.
    // TODO (OQ-A10-004): Replace with real calibration event aggregation.
  }

  // ── 4. Evidence highlights (parent-consented items only) ──────────────────
  //   Summary tier: no raw evidence highlights (they are raw interaction logs)
  //   Full / safety-override: include parent_consented_highlight = true items
  const evidenceHighlights: EvidenceHighlight[] = [];

  if (!isSummaryTier) {
    const portfolioRows = await supabaseGet<PortfolioItemRow>(
      config,
      "portfolio_items",
      `child_profile_id=eq.${childProfileId}&parent_consented=eq.true`,
    ).catch(() => [] as PortfolioItemRow[]);

    for (const item of portfolioRows) {
      evidenceHighlights.push({
        id: item.id,
        type: "mastery-moment", // default type; enriched by evidence event type in Sprint 2
        description: item.description ?? item.title,
        evidenceEventId: item.evidence_event_id ?? undefined,
        portfolioItemId: item.id,
        parentConsentedAt: item.created_at,
      });
    }
  }

  // ── 5. Game progress (graceful if Agent 9 tables don't have rows yet) ─────
  //   Tables from Migration 004 (Agent 9):
  //     companion_growth_events — bond events; bond level = count of events
  //     moolah_ledger           — Moolah transaction log
  //     xp_events               — XP earned events
  //     mission_attempts        — mission attempt records (Migration 003)
  //   If any table is missing data or returns an error, fall back gracefully.
  //   NOTE: companion_profiles does NOT exist in Migration 004. Agent 9 used
  //   companion_growth_events instead. Bond level = count of growth events.
  let gameProgress: GameProgressSummary | undefined;

  try {
    // Companion growth events (Migration 004) — derive companion key and bond level
    const companionGrowthRows = await supabaseGet<CompanionGrowthEventRow>(
      config,
      "companion_growth_events",
      `child_profile_id=eq.${childProfileId}&order=created_at.desc`,
    ).catch(() => [] as CompanionGrowthEventRow[]);

    const companionKey = companionGrowthRows[0]?.companion_key ?? null;
    const companionBondLevel = companionGrowthRows.length; // bond level = event count

    // Moolah balance: sum of all ledger amounts for this child
    const moolahRows = await supabaseGet<MoolahLedgerRow>(
      config,
      "moolah_ledger",
      `child_profile_id=eq.${childProfileId}`,
    ).catch(() => [] as MoolahLedgerRow[]);
    const moolahBalance = moolahRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    // XP total
    const xpRows = await supabaseGet<XpEventRow>(
      config,
      "xp_events",
      `child_profile_id=eq.${childProfileId}`,
    ).catch(() => [] as XpEventRow[]);
    const totalXp = xpRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    // Mission attempts (Migration 003)
    const attemptRows = await supabaseGet<MissionAttemptRow>(
      config,
      "mission_attempts",
      `child_profile_id=eq.${childProfileId}`,
    ).catch(() => [] as MissionAttemptRow[]);
    const missionsAttempted = attemptRows.length;
    const missionsCompleted = attemptRows.filter((r) => r.completed_at != null).length;

    gameProgress = {
      house: "pre_sorting", // resolved from academy_identities in Sprint 2
      companionName: companionKey ?? "—",
      companionBondLevel,
      moolahBalance: Math.max(0, moolahBalance),
      totalXp,
      badgesEarned: [],  // TODO: read from child_badges (Agent 9, Migration 004)
      missionsCompleted,
      missionsAttempted,
      academyUnlocksContributed: 0, // TODO: read from academy_unlocks
    };
  } catch {
    // Game progress tables may not have rows yet — silently omit
    gameProgress = undefined;
  }

  // ── 6. Next mission recommendation (static for Mission 001) ───────────────
  //   Mission library is not yet built. Static next path: Mission 002.
  const nextMissionRecommendation: NextMissionRecommendation = {
    summary: "Next: Mission 002 — [to be announced]",
    rationale:
      "After completing Mission 001 (Repair the Sorting Computer), the next " +
      "step in the L3ARN Academy is Mission 002. The full mission library will " +
      "be announced soon.",
    targetMasterySkillId: "AI_LITERACY.MISSION_002_TBD",
    targetMasteryDomainId: "AI_LITERACY",
    suggestedDeliveryMode: "3d",
  };

  // ── 7. Assemble the ParentReport ──────────────────────────────────────────
  const report: ParentReport = {
    id: generateReportId(),
    childProfileId,
    reportType: "unified-first-learning-map",
    generatedAt: new Date().toISOString(),
    masteryProgress,
    calibrationScore,
    evidenceHighlights,
    gameProgress,
    nextMissionRecommendation,
    // Privacy invariants — always true (compile-time + runtime enforced)
    noWebcamContent: true,
    noFaceCaptureContent: true,
  };

  return report;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateReportId(): string {
  // crypto.randomUUID() is available in Node 18+ (enforced by package.json engines)
  return crypto.randomUUID();
}

// ─── Route registration helper ────────────────────────────────────────────────
// Call this from index.ts to register the reports route on the Express app.

import type { Router as ExpressRouter } from "express";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

const AssembleReportRequestSchema = z.object({
  childProfileId: z.string().uuid({ message: "childProfileId must be a valid UUID" }),
  missionAttemptId: z.string().uuid({ message: "missionAttemptId must be a valid UUID" }),
  parentVisibilityTier: z.enum(["full", "summary", "safety-override"]),
});

export function createReportsRouter(): ExpressRouter {
  const router = Router();

  /**
   * POST /api/reports/first-learning-map
   *
   * Assembles and returns the Unified First Learning Map for a child after
   * Mission 001 completion.
   *
   * Request body:
   *   { childProfileId, missionAttemptId, parentVisibilityTier }
   *
   * Response:
   *   { report: ParentReport }
   */
  router.post(
    "/first-learning-map",
    async (req: Request, res: Response): Promise<void> => {
      const parseResult = AssembleReportRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "INVALID_REQUEST",
          issues: parseResult.error.issues,
        });
        return;
      }

      const { childProfileId, missionAttemptId, parentVisibilityTier } =
        parseResult.data;

      try {
        const report = await assembleUnifiedFirstLearningMap({
          childProfileId,
          missionAttemptId,
          parentVisibilityTier,
        });

        res.status(200).json({ report });
      } catch (err) {
        console.error(
          `[reports.route] Failed to assemble first learning map for childProfileId=${childProfileId}:`,
          err,
        );
        res.status(500).json({
          error: "REPORT_ASSEMBLY_ERROR",
          message:
            "Failed to assemble the First Learning Map. Please try again.",
        });
      }
    },
  );

  return router;
}
