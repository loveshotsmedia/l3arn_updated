/**
 * Student session client (browser).
 *
 * The single place the student app talks to Railway about the child session.
 * Centralizes:
 *   - the opaque childSessionToken (kept in sessionStorage, NOT localStorage —
 *     it is per-tab and cleared on close; it is the session authority)
 *   - the verified academy identity (from POST /api/sessions/verify ONLY)
 *   - the house + companion persistence calls (Authorization: Bearer <token>)
 *
 * RULE (ADR-031 / OQ-A8-001): identity authority is the backend, never
 * localStorage. localStorage may still hold non-authoritative draft UI state.
 */

import type {
  VerifySessionResponse,
  SetHouseResponse,
  SelectCompanionResponse,
  SelectableHouse,
  StartMissionResponse,
  CompleteMissionResponse,
} from "@l3arn/shared-types";

const TOKEN_KEY = "l3arn_session_token";
const IDENTITY_KEY = "l3arn_session_identity";

export interface VerifiedIdentity {
  displayName: string;
  house: string;
  childSessionId: string;
  academyIdentityId: string;
  expiresAt: string;
}

export type ApiOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; message: string };

function railwayBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_RAILWAY_API_URL;
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

const NOT_CONFIGURED: ApiOutcome<never> = {
  ok: false,
  status: 0,
  error: "RAILWAY_NOT_CONFIGURED",
  message: "The Academy backend is not configured (NEXT_PUBLIC_RAILWAY_API_URL).",
};

// ── Token + identity storage (sessionStorage) ──────────────────────────────────

export function storeSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeVerifiedIdentity(identity: VerifiedIdentity): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function getVerifiedIdentity(): VerifiedIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VerifiedIdentity;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(IDENTITY_KEY);
}

// ── API calls ──────────────────────────────────────────────────────────────────

async function parseError(res: Response): Promise<{ error: string; message: string }> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return {
      error: body.error ?? "REQUEST_FAILED",
      message: body.message ?? "The request failed.",
    };
  } catch {
    return { error: "REQUEST_FAILED", message: "The request failed." };
  }
}

/**
 * Verify a session token with Railway. The ONLY way to obtain academy identity.
 * On success, persists token + identity to sessionStorage as a side effect.
 */
export async function verifySession(token: string): Promise<ApiOutcome<VerifySessionResponse>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  try {
    const res = await fetch(`${base}/api/sessions/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }

    const data = (await res.json()) as VerifySessionResponse;
    storeSessionToken(token);
    storeVerifiedIdentity({
      displayName: data.academyIdentity.displayName,
      house: data.academyIdentity.house,
      childSessionId: data.childSessionId,
      academyIdentityId: data.academyIdentityId,
      expiresAt: data.expiresAt,
    });
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}

/** Persist the Sorting Ceremony result. Requires a stored session token. */
export async function setHouse(house: SelectableHouse): Promise<ApiOutcome<SetHouseResponse>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  const token = getSessionToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "Your session could not be found. Ask a parent to start a new one.",
    };
  }

  try {
    const res = await fetch(`${base}/api/student/session/house`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ house }),
    });

    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }

    const data = (await res.json()) as SetHouseResponse;
    // Keep the verified identity in sync with the new house.
    const current = getVerifiedIdentity();
    if (current) {
      storeVerifiedIdentity({ ...current, house: data.academyIdentity.house });
    }
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}

export interface CompanionSelection {
  companionKey: string;
  characterName: string;
  characterStyle?: string;
  teachingTone?: string;
  templateId?: string;
}

/** Persist the chosen companion. Requires a stored session token. */
export async function selectCompanion(
  selection: CompanionSelection,
): Promise<ApiOutcome<SelectCompanionResponse>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  const token = getSessionToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "Your session could not be found. Ask a parent to start a new one.",
    };
  }

  try {
    const res = await fetch(`${base}/api/student/session/companion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(selection),
    });

    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }

    const data = (await res.json()) as SelectCompanionResponse;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}

// ── Mission runtime ──────────────────────────────────────────────────────────

async function authedPost<T>(path: string, body: unknown): Promise<ApiOutcome<T>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  const token = getSessionToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "Your session could not be found. Ask a parent to start a new one.",
    };
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}

