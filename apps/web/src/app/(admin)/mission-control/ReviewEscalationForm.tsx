"use client";

/**
 * ReviewEscalationForm — Client Component
 *
 * Renders a "Mark Reviewed" button that expands into a form requiring
 * review_notes before submission. This is the only interactive element
 * on the Founder Mission Control dashboard.
 *
 * Security:
 *   - Submission POSTs to /api/admin/escalations/[id]/review
 *   - The API route verifies founder auth server-side before writing
 *   - review_notes is required before submission (enforced client-side + server-side)
 *   - On success, the page is refreshed to reflect the updated status
 *
 * Phase 1: marks status as "reviewed-resolved". Phase 2 will add
 * "reviewed-escalated" and "false-positive" options.
 *
 * Grounded in: ADR-048, ADR-049, agent-11 spec Task 3.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewEscalationFormProps {
  escalationId: string;
}

export function ReviewEscalationForm({ escalationId }: ReviewEscalationFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 600 }}>
        Reviewed
      </span>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: 600,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "4px",
          color: "#ef4444",
          cursor: "pointer",
        }}
      >
        Mark Reviewed
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setError("Review notes are required before marking as reviewed.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/escalations/${escalationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "reviewed-resolved",
          review_notes: trimmedNotes,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? `Server error: ${res.status}`);
        setSubmitting(false);
        return;
      }

      setDone(true);
      // Refresh the server component data
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error — please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        minWidth: "220px",
      }}
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (required)"
        required
        rows={3}
        style={{
          padding: "6px 8px",
          fontSize: "12px",
          background: "#0a0a0f",
          border: "1px solid #374151",
          borderRadius: "4px",
          color: "#e2e8f0",
          resize: "vertical",
          minHeight: "60px",
        }}
      />
      {error && (
        <p style={{ fontSize: "11px", color: "#ef4444", margin: 0 }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="submit"
          disabled={submitting || !notes.trim()}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: 600,
            background: submitting || !notes.trim()
              ? "rgba(52,211,153,0.05)"
              : "rgba(52,211,153,0.15)",
            border: "1px solid rgba(52,211,153,0.3)",
            borderRadius: "4px",
            color: submitting || !notes.trim() ? "#4b5563" : "#34d399",
            cursor: submitting || !notes.trim() ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setNotes("");
            setError(null);
          }}
          disabled={submitting}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            background: "transparent",
            border: "1px solid #374151",
            borderRadius: "4px",
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
