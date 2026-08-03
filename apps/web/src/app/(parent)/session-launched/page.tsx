"use client";

/**
 * /parent/session-launched
 *
 * Confirmation page shown after a parent successfully starts a child session
 * via POST /api/sessions/start (OQ-A8-001).
 *
 * Reads the launch handoff (childSessionToken + display name + expiry) that the
 * dashboard stashed in sessionStorage, keyed by childId. "Open Child Entry"
 * navigates to /student/enter?token=<token> — the same-device handoff. The token
 * never appears in this page's own URL.
 *
 * If the handoff is missing (page refreshed / opened directly), the entry button
 * is disabled and the parent is sent back to the dashboard to relaunch.
 *
 * Grounded in: ADR-031 (child session model), OQ-A8-001 (session start contract).
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readLaunchHandoff, type LaunchHandoff } from "@/lib/launch-handoff";

function SessionLaunchedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const childId = searchParams.get("childId");
  const [handoff, setHandoff] = useState<LaunchHandoff | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (childId) setHandoff(readLaunchHandoff(childId));
    setReady(true);
  }, [childId]);

  function openChildEntry() {
    if (!handoff) return;
    router.push(`/student/enter?token=${encodeURIComponent(handoff.token)}`);
  }

  const expiresLabel = handoff
    ? new Date(handoff.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        minHeight: "calc(100vh - 57px)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "440px",
          width: "100%",
          padding: "2.5rem",
          borderRadius: "1rem",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Success indicator */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            marginBottom: "1.25rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>&#10003;</span>
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: "0.75rem",
          }}
        >
          Session Started
        </h1>

        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            marginBottom: handoff ? "1.25rem" : "2rem",
          }}
        >
          {handoff
            ? `${handoff.displayName}'s session is active. Hand the device over and open the Academy.`
            : "The child session is now active. Hand the device to your child — they can enter the Academy from the child app."}
        </p>

        {handoff && expiresLabel && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              marginBottom: "1.75rem",
            }}
          >
            Expires around {expiresLabel}
          </p>
        )}

        {ready && !handoff && childId && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "#f59e0b",
              marginBottom: "1.5rem",
              lineHeight: 1.5,
            }}
          >
            The launch link for this session isn&apos;t available on this page anymore.
            Return to the dashboard and start the session again to open the Academy.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Link
            href="/parent/dashboard"
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              background: "var(--color-bg)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Back to Dashboard
          </Link>
          <button
            onClick={openChildEntry}
            disabled={!handoff}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: handoff ? "var(--color-primary)" : "var(--color-border)",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: handoff ? "pointer" : "not-allowed",
              opacity: handoff ? 1 : 0.6,
            }}
          >
            Open Child Entry
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionLaunchedPage() {
  return (
    <Suspense fallback={null}>
      <SessionLaunchedContent />
    </Suspense>
  );
}
