"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EnterAcademyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── OQ-A8-001: Production token flow (not yet wired — Phase 0) ──────────────
  // In production, this page should:
  //   1. Read childSessionToken from URL param (?token=<token>) or secure cookie
  //      (set by parent dashboard after POST /api/sessions/start succeeds)
  //   2. Call GET /api/sessions/verify?token=<token> to validate the session
  //      and retrieve academy identity from Railway
  //   3. Never trust localStorage as identity authority
  //   4. Reject (redirect to /student/enter-error) if token is missing, expired,
  //      or revoked
  // Phase 0: localStorage read retained for UI development only.
  // ────────────────────────────────────────────────────────────────────────────

  // Read token from URL param if present — store in state for Phase 1 wiring.
  // Currently unused beyond logging; does not alter the localStorage flow.
  const [sessionToken] = useState<string | null>(
    searchParams.get("token"),
  );

  // Phase 0: identity from localStorage (UI dev only)
  const displayName =
    typeof window !== "undefined"
      ? (localStorage.getItem("l3arn_display_name") ?? "Explorer")
      : "Explorer";
  const academyName =
    typeof window !== "undefined"
      ? (localStorage.getItem("l3arn_academy_name") ?? "The L3ARN Academy")
      : "The L3ARN Academy";

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[L3ARN DEV] /student/enter is using localStorage for identity. " +
        "Backend child session verification (ADR-031 / OQ-A8-001) is required before Sprint 2 launch.",
      );

      if (sessionToken) {
        // Token is present — Phase 1 will verify this against Railway API.
        // For now, just log it so developers can confirm the URL param flows through.
        console.info(
          "[L3ARN DEV] childSessionToken present in URL — Phase 1 will verify this token " +
          "against GET /api/sessions/verify before granting entry.",
          { tokenPrefix: sessionToken.slice(0, 8) + "…" },
        );
      } else {
        console.info(
          "[L3ARN DEV] No childSessionToken in URL — identity sourced from localStorage (Phase 0 only).",
        );
      }
    }
  }, [sessionToken]);

  function handleEnter() {
    router.push("/student/academy");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Welcome back</div>
        <h1 style={styles.name}>{displayName}</h1>
        <p style={styles.academy}>{academyName}</p>
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
  name: { fontSize: "2.5rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" },
  academy: { color: "#94a3b8", fontSize: "1rem", marginBottom: "1.5rem" },
  tagline: { color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" },
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
