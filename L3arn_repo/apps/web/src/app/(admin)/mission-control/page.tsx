/**
 * Founder Mission Control Dashboard
 *
 * Internal-only page. Accessible only to users with the 'founder' role in the
 * admin_users table. Access is enforced by (admin)/layout.tsx.
 * Authorization: Supabase auth + admin_users table (server-side only).
 * See apps/web/src/lib/admin-auth.ts
 *
 * This is a Server Component. All Supabase queries use the service-role
 * client — never the anon key, never client-side RLS.
 *
 * Dashboard sections:
 *   1. Enrollment Overview       — counts only, no PII
 *   2. Active Child Sessions     — live (not revoked/ended/expired) sessions   [Phase C]
 *   3. Mission Activity          — Mission 001 starts / completions            [Phase C]
 *   4. AI Fallback Events        — runs served by the safe static fallback     [Phase C]
 *   5. Reward Ledger Health      — moolah/xp/badge write counts + recent feed  [Phase C]
 *   6. Evidence & Reports        — evidence / mastery / First Learning Maps     [Phase C]
 *   7. Safety Escalations Queue  — pending-review S3/S4 events
 *   8. Recent Audit Log          — last 50 entries
 *   9. Safety Status             — link to /api/safety/status + Railway logs
 *
 * Phase C panels (2–6) are additive, read-only, de-identified observability over
 * the data Hero Slice Phases A/B produce. Their data layer (testable, takes a
 * Supabase client) lives in apps/web/src/lib/mission-control-data.ts.
 *
 * Privacy invariants (NON-NEGOTIABLE):
 *   - No child legal name anywhere on this page
 *   - No parent email anywhere on this page
 *   - No household address anywhere on this page
 *   - child_profile_id shown as UUID only
 *   - session_id shown as UUID only
 *   - violation_summary is already de-identified at write time (see
 *     SupabaseSafetyContainment and migration 006 comments)
 *   - payload_json from audit_logs is NOT expanded in the UI
 *     (detailed payloads are viewed via Supabase dashboard only)
 *
 * Phase 1 read-only note:
 *   The "Mark Reviewed" action is handled by the API route at
 *   /api/admin/escalations/[id]/review (POST). This Server Component
 *   renders the review form; submission posts to the API route.
 *   The API route verifies founder auth before writing.
 *
 * Grounded in: ADR-048 (Founder Mission Control), ADR-049 (Admin Access Model).
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import {
  fetchActiveSessions,
  fetchMissionActivity,
  fetchAiFallbackEvents,
  fetchRewardLedgerHealth,
  fetchEvidenceReporting,
} from "@/lib/mission-control-data";
import { ReviewEscalationForm } from "./ReviewEscalationForm";

// ─── Data Shapes ──────────────────────────────────────────────────────────────
// These shapes contain ONLY de-identified fields safe to render in the UI.

interface EnrollmentCounts {
  totalHouseholds: number;
  totalChildren: number;
  onboardingCompleteCount: number;
  onboardingCompletePct: number;
}

interface SafetyEscalationRow {
  id: string;
  severity: string;
  trigger_source: string;
  violation_summary: string;
  session_id: string | null;
  child_profile_id: string; // UUID only — never legal name
  created_at: string;
  status: string;
  // review fields (populated on resolved rows — not shown in pending view)
}

interface AuditLogRow {
  id: string;
  event_type: string;
  actor_role: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  // payload_json is intentionally NOT fetched — security: payloads only via Supabase dashboard
}

// ─── Data Fetchers (all use service_role) ────────────────────────────────────

async function fetchEnrollmentCounts(): Promise<EnrollmentCounts> {
  const client = createSupabaseServiceRoleClient();

  const [householdsRes, childrenRes, onboardingRes] = await Promise.all([
    client
      .from("households")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    client
      .from("child_profiles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    client
      .from("child_profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_complete", true)
      .is("deleted_at", null),
  ]);

  const totalHouseholds = householdsRes.count ?? 0;
  const totalChildren = childrenRes.count ?? 0;
  const onboardingCompleteCount = onboardingRes.count ?? 0;
  const onboardingCompletePct =
    totalChildren > 0
      ? Math.round((onboardingCompleteCount / totalChildren) * 100)
      : 0;

  return {
    totalHouseholds,
    totalChildren,
    onboardingCompleteCount,
    onboardingCompletePct,
  };
}

async function fetchPendingEscalations(): Promise<SafetyEscalationRow[]> {
  const client = createSupabaseServiceRoleClient();

  const { data, error } = await client
    .from("safety_escalations")
    .select(
      // Intentionally limited columns — no legal PII, no raw content
      "id, severity, trigger_source, violation_summary, session_id, child_profile_id, created_at, status"
    )
    .eq("status", "pending-review")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[MissionControl] Failed to fetch safety_escalations:", error.message);
    return [];
  }

  return (data ?? []) as SafetyEscalationRow[];
}

async function fetchRecentAuditLog(): Promise<AuditLogRow[]> {
  const client = createSupabaseServiceRoleClient();

  const { data, error } = await client
    .from("audit_logs")
    .select(
      // payload_json intentionally excluded from UI — security boundary
      "id, event_type, actor_role, target_type, target_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[MissionControl] Failed to fetch audit_logs:", error.message);
    return [];
  }

  return (data ?? []) as AuditLogRow[];
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function truncateUUID(uuid: string | null): string {
  if (!uuid) return "—";
  // Show first 8 chars of UUID for readability; full UUID in tooltip
  return uuid.substring(0, 8) + "...";
}

// ─── Styles (inline — no CSS module dependency) ───────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#9ca3af",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "16px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  color: "#6b7280",
  fontWeight: 600,
  borderBottom: "1px solid #1f2937",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #1f2937",
  color: "#d1d5db",
  verticalAlign: "top",
};

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  background: color === "red" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
  color: color === "red" ? "#ef4444" : "#eab308",
  border: `1px solid ${color === "red" ? "rgba(239,68,68,0.3)" : "rgba(234,179,8,0.3)"}`,
});

const statCardStyle: React.CSSProperties = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "6px",
  padding: "16px 20px",
  flex: 1,
  minWidth: "140px",
};

// Shared cell/section styles for the Phase C operational panels.
const monoTdStyle: React.CSSProperties = {
  ...tdStyle,
  fontFamily: "monospace",
  fontSize: "11px",
  color: "#6b7280",
};

const dateTdStyle: React.CSSProperties = {
  ...tdStyle,
  fontSize: "11px",
  color: "#9ca3af",
  whiteSpace: "nowrap",
};

const emptyStyle: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "13px",
  fontStyle: "italic",
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#4b5563",
  marginBottom: "16px",
};

// Single stat tile (value + caption). Used by the Phase C panels.
function StatCard({
  value,
  label,
  color,
}: {
  value: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function MissionControlPage() {
  // One service-role client shared by the Phase C operational fetchers
  // (the existing fetchers create their own internally — left unchanged).
  const serviceClient = createSupabaseServiceRoleClient();

  // Fetch all dashboard data in parallel using service_role
  const [
    enrollmentCounts,
    activeSessions,
    missionActivity,
    aiFallback,
    rewardLedger,
    evidenceReporting,
    pendingEscalations,
    recentAuditLog,
  ] = await Promise.all([
    fetchEnrollmentCounts(),
    fetchActiveSessions(serviceClient),
    fetchMissionActivity(serviceClient),
    fetchAiFallbackEvents(serviceClient),
    fetchRewardLedgerHealth(serviceClient),
    fetchEvidenceReporting(serviceClient),
    fetchPendingEscalations(),
    fetchRecentAuditLog(),
  ]);

  // Railway AI workers base URL for the safety status link
  const railwayBaseUrl =
    process.env.RAILWAY_AI_WORKERS_URL ?? "https://your-railway-service.up.railway.app";

  const safetyStatusUrl = `${railwayBaseUrl}/api/safety/status`;
  const railwayLogsUrl =
    process.env.RAILWAY_LOGS_URL ?? "https://railway.app/project/your-project/logs";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f9fafb", marginBottom: "4px" }}>
          Mission Control
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Founder operational dashboard — read-only in Phase 1. Internal use only.
        </p>
      </div>

      {/* ── Section 1: Enrollment Overview ── */}
      <section style={sectionStyle} aria-label="Enrollment Overview">
        <h2 style={sectionTitleStyle}>1. Enrollment Overview</h2>
        <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px" }}>
          Counts only — no parent or child PII visible in this view.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#60a5fa" }}>
              {enrollmentCounts.totalHouseholds}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              Families Enrolled
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>
              {enrollmentCounts.totalChildren}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              Total Children
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#a78bfa" }}>
              {enrollmentCounts.onboardingCompleteCount}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              Onboarding Complete
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b" }}>
              {enrollmentCounts.onboardingCompletePct}%
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              Onboarding Rate
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Active Child Sessions ── */}
      <section style={sectionStyle} aria-label="Active Child Sessions">
        <h2 style={sectionTitleStyle}>2. Active Child Sessions</h2>
        <p style={sectionDescStyle}>
          Live sessions — not revoked, not ended, not yet expired. UUIDs only;
          no child legal name shown.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <StatCard value={activeSessions.activeCount} label="Active Now" color="#34d399" />
        </div>
        {activeSessions.recent.length === 0 ? (
          <p style={emptyStyle}>No active sessions.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Session ID</th>
                <th style={thStyle}>Child ID</th>
                <th style={thStyle}>Launch Mode</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {activeSessions.recent.map((row) => (
                <tr key={row.id}>
                  <td style={monoTdStyle} title={row.id}>{truncateUUID(row.id)}</td>
                  <td style={monoTdStyle} title={row.child_profile_id}>
                    {truncateUUID(row.child_profile_id)}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>
                    {row.launch_mode}
                  </td>
                  <td style={dateTdStyle}>{formatDateTime(row.started_at)}</td>
                  <td style={dateTdStyle}>{formatDateTime(row.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 3: Mission Activity ── */}
      <section style={sectionStyle} aria-label="Mission Activity">
        <h2 style={sectionTitleStyle}>3. Mission Activity</h2>
        <p style={sectionDescStyle}>
          Mission 001 starts and completions. A completion is a mission_attempt
          with a non-null completed_at.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <StatCard value={missionActivity.totalStarted} label="Started" color="#60a5fa" />
          <StatCard value={missionActivity.totalCompleted} label="Completed" color="#34d399" />
          <StatCard value={`${missionActivity.completionRatePct}%`} label="Completion Rate" color="#f59e0b" />
        </div>
        {missionActivity.recent.length === 0 ? (
          <p style={emptyStyle}>No mission attempts yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Mission</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {missionActivity.recent.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                    {row.mission_id}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>{row.status}</td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>
                    {row.content_source ?? "—"}
                  </td>
                  <td style={dateTdStyle}>{formatDateTime(row.started_at)}</td>
                  <td style={dateTdStyle}>
                    {row.completed_at ? formatDateTime(row.completed_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 4: AI Fallback Events ── */}
      <section style={sectionStyle} aria-label="AI Fallback Events">
        <h2 style={sectionTitleStyle}>4. AI Fallback Events</h2>
        <p style={sectionDescStyle}>
          Runs where AI content failed validation or the model was unavailable, so
          the safe static mission was served (content_source = &lsquo;fallback&rsquo;).
          A non-zero rate is a signal, not an error.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <StatCard value={aiFallback.fallbackCount} label="Fallback Runs" color="#ef4444" />
          <StatCard value={aiFallback.aiCount} label="AI-Served Runs" color="#34d399" />
          <StatCard value={`${aiFallback.fallbackRatePct}%`} label="Fallback Rate" color="#f59e0b" />
        </div>
        {aiFallback.recent.length === 0 ? (
          <p style={emptyStyle}>No fallback events.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Mission</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Started</th>
              </tr>
            </thead>
            <tbody>
              {aiFallback.recent.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                    {row.mission_id}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>{row.status}</td>
                  <td style={dateTdStyle}>{formatDateTime(row.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 5: Reward Ledger Health ── */}
      <section style={sectionStyle} aria-label="Reward Ledger Health">
        <h2 style={sectionTitleStyle}>5. Reward Ledger Health</h2>
        <p style={sectionDescStyle}>
          Is the reward pipeline writing rows? Counts across the append-only reward
          tables plus the most recent ledger entries. Aggregates only — no per-child
          identity beyond UUID.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <StatCard value={rewardLedger.ledgerEntryCount} label="Moolah Ledger Entries" color="#60a5fa" />
          <StatCard value={rewardLedger.xpEventCount} label="XP Events" color="#a78bfa" />
          <StatCard value={rewardLedger.badgesAwardedCount} label="Badges Awarded" color="#f59e0b" />
        </div>
        {rewardLedger.recent.length === 0 ? (
          <p style={emptyStyle}>No ledger entries yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Child ID</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {rewardLedger.recent.map((row) => (
                <tr key={row.id}>
                  <td style={monoTdStyle} title={row.child_profile_id}>
                    {truncateUUID(row.child_profile_id)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: row.amount >= 0 ? "#34d399" : "#ef4444" }}>
                    {row.amount >= 0 ? `+${row.amount}` : row.amount}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>{row.source_type}</td>
                  <td style={{ ...tdStyle, fontSize: "12px", maxWidth: "260px" }}>{row.reason}</td>
                  <td style={dateTdStyle}>{formatDateTime(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 6: Evidence & Reports ── */}
      <section style={sectionStyle} aria-label="Evidence and Reports">
        <h2 style={sectionTitleStyle}>6. Evidence &amp; Reports</h2>
        <p style={sectionDescStyle}>
          Proof-of-learning pipeline: evidence events captured, mastery records
          written, and parent reports (First Learning Maps) generated. content_json
          is never read here.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <StatCard value={evidenceReporting.evidenceEventCount} label="Evidence Events" color="#60a5fa" />
          <StatCard value={evidenceReporting.masteryRecordCount} label="Mastery Records" color="#34d399" />
          <StatCard value={evidenceReporting.firstLearningMapCount} label="First Learning Maps" color="#a78bfa" />
          <StatCard value={evidenceReporting.reportCount} label="Total Reports" color="#f59e0b" />
        </div>
        {evidenceReporting.recentReports.length === 0 ? (
          <p style={emptyStyle}>No parent reports yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Report ID</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Child ID</th>
                <th style={thStyle}>Generated</th>
              </tr>
            </thead>
            <tbody>
              {evidenceReporting.recentReports.map((row) => (
                <tr key={row.id}>
                  <td style={monoTdStyle} title={row.id}>{truncateUUID(row.id)}</td>
                  <td style={{ ...tdStyle, fontSize: "12px", color: "#d1d5db" }}>{row.report_type}</td>
                  <td style={monoTdStyle} title={row.child_profile_id}>
                    {truncateUUID(row.child_profile_id)}
                  </td>
                  <td style={dateTdStyle}>{formatDateTime(row.generated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 7: Safety Escalations Queue ── */}
      <section style={sectionStyle} aria-label="Safety Escalations Queue">
        <h2 style={sectionTitleStyle}>7. Safety Escalations Queue</h2>
        <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px" }}>
          S3/S4 events pending founder review. De-identified — no child legal name,
          parent email, or household address shown.
        </p>

        {pendingEscalations.length === 0 ? (
          <p style={{ color: "#4b5563", fontSize: "13px", fontStyle: "italic" }}>
            No pending safety escalations.
          </p>
        ) : (
          <div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Severity</th>
                  <th style={thStyle}>Trigger</th>
                  <th style={thStyle}>Summary</th>
                  <th style={thStyle}>Child ID</th>
                  <th style={thStyle}>Session ID</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingEscalations.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>
                      <span style={badgeStyle(row.severity === "S4" ? "red" : "yellow")}>
                        {row.severity}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#9ca3af" }}>
                      {row.trigger_source}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: "300px", fontSize: "12px" }}>
                      {row.violation_summary}
                    </td>
                    <td
                      style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "#6b7280" }}
                      title={row.child_profile_id}
                    >
                      {truncateUUID(row.child_profile_id)}
                    </td>
                    <td
                      style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "#6b7280" }}
                      title={row.session_id ?? undefined}
                    >
                      {truncateUUID(row.session_id)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                      {formatDateTime(row.created_at)}
                    </td>
                    <td style={tdStyle}>
                      {/* ReviewEscalationForm is a Client Component — handles the review form */}
                      <ReviewEscalationForm escalationId={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 8: Recent Audit Log ── */}
      <section style={sectionStyle} aria-label="Recent Audit Log">
        <h2 style={sectionTitleStyle}>8. Recent Audit Log</h2>
        <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px" }}>
          Last 50 entries ordered by time (newest first).
          Detailed payloads are available via the Supabase dashboard only —
          payload_json is not expanded here.
        </p>

        {recentAuditLog.length === 0 ? (
          <p style={{ color: "#4b5563", fontSize: "13px", fontStyle: "italic" }}>
            No audit log entries yet.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Event Type</th>
                <th style={thStyle}>Actor Role</th>
                <th style={thStyle}>Target Type</th>
                <th style={thStyle}>Target ID</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentAuditLog.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                    {row.event_type}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>
                    {row.actor_role}
                  </td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "12px" }}>
                    {row.target_type ?? "—"}
                  </td>
                  <td
                    style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "#6b7280" }}
                    title={row.target_id ?? undefined}
                  >
                    {truncateUUID(row.target_id)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {formatDateTime(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 9: Safety Status ── */}
      <section style={sectionStyle} aria-label="Safety Status">
        <h2 style={sectionTitleStyle}>9. Safety Status</h2>
        <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px" }}>
          Current safety subsystem status from the Railway AI workers service.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href={safetyStatusUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#60a5fa",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            GET /api/safety/status (Railway)
          </a>
          <a
            href={railwayLogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#9ca3af",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Railway Logs (external)
          </a>
        </div>
        <p style={{ marginTop: "12px", fontSize: "11px", color: "#4b5563" }}>
          Configure URLs via RAILWAY_AI_WORKERS_URL and RAILWAY_LOGS_URL environment variables.
          {!process.env.RAILWAY_AI_WORKERS_URL && (
            <span style={{ color: "#f59e0b", marginLeft: "8px" }}>
              [RAILWAY_AI_WORKERS_URL not set — using placeholder URL]
            </span>
          )}
        </p>
      </section>
    </div>
  );
}
