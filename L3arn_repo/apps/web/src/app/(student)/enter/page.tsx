"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifySession, type VerifiedIdentity } from "../../../lib/student-session";

// ── Child entry gate (ADR-031 / OQ-A8-001) ───────────────────────────────────
// This page MUST verify the childSessionToken against Railway before rendering
// any Academy context. localStorage is NEVER the identity authority.
//
//   1. Read childSessionToken from ?token=… (set by the parent launch link)
//   2. POST /api/sessions/verify (Authorization: Bearer <token>)
//   3. Render the Academy identity ONLY on a 200 verify
//   4. Fail closed on missing / invalid / expired / revoked token
//
// Dev escape hatch: when NODE_ENV !== "production" AND no token is present, the
// page falls back to localStorage identity for UI development, behind a loud
// banner. This path never runs in production.
// ──────────────────────────────────────────────────────────────────────────────

type Status = "verifying" | "verified" | "error" | "dev-fallback";

function EnterAcademyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("verifying");
  const [identity, setIdentity] = useState<VerifiedIdentity | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [devName, setDevName] = useState<string>("Explorer");
  const [devAcademy, setDevAcademy] = useState<string>("The L3ARN Academy");

  useEffect(() => {
    const token = searchParams.get("token");
    const isProduction = process.env.NODE_ENV === "production";

    if (!token) {
      // No token. In production this is a hard failure (fail closed).
      if (isProduction) {
        setErrorMessage(
          "This Academy link is missing its session. Ask a parent to start a new session from their dashboard.",
        );
        setStatus("error");
        return;
      }
      // Dev only: allow localStorage-driven UI development behind a banner.
      setDevName(localStorage.getItem("l3arn_display_name") ?? "Explorer");
      setDevAcademy(localStorage.getItem("l3arn_academy_name") ?? "The L3ARN Academy");
      setStatus("dev-fallback");
      return;
    }

    let cancelled = false;
    void verifySession(token).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        setIdentity({
          displayName: outcome.data.academyIdentity.displayName,
          house: outcome.data.academyIdentity.house,
          childSessionId: outcome.data.childSessionId,
          academyIdentityId: outcome.data.academyIdentityId,
          expiresAt: outcome.data.expiresAt,
        });
        setStatus("verified");
      } else {
        setErrorMessage(outcome.message);
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function handleEnter() {
    // Sequence by sort state: an unsorted child (house = pre_sorting) goes to the
    // Sorting Ceremony first; a returning child goes straight to the Academy.
    const house =
      status === "verified"
        ? identity?.house
        : typeof window !== "undefined"
          ? localStorage.getItem("l3arn_house")
          : null;
    const sorted = !!house && house !== "pre_sorting";
    router.push(sorted ? "/student/academy" : "/student/onboarding/house");
  }

  // ── Verifying ────────────────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.badge}>Checking your pass…</div>
          <p style={styles.tagline}>Verifying your session with the Academy.</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired / revoked — fail closed ─────────────────────────────────
  if (status === "error") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ ...styles.badge, ...styles.badgeError }}>Session not valid</div>
          <h1 style={styles.name}>Can&apos;t enter yet</h1>
          <p style={styles.tagline}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ── Verified (authoritative) or dev-fallback (non-prod only) ──────────────────
  const displayName = status === "verified" ? identity?.displayName ?? "Explorer" : devName;
  const academyName = status === "verified" ? "The L3ARN Academy" : devAcademy;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Welcome back</div>
        <h1 style={styles.name}>{displayName}</h1>
        <p style={styles.academy}>{academyName}</p>
        {status === "dev-fallback" && (
          <p style={styles.devWarning}>
            DEV: no session token — identity is from localStorage and is not verified.
            This path is disabled in production.
          </p>
        )}
        <p style={styles.tagline}>Your companions and missions are waiting inside.</p>
        <button style={styles.enterBtn} onClick={handleEnter}>
          Enter the Academy
        </button>
      </div>
    </div>
  );
}

export default function EnterAcademyPage() {
  return (
    <Suspense fallback={null}>
      <EnterAcademyContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    minHeight: "calc(100vh - 52px)",
  },
  card: { textAlign: "center", maxWidth: "400px", width: "100%" },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "#818cf8",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "1rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  badgeError: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
  },
  name: { fontSize: "2.5rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" },
  academy: { color: "#94a3b8", fontSize: "1rem", marginBottom: "1.5rem" },
  tagline: { color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" },
  devWarning: {
    color: "#fbbf24",
    fontSize: "0.75rem",
    lineHeight: 1.5,
    marginBottom: "1.25rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
  },
  enterBtn: {
    padding: "0.875rem 2.5rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
  },
};
