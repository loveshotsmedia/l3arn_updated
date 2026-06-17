"use client";

/**
 * First Learning Map Report View — /parent/reports/[childId]
 *
 * Shows the parent-facing report for a specific child, using ParentReportSchema
 * structure from parent-report.schema.ts.
 *
 * Report sections (when data is available):
 *   - Learner Calibration Score (with confidence level)
 *   - Mastery Progress (per-skill summary, separate from game progress per ADR-011)
 *   - Evidence Highlights (parent-consented moments)
 *   - Game Progress Summary (house, companion, Moolah, XP — shown separately)
 *   - Next Mission Recommendation
 *
 * Empty state: "No sessions yet" when no reports exist for this child.
 *
 * Privacy invariants enforced by display logic:
 *   - noWebcamContent: true — no webcam/biometric content is ever shown
 *   - noFaceCaptureContent: true — no face capture content shown
 *   - These are enforced at the data layer (ParentReportSchema z.literal(true))
 *     and also at the UI layer by simply not rendering any webcam/face UI.
 *
 * Data source: parent_reports table via Railway API (service-role).
 * In Phase 0, this is a placeholder — reports are created after Mission 001.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ParentReport shape from parent-report.schema.ts (simplified for Phase 0 rendering)
interface MasteryProgressItem {
  skillName: string;
  masteryDomainId: string;
  currentLevel: "not-started" | "emerging" | "developing" | "proficient" | "advanced";
  evidenceCount: number;
  lastActivityAt?: string;
}

interface EvidenceHighlight {
  id: string;
  type: string;
  description: string;
}

interface GameProgress {
  house: string;
  companionName: string;
  companionBondLevel: number;
  moolahBalance: number;
  totalXp: number;
  badgesEarned: string[];
  missionsCompleted: number;
  missionsAttempted: number;
  academyUnlocksContributed: number;
}

interface CalibrationScore {
  score: number;
  stage: string;
  confidence: number;
  signalsContributing: string[];
  computedAt: string;
}

interface ParentReport {
  id: string;
  childProfileId: string;
  reportType: string;
  generatedAt: string;
  masteryProgress: MasteryProgressItem[];
  calibrationScore?: CalibrationScore;
  evidenceHighlights: EvidenceHighlight[];
  gameProgress?: GameProgress;
  // Privacy invariants — always true per ParentReportSchema
  noWebcamContent: true;
  noFaceCaptureContent: true;
}

interface ChildInfo {
  displayName: string;
  grade: string;
  house: string | null;
}

const LEVEL_LABELS: Record<MasteryProgressItem["currentLevel"], string> = {
  "not-started": "Not started",
  emerging: "Emerging",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

const LEVEL_COLORS: Record<MasteryProgressItem["currentLevel"], string> = {
  "not-started": "#64748b",
  emerging: "#f59e0b",
  developing: "#3b82f6",
  proficient: "#10b981",
  advanced: "#8b5cf6",
};

export default function ChildReportPage() {
  const params = useParams<{ childId: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [report, setReport] = useState<ParentReport | null>(null);
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
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

      // Verify the parent owns this child profile (RLS enforces this at DB level too)
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
        setError("Child profile not found or you don't have permission to view this report.");
        setLoading(false);
        return;
      }

      const identity = Array.isArray(profile.academy_identities)
        ? profile.academy_identities[0]
        : profile.academy_identities;

      setChildInfo({
        displayName: identity?.display_name ?? "—",
        grade: profile.grade,
        house: identity?.house ?? null,
      });

      // Fetch latest parent report from parent_reports table.
      // In Phase 0: table may not have data yet.
      // Reports are created after Mission 001 completion.
      const { data: reportData } = await supabase
        .from("parent_reports")
        .select("*")
        .eq("child_profile_id", params.childId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      // reportData may be null (no sessions yet) — that's expected in Phase 0
      setReport(reportData as ParentReport | null);
      setLoading(false);
    }

    loadReport();
  }, [params.childId, router, supabase]);

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
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Child header */}
      <div className="mb-8">
        {childInfo?.house && (
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
          {childInfo?.displayName ?? "—"}'s Learning Map
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {childInfo?.grade === "K" ? "Kindergarten" : `Grade ${childInfo?.grade ?? "—"}`}
        </p>
      </div>

      {/* No sessions yet — empty state */}
      {!report ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-lg font-semibold mb-2">No sessions yet</h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
            Your child's First Learning Map will appear here after their first session.
            It will show mastery progress, calibration score, evidence highlights, and
            game world progress — separately, so you can see both the academic and the
            adventure sides of their learning.
          </p>
          <Link
            href="/parent/dashboard"
            className="inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report type + generated at */}
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <span className="text-sm font-medium">
              {report.reportType === "unified-first-learning-map"
                ? "First Learning Map"
                : report.reportType}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Generated {new Date(report.generatedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Calibration Score */}
          {report.calibrationScore && (
            <section
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <h2 className="text-base font-semibold mb-1">Learner Calibration</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                How well L3ARN currently understands your child's learning style.
                This improves over time.
              </p>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-3xl font-bold">{report.calibrationScore.score}%</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {report.calibrationScore.stage}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                    <span>Confidence</span>
                    <span>{Math.round(report.calibrationScore.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "var(--color-bg)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${report.calibrationScore.confidence * 100}%`,
                        background: "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              </div>
              {report.calibrationScore.signalsContributing.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {report.calibrationScore.signalsContributing.map((signal) => (
                    <span
                      key={signal}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "var(--color-bg)",
                        color: "var(--color-text-muted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Mastery Progress — separate from game progress (ADR-011) */}
          {report.masteryProgress.length > 0 && (
            <section
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <h2 className="text-base font-semibold mb-1">Academic Mastery</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Skills your child has worked on and their current mastery level.
              </p>
              <div className="space-y-3">
                {report.masteryProgress.map((item) => (
                  <div
                    key={item.skillName}
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium">{item.skillName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {item.evidenceCount} evidence event{item.evidenceCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{
                        color: LEVEL_COLORS[item.currentLevel],
                        background: `${LEVEL_COLORS[item.currentLevel]}22`,
                        border: `1px solid ${LEVEL_COLORS[item.currentLevel]}44`,
                      }}
                    >
                      {LEVEL_LABELS[item.currentLevel]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Game Progress — always separate from mastery (ADR-011) */}
          {report.gameProgress && (
            <section
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <h2 className="text-base font-semibold mb-1">Academy Adventure</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Your child's progress in the L3ARN 3D Academy world. Shown separately
                from academic mastery — game progress reflects engagement and effort,
                not academic achievement alone.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Moolah", value: report.gameProgress.moolahBalance },
                  { label: "XP", value: report.gameProgress.totalXp },
                  {
                    label: "Missions",
                    value: `${report.gameProgress.missionsCompleted}/${report.gameProgress.missionsAttempted}`,
                  },
                  {
                    label: "Companion Bond",
                    value: `Level ${report.gameProgress.companionBondLevel}`,
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

          {/* Evidence Highlights */}
          {report.evidenceHighlights.length > 0 && (
            <section
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <h2 className="text-base font-semibold mb-4">Evidence Highlights</h2>
              <div className="space-y-3">
                {report.evidenceHighlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="rounded-lg p-3"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {highlight.type}
                    </span>
                    <p className="text-sm mt-2">{highlight.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Privacy statement — always visible at the bottom of every report */}
          <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
            This report contains no webcam content, no face capture, and no biometric data.
            All evidence is text-based structured activity signals.
          </p>
        </div>
      )}
    </div>
  );
}
