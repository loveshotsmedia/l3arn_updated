/**
 * Parent Shell Layout
 *
 * Wraps all parent-facing routes: auth, onboarding, dashboard, reports.
 * - Back button always top-left
 * - L3ARN brand nav
 * - No student/child chrome here
 *
 * This is a Server Component layout. Client-interactive nav
 * elements (sign-out, back button) are extracted to client components.
 */

import { BackButton } from "@/components/BackButton";
import Link from "next/link";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Parent nav shell */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Back button — always top-left */}
        <div className="w-24">
          <BackButton />
        </div>

        {/* Brand */}
        <Link
          href="/parent/dashboard"
          className="text-lg font-bold tracking-tight"
          style={{ color: "var(--color-primary)" }}
        >
          L3ARN
        </Link>

        {/* Right side spacer (auth actions added per page via slots or server components) */}
        <div className="w-24" />
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
