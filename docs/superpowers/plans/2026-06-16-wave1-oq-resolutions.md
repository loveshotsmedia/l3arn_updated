# Wave 1 Open Question Resolutions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply all 18 decisions from the Phase 0 Build Wave 1 open question resolution session across packages/shared-types, packages/mission-compiler, packages/safety, packages/world-engine, services/ai-workers, apps/web, and infra/supabase.

**Architecture:** 14 tasks grouped by subsystem. Tasks 1–2 are config hygiene. Tasks 3–5 are schema/type fixes. Tasks 6–8 are Mission Compiler upgrades (env var model, structured output, CalibrationSignal import). Tasks 9–10 are safety system amendments (kill-switch, moderation event creator). Task 11 is the safety endpoint admin gate. Task 12 is DB Migration 003. Task 13 is frontend cleanup (delete Vite pages). Task 14 is the world engine Zustand store wiring.

**Tech Stack:** TypeScript 5.7, Zod 3.23, @anthropic-ai/sdk 0.26, React Three Fiber, Zustand 4, Supabase PostgreSQL, Next.js 14 App Router, Express 4, pnpm monorepo

---

## File Map

| File | Action | Task |
|------|--------|------|
| `apps/web/package.json` | Add `engines` field | 1 |
| `services/ai-workers/package.json` | Add `engines` field | 1 |
| `packages/mission-compiler/package.json` | Add `engines` + `zod-to-json-schema` dep | 1, 7 |
| `services/ai-workers/.env.example` | Create | 2 |
| `packages/shared-types/src/identity.schema.ts` | Add `pre_sorting` to HouseSchema | 3 |
| `packages/world-engine/src/types.ts` | Add `pre_sorting` to house type union | 3 |
| `packages/safety/src/kill-switch/kill-switch.interface.ts` | Amend comments + add new interface | 9 |
| `packages/safety/src/kill-switch/safety-containment.interface.ts` | Create | 9 |
| `packages/safety/src/events/moderation-event.creator.ts` | Fix triggerSource, remove sentinels | 10 |
| `packages/mission-compiler/src/outputs/calibration-signals.ts` | Remove local type, re-export from shared-types | 6 |
| `packages/mission-compiler/src/compiler.ts` | Use env var model; use tool_use API | 7, 8 |
| `packages/mission-compiler/src/validation/mission-output.json-schema.ts` | Create — JSON Schema for tool_use | 8 |
| `services/ai-workers/src/middleware/admin-auth.middleware.ts` | Create | 11 |
| `services/ai-workers/src/routes/moderation.route.ts` | Apply admin auth to /check | 11 |
| `infra/supabase/migrations/003_curriculum_prefs_onboarding_sessions.sql` | Create | 12 |
| `apps/web/src/pages/student/` | Delete entire directory | 13 |
| `packages/world-engine/package.json` | Add `zustand` dep | 14 |
| `packages/world-engine/src/state/worldStore.ts` | Create | 14 |
| `packages/world-engine/src/objects/PlayerAvatar.tsx` | Wire moveTo to zustand | 14 |
| `apps/web/src/app/(student)/enter/page.tsx` | Add dev-mode placeholder warning | 5 |
| `apps/web/src/app/(student)/onboarding/house/page.tsx` | Update placeholder comment | 4 |

---

## Task 1 — Pin Node >=18 in all app and service package.json files

**Files:**
- Modify: `apps/web/package.json`
- Modify: `services/ai-workers/package.json`
- Modify: `packages/mission-compiler/package.json`

- [ ] **Step 1: Add engines to apps/web/package.json**

  After `"private": true,` add:
  ```json
  "engines": {
    "node": ">=18.0.0"
  },
  ```

- [ ] **Step 2: Add engines to services/ai-workers/package.json**

  After `"version": "0.0.1",` add:
  ```json
  "engines": {
    "node": ">=18.0.0"
  },
  ```

- [ ] **Step 3: Add engines to packages/mission-compiler/package.json**

  After `"version": "0.0.1",` add:
  ```json
  "engines": {
    "node": ">=18.0.0"
  },
  ```

- [ ] **Step 4: Verify root already has engines pinned**

  The root `package.json` already specifies `"node": ">=18.0.0"`. Confirm it is present. If not, add it.

- [ ] **Step 5: Commit**
  ```
  git add apps/web/package.json services/ai-workers/package.json packages/mission-compiler/package.json
  git commit -m "chore: pin node >=18 engines in app and service packages"
  ```

---

## Task 2 — Create .env.example for ai-workers

**Files:**
- Create: `services/ai-workers/.env.example`

- [ ] **Step 1: Create .env.example**

  `services/ai-workers/.env.example`:
  ```bash
  # L3ARN AI Workers — Railway Environment Variables
  # Copy to .env for local development. Never commit .env.

  # ── Anthropic ────────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY=sk-ant-...

  # Model selection (required in production — no hardcoded fallback)
  # Default for local dev: claude-sonnet-4-6
  ANTHROPIC_MODEL=claude-sonnet-4-6
  AI_PROVIDER=anthropic

  # Fallback model used if primary fails at the provider level (not retry logic)
  AI_FALLBACK_MODEL=claude-haiku-4-5-20251001

  # Retry policy (confirmed: 3 retries hard cap — ADR-054)
  AI_MAX_RETRY_ATTEMPTS=3

  # ── Server ───────────────────────────────────────────────────────────────────
  PORT=3001
  NODE_ENV=development

  # ── Safety Admin ─────────────────────────────────────────────────────────────
  # Required to call POST /api/safety/check in any deployed environment.
  # Use a long random string. Keep secret.
  SAFETY_ADMIN_TOKEN=dev-only-token-replace-in-prod
  ```

- [ ] **Step 2: Commit**
  ```
  git add services/ai-workers/.env.example
  git commit -m "chore: add ai-workers .env.example with model env vars"
  ```

---

## Task 3 — Add pre_sorting to HouseSchema

**Files:**
- Modify: `packages/shared-types/src/identity.schema.ts`
- Modify: `packages/world-engine/src/types.ts`

**Background:** `academy_identities.house` is NOT NULL but house is unknown before the Sorting Ceremony. Decision: add `pre_sorting` as a valid enum value so we never insert a fake House. Migration 003 (Task 12) alters the DB enum.

- [ ] **Step 1: Update HouseSchema in identity.schema.ts**

  In `packages/shared-types/src/identity.schema.ts`, change line 18:
  ```typescript
  // Before
  export const HouseSchema = z.enum(["Valkryn", "Lyrion", "Novari", "Cytrex"]);

  // After
  export const HouseSchema = z.enum(["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]);
  ```

  `pre_sorting` is the value inserted before the Sorting Ceremony. Restoration to a real House requires updating `academy_identities.house` after ceremony completion. Never display "pre_sorting" in the UI — treat it as a loading/unassigned state.

