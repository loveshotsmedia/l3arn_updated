/**
 * Founder Mission Control — Hero Slice observability data layer (Phase C).
 *
 * Pure, server-only data fetchers for the operational panels added in Phase C.
 * Each fetcher is given a Supabase client (service-role, created by the caller)
 * and returns a DE-IDENTIFIED shape that is safe to render in the UI.
 *
 * WHY this is a separate module (not inline in page.tsx):
 *   - It takes the client as an argument, so the logic is testable against a
 *     real Supabase stack without rendering a page (see
 *     services/ai-workers/scripts/mission-control-data.test.ts).
 *   - It has NO Next.js / no `@/` imports and NO runtime imports — only a
 *     type-only import — so it can be exercised by ts-node from any package.
 *
 * NON-NEGOTIABLE de-identification contract (mirrors mission-control/page.tsx):
 *   - UUIDs only. No legal name, no parent email, no household address.
 *   - Never select/return content_json, payload_json, or any raw AI output.
 *   - Aggregates and bounded recent-activity rows only — never bulk PII dumps.
 *
 * All reads use the service-role client (bypasses RLS). On any query error a
 * fetcher logs and returns safe empty defaults — the dashboard degrades to
 * zeros rather than throwing (mirrors fetchPendingEscalations / fetchRecentAuditLog).
 *
 * Acceptance criteria covered (agent-11 / Phase C handoff §2):
 *   1. Active child sessions            → fetchActiveSessions
 *   2. Mission 001 starts / completions → fetchMissionActivity
 *   3. Failed AI validation / fallback  → fetchAiFallbackEvents
 *   4. Reward ledger health             → fetchRewardLedgerHealth
 *   5. Evidence / report creation       → fetchEvidenceReporting
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** How many recent rows each panel surfaces. Bounded — never an unbounded scan. */
const RECENT_LIMIT = 10;

// ─── Panel 1: Active child sessions ──────────────────────────────────────────

export interface ActiveSessionRow {
  id: string;
  child_profile_id: string; // UUID only — never legal name
  launch_mode: string;
  started_at: string;
  expires_at: string;
}

export interface ActiveSessionsPanel {
  activeCount: number;
  recent: ActiveSessionRow[];
}

/**
 * Active = not revoked, not ended, not yet expired (mirrors the
 * idx_child_sessions_expires_at partial index + the /verify fail-closed rule).
 */
