"use client";

/**
 * Parent Dashboard
 *
 * Shows:
 *   - Child profile cards with "Start Session" and "View Reports" actions
 *   - Quick household overview
 *
 * "Start Session" is a placeholder — in Phase 1 this will call the Railway API
 * to create a child_sessions row and issue a session token for the child app.
 * Per ADR-031: sessions are created by the backend (service_role), not the client.
 *
 * "View Reports" routes to /parent/reports/[childId].
 *
 * Parent authentication is checked on mount — unauthenticated users are
 * redirected to login.
 *
 * Data fetched:
 *   - child_profiles joined with academy_identities (parent household)
 *   - moolah_wallets (Agent 9 — rewards balance; graceful fallback)
 *   - child_badges (Agent 9 — most recent badge; graceful fallback)
 *   - privacy_settings (Agent 8 — parent_visibility_tier)
 *   - parent_curriculum_prefs (Agent 8 — focus_subjects, approval_mode)
 *
 * RLS ensures parent sees only their own children's data.
 *
 * Visibility tier display (ADR-008, OQ-C resolution 2026-06-17):
 *   - Read from privacy_settings.parent_visibility_tier
 *   - If NULL (legacy row), derive display with resolveDefaultVisibilityTier — never store derived value
 *   - Parent override panel enforces stricter-only direction:
 *     full → summary or safety-override; summary → safety-override only
 *
 * Agent 9 additions: moolahBalance, mostRecentBadgeName (preserved below)
 * Agent 8 additions: visibilityTier, curriculumPrefs, settings panel
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { StartSessionResponse } from "@l3arn/shared-types";
import {
  resolveDefaultVisibilityTier,
  getAvailableVisibilityTiers,
  visibilityTierLabel,
  visibilityTierColor,
  type VisibilityTier,
} from "@/lib/visibility-tier";

interface CurriculumPrefs {
  focusSubjects: string[];
  approvalMode: string | null;
}

interface ChildCard {
  id: string;
  legalFirstName: string;
  grade: string;
  displayName: string;
  house: string | null;
  onboardingComplete: boolean;
  /** null = wallet row does not exist yet (migration 004 not applied or no rewards) */
  moolahBalance: number | null;
  /** null = no badges earned yet */
  mostRecentBadgeName: string | null;
  /** null = privacy_settings row does not exist yet */
  visibilityTier: VisibilityTier | null;
  /** null = parent_curriculum_prefs row does not exist yet */
  curriculumPrefs: CurriculumPrefs | null;
}

// ─── Visibility tier badge ────────────────────────────────────────────────────

function VisibilityTierBadge({ tier }: { tier: VisibilityTier }) {
  const colors = visibilityTierColor(tier);
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {visibilityTierLabel(tier)}
    </span>
  );
}

// ─── Visibility tier override panel ──────────────────────────────────────────

interface SettingsPanelProps {
  child: ChildCard;
  onClose: () => void;
  onSaved: (newTier: VisibilityTier) => void;
}

