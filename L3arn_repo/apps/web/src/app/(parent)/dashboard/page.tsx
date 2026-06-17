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
 * Data fetched: child_profiles joined with academy_identities for the parent's
 * household. RLS ensures parent sees only their own children.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface ChildCard {
  id: string;
  legalFirstName: string;
  grade: string;
  displayName: string;
  house: string | null;
  onboardingComplete: boolean;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [children, setChildren] = useState<ChildCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

      const cards: ChildCard[] = (profiles ?? []).map((p) => {
        // academy_identities is a 1:1 relationship; Supabase returns it as array
        const identity = Array.isArray(p.academy_identities)
          ? p.academy_identities[0]
          : p.academy_identities;

        return {
          id: p.id,
          legalFirstName: p.legal_first_name,
          grade: p.grade,
          displayName: identity?.display_name ?? "—",
          house: identity?.house ?? null,
          onboardingComplete: p.onboarding_complete,
        };
      });

      setChildren(cards);
      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/parent/auth/login");
  }

  // "Start Session" is a placeholder for Phase 1.
  // In Phase 1: calls Railway API POST /sessions/start { child_profile_id }
  // Railway creates child_sessions row + returns a session token for the child app.
  function handleStartSession(childId: string) {
    // Phase 1 placeholder — session creation is backend-mediated (ADR-031)
    alert(
      `Phase 1: Start session for child ${childId}.\n\n` +
        "In Phase 1, this will call the Railway API to create a child session " +
        "and route to the student entry point."
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
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              {/* House badge */}
              {child.house && (
                <span
                  className="inline-block text-xs font-medium px-2 py-0.5 rounded mb-3"
                  style={{
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "var(--color-primary)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                  }}
                >
                  House {child.house}
                </span>
              )}

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

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => handleStartSession(child.id)}
                  disabled={!child.onboardingComplete}
                  className="flex-1 text-sm py-2 rounded-lg font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ background: "var(--color-primary)" }}
                  title={
                    !child.onboardingComplete
                      ? "Complete setup before starting a session"
                      : "Launch a session for this child"
                  }
                >
                  Start Session
                </button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