/** Start a mission: backend compiles (validated/fallback) + creates the attempt. */
export function startMission(missionId = "mission-001"): Promise<ApiOutcome<StartMissionResponse>> {
  return authedPost<StartMissionResponse>("/api/student/mission/start", { missionId });
}

export interface CompleteMissionInput {
  missionAttemptId: string;
  completedAllTasks?: boolean;
  masteryThresholdMet?: boolean;
  masteryEvidenceScore?: number;
}

/** Complete a mission: records completion + rewards/evidence/mastery/report. */
export function completeMission(
  input: CompleteMissionInput,
): Promise<ApiOutcome<CompleteMissionResponse>> {
  return authedPost<CompleteMissionResponse>("/api/student/mission/complete", input);
}

// ── House Calling calibration signals ─────────────────────────────────────────

export interface CalibrationSignalPayload {
  traitScores: {
    curiosity: number;
    courage: number;
    creativity: number;
    leadership: number;
    collaboration: number;
    resilience: number;
    independence: number;
  };
  recommendedHouse: string;
  selectedHouse: string;
  overrideUsed: boolean;
}

/**
 * Persist House Calling trial signals to Railway.
 * Best-effort — callers should catch and ignore errors.
 * Stored in house_calling_signals (migration 010).
 */
export function saveCalibrationSignals(
  payload: CalibrationSignalPayload,
): Promise<ApiOutcome<{ ok: true }>> {
  return authedPost<{ ok: true }>("/api/student/session/calibration-signals", payload);
}

// ── Evidence capture ──────────────────────────────────────────────────────────

export interface EvidenceCapturePayload {
  missionAttemptId: string;
  taskId: string;
  evidenceCaptureType:
    | "decision-log"
    | "sequence-completion"
    | "ai-mistake-check"
    | "explanation"
    | "reflection"
    | "structured-replay"
    | "artifact-upload"
    | "audio-response"
    | "screenshot";
  contentJson?: Record<string, unknown>;
}

/**
 * Capture evidence for a mission task interaction.
 * Best-effort — callers should wrap in try/catch. Non-fatal.
 *
 * Calls POST /api/student/mission/evidence on Railway.
 * Auth: stored child session token (Bearer header via authedPost).
 */
export function captureEvidence(
  missionAttemptId: string,
  taskId: string,
  evidenceCaptureType: EvidenceCapturePayload["evidenceCaptureType"],
  contentJson: Record<string, unknown> = {},
): Promise<ApiOutcome<{ ok: true; evidenceId: string }>> {
  return authedPost<{ ok: true; evidenceId: string }>("/api/student/mission/evidence", {
    missionAttemptId,
    taskId,
    evidenceCaptureType,
    contentJson,
  });
}

// ── Learner calibration pipeline ──────────────────────────────────────────────

export interface CalibrationSnapshotResult {
  stage: string;
  confidenceScore: number;
  signalSources: string[];
}

/**
 * Trigger a calibration snapshot update after a significant learning event.
 *
 * The Railway backend reads house_calling_signals + learning_evidence_events to
 * compute the current calibration stage and confidence score (architecture.md §9),
 * then persists the result to calibration_snapshots (migration 011).
 *
 * When to call:
 *   - After House Calling ceremony completes (sorting-ceremony → 0.40–0.55)
 *   - After completeMission() succeeds (mission-001 → 0.60–0.75)
 *
 * Best-effort — non-fatal. Callers should NOT await this in the critical path;
 * fire-and-forget or await after confirming the primary action succeeded.
 *
 * Example (after mission complete):
 *   const result = await completeMission(input);
 *   if (result.ok) {
 *     updateCalibration().catch(() => {}); // best-effort, non-blocking
 *   }
 *
 * Stage → confidence range (architecture.md §9):
 *   "onboarding"        → 0.20–0.35 (no signals yet)
 *   "sorting-ceremony"  → 0.40–0.55 (House Calling trait scores present)
 *   "mission-001"       → 0.60–0.75 (learning evidence events present)
 *   "days-7-14"         → 0.80–0.90 (future phase)
 */
export function updateCalibration(): Promise<ApiOutcome<CalibrationSnapshotResult>> {
  return authedPost<CalibrationSnapshotResult>("/api/student/calibration/snapshot", {});
}
