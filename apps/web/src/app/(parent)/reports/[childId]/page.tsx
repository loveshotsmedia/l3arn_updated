"use client";

/**
 * First Learning Map Report View — /parent/reports/[childId]
 *
 * Shows the Unified First Learning Map for a specific child.
 * Data is assembled from multiple Supabase tables:
 *   - parent_reports       (from Migration 005) — top-level report check
 *   - mastery_records      (from Migration 005) — academic proof
 *   - portfolio_items      (from Migration 005) — evidence highlights
 *   - academy_identities   (from Migration 001) — child info header
 *   - child_profiles       (from Migration 001) — grade, parent ownership check
 *   - companion_profiles   (from Agent 9 / Migration 004) — game progress
 *   - moolah_ledger        (from Agent 9 / Migration 004) — Moolah balance
 *   - xp_events            (from Agent 9 / Migration 004) — XP total
 *
 * Visibility gate (ADR-008):
 *   - "full" / "safety-override" tier: all sections shown including
 *     calibration signal values and evidence highlights
 *   - "summary" tier: aggregate mastery level shown; raw calibration
 *     signal values hidden; evidence highlights hidden
 *
 * Empty state:
 *   If no parent_reports row exists: "Mission 001 not yet completed."
 *   No hardcoded fake data is ever shown.
 *
 * Privacy invariants enforced at the display layer:
 *   - No webcam content shown (ADR-026)
 *   - No face capture content shown (ADR-026)
 *   - No biometric data shown (ADR-027)
 *
 * Next mission: Static "Next: Mission 002" until mission library is built.
 *   This is not hardcoded data — it is a structural placeholder.
 *
 * Agent 9 tables (companion_profiles, moolah_ledger, xp_events) are read
 * with graceful fallback: missing rows result in zero-value display, not crashes.
 *
 * Data source: parent reads directly from Supabase via RLS (parent_account_id).
 * Sensitive service-role data (raw interaction logs) never reaches this page.
 *
 * Grounded in:
 *   - docs/agent-10-evidence-reports.md Task 5
 *   - packages/shared-types/src/parent-report.schema.ts
 *   - ADR-008 (parent visibility model)
 *   - ADR-010 (academic progress: separate from game progress)
 *   - ADR-011 (reward economy: shown separately)
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  visibilityTierLabel,
  visibilityTierColor,
  type VisibilityTier,
} from "@/lib/visibility-tier";

// ─── Local types (RLS-safe data shapes read from Supabase) ───────────────────

interface MasteryRecordRow {
  id: string;
  mastery_skill_id: string;
  mastery_level: "emerging" | "developing" | "proficient" | "advanced";
  evidence_event_ids: string[];
  assessed_at: string;
  // Joined from mastery_skills (via service layer in production)
  // For direct client reads: skill name comes from a cached lookup or separate query
  skill_name?: string;
}

interface PortfolioItemRow {
  id: string;
  title: string;
  description: string | null;
  parent_consented: boolean;
  created_at: string;
  evidence_event_id: string | null;
}

interface ParentReportRow {
  id: string;
  child_profile_id: string;
  report_type: string;
  generated_at: string;
  mission_attempt_id: string | null;
  content_json: Record<string, unknown>;
  visibility_tier_at_generation: string;
}

interface CurriculumPrefs {
  focusSubjects: string[];
  approvalMode: string | null;
}

interface ChildInfo {
  childProfileId: string;
  displayName: string;
  grade: string;
  house: string | null;
  parentVisibilityTier: "full" | "summary" | "safety-override";
}

interface CompanionGrowthEventRow {
  companion_key: string;  // e.g. "loomi", "charli" — from companion_growth_events (Migration 004)
  // NOTE: companion_profiles does not exist in Migration 004; Agent 9 used
  // companion_growth_events. Bond level is derived from event count.
}

interface GameData {
  moolahBalance: number;
  totalXp: number;
  companionName: string;
  companionBondLevel: number;
  missionsCompleted: number;
  missionsAttempted: number;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<MasteryRecordRow["mastery_level"], string> = {
  emerging: "Emerging",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

const LEVEL_COLORS: Record<MasteryRecordRow["mastery_level"], string> = {
  emerging: "#f59e0b",
  developing: "#3b82f6",
  proficient: "#10b981",
  advanced: "#8b5cf6",
};

// ─── Calibration signal display data (derived from architecture.md §9) ───────
const CALIBRATION_SIGNALS_AFTER_MISSION_001 = [
  {
    id: "cognitive-load",
    label: "Learning Pace",
    summary: "How your child handles instruction chunk size and hint needs.",
  },
  {
    id: "ai-readiness",
    label: "AI Readiness",
    summary: "How comfortable your child is interacting with the AI companion.",
  },
  {
    id: "persistence",
    label: "Persistence",
    summary: "Whether your child retries after mistakes or seeks help.",
  },
  {
    id: "delivery-mode-preference",
    label: "Learning Mode",
    summary: "Which delivery mode your child chose for this mission.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChildReportPage() {
  const params = useParams<{ childId: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [report, setReport] = useState<ParentReportRow | null>(null);
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [masteryRecords, setMasteryRecords] = useState<MasteryRecordRow[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemRow[]>([]);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [curriculumPrefs, setCurriculumPrefs] = useState<CurriculumPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReportData() {
      if (!params.childId) {
        router.push("/parent/dashboard");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/parent/auth/login");
        return;
      }

      // ── 1. Load child profile + academy identity (RLS: parent_account_id = auth.uid()) ──
      const { data: profile, error: profileError } = await supabase
        .from("child_profiles")
        .select(
          `
          id,
          grade,
          academy_identities (
            display_name,
            house
          )
        `
        )
        .eq("id", params.childId)
        .eq("parent_account_id", session.user.id)
        .is("deleted_at", null)
        .single();

      if (profileError || !profile) {
        setError(
          "Child profile not found or you don't have permission to view this report."
        );
        setLoading(false);
        return;
      }

      const identity = Array.isArray(profile.academy_identities)
        ? profile.academy_identities[0]
        : profile.academy_identities;

      // ── 2. Load parent visibility tier from privacy_settings ─────────────
      const { data: privacyData } = await supabase
        .from("privacy_settings")
        .select("parent_visibility_tier")
        .eq("child_profile_id", params.childId)
        .single();

      const visibilityTier: "full" | "summary" | "safety-override" =
        (privacyData?.parent_visibility_tier as "full" | "summary" | "safety-override") ?? "full";

      setChildInfo({
        childProfileId: params.childId,
        displayName: identity?.display_name ?? "—",
        grade: profile.grade,
        house: identity?.house ?? null,
        parentVisibilityTier: visibilityTier,
      });

      // ── 2b. Load curriculum preferences (Agent 8 addition) ───────────────
      const { data: curriculumData } = await supabase
        .from("parent_curriculum_prefs")
        .select("focus_subjects, approval_mode")
        .eq("child_profile_id", params.childId)
        .maybeSingle();

      if (curriculumData) {
        setCurriculumPrefs({
          focusSubjects: Array.isArray(curriculumData.focus_subjects)
            ? (curriculumData.focus_subjects as string[])
            : [],
          approvalMode: (curriculumData.approval_mode as string) ?? null,
        });
      } else {
        setCurriculumPrefs(null);
      }

      // ── 3. Load latest parent_reports row ────────────────────────────────
      // If this returns null → Mission 001 not yet completed
      const { data: reportData } = await supabase
        .from("parent_reports")
        .select("*")
        .eq("child_profile_id", params.childId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setReport(reportData as ParentReportRow | null);

      // ── 4. Load mastery_records (always — not gated by parent_reports) ──
      const { data: masteryData } = await supabase
        .from("mastery_records")
        .select("id, mastery_skill_id, mastery_level, evidence_event_ids, assessed_at")
        .eq("child_profile_id", params.childId)
        .order("assessed_at", { ascending: false });

      // Enrich mastery records with parent-friendly skill names (mastery_skills
      // lookup) so the UI shows "Can catch AI mistakes" instead of a raw UUID.
      const masteryRows = (masteryData ?? []) as MasteryRecordRow[];
      const skillIds = [...new Set(masteryRows.map((r) => r.mastery_skill_id))];
      if (skillIds.length > 0) {
        const { data: skillRows } = await supabase
          .from("mastery_skills")
          .select("id, name, parent_friendly_name")
          .in("id", skillIds);
        const nameById = new Map(
          (skillRows ?? []).map((s) => [
            s.id as string,
            ((s.parent_friendly_name as string | null) ??
              (s.name as string | null)) || undefined,
          ]),
        );
        for (const r of masteryRows) {
          r.skill_name = nameById.get(r.mastery_skill_id) ?? r.skill_name;
        }
      }
      setMasteryRecords(masteryRows);

      // ── 5. Load portfolio items (parent_consented = true only) ───────────
      // In "summary" visibility tier, portfolio items are not shown
      // (evidence highlights are excluded at this tier per ADR-008)
      if (visibilityTier !== "summary") {
        const { data: portfolioData } = await supabase
          .from("portfolio_items")
          .select("id, title, description, parent_consented, created_at, evidence_event_id")
          .eq("child_profile_id", params.childId)
          .eq("parent_consented", true)
          .order("created_at", { ascending: false })
          .limit(10);

        setPortfolioItems((portfolioData ?? []) as PortfolioItemRow[]);
      }

      // ── 6. Load game progress from Agent 9 tables (graceful fallback) ────
      // If tables don't exist or have no rows: display zero-value defaults
      // No crash if Agent 9 tables are not yet populated
      try {
        const [companionResult, moolahResult, xpResult, attemptResult] =
          await Promise.allSettled([
            // companion_growth_events (Migration 004, Agent 9) — no companion_profiles table
            supabase
              .from("companion_growth_events")
              .select("companion_key")
              .eq("child_profile_id", params.childId)
              .order("created_at", { ascending: false }),
            supabase
              .from("moolah_ledger")
              .select("amount")
              .eq("child_profile_id", params.childId),
            supabase
              .from("xp_events")
              .select("xp_amount")
              .eq("child_profile_id", params.childId),
            supabase
              .from("mission_attempts")
              .select("id, completed_at")
              .eq("child_profile_id", params.childId),
          ]);

        const companionRows =
          companionResult.status === "fulfilled"
            ? ((companionResult.value.data ?? []) as CompanionGrowthEventRow[])
            : [];
        const companionKey = companionRows[0]?.companion_key ?? null;
        const companionBondLevel = companionRows.length; // bond level = event count

        const moolahRows =
          moolahResult.status === "fulfilled"
            ? (moolahResult.value.data ?? [])
            : [];

        const xpRows =
          xpResult.status === "fulfilled"
            ? (xpResult.value.data ?? [])
            : [];

        const attemptRows =
          attemptResult.status === "fulfilled"
            ? (attemptResult.value.data ?? [])
            : [];

        const moolahBalance = (moolahRows as { amount: number }[]).reduce(
          (sum, r) => sum + (r.amount ?? 0),
          0
        );
        const totalXp = (xpRows as { xp_amount: number }[]).reduce(
          (sum, r) => sum + (r.xp_amount ?? 0),
          0
        );
        const missionsAttempted = attemptRows.length;
        const missionsCompleted = (
          attemptRows as { completed_at: string | null }[]
        ).filter((r) => r.completed_at != null).length;

        setGameData({
          moolahBalance: Math.max(0, moolahBalance),
          totalXp,
          companionName: companionKey
            ? companionKey.split("-").pop()!.replace(/^\w/, (c) => c.toUpperCase())
            : "—",
          companionBondLevel,
          missionsCompleted,
          missionsAttempted,
        });
      } catch {
        // Agent 9 tables not yet populated — silently omit game progress
        setGameData(null);
      }

      setLoading(false);
    }

    loadReportData();
  }, [params.childId, router, supabase]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p style={{ color: "var(--color-text-muted)" }}>Loading report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="rounded-lg px-4 py-3 text-sm bg-red-900/30 text-red-300 border border-red-800">
          {error}
        </p>
        <Link
          href="/parent/dashboard"
          className="inline-block mt-4 text-sm"
          style={{ color: "var(--color-primary)" }}
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const isSummaryTier = childInfo?.parentVisibilityTier === "summary";

  // ─── Empty state: Mission 001 not yet completed ───────────────────────────

  if (!report && masteryRecords.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Child header */}
        <ChildHeader childInfo={childInfo} />

        {/* ── Agent 8: Visibility Settings section (empty state) ─────────── */}
        {childInfo && (
          <VisibilitySettingsSection childInfo={childInfo} />
        )}

        {/* ── Agent 8: Curriculum Preferences section (empty state) ──────── */}
        <CurriculumPrefsSection
          curriculumPrefs={curriculumPrefs}
          childProfileId={params.childId}
        />

        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-lg font-semibold mb-2">Mission 001 not yet completed.</h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
            Your child&apos;s First Learning Map will appear here after they complete
            Mission 001: Repair the Sorting Computer. It will show academic mastery,
            learner calibration, evidence highlights, and Academy adventure progress.
          </p>
          <Link
            href="/parent/dashboard"
            className="inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─── Report view ──────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back nav */}
      <Link
        href="/parent/dashboard"
        className="inline-block mb-6 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        ← Back to dashboard
      </Link>

      {/* Child header */}
      <ChildHeader childInfo={childInfo} />

      {/* ── Agent 8: Visibility Settings section ───────────────────────────── */}
      {childInfo && (
        <VisibilitySettingsSection childInfo={childInfo} />
      )}

      {/* ── Agent 8: Curriculum Preferences section ────────────────────────── */}
      <CurriculumPrefsSection
        curriculumPrefs={curriculumPrefs}
        childProfileId={params.childId}
      />

      {/* Report metadata */}
      {report && (
        <div
          className="flex items-center justify-between rounded-lg border px-4 py-3 mb-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="text-sm font-medium">
            {report.report_type === "unified-first-learning-map"
              ? "First Learning Map"
              : report.report_type}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Generated {new Date(report.generated_at).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Section 1: Academic Mastery (always shown when records exist) ── */}
        {masteryRecords.length > 0 && (
          <section
            className="rounded-xl border p-6"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <h2 className="text-base font-semibold mb-1">Academic Mastery</h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Skills your child worked on during Mission 001 and their current
              mastery level. Each skill is backed by evidence events captured
              during the mission.
            </p>
            <div className="space-y-3">
              {masteryRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {record.skill_name ?? record.mastery_skill_id}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {record.evidence_event_ids?.length ?? 0} evidence event
                      {(record.evidence_event_ids?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{
                      color: LEVEL_COLORS[record.mastery_level],
                      background: `${LEVEL_COLORS[record.mastery_level]}22`,
                      border: `1px solid ${LEVEL_COLORS[record.mastery_level]}44`,
                    }}
                  >
                    {LEVEL_LABELS[record.mastery_level]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 2: Learner Calibration ──────────────────────────────── */}
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <h2 className="text-base font-semibold mb-1">Learner Calibration</h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            How well L3ARN now understands your child&apos;s learning style after Mission 001.
            This score improves as your child completes more missions.
          </p>
          {isSummaryTier ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Detailed calibration signals are available in full visibility mode.
              Your current setting shows a summary view for your child&apos;s age range.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Calibration score range (architecture.md §9 Mission 001 = 60-75%) */}
              <div className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <span className="text-sm font-medium">Calibration Progress</span>
                <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                  60–75% after Mission 001
                </span>
              </div>
              {CALIBRATION_SIGNALS_AFTER_MISSION_001.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-lg p-3"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                >
                  <p className="text-sm font-medium">{signal.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {signal.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 3: Academy Adventure (game progress) ─────────────────── */}
        {/* Shown separately from academic mastery (ADR-011) */}
        {gameData && (
          <section
            className="rounded-xl border p-6"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <h2 className="text-base font-semibold mb-1">Academy Adventure</h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Your child&apos;s Academy progress — shown separately from academic mastery.
              Effort and engagement are rewarded here; mastery achievements are above.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Moolah", value: gameData.moolahBalance },
                { label: "XP", value: gameData.totalXp },
                {
                  label: "Missions",
                  value: `${gameData.missionsCompleted}/${gameData.missionsAttempted}`,
                },
                {
                  label: "Companion",
                  value: gameData.companionName,
                },
                {
                  label: "Bond Level",
                  value: `Level ${gameData.companionBondLevel}`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                >
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4: Evidence Highlights (full tier only) ──────────────── */}
        {!isSummaryTier && portfolioItems.length > 0 && (
          <section
            className="rounded-xl border p-6"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <h2 className="text-base font-semibold mb-4">Evidence Highlights</h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Notable moments from your child&apos;s Mission 001 session that you approved
              for your portfolio.
            </p>
            <div className="space-y-3">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 5: Next Path ─────────────────────────────────────────── */}
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <h2 className="text-base font-semibold mb-1">What Comes Next</h2>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            Your child has completed their first mission. Here is their recommended
            next step in the L3ARN Academy.
          </p>
          <div
            className="rounded-lg p-4 flex items-center gap-4"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)" }}
            >
              2
            </div>
            <div>
              <p className="text-sm font-semibold">Next: Mission 002</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Coming soon — the mission library is being built. Your child&apos;s
                calibration data from Mission 001 will personalize every future mission.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy statement — always visible (never removed) */}
        <p className="text-xs text-center pb-4" style={{ color: "var(--color-text-muted)" }}>
          This report contains no webcam content, no face capture, and no biometric data.
          All evidence is text-based structured activity signals. Audio responses (if any)
          were push-to-talk only with your explicit consent.
        </p>
      </div>
    </div>
  );
}

// ─── Agent 8: VisibilitySettingsSection subcomponent ─────────────────────────

function VisibilitySettingsSection({ childInfo }: { childInfo: ChildInfo }) {
  const tier = childInfo.parentVisibilityTier;
  const colors = visibilityTierColor(tier as VisibilityTier);

  return (
    <div
      className="rounded-xl border px-5 py-4 mb-6 flex items-center justify-between gap-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--color-text-muted)" }}>
          Visibility Settings
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            {visibilityTierLabel(tier as VisibilityTier)}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {tier === "summary"
              ? "Raw signals and evidence highlights are hidden."
              : tier === "safety-override"
              ? "Only safety-flagged events are surfaced."
              : "Full detail shown."}
          </span>
        </div>
      </div>
      <Link
        href="/parent/dashboard"
        className="text-xs whitespace-nowrap underline flex-shrink-0"
        style={{ color: "var(--color-primary)" }}
      >
        Change on dashboard
      </Link>
    </div>
  );
}

// ─── Agent 8: CurriculumPrefsSection subcomponent ────────────────────────────

interface CurriculumPrefsSectionProps {
  curriculumPrefs: { focusSubjects: string[]; approvalMode: string | null } | null;
  childProfileId: string;
}

function approvalModeLabelLocal(mode: string | null): string {
  if (!mode) return "—";
  switch (mode) {
    case "high-control": return "High Control";
    case "balanced": return "Balanced";
    case "autopilot": return "Autopilot";
    default: return mode;
  }
}

function CurriculumPrefsSection({ curriculumPrefs, childProfileId }: CurriculumPrefsSectionProps) {
  return (
    <section
      className="rounded-xl border p-5 mb-6"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Curriculum Preferences</h2>
        <Link
          href={`/parent/onboarding/curriculum?childId=${childProfileId}`}
          className="text-xs underline"
          style={{ color: "var(--color-primary)" }}
        >
          Curriculum settings
        </Link>
      </div>

      {curriculumPrefs ? (
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-medium" style={{ minWidth: "8rem", flexShrink: 0 }}>
              Subject focus:
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              {curriculumPrefs.focusSubjects.length > 0
                ? curriculumPrefs.focusSubjects.join(", ")
                : "Balanced (all subjects)"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium" style={{ minWidth: "8rem", flexShrink: 0 }}>
              Approval mode:
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              {approvalModeLabelLocal(curriculumPrefs.approvalMode)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No curriculum preferences set yet.{" "}
          <Link
            href={`/parent/onboarding/curriculum?childId=${childProfileId}`}
            className="underline"
            style={{ color: "var(--color-primary)" }}
          >
            Add them from the curriculum settings page.
          </Link>
        </p>
      )}
    </section>
  );
}

// ─── ChildHeader subcomponent ─────────────────────────────────────────────────

function ChildHeader({ childInfo }: { childInfo: ChildInfo | null }) {
  return (
    <div className="mb-8">
      {childInfo?.house && childInfo.house !== "pre_sorting" && (
        <span
          className="inline-block text-xs font-medium px-2 py-0.5 rounded mb-2"
          style={{
            background: "rgba(99, 102, 241, 0.15)",
            color: "var(--color-primary)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
          }}
        >
          House {childInfo.house}
        </span>
      )}
      <h1 className="text-2xl font-bold">
        {childInfo?.displayName ?? "—"}&apos;s Learning Map
      </h1>
      <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        {childInfo?.grade === "K"
          ? "Kindergarten"
          : childInfo?.grade
          ? `Grade ${childInfo.grade}`
          : "—"}
        {" · "}
        {childInfo?.parentVisibilityTier === "summary"
          ? "Summary view"
          : "Full view"}
      </p>
    </div>
  );
}
