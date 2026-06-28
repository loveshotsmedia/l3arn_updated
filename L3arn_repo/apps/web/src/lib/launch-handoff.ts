/**
 * Parent → child session launch handoff (browser, same-device).
 *
 * POST /api/sessions/start returns the opaque childSessionToken to the PARENT.
 * The child entry page (/student/enter) needs that token to verify the session.
 * This module carries the token across the parent dashboard → session-launched
 * navigation via sessionStorage (per-tab, cleared on close), keyed by childId —
 * so it never rides in the dashboard's redirect URL.
 *
 * The token DOES land in the child entry URL (/student/enter?token=…) when the
 * parent opens it on this device — that is the intended same-device handoff.
 */

export interface LaunchHandoff {
  token: string;
  displayName: string;
  expiresAt: string;
}

const keyFor = (childId: string) => `l3arn_launch_${childId}`;

export function storeLaunchHandoff(childId: string, data: LaunchHandoff): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(keyFor(childId), JSON.stringify(data));
}

export function readLaunchHandoff(childId: string): LaunchHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(keyFor(childId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LaunchHandoff;
  } catch {
    return null;
  }
}

export function clearLaunchHandoff(childId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(keyFor(childId));
}