- [ ] **Step 2: Update house union type in world-engine/types.ts**

  In `packages/world-engine/src/types.ts`, there are two places using the house union. Update both:

  ```typescript
  // SceneProps interface (line 64)
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';

  // WorldCanvasProps (in WorldCanvas.tsx — update in that file too)
  ```

  Also update `HOUSE_COLORS` to handle `pre_sorting` gracefully:
  ```typescript
  export const HOUSE_COLORS: Record<string, string> = {
    pre_sorting: '#64748b', // slate-500 — neutral before Sorting Ceremony
    Valkryn: '#ef4444',
    Lyrion: '#a855f7',
    Novari: '#22c55e',
    Cytrex: '#3b82f6',
  };
  ```

- [ ] **Step 3: Update WorldCanvas.tsx house prop type**

  In `packages/world-engine/src/WorldCanvas.tsx`, update the `WorldCanvasProps` interface:
  ```typescript
  interface WorldCanvasProps {
    scene: SceneKey;
    onEvent: (event: WorldEvent) => void;
    displayName?: string;
    house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  }
  ```

- [ ] **Step 4: Run typecheck**
  ```
  cd packages/shared-types && pnpm typecheck
  cd packages/world-engine && pnpm lint
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**
  ```
  git add packages/shared-types/src/identity.schema.ts packages/world-engine/src/types.ts packages/world-engine/src/WorldCanvas.tsx
  git commit -m "feat(schema): add pre_sorting to HouseSchema — no fake House before Sorting Ceremony"
  ```

---

## Task 4 — Update /student/onboarding/house placeholder comment

**Files:**
- Modify: `apps/web/src/app/(student)/onboarding/house/page.tsx`

**Background:** The write is a `console.log` placeholder. The decision is that house selection must go via a backend-mediated write (child session token → Railway → Supabase). This task upgrades the placeholder comment so it clearly specifies the required Sprint 2 pattern.

- [ ] **Step 1: Replace console.log placeholder in handleConfirm**

  In `apps/web/src/app/(student)/onboarding/house/page.tsx`, replace the current `handleConfirm`:
  ```typescript
  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    // SPRINT 2 TODO: Replace this placeholder with a backend-mediated write.
    // Required flow:
    //   1. POST /api/student/session/house  { house: selected }
    //      with Authorization: Bearer <child-session-token>
    //   2. Railway validates child_sessions row (ADR-031)
    //   3. Railway writes academy_identities.house = selected (NOT child_profiles)
    //   4. Railway returns { success: true, house: selected }
    // Do NOT write directly to Supabase from the frontend for this.
    localStorage.setItem("l3arn_house", selected);
    console.warn(
      "[L3ARN PLACEHOLDER] House selection not persisted to Supabase. " +
      "Backend-mediated write required (Sprint 2). house:", selected
    );
    setSaving(false);
    router.push("/student/onboarding/companion");
  }
  ```

- [ ] **Step 2: Commit**
  ```
  git add apps/web/src/app/(student)/onboarding/house/page.tsx
  git commit -m "chore(student): upgrade house selection placeholder comment to Sprint 2 spec"
  ```

---

## Task 5 — /student/enter: add backend-session-required dev warning

**Files:**
- Modify: `apps/web/src/app/(student)/enter/page.tsx`

**Background:** The page reads `displayName` from `localStorage`. In production it must verify a valid `child_sessions` row before rendering. Sprint 2 will replace this.

- [ ] **Step 1: Add dev-mode warning log to EnterAcademyPage**

  Add a `useEffect` that logs a clear warning in non-production environments. Also add a comment block above the localStorage reads:

  ```typescript
  "use client";

  import { useEffect } from "react";
  import { useRouter } from "next/navigation";

  export default function EnterAcademyPage() {
    const router = useRouter();

    // SPRINT 2 TODO: Replace localStorage reads with backend child session verification.
    // Required flow (ADR-031):
    //   1. Read child session token from URL param or secure cookie
    //   2. POST /api/student/session/verify  { token }
    //   3. Railway checks child_sessions row (not expired, not revoked)
    //   4. Return { displayName, house, academyName, sessionId }
    //   5. Reject and redirect to /student/enter-error if invalid
    // localStorage is a Phase 0 placeholder ONLY. Never trust it for identity.
    const displayName =
      typeof window !== "undefined"
        ? (localStorage.getItem("l3arn_display_name") ?? "Explorer")
        : "Explorer";
    const academyName =
      typeof window !== "undefined"
        ? (localStorage.getItem("l3arn_academy_name") ?? "The L3ARN Academy")
        : "The L3ARN Academy";

    useEffect(() => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[L3ARN DEV] /student/enter is using localStorage for identity. " +
          "Backend child session verification (ADR-031) is required before Sprint 2 launch."
        );
      }
    }, []);

    function handleEnter() {
      router.push("/student/academy");
    }

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.badge}>Welcome back</div>
          <h1 style={styles.name}>{displayName}</h1>
          <p style={styles.academy}>{academyName}</p>
          <p style={styles.tagline}>Your companions and missions are waiting inside.</p>
          <button style={styles.enterBtn} onClick={handleEnter}>
            Enter the Academy
          </button>
        </div>
      </div>
    );
  }

  const styles: Record<string, React.CSSProperties> = {
    container: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      minHeight: "calc(100vh - 52px)",
    },
    card: { textAlign: "center", maxWidth: "400px", width: "100%" },
    badge: {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "999px",
      background: "rgba(99, 102, 241, 0.15)",
      border: "1px solid rgba(99, 102, 241, 0.4)",
      color: "#818cf8",
      fontSize: "0.8rem",
      fontWeight: 600,
      marginBottom: "1rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
    },
    name: { fontSize: "2.5rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" },
    academy: { color: "#94a3b8", fontSize: "1rem", marginBottom: "1.5rem" },
    tagline: { color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" },
    enterBtn: {
      padding: "0.875rem 2.5rem",
      borderRadius: "10px",
      border: "none",
      background: "linear-gradient(135deg, #6366f1, #818cf8)",
      color: "#fff",
      fontSize: "1.1rem",
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
    },
  };
  ```

- [ ] **Step 2: Commit**
  ```
  git add apps/web/src/app/(student)/enter/page.tsx
  git commit -m "chore(student): add ADR-031 backend session verification placeholder warning"
  ```

---

## Task 6 — Fix CalibrationSignal import in mission-compiler

**Files:**
- Modify: `packages/mission-compiler/src/outputs/calibration-signals.ts`
- Modify: `packages/mission-compiler/src/compiler.ts`

**Background:** `CalibrationSignal` is defined twice — once as a local interface in `calibration-signals.ts` and once as a canonical Zod schema in `packages/shared-types/src/calibration.schema.ts`. The canonical version must win. Decision: import from `@l3arn/shared-types`, remove the local definition.

- [ ] **Step 1: Rewrite calibration-signals.ts to import from shared-types**

  Replace the full content of `packages/mission-compiler/src/outputs/calibration-signals.ts`:

  ```typescript
  /**
   * Mission 001 calibration signal builder.
   *
   * CalibrationSignal is defined canonically in @l3arn/shared-types.
   * This module re-exports the type and provides the Mission 001 builder function.
   *
   * Grounded in: architecture.md §9, evidence.schema.ts, calibration.schema.ts.
   */

  import { CalibrationSignal } from "@l3arn/shared-types";

  export type { CalibrationSignal };

  /**
   * Build the fixed set of calibration signals for Mission 001.
   * These signals describe what the system WILL measure — not what it has captured.
   */
  export function buildMission001CalibrationSignals(
    hasAudioEnabled: boolean,
  ): CalibrationSignal[] {
    const signals: CalibrationSignal[] = [
      {
        signalType: "cognitive-load",
        description:
          "Measures how long the student spends on each task and whether they request hints, " +
          "indicating the appropriate instruction chunk size and scaffolding level.",
        sourceMissionTaskId: "task-sort-red",
        evidenceCaptureType: "sequence-completion",
      },
      {
        signalType: "ai-readiness",
        description:
          "Measures whether the student engages with companion dialogue, " +
          "responds to AI prompts, and is comfortable interacting with the AI companion.",
        sourceMissionTaskId: "task-explain-rule",
        evidenceCaptureType: "decision-log",
      },
      {
        signalType: "persistence",
        description:
          "Measures whether the student retries after mistakes rather than requesting help " +
          "or abandoning, indicating frustration tolerance and self-directed learning readiness.",
        sourceMissionTaskId: null,
        evidenceCaptureType: "structured-replay",
      },
      {
        signalType: "delivery-mode-preference",
        description:
          "Mission 001 offers all three delivery modes; which mode the student chooses " +
          "provides a baseline delivery mode preference signal.",
        sourceMissionTaskId: null,
        evidenceCaptureType: null,
      },
      {
        signalType: "hint-frequency",
        description:
          "How often the student requests hints from the companion during the mission, " +
          "calibrating the appropriate hint frequency for future missions.",
        sourceMissionTaskId: null,
        evidenceCaptureType: "decision-log",
      },
    ];

    if (hasAudioEnabled) {
      signals.push({
        signalType: "reading-vs-listening",
        description:
          "If audio is enabled, measures whether the student activates read-aloud prompts " +
          "or prefers reading text independently, calibrating audio support preference.",
        sourceMissionTaskId: null,
        evidenceCaptureType: null,
      });
    }

    return signals;
  }
  ```

- [ ] **Step 2: Verify compiler.ts import still works**

  In `packages/mission-compiler/src/compiler.ts`, the import is:
  ```typescript
  import {
    buildMission001CalibrationSignals,
    CalibrationSignal,
  } from "./outputs/calibration-signals";
  ```
  This still works because `calibration-signals.ts` re-exports both.

- [ ] **Step 3: Run typecheck**
  ```
  cd packages/mission-compiler && pnpm typecheck
  ```
  Expected: no errors. The `CalibrationSignal` type from `@l3arn/shared-types` is a Zod infer type that matches the previous interface shape.

- [ ] **Step 4: Commit**
  ```
  git add packages/mission-compiler/src/outputs/calibration-signals.ts
  git commit -m "fix(mission-compiler): import CalibrationSignal from @l3arn/shared-types, remove local duplicate"
  ```

---

## Task 7 — Mission Compiler: replace hardcoded model with env var

**Files:**
- Modify: `packages/mission-compiler/src/compiler.ts`

**Background:** `MODEL_VERSION` is hardcoded as `"claude-3-5-sonnet-20241022"`. Decision: read from `ANTHROPIC_MODEL` env var at construction time. Fail fast (log critical error) if the env var is absent in production.

- [ ] **Step 1: Replace MODEL_VERSION constant in compiler.ts**

  Remove the constants block:
  ```typescript
  // BEFORE (remove these lines)
  const MODEL_PROVIDER = "anthropic";
  const MODEL_VERSION = "claude-3-5-sonnet-20241022";
  ```

  Replace with a runtime resolver:
  ```typescript
  const MODEL_PROVIDER = "anthropic";

  function resolveModelVersion(): string {
    const model = process.env.ANTHROPIC_MODEL;
    if (!model) {
      if (process.env.NODE_ENV === "production") {
        // In production, this is a hard config error — log critical and fail
        console.error(
          "[MissionCompiler] CRITICAL: ANTHROPIC_MODEL env var is not set. " +
          "No production mission generation path may use a hardcoded model. " +
          "Set ANTHROPIC_MODEL in Railway environment variables."
        );
        throw new Error(
          "ANTHROPIC_MODEL environment variable is required in production"
        );
      }
      // Local dev: allow documented default
      const DEV_DEFAULT = "claude-sonnet-4-6";
      console.warn(
        `[MissionCompiler] ANTHROPIC_MODEL not set — using dev default: ${DEV_DEFAULT}. ` +
        "Set ANTHROPIC_MODEL in your .env file."
      );
      return DEV_DEFAULT;
    }
    return model;
  }
  ```

- [ ] **Step 2: Update compile() to use resolveModelVersion()**

  In the `compile()` method, add at the top before the generate call:
  ```typescript
  async compile(input: MissionCompilerInput): Promise<MissionCompilerOutput> {
    const modelVersion = resolveModelVersion(); // resolve at call time, not module load
    const traceId = uuidv4();
    const requestedAt = new Date().toISOString();
    // ...
  ```

  Then replace all uses of `MODEL_VERSION` with `modelVersion`:
  - In `this.client.messages.create()`: `model: modelVersion,`
  - In the envelope: `modelVersion: modelVersion,`

- [ ] **Step 3: Run typecheck**
  ```
  cd packages/mission-compiler && pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**
  ```
  git add packages/mission-compiler/src/compiler.ts
  git commit -m "fix(mission-compiler): read model from ANTHROPIC_MODEL env var — no hardcoded model in production"
  ```

---

## Task 8 — Mission Compiler: switch to tool_use structured output

**Files:**
- Create: `packages/mission-compiler/src/validation/mission-output.json-schema.ts`
- Modify: `packages/mission-compiler/src/compiler.ts`
- Modify: `packages/mission-compiler/package.json` (add zod-to-json-schema dep)

**Background:** The compiler currently asks Claude to return raw JSON as text and calls `JSON.parse()`. JSON parse errors consume retry budget. Using Claude's `tool_use` (structured output) eliminates the parse failure mode. Zod validation still runs on the tool_use input for schema enforcement.

- [ ] **Step 1: Add zod-to-json-schema dependency**

  In `packages/mission-compiler/package.json`, add to `dependencies`:
  ```json
  "zod-to-json-schema": "^3.23.0"
  ```

  Run:
  ```
  cd packages/mission-compiler && pnpm install
  ```
  Expected: `zod-to-json-schema` added to lockfile.

- [ ] **Step 2: Read AIRawMissionOutputSchema**

  Open `packages/mission-compiler/src/validation/mission-output.schema.ts` and read it to understand the exact Zod shape. This schema is what Claude must produce. It will become the `input_schema` for the tool definition.

- [ ] **Step 3: Create mission-output.json-schema.ts**

  Create `packages/mission-compiler/src/validation/mission-output.json-schema.ts`:
  ```typescript
  /**
   * JSON Schema representation of AIRawMissionOutputSchema.
   *
   * Used as the `input_schema` for the Claude tool_use (structured output) call.
   * Generated from the Zod schema using zod-to-json-schema so the two stay in sync.
   *
   * Claude fills this schema directly — no JSON.parse() needed. Zod still validates
   * the result for runtime safety.
   */

  import { zodToJsonSchema } from "zod-to-json-schema";
  import { AIRawMissionOutputSchema } from "./mission-output.schema";

  // Export as a plain object — this is passed directly to the Anthropic SDK tools array.
  // The SDK expects a JSON Schema object with type "object" at the root.
  export const MISSION_OUTPUT_JSON_SCHEMA = zodToJsonSchema(
    AIRawMissionOutputSchema,
    { name: "AIRawMissionOutput", errorMessages: false }
  ) as Record<string, unknown>;
  ```

- [ ] **Step 4: Update the generate() callback in compiler.ts to use tool_use**

  In `packages/mission-compiler/src/compiler.ts`, add the import:
  ```typescript
  import { MISSION_OUTPUT_JSON_SCHEMA } from "./validation/mission-output.json-schema";
  ```

  Then replace the `generate()` callback inside `withAIRetry()`:

  ```typescript
  // generate(): call Claude with tool_use (structured output) — no JSON.parse needed
  async () => {
    const response = await this.client.messages.create({
      model: modelVersion,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: [
        {
          name: "generate_mission",
          description:
            "Generate a complete L3ARN mission output including all six delivery formats, " +
            "evidence plan, reward plan, and parent plan.",
          input_schema: MISSION_OUTPUT_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "generate_mission" },
    });

    // Extract the tool_use block — SDK parses JSON for us
    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use"
    );
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      throw new Error(
        "Claude did not return a tool_use block for generate_mission"
      );
    }

    // toolUseBlock.input is already a parsed JS object — pass directly to validator
    return toolUseBlock.input;
  },
  ```

- [ ] **Step 5: Run typecheck**
  ```
  cd packages/mission-compiler && pnpm typecheck
  ```
  Expected: no errors. The Anthropic SDK types the `input_schema` as `Record<string, unknown>` which is compatible with our export.

- [ ] **Step 6: Commit**
  ```
  git add packages/mission-compiler/src/validation/mission-output.json-schema.ts packages/mission-compiler/src/compiler.ts packages/mission-compiler/package.json
  git commit -m "feat(mission-compiler): switch to Claude tool_use structured output — eliminates JSON.parse failure mode"
  ```

---

## Task 9 — Kill-switch: add SafetyContainmentTrigger interface

**Files:**
- Modify: `packages/safety/src/kill-switch/kill-switch.interface.ts`
- Create: `packages/safety/src/kill-switch/safety-containment.interface.ts`

**Background:** ADR-047 said "no automated kill switch." This conflicts with S4 events (CSAM, self-harm) that cannot wait for human review. Decision: amend ADR-047 — automated safety containment IS allowed for predefined severe events. Containment degrades to a safer mode; restoration always requires founder review. The existing `KillSwitchTrigger` interface is kept for backward compat but the new `SafetyContainmentTrigger` is the approved pattern.

- [ ] **Step 1: Create safety-containment.interface.ts**

  Create `packages/safety/src/kill-switch/safety-containment.interface.ts`:
  ```typescript
  /**
   * Safety Containment Interface
   *
   * Defines automated safety containment for predefined severe child-safety events.
   *
   * ADR-047 (amended June 2026):
   *   Automated kill switches ARE allowed for predefined safety-critical events.
   *   These actions must degrade the product into a safer mode, log the incident,
   *   notify Founder Mission Control, and require founder/admin review before restoration.
   *
   * This is NOT "AI randomly shuts down the platform." It is:
   *   Predefined automated safety containment for severe child-safety events.
   *
   * Approved automated actions for S3/S4 events:
   *   - block-content          : block the unsafe content before delivery
   *   - end-session            : terminate the child session
   *   - force-quick-chat       : restrict chat to Quick Chat only
   *   - force-guided-ai        : restrict AI to Guided Mode only
   *   - disable-audio          : disable push-to-talk for this session
   *   - disable-evidence       : disable evidence capture for this session
   *   - freeze-moolah          : freeze Moolah transactions
   *   - freeze-world-state     : freeze world-state writes
   *
   * Restoration:
   *   ANY containment action requires founder/admin review before the
   *   affected capability is restored. No automated restoration.
   *
   * Grounded in: ADR-047 (amended), ADR-048, ADR-046.
   */

  // ─── Containment Actions ──────────────────────────────────────────────────────

  export type SafetyContainmentAction =
    | "block-content"
    | "end-session"
    | "force-quick-chat"
    | "force-guided-ai"
    | "disable-audio"
    | "disable-evidence"
    | "freeze-moolah"
    | "freeze-world-state";

  // ─── Containment Event ────────────────────────────────────────────────────────

  export interface SafetyContainmentEvent {
    /** Severity that triggered containment. S4 is CSAM/self-harm; S3 is high concern. */
    severity: "S3" | "S4";

    /** Actions the system has taken or will take. */
    actions: SafetyContainmentAction[];

    /** Child profile UUID. Never real name or PII. */
    childProfileId: string;

    /** Active session UUID, if known. */
    sessionId: string | undefined;

    /** Human-readable reason for the containment event. */
    reason: string;

    /** ISO 8601 timestamp. */
    triggeredAt: string;

    /** Restoration always requires a human review step. Compile-time invariant. */
    requiresFounderReview: true;
  }

  // ─── SafetyContainmentTrigger Interface ───────────────────────────────────────

  export interface SafetyContainmentTrigger {
    /**
     * Execute automated safety containment for a severe safety event.
     *
     * Implementation MUST:
     *   - Execute all actions in the event.actions array
     *   - Write a containment record to audit_logs with action: "kill-switch-invoked"
     *   - Notify Founder Mission Control (email + in-platform alert)
     *   - Never surface errors to the child or parent as UI errors
     *   - Return a resolved Promise regardless of internal errors
     *
     * The implementation is provided by the infrastructure layer (Phase 2).
     * In Phase 0/1, inject NoopSafetyContainment.
     */
    contain(event: SafetyContainmentEvent): Promise<void>;
  }

  // ─── NoopSafetyContainment ───────────────────────────────────────────────────
  // Phase 0/1 implementation. Logs the event. Does NOT take action.
  // Replace by injecting a real implementation in Phase 2.

  export class NoopSafetyContainment implements SafetyContainmentTrigger {
    async contain(event: SafetyContainmentEvent): Promise<void> {
      console.log(
        JSON.stringify({
          level: "CRITICAL",
          system: "safety-containment",
          message: `NOOP containment triggered for ${event.severity} — no action taken in Phase 0`,
          severity: event.severity,
          actions: event.actions,
          childProfileId: event.childProfileId,
          sessionId: event.sessionId,
          reason: event.reason,
          triggeredAt: event.triggeredAt,
          requiresFounderReview: true,
        })
      );
    }
  }
  ```

- [ ] **Step 2: Update kill-switch.interface.ts comments to reference ADR-047 amendment**

  In `packages/safety/src/kill-switch/kill-switch.interface.ts`, update the file-level comment block. Replace:
  ```
  * Kill-switch rules (ADR-047 — provisional):
  *   - Only founders may invoke a kill switch
  *   - Kill switches must be reversible and logged
  *   - A kill switch invocation triggers at minimum an S1 review
  *   - No automated system may invoke a kill switch without founder approval
  ```
  With:
  ```
  * Kill-switch rules (ADR-047 — amended June 2026):
  *   - Automated safety containment IS allowed for predefined S3/S4 events.
  *     See safety-containment.interface.ts for the approved containment contract.
  *   - Manual (founder-only) kill switches remain for platform-wide actions.
  *   - Kill switches must be reversible and logged.
  *   - A kill switch invocation triggers at minimum an S1 review.
  *   - Restoration from any containment action requires founder/admin review.
  ```

  Also remove the OPEN QUESTION block (it is now resolved):
  ```
  * OPEN QUESTION: ADR-047 states "no automated system may invoke a kill switch
  * without founder approval." ...Filed for founder review. — Agent 7, Phase 0
  ```

- [ ] **Step 3: Export SafetyContainmentTrigger from safety package index**

  In `packages/safety/src/index.ts`, add the export:
  ```typescript
  export * from "./kill-switch/safety-containment.interface";
  ```

- [ ] **Step 4: Run typecheck**
  ```
  cd packages/safety && pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**
  ```
  git add packages/safety/src/kill-switch/safety-containment.interface.ts packages/safety/src/kill-switch/kill-switch.interface.ts packages/safety/src/index.ts
  git commit -m "feat(safety): add SafetyContainmentTrigger — ADR-047 amended to allow automated S3/S4 containment"
  ```

---

## Task 10 — Moderation event creator: fix triggerSource, remove sentinel values

**Files:**
- Modify: `packages/safety/src/events/moderation-event.creator.ts`

**Background:** `createModerationEvent` sets `roomId: "AI_OUTPUT:${triggeredBy}"` and `messageType: "system-message"` as sentinel values. But `ModerationEventSchema` already has a `triggerSource` required field to distinguish event origins. The creator doesn't set `triggerSource` at all (TypeScript error). Fix: set `triggerSource` properly and remove the sentinels.

- [ ] **Step 1: Update createModerationEvent function signature and body**

  Replace the full `createModerationEvent` function in `packages/safety/src/events/moderation-event.creator.ts`:

  ```typescript
  /**
   * Creates a ModerationEvent for a single BoundaryViolation.
   *
   * @param violation           - The boundary violation that triggered this event
   * @param childProfileId      - UUID of the child's profile (never real name/PII)
   * @param sessionId           - UUID of the active session, if any
   * @param triggeredBy         - Source: companion-response, mission-output, or user-input
   * @param aiOutputEnvelopeId  - UUID of the AIOutputEnvelope, if applicable
   */
  export function createModerationEvent(
    violation: BoundaryViolation,
    childProfileId: string,
    sessionId: string | undefined,
    triggeredBy: ModerationTriggerSource,
    aiOutputEnvelopeId?: string,
  ): ModerationEvent {
    const outcome: ModerationEvent["outcome"] =
      violation.severity === "S4" || violation.severity === "S3"
        ? "blocked"
        : violation.severity === "S2" || violation.severity === "S1"
        ? "flagged-for-review"
        : "approved";

    const now = new Date().toISOString();

    // Map internal trigger source to ModerationTriggerSchema values
    const triggerSource: ModerationEvent["triggerSource"] =
      triggeredBy === "user-input" ? "user-input" : "ai-output";

    const event: ModerationEvent = {
      id: generateEventId(),
      triggerSource,
      // chatMessageId: absent — this event is not triggered by a chat message
      // roomId: absent — AI output events are not room-scoped
      // messageType: absent — AI output events don't have a chat message type
      ...(aiOutputEnvelopeId ? { aiOutputEnvelopeId } : {}),
      senderChildProfileId: childProfileId,
      outcome,
      checksRun: [
        {
          checkType: "keyword-filter",
          outcome,
          matchedPatterns: [
            violation.rule,
            ...(violation.severity !== "S0"
              ? [`excerpt_ref:${sanitizeExcerptForLog(violation.excerpt)}`]
              : []),
          ],
        },
      ],
      moderatedAt: now,
      parentNotified: violation.severity === "S4" || violation.severity === "S3",
      parentNotifiedAt:
        violation.severity === "S4" || violation.severity === "S3" ? now : undefined,
    };

    return event;
  }
  ```

  Also remove the module-level OPEN QUESTION comment about sentinel values (the concern is resolved):
  ```
  // OPEN QUESTION: Schema gap — see module-level comment. — Agent 7, Phase 0
  ```

  And remove the module-level comment block describing sentinel values (the file header should be simplified).

- [ ] **Step 2: Update ModerationTriggerSource to align with schema values**

  The local type should document the mapping:
  ```typescript
  // Internal trigger sources in the safety pipeline.
  // Maps to ModerationTriggerSchema values:
  //   "companion-response" → "ai-output"
  //   "mission-output"     → "ai-output"
  //   "user-input"         → "user-input"
  export type ModerationTriggerSource =
    | "companion-response"
    | "mission-output"
    | "user-input";
  ```

- [ ] **Step 3: Run typecheck**
  ```
  cd packages/safety && pnpm typecheck
  ```
  Expected: no errors (TypeScript should now be satisfied that triggerSource is set).

- [ ] **Step 4: Commit**
  ```
  git add packages/safety/src/events/moderation-event.creator.ts
  git commit -m "fix(safety): set triggerSource in moderation events — remove sentinel roomId and messageType values"
  ```

---

## Task 11 — Admin auth gate for /api/safety/check

**Files:**
- Create: `services/ai-workers/src/middleware/admin-auth.middleware.ts`
- Modify: `services/ai-workers/src/routes/moderation.route.ts`

**Background:** `POST /api/safety/check` is unprotected. Decision: require `Authorization: Bearer <SAFETY_ADMIN_TOKEN>` before any deployed environment. For Phase 0 local dev it logs a warning when the token env var is absent.

- [ ] **Step 1: Create admin-auth.middleware.ts**

  Create `services/ai-workers/src/middleware/admin-auth.middleware.ts`:
  ```typescript
  /**
   * Admin Auth Middleware
   *
   * Guards internal-only endpoints that must never be publicly accessible.
   * Requires Authorization: Bearer <SAFETY_ADMIN_TOKEN>.
   *
   * SAFETY_ADMIN_TOKEN must be set in Railway environment variables for all
   * non-local environments. In local dev, a warning is logged if absent.
   *
   * Grounded in: ADR-048, ADR-049 (provisional admin access model).
   */

  import { type Request, type Response, type NextFunction } from "express";

  const SAFETY_ADMIN_TOKEN = process.env.SAFETY_ADMIN_TOKEN;

  if (!SAFETY_ADMIN_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[AdminAuth] CRITICAL: SAFETY_ADMIN_TOKEN is not set. " +
        "Admin-gated endpoints are UNPROTECTED. Set SAFETY_ADMIN_TOKEN in Railway."
      );
    } else {
      console.warn(
        "[AdminAuth] SAFETY_ADMIN_TOKEN not set — admin endpoints require the header " +
        "Authorization: Bearer dev-only-token-replace-in-prod in local dev. " +
        "Set SAFETY_ADMIN_TOKEN in your .env file."
      );
    }
  }

  export function requireAdminAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // If no token is configured, block all access (safest default)
    if (!SAFETY_ADMIN_TOKEN) {
      res.status(503).json({
        error: "Admin auth not configured. Set SAFETY_ADMIN_TOKEN.",
      });
      return;
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Bearer token required" });
      return;
    }

    const token = authHeader.slice("Bearer ".length);
    if (token !== SAFETY_ADMIN_TOKEN) {
      res.status(403).json({ error: "Forbidden: invalid admin token" });
      return;
    }

    next();
  }
  ```

- [ ] **Step 2: Apply requireAdminAuth to POST /api/safety/check**

  In `services/ai-workers/src/routes/moderation.route.ts`, add the import and apply middleware:

  ```typescript
  import { Router, type Request, type Response } from "express";
  import { requireAdminAuth } from "../middleware/admin-auth.middleware";
  // ... other imports unchanged
  ```

  Change the route definition:
  ```typescript
  // BEFORE
  moderationRouter.post("/check", (req: Request, res: Response) => {

  // AFTER
  moderationRouter.post("/check", requireAdminAuth, (req: Request, res: Response) => {
  ```

  Also remove the "OPEN QUESTION" comment in the file header (it is now resolved):
  ```
  // OPEN QUESTION: The /api/safety/check endpoint returns raw classifier results...
  // — Agent 7, Phase 0
  ```

- [ ] **Step 3: Verify typecheck**
  ```
  cd services/ai-workers && pnpm typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**
  ```
  git add services/ai-workers/src/middleware/admin-auth.middleware.ts services/ai-workers/src/routes/moderation.route.ts
  git commit -m "feat(ai-workers): admin auth gate for POST /api/safety/check — require SAFETY_ADMIN_TOKEN"
  ```

---

## Task 12 — Migration 003: house enum, curriculum prefs, onboarding sessions

**Files:**
- Create: `infra/supabase/migrations/003_curriculum_prefs_onboarding_sessions.sql`

**Background:** Three DB changes:
1. Add `pre_sorting` to the `house_name` enum (to support the academy_identities.house default before Sorting Ceremony)
2. Create `parent_curriculum_prefs` table (replaces adding focus_subjects to child_permissions)
3. Create `onboarding_sessions` table (server-side onboarding token, replaces fragile sessionStorage)

- [ ] **Step 1: Create migration 003 SQL file**

  Create `infra/supabase/migrations/003_curriculum_prefs_onboarding_sessions.sql`:

  ```sql
  -- =============================================================================
  -- L3ARN Migration 003 — House Pre-Sorting, Curriculum Prefs, Onboarding Sessions
  -- =============================================================================
  -- Grounded in:
  --   Wave 1 OQ Resolutions (June 2026):
  --     OQ-7  → Add pre_sorting to house_name enum
  --     OQ-10 → Create parent_curriculum_prefs (not child_permissions.focus_subjects)
  --     OQ-15 → Create onboarding_sessions (server-side onboarding token)
  -- =============================================================================

  BEGIN;

  -- ---------------------------------------------------------------------------
  -- 1. Add pre_sorting to house_name enum
  -- ---------------------------------------------------------------------------
  -- pre_sorting is the value set for academy_identities.house before the
  -- Sorting Ceremony. Never display it as a real House name in the UI.
  -- Restoration to a real House requires founder/admin review.

  ALTER TYPE public.house_name ADD VALUE IF NOT EXISTS 'pre_sorting' BEFORE 'Valkryn';

  -- Update academy_identities default so new inserts before Sorting Ceremony
  -- get pre_sorting automatically.
  ALTER TABLE public.academy_identities
    ALTER COLUMN house SET DEFAULT 'pre_sorting';

  -- ---------------------------------------------------------------------------
  -- 2. parent_curriculum_prefs table
  -- ---------------------------------------------------------------------------
  -- Curriculum preferences are parent-owned and household-scoped.
  -- Kept separate from child_permissions (which is access control, not curriculum).
  -- Owned by: parent / household admin.
  -- Access: authenticated parent via household RLS.

  CREATE TABLE IF NOT EXISTS public.parent_curriculum_prefs (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_profile_id          UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    household_id              UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,

    -- Curriculum focus
    focus_subjects            JSONB NOT NULL DEFAULT '[]',   -- e.g. ["math", "science"]
    blocked_topics            JSONB NOT NULL DEFAULT '[]',   -- mirrors child_permissions; curriculum-specific additions
    parent_goals              JSONB NOT NULL DEFAULT '[]',   -- free-form parent goals text

    -- Delivery preferences
    preferred_delivery_modes  JSONB NOT NULL DEFAULT '["3d"]',  -- subset of delivery_mode enum values
    outside_time_preference   TEXT,                             -- e.g. "evenings only"
    screen_time_preference    TEXT,                             -- e.g. "1 hour max per session"

    -- Approval mode (mirrors child_permissions.curriculum_approval_mode for curriculum context)
    approval_mode             public.approval_mode NOT NULL DEFAULT 'balanced',

    -- Optional sensitive preferences
    religious_or_secular_preference TEXT,    -- e.g. "secular only" or "faith-integrated"
    custom_notes              TEXT,           -- free-form parent notes for the AI

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (child_profile_id)  -- one prefs record per child
  );

  -- RLS: parent may only access their own household's curriculum prefs
  ALTER TABLE public.parent_curriculum_prefs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "parent_curriculum_prefs_select"
    ON public.parent_curriculum_prefs FOR SELECT
    USING (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  CREATE POLICY "parent_curriculum_prefs_insert"
    ON public.parent_curriculum_prefs FOR INSERT
    WITH CHECK (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  CREATE POLICY "parent_curriculum_prefs_update"
    ON public.parent_curriculum_prefs FOR UPDATE
    USING (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  -- No DELETE policy — soft-delete only (set a flag if needed in future).

  -- ---------------------------------------------------------------------------
  -- 3. onboarding_sessions table
  -- ---------------------------------------------------------------------------
  -- Server-side onboarding token. Replaces fragile sessionStorage flow.
  -- Each onboarding attempt for a child gets a short-lived token.
  -- Token expires after completion or ONBOARDING_SESSION_TTL_MINUTES (default 60).

  DO $$ BEGIN
    CREATE TYPE public.onboarding_status AS ENUM (
      'in-progress',
      'completed',
      'expired',
      'abandoned'
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id      UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    child_profile_id  UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,

    -- Token: short-lived, sent to the client as a URL param or secure cookie
    -- The token itself is stored hashed (sha256) to prevent theft from DB reads.
    -- The Railway API compares hash(incoming_token) against this column.
    token_hash        TEXT NOT NULL UNIQUE,

    status            public.onboarding_status NOT NULL DEFAULT 'in-progress',

    -- Tracks where in the onboarding flow the user is
    current_step      TEXT NOT NULL DEFAULT 'household',

    -- TTL: expires_at is set at INSERT time; API rejects expired tokens
    expires_at        TIMESTAMPTZ NOT NULL,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- RLS: only the owning parent may read/update their onboarding session
  ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "onboarding_sessions_select"
    ON public.onboarding_sessions FOR SELECT
    USING (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  CREATE POLICY "onboarding_sessions_insert"
    ON public.onboarding_sessions FOR INSERT
    WITH CHECK (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  CREATE POLICY "onboarding_sessions_update"
    ON public.onboarding_sessions FOR UPDATE
    USING (
      household_id IN (
        SELECT id FROM public.households WHERE parent_account_id = auth.uid()
      )
    );

  -- No DELETE policy.

  -- Service role may also INSERT onboarding sessions on behalf of the parent
  -- (used by Railway API when the parent creates a new child onboarding flow).
  CREATE POLICY "onboarding_sessions_service_role_all"
    ON public.onboarding_sessions FOR ALL
    USING (auth.role() = 'service_role');

  -- ---------------------------------------------------------------------------
  -- 4. Updated-at trigger helper (shared pattern)
  -- ---------------------------------------------------------------------------

  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER parent_curriculum_prefs_updated_at
    BEFORE UPDATE ON public.parent_curriculum_prefs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  CREATE TRIGGER onboarding_sessions_updated_at
    BEFORE UPDATE ON public.onboarding_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  COMMIT;
  ```

- [ ] **Step 2: Verify SQL syntax**

  If you have the Supabase CLI installed locally:
  ```
  supabase db reset --local
  ```
  Expected: migrations 001, 002, 003 apply without errors.

  If not, review the SQL for:
  - `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is PostgreSQL 9.1+ and idempotent ✓
  - `REFERENCES public.child_profiles(id)` — the `child_profiles` table is created in Migration 001 ✓
  - `REFERENCES public.households(id)` — created in Migration 001 ✓
  - `auth.uid()` and `auth.role()` are Supabase auth helpers available in RLS policies ✓

- [ ] **Step 3: Commit**
  ```
  git add infra/supabase/migrations/003_curriculum_prefs_onboarding_sessions.sql
  git commit -m "feat(db): migration 003 — pre_sorting house enum, parent_curriculum_prefs, onboarding_sessions"
  ```

---

## Task 13 — Delete old Vite pages

**Files:**
- Delete: `apps/web/src/pages/student/` (entire directory — 6 files)

**Background:** The `src/pages/student/` directory contains copies of pages written in the old Vite/React Router pattern. The canonical routes now live in `apps/web/src/app/(student)/`. Confirmed by decision 4: Next.js App Router is canonical.

Before deleting, verify none of these components export reusable logic consumed elsewhere:

- `AcademyScene.tsx` — replaced by `src/app/(student)/academy/page.tsx`
- `CompanionSelection.tsx` — replaced by `src/app/(student)/onboarding/companion/page.tsx`
- `EnterAcademy.tsx` — replaced by `src/app/(student)/enter/page.tsx`
- `HouseSelection.tsx` — replaced by `src/app/(student)/onboarding/house/page.tsx`
- `MissionBriefing.tsx` — replaced by `src/app/(student)/mission/[missionId]/page.tsx`
- `StudentLayout.tsx` — replaced by `src/app/(student)/layout.tsx`

- [ ] **Step 1: Check for any imports of the old pages files**
  ```
  grep -r "src/pages/student" apps/web/src --include="*.tsx" --include="*.ts"
  grep -r "from.*pages/student" apps/web/src --include="*.tsx" --include="*.ts"
  ```
  Expected: no results. If any imports exist, update them to the new App Router paths before deleting.

- [ ] **Step 2: Delete the directory**
  ```
  rm -rf apps/web/src/pages/student
  ```

- [ ] **Step 3: Verify Next.js build is not affected**
  ```
  cd apps/web && pnpm typecheck
  ```
  Expected: no errors referencing the deleted files.

- [ ] **Step 4: Commit**
  ```
  git add -A apps/web/src/pages/
  git commit -m "chore(web): delete old Vite/React Router pages — Next.js App Router is canonical"
  ```

---

## Task 14 — World Engine: Zustand store + wire PlayerAvatar movement

**Files:**
- Modify: `packages/world-engine/package.json` (add zustand dep)
- Create: `packages/world-engine/src/state/worldStore.ts`
- Modify: `packages/world-engine/src/objects/PlayerAvatar.tsx`
- Modify: `packages/world-engine/src/scenes/GreatHall.tsx`

**Background:** `PlayerAvatar.tsx` has a lerp-based `moveTo()` method that is not wired to the floor-click `avatar-move-requested` event. The approved solution is a Zustand world store. The store holds `moveTarget`; the avatar subscribes; the scene dispatches on floor click.

- [ ] **Step 1: Add zustand to world-engine package.json**

  In `packages/world-engine/package.json`, add to `dependencies`:
  ```json
  "zustand": "^4.5.0"
  ```

  Run:
  ```
  cd packages/world-engine && pnpm install
  ```

- [ ] **Step 2: Create worldStore.ts**

  Create `packages/world-engine/src/state/worldStore.ts`:
  ```typescript
  /**
   * World State Store (Zustand)
   *
   * Holds the single source of truth for the 3D world's runtime state.
   * Components dispatch actions; subscribers re-render reactively.
   *
   * Avatar movement flow:
   *   1. User clicks floor → GreatHall dispatches avatar-move-requested WorldEvent
   *   2. WorldCanvas (or scene) calls worldStore.getState().setMoveTarget(x, y, z)
   *   3. PlayerAvatar subscribes to moveTarget and lerps toward it each frame
   */

  import { create } from "zustand";

  interface WorldState {
    /** Target position for avatar lerp movement. null = no pending movement. */
    moveTarget: { x: number; y: number; z: number } | null;

    /** Current scene key */
    currentScene: string | null;

    /** Whether a world-state freeze is active (safety containment) */
    worldStateFrozen: boolean;

    // ── Actions ──────────────────────────────────────────────────────────────

    setMoveTarget: (x: number, y: number, z: number) => void;
    clearMoveTarget: () => void;
    setCurrentScene: (scene: string) => void;
    freezeWorldState: () => void;
    unfreezeWorldState: () => void;
  }

  export const useWorldStore = create<WorldState>((set) => ({
    moveTarget: null,
    currentScene: null,
    worldStateFrozen: false,

    setMoveTarget: (x, y, z) =>
      set((state) => {
        if (state.worldStateFrozen) return state; // ignore moves during freeze
        return { moveTarget: { x, y, z } };
      }),

    clearMoveTarget: () => set({ moveTarget: null }),

    setCurrentScene: (scene) => set({ currentScene: scene }),

    freezeWorldState: () => set({ worldStateFrozen: true }),

    unfreezeWorldState: () => set({ worldStateFrozen: false }),
  }));
  ```

- [ ] **Step 3: Update PlayerAvatar.tsx to subscribe to worldStore**

  Replace the full content of `packages/world-engine/src/objects/PlayerAvatar.tsx`:

  ```typescript
  /**
   * PlayerAvatar — The student's in-world representation.
   *
   * Renders as a capsule mesh tinted by the student's House color.
   * Displays the Academy Display Name (never legal name — ADR-007).
   *
   * Movement: subscribes to worldStore.moveTarget and lerps toward it each frame.
   * Floor clicks dispatch avatar-move-requested → GreatHall → worldStore.setMoveTarget.
   */

  import { useRef } from 'react';
  import { useFrame } from '@react-three/fiber';
  import { Html } from '@react-three/drei';
  import { Vector3, type Mesh } from 'three';
  import { HOUSE_COLORS } from '../types';
  import { useWorldStore } from '../state/worldStore';

  interface PlayerAvatarProps {
    displayName: string;
    house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
    initialPosition?: [number, number, number];
  }

  const LERP_SPEED = 0.05;

  export function PlayerAvatar({
    displayName,
    house,
    initialPosition = [3, 0.9, 3],
  }: PlayerAvatarProps) {
    const meshRef = useRef<Mesh>(null);
    const currentPos = useRef(new Vector3(...initialPosition));
    const targetVec = useRef(new Vector3(...initialPosition));

    const moveTarget = useWorldStore((s) => s.moveTarget);

    // Sync targetVec with store's moveTarget
    if (moveTarget) {
      targetVec.current.set(moveTarget.x, initialPosition[1], moveTarget.z);
    }

    useFrame(() => {
      if (!meshRef.current) return;
      currentPos.current.lerp(targetVec.current, LERP_SPEED);
      meshRef.current.position.copy(currentPos.current);
    });

    const houseColor = house ? HOUSE_COLORS[house] : '#64748b';

    return (
      <group ref={meshRef} position={initialPosition}>
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
          <meshStandardMaterial color={houseColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color={houseColor} roughness={0.5} />
        </mesh>
        <Html
          position={[0, 1.4, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#f1f5f9',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: `1px solid ${houseColor}`,
            }}
          >
            {displayName}
          </div>
        </Html>
      </group>
    );
  }
  ```

- [ ] **Step 4: Update GreatHall.tsx to call worldStore.setMoveTarget on floor click**

  In `packages/world-engine/src/scenes/GreatHall.tsx`, add the import and wire the floor click:

  ```typescript
  import { SortingComputer } from '../objects/SortingComputer';
  import { PlayerAvatar } from '../objects/PlayerAvatar';
  import type { SceneProps } from '../types';
  import { useWorldStore } from '../state/worldStore';

  export function GreatHall({ onEvent, displayName = 'Explorer', house }: SceneProps) {
    const setMoveTarget = useWorldStore((s) => s.setMoveTarget);

    function handleFloorClick(e: { stopPropagation: () => void; point?: { x: number; y: number; z: number } }) {
      e.stopPropagation();
      const pt = e.point ?? { x: 0, y: 0, z: 0 };
      // Update world store — PlayerAvatar subscribes and lerps to new target
      setMoveTarget(pt.x, 0, pt.z);
      onEvent({
        type: 'avatar-move-requested',
        targetPosition: { x: pt.x, y: 0, z: pt.z },
      });
    }

    return (
      <group>
        {/* Floor — gray stone placeholder */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={handleFloorClick as any}
        >
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>

        {/* Back wall */}
        <mesh position={[0, 5, -15]} receiveShadow castShadow>
          <boxGeometry args={[30, 10, 1]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Left wall */}
        <mesh position={[-15, 5, 0]} receiveShadow castShadow>
          <boxGeometry args={[1, 10, 30]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Right wall */}
        <mesh position={[15, 5, 0]} receiveShadow castShadow>
          <boxGeometry args={[1, 10, 30]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Front wall — split to leave entrance gap */}
        <mesh position={[-8, 5, 15]} receiveShadow castShadow>
          <boxGeometry args={[14, 10, 1]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[8, 5, 15]} receiveShadow castShadow>
          <boxGeometry args={[14, 10, 1]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Sorting Computer — Mission 001 trigger */}
        <SortingComputer position={[0, 0.75, -10]} onEvent={onEvent} />

        {/* Player avatar — subscribes to worldStore.moveTarget */}
        <PlayerAvatar
          displayName={displayName}
          house={house}
          initialPosition={[0, 0.9, 8]}
        />
      </group>
    );
  }
  ```

- [ ] **Step 5: Export worldStore from world-engine index**

  In `packages/world-engine/src/index.ts`, add:
  ```typescript
  export * from "./state/worldStore";
  ```

- [ ] **Step 6: Run typecheck**
  ```
  cd packages/world-engine && pnpm lint
  ```
  Expected: no TypeScript errors.

- [ ] **Step 7: Commit**
  ```
  git add packages/world-engine/package.json packages/world-engine/src/state/worldStore.ts packages/world-engine/src/objects/PlayerAvatar.tsx packages/world-engine/src/scenes/GreatHall.tsx packages/world-engine/src/index.ts
  git commit -m "feat(world-engine): Zustand world store — wire floor-click avatar movement via setMoveTarget"
  ```

---

## Self-Review

### Spec Coverage

| Decision | Task | Status |
|----------|------|--------|
| 1. Automated safety containment (ADR-047 amendment) | Task 9 | ✓ |
| 2. 3 retries confirmed + parent notification rules | Compiler comment + .env.example | ✓ note: notification delivery mechanism is Sprint 2 |
| 3. No hardcoded model — ANTHROPIC_MODEL env var | Task 7 | ✓ |
| 4. Next.js App Router canonical — delete Vite pages | Task 13 | ✓ |
| 5. Structured output (tool_use) for Mission Compiler | Task 8 | ✓ |
| 6. House on academy_identities.house, not child_profiles | Implicit in schema — no code change needed; enforced by Migration 003 default | ✓ |
| 7. pre_sorting enum value | Tasks 3 + 12 | ✓ |
| 8. ModerationEvent schema — Phase 0 extension acceptable | Task 10 (fix trigger source) | ✓ |
| 9. CalibrationSignal from @l3arn/shared-types | Task 6 | ✓ |
| 10. parent_curriculum_prefs table | Task 12 | ✓ |
| 11. Backend-mediated student onboarding writes | Task 4 (placeholder updated) | ✓ Sprint 2 |
| 12. /api/safety/check admin auth gate | Task 11 | ✓ |
| 13. /student/enter localStorage dev warning | Task 5 | ✓ Sprint 2 |
| 14. parentVisibilityTier K-5/6-8 default (backend function) | Not implemented — Sprint 2 Railway function | Note below |
| 15. onboarding_sessions table | Task 12 | ✓ |
| 16. Avatar Zustand store + moveTo wiring | Task 14 | ✓ |
| 17. Scene transition animations (deferred) | No code change — decision is "defer" | ✓ |
| 18. Node >=18 engines pin | Task 1 | ✓ |

**Decision 14 note (parentVisibilityTier):** The Railway function that sets visibility tier based on grade is a Sprint 2 task — it requires a Railway endpoint that fires after `child_profiles` INSERT. No Supabase DB trigger. This plan does not implement it; Sprint 2 plan should include it as the first task in the `services/api` service.

### Placeholder Scan

No "TBD", "fill in details", or "implement later" language in code steps. All tasks include complete implementation or a clear doc-only note for Sprint 2 items.

### Type Consistency

- `HouseSchema` adds `"pre_sorting"` — all downstream types updated (world-engine/types.ts, WorldCanvas.tsx, PlayerAvatar.tsx) ✓
- `CalibrationSignal` type is now from `@l3arn/shared-types` everywhere — `compiler.ts` import unchanged ✓
- `ModerationEvent.triggerSource` added — creator fixed ✓
- `SafetyContainmentTrigger` is new — no downstream consumers yet (Phase 2 infrastructure will inject it) ✓
