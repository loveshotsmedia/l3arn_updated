/**
 * Admin Route Group Layout — Founder Mission Control
 *
 * Guards all routes under (admin)/ against non-founder access.
 *
 * Authorization: Supabase auth + admin_users table (server-side only).
 * See apps/web/src/lib/admin-auth.ts
 *
 * Auth model (Wave 1):
 *   1. Verify a valid Supabase session exists (createSupabaseServerClient).
 *   2. Look up user_id in admin_users table via service_role client.
 *   3. Require role === 'founder'. Any other role or missing row → redirect to /.
 *   4. Fail closed on any DB error — never grant access on error.
 *
 * Security invariants:
 *   - No parent or child user can access any route under (admin)/
 *   - NEXT_PUBLIC_FOUNDER_EMAILS is NOT used for authorization (removed)
 *   - Authorization source: admin_users table (server-side, service_role only)
 *   - Supabase queries in child routes use service role (Server Components)
 *   - This layout is a Server Component — auth check runs on the server
 *   - No admin data is exposed to the browser client
 *
 * Grounded in: ADR-048, ADR-049 (admin access model), OQ-A11-001 resolution.
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isFounder } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authorization: Supabase auth + admin_users table (server-side only).
  // See apps/web/src/lib/admin-auth.ts

  // Step 1: Verify a valid Supabase session
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Not logged in → redirect to home
  if (!session) {
    redirect("/");
  }

  // Step 2+3: Check admin_users table for founder role (fails closed on error)
  const founderAccess = await isFounder(session.user.id);

  // Not a founder (or DB error) → redirect to home
  if (!founderAccess) {
    redirect("/");
  }

  // Display-only: show the user's email in the header nav (not used for auth)
  const userEmail = session.user.email ?? session.user.id;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0a0f", color: "#e2e8f0" }}
    >
      {/* Admin nav shell */}
      <header
        style={{
          background: "#111827",
          borderBottom: "1px solid #1f2937",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#ef4444",
              padding: "2px 8px",
              background: "rgba(239,68,68,0.1)",
              borderRadius: "4px",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            INTERNAL
          </span>
          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
            L3ARN Founder Mission Control
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          {userEmail}
        </div>
      </header>

      {/* Main content area */}
      <main style={{ flex: 1, padding: "24px" }}>{children}</main>

      {/* Internal tooling footer */}
      <footer
        style={{
          padding: "12px 24px",
          borderTop: "1px solid #1f2937",
          fontSize: "11px",
          color: "#4b5563",
          textAlign: "center",
        }}
      >
        Founder Mission Control — Internal Use Only — L3ARN Phase 1
      </footer>
    </div>
  );
}