function ChildSettingsPanel({ child, onClose, onSaved }: SettingsPanelProps) {
  const supabase = getSupabaseBrowserClient();

  // Derive the effective current tier (handle NULL from legacy rows)
  const effectiveTier: VisibilityTier =
    child.visibilityTier ?? resolveDefaultVisibilityTier(child.grade, false);

  const [selectedTier, setSelectedTier] = useState<VisibilityTier>(effectiveTier);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Available options — only allow stricter choices than the grade default
  const availableOptions = getAvailableVisibilityTiers(child.grade);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    // Safety check: never allow looser than grade default from frontend
    const gradeDefault = resolveDefaultVisibilityTier(child.grade, false);
    if (gradeDefault === "summary" && selectedTier === "full") {
      setSaveError("Cannot set Full View for a Grade 6–8 child. Only Summary or Safety Override are permitted.");
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaveError("Session expired. Please refresh and try again.");
      setSaving(false);
      return;
    }

    // Write to privacy_settings.parent_visibility_tier via RLS
    // Parent owns the row (auth_owns_child check in RLS policy)
    const { error } = await supabase
      .from("privacy_settings")
      .update({ parent_visibility_tier: selectedTier })
      .eq("child_profile_id", child.id);

    if (error) {
      setSaveError("Could not save visibility setting. Please try again.");
      setSaving(false);
      return;
    }

    // Optimistic UI — update local state without full page reload
    onSaved(selectedTier);
    onClose();
  }

  return (
    <div
      className="mt-4 rounded-lg border p-4"
      style={{
        background: "var(--color-bg)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Visibility Settings</h3>
        <button
          onClick={onClose}
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Close settings"
        >
          Close
        </button>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        Control how much detail you see in {child.displayName}&apos;s reports.
        You can only move to a more private setting — not back to a less private one
        (unless a backend admin resets it).
      </p>

      <div className="space-y-2 mb-4">
        {availableOptions.map((tier) => {
          const colors = visibilityTierColor(tier);
          return (
            <label
              key={tier}
              className="flex items-start gap-3 rounded-lg p-3 cursor-pointer border transition-colors"
              style={{
                borderColor: selectedTier === tier ? colors.border : "var(--color-border)",
                background: selectedTier === tier ? colors.bg : "var(--color-surface)",
              }}
            >
              <input
                type="radio"
                name={`visibility-tier-${child.id}`}
                value={tier}
                checked={selectedTier === tier}
                onChange={() => setSelectedTier(tier)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {visibilityTierLabel(tier)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {tier === "full" && "See all session detail, evidence highlights, and calibration signals."}
                  {tier === "summary" && "See aggregate mastery levels only. Raw signals and evidence highlights are hidden."}
                  {tier === "safety-override" && "Strictest setting. Only safety-flagged events are surfaced. Use for maximum privacy."}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {saveError && (
        <p className="text-xs rounded px-3 py-2 mb-3 bg-red-900/30 text-red-300 border border-red-800">
          {saveError}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || selectedTier === effectiveTier}
        className="w-full text-sm py-2 rounded-lg font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ background: "var(--color-primary)" }}
      >
        {saving ? "Saving…" : "Save visibility setting"}
      </button>
    </div>
  );
}

// ─── Approval mode display label ──────────────────────────────────────────────

function approvalModeLabel(mode: string | null): string {
  if (!mode) return "—";
  switch (mode) {
    case "high-control":
      return "High Control";
    case "balanced":
      return "Balanced";
    case "autopilot":
      return "Autopilot";
    default:
      return mode;
  }
}

// ─── House display label ──────────────────────────────────────────────────────

function houseDisplayLabel(house: string): string {
  if (house === "pre_sorting") return "Awaiting Sorting";
  return `House ${house}`;
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [children, setChildren] = useState<ChildCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  /** Track which child's settings panel is open (child.id or null) */
  const [openSettingsChildId, setOpenSettingsChildId] = useState<string | null>(null);
  /** Track which child's session is being started (child.id or null = none in-flight) */
  const [sessionStartingChildId, setSessionStartingChildId] = useState<string | null>(null);
  /** Inline error per child card: childId → error message */
  const [sessionErrors, setSessionErrors] = useState<Record<string, string>>({});
  /** Session launched confirmation: childId → StartSessionResponse */
  const [sessionLaunched, setSessionLaunched] = useState<Record<string, StartSessionResponse>>({});

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/parent/auth/login");
        return;
      }

      setUserEmail(session.user.email ?? null);

      // Fetch child profiles + academy identities for this parent
      const { data: profiles, error: profileError } = await supabase
        .from("child_profiles")
        .select(
          `
          id,
          legal_first_name,
          grade,
          onboarding_complete,
          academy_identities (
            display_name,
            house
          )
        `
        )
        .eq("parent_account_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (profileError) {
        setError("Could not load your children's profiles.");
        setLoading(false);
        return;
      }

      // Build base child cards from profiles
      const baseCards = (profiles ?? []).map((p) => {
        // academy_identities is a 1:1 relationship; Supabase returns it as array
        const identity = Array.isArray(p.academy_identities)
          ? p.academy_identities[0]
          : p.academy_identities;

        return {
          id: p.id as string,
          legalFirstName: p.legal_first_name as string,
          grade: p.grade as string,
          displayName: (identity?.display_name as string | undefined) ?? "—",
          house: (identity?.house as string | undefined) ?? null,
          onboardingComplete: p.onboarding_complete as boolean,
        };
      });

      // Fetch Moolah wallets for all children in this household.
      // Gated: if the moolah_wallets table doesn't exist yet (migration 004 not
      // applied), the query will error — we silently swallow it and show
      // "No rewards yet" on all cards.
      const childIds = baseCards.map((c) => c.id);
      let walletMap: Record<string, number> = {};
      let badgeMap: Record<string, string> = {};

      if (childIds.length > 0) {
        // Moolah wallets — one row per child
        const { data: wallets } = await supabase
          .from("moolah_wallets")
          .select("child_profile_id, balance")
          .in("child_profile_id", childIds);

        if (wallets) {
          for (const w of wallets) {
            walletMap[w.child_profile_id as string] = w.balance as number;
          }
        }

        // Most recent badge per child — join child_badges to badges for the name
        const { data: recentBadges } = await supabase
          .from("child_badges")
          .select("child_profile_id, awarded_at, badges(name)")
          .in("child_profile_id", childIds)
          .order("awarded_at", { ascending: false });

        if (recentBadges) {
          // Group by child_profile_id and take the first (most recent) entry
          for (const row of recentBadges) {
            const childId = row.child_profile_id as string;
            if (!badgeMap[childId]) {
              const badgeName =
                Array.isArray(row.badges)
                  ? (row.badges[0]?.name as string | undefined)
                  : (row.badges as { name: string } | null)?.name;
              if (badgeName) {
                badgeMap[childId] = badgeName;
              }
            }
          }
        }
      }

      // Fetch privacy_settings (visibility tier) — graceful fallback if row missing
      let privacyMap: Record<string, VisibilityTier> = {};
      if (childIds.length > 0) {
        const { data: privacyRows } = await supabase
          .from("privacy_settings")
          .select("child_profile_id, parent_visibility_tier")
          .in("child_profile_id", childIds);

        if (privacyRows) {
          for (const row of privacyRows) {
            privacyMap[row.child_profile_id as string] =
              row.parent_visibility_tier as VisibilityTier;
          }
        }
      }

      // Fetch parent_curriculum_prefs — graceful fallback if row missing
      let curriculumMap: Record<string, CurriculumPrefs> = {};
      if (childIds.length > 0) {
        const { data: curriculumRows } = await supabase
          .from("parent_curriculum_prefs")
          .select("child_profile_id, focus_subjects, approval_mode")
          .in("child_profile_id", childIds);

        if (curriculumRows) {
          for (const row of curriculumRows) {
            const subjects = Array.isArray(row.focus_subjects)
              ? (row.focus_subjects as string[])
              : [];
            curriculumMap[row.child_profile_id as string] = {
              focusSubjects: subjects,
              approvalMode: (row.approval_mode as string) ?? null,
            };
          }
        }
      }

      // Merge all data into child cards
      const cards: ChildCard[] = baseCards.map((c) => ({
        ...c,
        moolahBalance: walletMap[c.id] !== undefined ? walletMap[c.id] : null,
        mostRecentBadgeName: badgeMap[c.id] ?? null,
        visibilityTier: privacyMap[c.id] ?? null,
        curriculumPrefs: curriculumMap[c.id] ?? null,
      }));

      setChildren(cards);
      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/parent/auth/login");
  }

  /**
   * Start a child session via the Railway API (OQ-A8-001).
   *
   * Calls POST /api/sessions/start with the child's profile ID.
   * On success: shows an inline confirmation so the parent can hand the device
   *   to the child, or redirects to /parent/session-launched?childId=<uuid>.
   * On error: shows inline error — never crashes the page.
   * On loading: shows "Starting…" state on the button.
   *
   * If NEXT_PUBLIC_RAILWAY_API_URL is not configured, the button is disabled
   * with a tooltip explaining the requirement.
   */
  async function handleStartSession(childId: string) {
    const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL;

    // Guard: Railway URL required for session launch
    if (!railwayUrl) {
      setSessionErrors((prev) => ({
        ...prev,
        [childId]: "Session launch requires Railway API configuration (NEXT_PUBLIC_RAILWAY_API_URL).",
      }));
      return;
    }

    setSessionStartingChildId(childId);
    setSessionErrors((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });
    setSessionLaunched((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });

    try {
      // Get parent auth session for the X-Parent-Id header (Phase 0 auth)
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authSession?.user?.id) {
        headers["X-Parent-Id"] = authSession.user.id;
      }

      const response = await fetch(`${railwayUrl}/api/sessions/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          childProfileId: childId,
          launchMode: "parent_launched",
        }),
      });

      if (!response.ok) {
        let message = "Could not start the session. Please try again.";
        try {
          const body = (await response.json()) as { message?: string; error?: string };
          if (body.message) message = body.message;
          else if (body.error) message = body.error;
        } catch {
          // ignore JSON parse error — use default message
        }
        setSessionErrors((prev) => ({ ...prev, [childId]: message }));
        return;
      }

      const sessionData = (await response.json()) as StartSessionResponse;
      setSessionLaunched((prev) => ({ ...prev, [childId]: sessionData }));

      // Redirect to confirmation page — hand device to child
      router.push(`/parent/session-launched?childId=${childId}`);
    } catch (err) {
      console.error("[dashboard] Session start failed:", err);
      setSessionErrors((prev) => ({
        ...prev,
        [childId]: "Network error starting session. Check your connection and try again.",
      }));
    } finally {
      setSessionStartingChildId(null);
    }
  }

  /** Optimistic update when parent saves a new visibility tier */
  function handleVisibilitySaved(childId: string, newTier: VisibilityTier) {
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, visibilityTier: newTier } : c))
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <p style={{ color: "var(--color-text-muted)" }}>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Household</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {userEmail}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/parent/onboarding/child"
            className="text-sm px-4 py-2 rounded-lg border font-medium"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
              background: "var(--color-surface)",
            }}
          >
            + Add child
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg border font-medium"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
              background: "var(--color-surface)",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg px-4 py-3 text-sm bg-red-900/30 text-red-300 border border-red-800 mb-6">
          {error}
        </p>
      )}

      {/* Child profile cards */}
      {children.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <h2 className="text-lg font-semibold mb-2">No children added yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Add your first child to get started with L3ARN.
          </p>
          <Link
            href="/parent/onboarding/child"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Add your first child
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            // Derive effective visibility tier (fallback for NULL = legacy row)
            const effectiveTier: VisibilityTier =
              child.visibilityTier ?? resolveDefaultVisibilityTier(child.grade, false);

            const isSettingsOpen = openSettingsChildId === child.id;

            return (
              <div
                key={child.id}
                className="rounded-xl border p-6"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                {/* Top badge row: house + visibility tier */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {/* House badge — pre_sorting shown as "Awaiting Sorting" */}
                  {child.house && (
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        background: child.house === "pre_sorting"
                          ? "rgba(100, 116, 139, 0.15)"
                          : "rgba(99, 102, 241, 0.15)",
                        color: child.house === "pre_sorting"
                          ? "var(--color-text-muted)"
                          : "var(--color-primary)",
                        border: child.house === "pre_sorting"
                          ? "1px solid rgba(100, 116, 139, 0.3)"
                          : "1px solid rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      {houseDisplayLabel(child.house)}
                    </span>
                  )}

                  {/* Visibility tier badge */}
                  <VisibilityTierBadge tier={effectiveTier} />
                </div>

                {/* Academy display name */}
                <h2 className="text-xl font-bold">{child.displayName}</h2>

                {/* Grade */}
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {child.grade === "K" ? "Kindergarten" : `Grade ${child.grade}`}
                </p>

                {/* Onboarding incomplete notice */}
                {!child.onboardingComplete && (
                  <p className="text-xs mt-2 text-amber-400">
                    Setup incomplete — finish onboarding to enable sessions.
                  </p>
                )}

                {/* Rewards summary — gated on migration 004 wallet row existing (Agent 9) */}
                <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <span>
                    {child.moolahBalance !== null
                      ? `🪙 ${child.moolahBalance} Moolah`
                      : "No rewards yet"}
                  </span>
                  {child.mostRecentBadgeName !== null && (
                    <span>
                      {`🏅 ${child.mostRecentBadgeName}`}
                    </span>
                  )}
                  {child.moolahBalance !== null && child.mostRecentBadgeName === null && (
                    <span>No badges yet</span>
                  )}
                </div>

                {/* Curriculum snapshot (Agent 8) */}
                <div
                  className="mt-3 rounded-lg px-3 py-2.5 text-xs"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {child.curriculumPrefs ? (
                    <>
                      <p style={{ color: "var(--color-text-muted)" }}>
                        <span className="font-medium" style={{ color: "var(--color-text)" }}>
                          Subjects:
                        </span>{" "}
                        {child.curriculumPrefs.focusSubjects.length > 0
                          ? child.curriculumPrefs.focusSubjects.join(", ")
                          : "Balanced (all subjects)"}
                      </p>
                      <p className="mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        <span className="font-medium" style={{ color: "var(--color-text)" }}>
                          Approval mode:
                        </span>{" "}
                        {approvalModeLabel(child.curriculumPrefs.approvalMode)}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: "var(--color-text-muted)" }}>
                      No curriculum preferences set yet.
                    </p>
                  )}
                  <Link
                    href={`/parent/onboarding/curriculum?childId=${child.id}`}
                    className="inline-block mt-1.5 underline text-xs"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Curriculum settings
                  </Link>
                </div>

                {/* Session error message for this child */}
                {sessionErrors[child.id] && (
                  <p className="mt-3 text-xs rounded px-3 py-2 bg-red-900/30 text-red-300 border border-red-800">
                    {sessionErrors[child.id]}
                  </p>
                )}

                {/* Session launched confirmation for this child */}
                {sessionLaunched[child.id] && (
                  <p className="mt-3 text-xs rounded px-3 py-2 bg-green-900/30 text-green-300 border border-green-800">
                    Session started — hand the device to{" "}
                    {sessionLaunched[child.id].academyIdentity.displayName}.
                    Session expires at{" "}
                    {new Date(sessionLaunched[child.id].expiresAt).toLocaleTimeString()}.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-5">
                  {/*
                   * "Start Session" — wired to Railway POST /api/sessions/start (OQ-A8-001).
                   * Disabled states:
                   *   1. Child onboarding not complete (child.onboardingComplete = false)
                   *   2. Railway API URL not configured (NEXT_PUBLIC_RAILWAY_API_URL not set)
                   *   3. Session start in flight (sessionStartingChildId === child.id)
                   * On success: redirects to /parent/session-launched
                   * On error: shows inline error message above this row
                   */}
                  {process.env.NEXT_PUBLIC_RAILWAY_API_URL ? (
                    <button
                      onClick={() => handleStartSession(child.id)}
                      disabled={
                        !child.onboardingComplete ||
                        sessionStartingChildId === child.id
                      }
                      className="flex-1 text-sm py-2 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "var(--color-primary)" }}
                      title={
                        !child.onboardingComplete
                          ? "Complete child onboarding before starting a session"
                          : undefined
                      }
                    >
                      {sessionStartingChildId === child.id ? "Starting…" : "Start Session"}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 text-sm py-2 rounded-lg font-semibold text-white opacity-50 cursor-not-allowed"
                      style={{ background: "var(--color-primary)" }}
                      title="Session launch requires Railway API configuration (NEXT_PUBLIC_RAILWAY_API_URL)"
                    >
                      Start Session
                    </button>
                  )}
                  <Link
                    href={`/parent/reports/${child.id}`}
                    className="flex-1 text-center text-sm py-2 rounded-lg font-medium border"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-muted)",
                      background: "var(--color-bg)",
                    }}
                  >
                    View Reports
                  </Link>
                </div>

                {/* Settings / Configure action */}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() =>
                      setOpenSettingsChildId(isSettingsOpen ? null : child.id)
                    }
                    className="text-xs underline"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {isSettingsOpen ? "Hide settings" : "Visibility settings"}
                  </button>
                </div>

                {/* Inline visibility override panel */}
                {isSettingsOpen && (
                  <ChildSettingsPanel
                    child={child}
                    onClose={() => setOpenSettingsChildId(null)}
                    onSaved={(newTier) => {
                      handleVisibilitySaved(child.id, newTier);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
