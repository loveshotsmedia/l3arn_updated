"use client";

/**
 * /parent/session-launched
 *
 * Confirmation page shown after a parent successfully starts a child session
 * via POST /api/sessions/start (OQ-A8-001).
 *
 * Phase 0 stub: displays a confirmation message based on the childId query param.
 * Phase 1: will display the child's academy display name and session expiry,
 *   received from the StartSessionResponse stored in parent session state or
 *   passed as additional query params.
 *
 * This page does NOT expose the childSessionToken — that is passed to the
 * child's device directly (Phase 1: URL param or secure cookie on the child
 * entry URL). The parent confirmation page only shows non-sensitive info.
 *
 * Grounded in: ADR-031 (child session model), OQ-A8-001 (session start contract).
 */

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function SessionLaunchedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const childId = searchParams.get("childId");

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
            marginBottom: "2rem",
          }}
        >
          The child session is now active. Hand the device to your child — they
          can enter the Academy from the child app.
        </p>

        {/* TODO (OQ-A8-001 Phase 1): Display child display name + session expiry
            once StartSessionResponse is passed via state or query params. */}
        {childId && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              marginBottom: "1.5rem",
              fontFamily: "monospace",
            }}
          >
            Child ID: {childId}
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
            onClick={() => router.push("/student/enter")}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
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
