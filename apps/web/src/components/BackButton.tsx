"use client";

/**
 * BackButton — always top-left on every parent page.
 *
 * Uses Next.js router.back() so history-based navigation works
 * throughout the onboarding flow.
 *
 * Spec: UX requirement — back button top-left always visible.
 */

import { useRouter } from "next/navigation";

interface BackButtonProps {
  /** Optional label override. Defaults to "Back". */
  label?: string;
  /** Optional href override. If set, navigates to href instead of router.back(). */
  href?: string;
}

export function BackButton({ label = "Back", href }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      aria-label={label}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {label}
    </button>
  );
}