export async function fetchActiveSessions(
  client: SupabaseClient
): Promise<ActiveSessionsPanel> {
  const nowIso = new Date().toISOString();

  const [countRes, recentRes] = await Promise.all([
    client
      .from("child_sessions")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null)
      .is("ended_at", null)
      .gt("expires_at", nowIso),
    client
      .from("child_sessions")
      .select("id, child_profile_id, launch_mode, started_at, expires_at")
      .is("revoked_at", null)
      .is("ended_at", null)
      .gt("expires_at", nowIso)
      .order("started_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (countRes.error || recentRes.error) {
    console.error(
      "[MissionControl] fetchActiveSessions failed:",
      countRes.error?.message ?? recentRes.error?.message
    );
    return { activeCount: countRes.count ?? 0, recent: [] };
  }

  return {
    activeCount: countRes.count ?? 0,
    recent: (recentRes.data ?? []) as ActiveSessionRow[],
  };
}

// ─── Panel 2: Mission activity (starts / completions) ────────────────────────

export interface MissionAttemptRow {
  id: string;
  mission_id: string;
  status: string;
  content_source: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface MissionActivityPanel {
  totalStarted: number;
  totalCompleted: number;
  completionRatePct: number;
  recent: MissionAttemptRow[];
}

/**
 * Every attempt row is a "start"; completed = completed_at IS NOT NULL
 * (the consumer contract from migration 008).
 */
export async function fetchMissionActivity(
  client: SupabaseClient
): Promise<MissionActivityPanel> {
  const [startedRes, completedRes, recentRes] = await Promise.all([
    client.from("mission_attempts").select("id", { count: "exact", head: true }),
    client
      .from("mission_attempts")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null),
    client
      .from("mission_attempts")
      .select("id, mission_id, status, content_source, started_at, completed_at")
      .order("started_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (startedRes.error || completedRes.error || recentRes.error) {
    console.error(
      "[MissionControl] fetchMissionActivity failed:",
      startedRes.error?.message ??
        completedRes.error?.message ??
        recentRes.error?.message
    );
  }

  const totalStarted = startedRes.count ?? 0;
  const totalCompleted = completedRes.count ?? 0;
  const completionRatePct =
    totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  return {
    totalStarted,
    totalCompleted,
    completionRatePct,
    recent: (recentRes.data ?? []) as MissionAttemptRow[],
  };
}

// ─── Panel 3: AI fallback events (failed AI validation) ──────────────────────

export interface FallbackAttemptRow {
  id: string;
  mission_id: string;
  status: string;
  started_at: string;
}

export interface AiFallbackPanel {
  /** Runs where the static, human-authored fallback was served (no AI reached child). */
  fallbackCount: number;
  /** Runs served from validated AI content (denominator for the fallback rate). */
  aiCount: number;
  fallbackRatePct: number;
  recent: FallbackAttemptRow[];
}

/**
 * content_source = 'fallback' is the "failed AI validation / fallback" signal:
 * the Mission Compiler's output failed Zod validation or the AI was unavailable,
 * so the safe static mission was served instead (migration 008 comment).
 */
export async function fetchAiFallbackEvents(
  client: SupabaseClient
): Promise<AiFallbackPanel> {
  const [fallbackRes, aiRes, recentRes] = await Promise.all([
    client
      .from("mission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("content_source", "fallback"),
    client
      .from("mission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("content_source", "ai"),
    client
      .from("mission_attempts")
      .select("id, mission_id, status, started_at")
      .eq("content_source", "fallback")
      .order("started_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (fallbackRes.error || aiRes.error || recentRes.error) {
    console.error(
      "[MissionControl] fetchAiFallbackEvents failed:",
      fallbackRes.error?.message ??
        aiRes.error?.message ??
        recentRes.error?.message
    );
  }

  const fallbackCount = fallbackRes.count ?? 0;
  const aiCount = aiRes.count ?? 0;
  const denom = fallbackCount + aiCount;
  const fallbackRatePct = denom > 0 ? Math.round((fallbackCount / denom) * 100) : 0;

  return {
    fallbackCount,
    aiCount,
    fallbackRatePct,
    recent: (recentRes.data ?? []) as FallbackAttemptRow[],
  };
}

// ─── Panel 4: Reward ledger health ───────────────────────────────────────────

export interface LedgerEntryRow {
  id: string;
  child_profile_id: string; // UUID only
  amount: number;
  reason: string;
  source_type: string;
  created_at: string;
}

export interface RewardLedgerPanel {
  ledgerEntryCount: number;
  xpEventCount: number;
  badgesAwardedCount: number;
  recent: LedgerEntryRow[];
}

/**
 * Health = is the reward pipeline writing rows? Counts across the three
 * append-only reward tables + a bounded recent ledger feed. Aggregates only —
 * amount/reason/source_type are not PII; no per-child identity is exposed.
 */
export async function fetchRewardLedgerHealth(
  client: SupabaseClient
): Promise<RewardLedgerPanel> {
  const [ledgerRes, xpRes, badgesRes, recentRes] = await Promise.all([
    client.from("moolah_ledger").select("id", { count: "exact", head: true }),
    client.from("xp_events").select("id", { count: "exact", head: true }),
    client.from("child_badges").select("id", { count: "exact", head: true }),
    client
      .from("moolah_ledger")
      .select("id, child_profile_id, amount, reason, source_type, created_at")
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (ledgerRes.error || xpRes.error || badgesRes.error || recentRes.error) {
    console.error(
      "[MissionControl] fetchRewardLedgerHealth failed:",
      ledgerRes.error?.message ??
        xpRes.error?.message ??
        badgesRes.error?.message ??
        recentRes.error?.message
    );
  }

  return {
    ledgerEntryCount: ledgerRes.count ?? 0,
    xpEventCount: xpRes.count ?? 0,
    badgesAwardedCount: badgesRes.count ?? 0,
    recent: (recentRes.data ?? []) as LedgerEntryRow[],
  };
}

// ─── Panel 5: Evidence / report creation ─────────────────────────────────────

export interface ReportRow {
  id: string;
  child_profile_id: string; // UUID only
  report_type: string;
  generated_at: string;
}

export interface EvidenceReportingPanel {
  evidenceEventCount: number;
  masteryRecordCount: number;
  /** parent_reports of type 'unified-first-learning-map' = First Learning Maps. */
  firstLearningMapCount: number;
  reportCount: number;
  recentReports: ReportRow[];
}

/**
 * Proof-of-learning pipeline health: evidence events captured, mastery records
 * written, and parent reports (First Learning Maps) generated. content_json is
 * never read — only counts and de-identified report metadata.
 */
export async function fetchEvidenceReporting(
  client: SupabaseClient
): Promise<EvidenceReportingPanel> {
  const [evidenceRes, masteryRes, mapRes, reportRes, recentRes] =
    await Promise.all([
      client
        .from("learning_evidence_events")
        .select("id", { count: "exact", head: true }),
      client
        .from("mastery_records")
        .select("id", { count: "exact", head: true }),
      client
        .from("parent_reports")
        .select("id", { count: "exact", head: true })
        .eq("report_type", "unified-first-learning-map"),
      client.from("parent_reports").select("id", { count: "exact", head: true }),
      client
        .from("parent_reports")
        .select("id, child_profile_id, report_type, generated_at")
        .order("generated_at", { ascending: false })
        .limit(RECENT_LIMIT),
    ]);

  if (
    evidenceRes.error ||
    masteryRes.error ||
    mapRes.error ||
    reportRes.error ||
    recentRes.error
  ) {
    console.error(
      "[MissionControl] fetchEvidenceReporting failed:",
      evidenceRes.error?.message ??
        masteryRes.error?.message ??
        mapRes.error?.message ??
        reportRes.error?.message ??
        recentRes.error?.message
    );
  }

  return {
    evidenceEventCount: evidenceRes.count ?? 0,
    masteryRecordCount: masteryRes.count ?? 0,
    firstLearningMapCount: mapRes.count ?? 0,
    reportCount: reportRes.count ?? 0,
    recentReports: (recentRes.data ?? []) as ReportRow[],
  };
}
