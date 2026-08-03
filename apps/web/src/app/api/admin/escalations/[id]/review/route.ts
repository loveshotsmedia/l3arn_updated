/**
 * POST /api/admin/escalations/[id]/review
 *
 * Marks a safety escalation as reviewed. Called by ReviewEscalationForm.tsx.
 * Requires the calling user to be a verified founder (role in admin_users table).
 *
 * Authorization: Supabase auth + admin_users table (server-side only).
 * See apps/web/src/lib/admin-auth.ts
 *
 * Request body:
 *   { status: "reviewed-resolved" | "reviewed-escalated" | "false-positive", review_notes: string }
 *
 * Security:
 *   - Founder auth verified server-side via admin_users table (NOT email list)
 *   - Fails closed: any DB error = 403 Forbidden (never grants on error)
 *   - Writes via service_role to safety_escalations
 *   - Writes an audit_logs entry for every review action (per ADR-049)
 *   - review_notes is required — empty notes are rejected
 *   - No child PII is read or returned
 *
 * Phase 1: only "reviewed-resolved" status is supported.
 * Phase 2 TODO: support "reviewed-escalated" and "false-positive" statuses.
 *
 * Grounded in: ADR-048, ADR-049 (admin access model), OQ-A11-001 resolution.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { isFounder } from "@/lib/admin-auth";
import { z } from "zod";

// Request body schema
const ReviewBodySchema = z.object({
  status: z.enum([
    "reviewed-resolved",
    "reviewed-escalated",
    "false-positive",
  ]),
  review_notes: z.string().trim().min(1, "Review notes are required."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escalationId } = await params;

  // ── 1. Auth check (session + admin_users table) ──────────────────────────────
  // Authorization: Supabase auth + admin_users table (server-side only).
  // See apps/web/src/lib/admin-auth.ts
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin_users table for founder role — fails closed on any DB error
  const founderAccess = await isFounder(session.user.id);
  if (!founderAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Validate request body ──────────────────────────────────────────────────
  let body: z.infer<typeof ReviewBodySchema>;
  try {
    const raw: unknown = await req.json();
    const result = ReviewBodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    body = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  // ── 3. Update safety_escalations ─────────────────────────────────────────────
  const { error: updateError } = await serviceClient
    .from("safety_escalations")
    .update({
      status: body.status,
      reviewed_by: session.user.id,
      reviewed_at: now,
      review_notes: body.review_notes,
      updated_at: now,
    })
    .eq("id", escalationId);

  if (updateError) {
    console.error("[AdminReview] Failed to update safety_escalation:", updateError.message);
    return NextResponse.json(
      { error: "Failed to update escalation. Please try again." },
      { status: 500 }
    );
  }

  // ── 4. Write audit log entry for this admin action (per ADR-049) ──────────────
  // Every admin action on child/parent-adjacent data requires an audit trail.
  // reviewed_by and review_notes are in the payload for accountability.
  const userEmail = session.user.email ?? session.user.id;
  const { error: auditError } = await serviceClient
    .from("audit_logs")
    .insert({
      event_type: "safety-escalation-reviewed",
      actor_role: "founder",
      actor_id: session.user.id,
      target_type: "safety_escalation",
      target_id: escalationId,
      justification: body.review_notes, // required per ADR-049 for admin actions
      payload_json: {
        status: body.status,
        reviewed_by_email: userEmail, // email is not child PII — it's the founder's own email
        reviewed_at: now,
        escalation_id: escalationId,
      },
      created_at: now,
    });

  if (auditError) {
    // Log the failure but do not fail the request — the escalation update already succeeded.
    // A failed audit write is a compliance risk, so log at CRITICAL.
    console.error(
      JSON.stringify({
        level: "CRITICAL",
        system: "admin-review-route",
        message: "audit_logs write failed after safety_escalation update",
        error: auditError.message,
        escalationId,
        reviewedBy: session.user.id,
        timestamp: now,
      })
    );
  }

  return NextResponse.json({ success: true, status: body.status });
}
