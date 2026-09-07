# Mission Generation Fast Start — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut Mission 001 start latency from 90–270s to ~3–6s and make AI-personalized content the default (not the fallback), by generating only the one mission section the runtime actually consumes.

**Architecture:** Add a `compileStart()` path to `MissionCompiler` that asks Claude to fill a tool schema scoped to `student3dMission` only (instead of all six mission sections), validated against the narrow `AI3dMissionSchema`, with a narrow fallback slice. Wire `mission-runtime.startMission` to call it. Fix the PR #20 retry predicate so a request timeout short-circuits to fallback in prod. The full six-section `compile()` stays intact but unused (opt-in for a future multi-format runtime).

**Tech Stack:** TypeScript, `@anthropic-ai/sdk@0.26.1` (tool_use structured output), Zod, `zod-to-json-schema`, Jest (ts-jest ESM), Express (Railway `ai-workers`).

**Spec:** `docs/superpowers/specs/2026-07-04-mission-generation-latency-design.md`

**Working branch:** `perf/mission-generation-fast-start` (already created off `main`).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `packages/mission-compiler/src/validation/mission-output.schema.ts` | modify | Export `AI3dMissionSchema` (currently private) for narrow validation + JSON schema. |
| `packages/mission-compiler/src/validation/mission-3d.json-schema.ts` | create | Narrow tool `input_schema` (student3dMission only). |
| `packages/mission-compiler/src/prompts/mission-001-3d.prompt.ts` | create | Focused system prompt that asks only for `student3dMission`. |
| `packages/mission-compiler/src/fallbacks/mission-001.fallback.ts` | modify | Add `getMission001FallbackStudent3d()` — the student3dMission slice of the fallback. |
| `packages/mission-compiler/src/retry/retry-engine.ts` | (already has predicate param — add a test) | Short-circuit fatal generation errors. |
| `packages/mission-compiler/src/compiler.ts` | modify | Export a robust `isNonRetryableAiError`; add client injection; add `compileStart()`; lower timeout default. |
| `packages/mission-compiler/src/index.ts` | modify | Export `compileStart` return type + `isNonRetryableAiError`. |
| `services/ai-workers/src/missions/mission-runtime.ts` | modify | Call `compileStart()` and read `output.student3dMission`. |

New test files:
- `packages/mission-compiler/src/retry/retry-engine.test.ts`
- `packages/mission-compiler/src/validation/mission-3d.json-schema.test.ts`
- `packages/mission-compiler/src/fallbacks/mission-001.fallback.test.ts`
- `packages/mission-compiler/src/compiler.compile-start.test.ts`

Test runner: `cd packages/mission-compiler && pnpm test` (jest). Typecheck: `pnpm -r typecheck`.

---

## Task 1: Export `AI3dMissionSchema` + narrow tool JSON schema

**Files:**
- Modify: `packages/mission-compiler/src/validation/mission-output.schema.ts:80`
- Create: `packages/mission-compiler/src/validation/mission-3d.json-schema.ts`
- Test: `packages/mission-compiler/src/validation/mission-3d.json-schema.test.ts`

- [ ] **Step 1: Export the existing narrow schema**

In `mission-output.schema.ts`, change the `AI3dMissionSchema` declaration (currently `const AI3dMissionSchema = ...`) to be exported:

```typescript
// ─── Output 2: 3D Mission ─────────────────────────────────────────────────────

export const AI3dMissionSchema = z.object({
  storyHook: z.string().min(1),
  worldRoomId: z.string().min(1),
  companionDialogue: z.array(CompanionDialogueLineSchema).min(1),
  tasks: z.array(MissionTaskSchema).min(1),
  rewardPreviewLabel: z.string().min(1),
});
export type AI3dMission = z.infer<typeof AI3dMissionSchema>;
```

(Leave `AIRawMissionOutputSchema` unchanged — it still references `AI3dMissionSchema`.)

- [ ] **Step 2: Write the failing test for the narrow JSON schema**

Create `mission-3d.json-schema.test.ts`:

```typescript
import { MISSION_3D_JSON_SCHEMA } from "./mission-3d.json-schema";

describe("MISSION_3D_JSON_SCHEMA", () => {
  it("is a JSON-Schema object with only the student3dMission fields", () => {
    expect(MISSION_3D_JSON_SCHEMA.type).toBe("object");
    const props = MISSION_3D_JSON_SCHEMA.properties as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(
      ["companionDialogue", "rewardPreviewLabel", "storyHook", "tasks", "worldRoomId"],
    );
    // Must NOT carry the discarded sections.
    expect(props.parentPlan).toBeUndefined();
    expect(props.evidencePlan).toBeUndefined();
    expect(props.rewardPlan).toBeUndefined();
  });

  it("stays flat (no $ref/$defs) so the Anthropic validator accepts it", () => {
    const json = JSON.stringify(MISSION_3D_JSON_SCHEMA);
    expect(json).not.toContain("$ref");
    expect(json).not.toContain("$defs");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd packages/mission-compiler && pnpm test mission-3d.json-schema`
Expected: FAIL — `Cannot find module './mission-3d.json-schema'`.

- [ ] **Step 4: Create the narrow JSON schema**

Create `mission-3d.json-schema.ts`:

```typescript
/**
 * Narrow tool `input_schema` for the fast mission-start path: the student3dMission
 * section only. Same generator settings as MISSION_OUTPUT_JSON_SCHEMA (jsonSchema7,
 * $refStrategy: "none") so the Anthropic tool validator accepts it (draft 2020-12,
 * flat, no $ref) — verified against the live API for the full schema on 2026-06-28.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { AI3dMissionSchema } from "./mission-output.schema";

export const MISSION_3D_JSON_SCHEMA = zodToJsonSchema(
  AI3dMissionSchema,
  { target: "jsonSchema7", $refStrategy: "none", errorMessages: false },
) as { type: "object"; properties: Record<string, unknown>; [key: string]: unknown };
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `cd packages/mission-compiler && pnpm test mission-3d.json-schema`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/mission-compiler/src/validation/mission-output.schema.ts \
  packages/mission-compiler/src/validation/mission-3d.json-schema.ts \
  packages/mission-compiler/src/validation/mission-3d.json-schema.test.ts
git commit -m "feat(mission-compiler): narrow tool schema for student3dMission-only generation"
```

---

## Task 2: Focused system prompt for `student3dMission` only

**Files:**
- Create: `packages/mission-compiler/src/prompts/mission-001-3d.prompt.ts`

- [ ] **Step 1: Create the focused prompt**

Create `mission-001-3d.prompt.ts` (reuses the existing user-message builder; only the system prompt is scoped down):

```typescript
/**
 * Mission 001 — focused prompt for the fast-start path.
 *
 * Asks Claude to fill ONLY the student3dMission section (storyHook, worldRoomId,
 * companionDialogue, tasks, rewardPreviewLabel) — the single section the runtime
 * consumes at start. The user message (three-part constraint) is reused verbatim
 * from mission-001.prompt.ts so personalization inputs stay identical.
 *
 * Grounded in: ADR-014 (three-part constraint), ADR-015 (conflict order),
 * ADR-016 (student3dMission is one of the six mission outputs).
 */

export const MISSION_001_3D_PROMPT_TEMPLATE_VERSION = "3d-0.1.0";

export function buildMission0013dSystemPrompt(): string {
  return `You are the L3ARN Mission Compiler — you generate the in-world 3D experience for Mission 001 ("Repair the Sorting Computer") for a K-8 student in a safe, parent-controlled homeschool platform.

## Your Role
Produce ONLY the student-facing 3D mission: the in-world story hook, companion dialogue, the ordered tasks, and the reward preview. This is a color-sorting/classification mission set in the Great Hall.

## Conflict Resolution Order (MANDATORY — apply in this sequence)
1. SAFETY/LEGAL: Never generate content harmful or inappropriate for K-8. This always wins.
2. PARENT BOUNDARIES: Honor all blocked topics and parent instructions exactly.
3. MASTERY/STANDARDS: Preserve the sorting/classification objective — reformat, never discard.
4. CHILD PERSONALIZATION: Adapt scaffolding and pacing to the child's learning preferences.
5. CHILD THEME: Use the child's house and companion to decorate the story and dialogue.

## Output Requirements
Call the \`generate_student_3d_mission\` tool with an object matching its schema exactly:
- storyHook: the in-world narrative hook (personalized to the child's house/companion).
- worldRoomId: always "great-hall".
- companionDialogue: at least one line per trigger (on-start, on-hint-requested, on-step-complete, on-mistake, on-mission-complete). Always refer to the companion by the exact name given; never invent a different one.
- tasks: the ordered gameplay steps. Include the signature Mission 001 beat where the student catches a deliberate sorting MISTAKE the AI made (an "ai-mistake-check" style task with interactionType "choice"), plus a final task where the student explains their sorting rule (interactionType "choice", isEvidenceCapturePoint true).
- rewardPreviewLabel: a short reward summary shown before starting.

## Privacy Rules (NON-NEGOTIABLE)
- Never include real student names, addresses, or identifying information in mission content.
- Never suggest webcam, face capture, or required audio.

Return the tool call only — no preamble, no explanation.`;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/mission-compiler && pnpm typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/mission-compiler/src/prompts/mission-001-3d.prompt.ts
git commit -m "feat(mission-compiler): focused system prompt for student3dMission generation"
```

---

## Task 3: Fallback slice helper

**Files:**
- Modify: `packages/mission-compiler/src/fallbacks/mission-001.fallback.ts`
- Test: `packages/mission-compiler/src/fallbacks/mission-001.fallback.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mission-001.fallback.test.ts`:

```typescript
import { getMission001FallbackStudent3d } from "./mission-001.fallback";
import { Student3dMissionSchema } from "@l3arn/shared-types";

describe("getMission001FallbackStudent3d", () => {
  it("returns the student3dMission slice, valid against the shared-types schema", () => {
    const slice = getMission001FallbackStudent3d();
    expect(() => Student3dMissionSchema.parse(slice)).not.toThrow();
    expect(slice.worldRoomId).toBe("great-hall");
    expect(slice.tasks.length).toBeGreaterThan(0);
    expect(typeof slice.storyHook).toBe("string");
    expect(typeof slice.rewardPreviewLabel).toBe("string");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/mission-compiler && pnpm test mission-001.fallback`
Expected: FAIL — `getMission001FallbackStudent3d is not a function` / not exported.

- [ ] **Step 3: Add the helper**

At the bottom of `mission-001.fallback.ts`, add:

```typescript
import { Student3dMissionSchema, type Student3dMission } from "@l3arn/shared-types";

/**
 * The student3dMission slice of the safe fallback, parsed to the shared-types
 * shape. Used by the fast-start path (compileStart) when AI generation fails —
 * it needs only this section, not the whole mission.
 */
export function getMission001FallbackStudent3d(): Student3dMission {
  const parsed = JSON.parse(MISSION_001_FALLBACK.content) as { student3dMission: unknown };
  return Student3dMissionSchema.parse(parsed.student3dMission);
}
```

(Place the `import` with the existing top-of-file imports rather than mid-file; shown here for locality.)

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/mission-compiler && pnpm test mission-001.fallback`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/fallbacks/mission-001.fallback.ts \
  packages/mission-compiler/src/fallbacks/mission-001.fallback.test.ts
git commit -m "feat(mission-compiler): expose student3dMission fallback slice"
```

---

## Task 4: Robust `isNonRetryableAiError` + retry-engine short-circuit test (fixes PR #20 prod miss)

**Files:**
- Modify: `packages/mission-compiler/src/compiler.ts` (the `isNonRetryableAiError` function)
- Test: `packages/mission-compiler/src/retry/retry-engine.test.ts`

**Context:** In prod, the SDK's timeout surfaced as an error whose `instanceof Anthropic.APIConnectionTimeoutError` check did NOT match, so `withAIRetry` retried all 3 attempts (3×90s=270s) instead of short-circuiting. Broaden the predicate to duck-type by name/message.

- [ ] **Step 1: Replace the predicate in `compiler.ts` and export it**

Find the existing `isNonRetryableAiError` (added in PR #20) and replace it with:

```typescript
/**
 * A generation error that retrying the identical call cannot fix: a request
 * timeout or a user/programmatic abort. Detected by both instanceof AND
 * name/message duck-typing — in the Railway runtime the SDK timeout did NOT
 * match instanceof alone (PR #20 prod miss), so it retried 3× instead of
 * short-circuiting. These go straight to the safe fallback; validation
 * (ZodError) failures are still retried.
 */
export function isNonRetryableAiError(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return true;
  if (error instanceof Anthropic.APIUserAbortError) return true;
  const name = (error as { name?: unknown } | null)?.name;
  if (
    typeof name === "string" &&
    ["APIConnectionTimeoutError", "APIUserAbortError", "AbortError", "TimeoutError"].includes(name)
  ) {
    return true;
  }
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && /timed out|timeout|aborted|abort/i.test(message)) return true;
  return false;
}
```

- [ ] **Step 2: Write the failing retry-engine test**

Create `retry/retry-engine.test.ts` (this package uses jest — `describe`/`it`/`expect` are ambient globals, no import needed):

```typescript
import { withAIRetry } from "./retry-engine";
import { isNonRetryableAiError } from "../compiler";
import type { SafeFallback } from "@l3arn/shared-types";

const FALLBACK: SafeFallback = {
  id: "test-fallback",
  context: "mission-generation",
  title: "t",
  content: "{}",
  parentNote: "n",
  parentVisible: true,
  isAIGenerated: false,
};

describe("withAIRetry — fatal generation errors", () => {
  it("short-circuits to fallback after ONE attempt when the error is a timeout", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw { name: "AbortError", message: "Request timed out." };
    };
    const result = await withAIRetry(generate, (r) => r, () => FALLBACK, isNonRetryableAiError);
    expect(calls).toBe(1); // NOT 3
    expect(result.status).toBe("failed-with-fallback");
  });

  it("still retries 3× for a non-fatal generation error", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw new Error("transient network blip");
    };
    const result = await withAIRetry(generate, (r) => r, () => FALLBACK, isNonRetryableAiError);
    expect(calls).toBe(3);
    expect(result.status).toBe("failed-with-fallback");
  });

  it("predicate matches by name and message, not just instanceof", () => {
    expect(isNonRetryableAiError({ name: "AbortError" })).toBe(true);
    expect(isNonRetryableAiError({ message: "Request timed out." })).toBe(true);
    expect(isNonRetryableAiError(new Error("boom"))).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd packages/mission-compiler && pnpm test retry-engine`
Expected: FAIL — `isNonRetryableAiError` is not yet exported from `../compiler` (Step 1 exports it; if Step 1 is done, the failing case is the `calls).toBe(1)` assertion only if the predicate is wrong). If Step 1 is complete, this test should already pass — run it to confirm the short-circuit and 3×-retry behaviors both hold.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/mission-compiler && pnpm test retry-engine`
Expected: PASS (3 tests). `calls === 1` for timeout, `calls === 3` for generic error.

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/compiler.ts \
  packages/mission-compiler/src/retry/retry-engine.test.ts
git commit -m "fix(mission-compiler): duck-type timeout/abort so retry short-circuits in prod (#20)"
```

---

## Task 5: Add client injection + `compileStart()`

**Files:**
- Modify: `packages/mission-compiler/src/compiler.ts`
- Modify: `packages/mission-compiler/src/index.ts`
- Test: `packages/mission-compiler/src/compiler.compile-start.test.ts`

- [ ] **Step 1: Allow injecting the Anthropic client (for tests)**

Change the constructor in `compiler.ts`:

```typescript
export class MissionCompiler {
  private readonly client: Anthropic;

  constructor(apiKey?: string, client?: Anthropic) {
    this.client = client ?? new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }
```

- [ ] **Step 2: Add the `compileStart` return type + a private envelope helper**

Add near the other interfaces in `compiler.ts`:

```typescript
/** The fast-start compiler output — only the section the runtime consumes at start. */
export interface MissionStartCompilerOutput {
  student3dMission: import("@l3arn/shared-types").Student3dMission;
  usedFallback: boolean;
  envelope: AIOutputEnvelope;
}
```

Add this private method to the class (extracts the envelope build so `compile` and `compileStart` share it):

```typescript
  private buildEnvelope(
    traceId: string,
    requestedAt: string,
    result: AIOutputResult,
    modelVersion: string,
    input: MissionCompilerInput,
  ): AIOutputEnvelope {
    return {
      id: uuidv4(),
      traceId,
      generationContext: "mission-compiler",
      childProfileId: input.childProfileId,
      childSessionId: input.childSessionId,
      requestedAt,
      result,
      modelProvider: MODEL_PROVIDER,
      modelVersion,
      promptTemplateVersion: MISSION_001_PROMPT_TEMPLATE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      safetyPolicyVersion: undefined,
      missionCompilerVersion: MISSION_COMPILER_VERSION,
      parentVisible: true,
    };
  }
```

- [ ] **Step 3: Add the imports `compileStart` needs**

At the top of `compiler.ts`, add:

```typescript
import { AI3dMissionSchema } from "./validation/mission-output.schema";
import { MISSION_3D_JSON_SCHEMA } from "./validation/mission-3d.json-schema";
import { buildMission0013dSystemPrompt } from "./prompts/mission-001-3d.prompt";
import { getMission001FallbackStudent3d } from "./fallbacks/mission-001.fallback";
import { Student3dMissionSchema } from "@l3arn/shared-types";
```

(Reuse the already-imported `buildMission001UserMessage` from `./prompts/mission-001.prompt`.)

- [ ] **Step 4: Add the `compileStart` method**

```typescript
  /**
   * Fast-start compile: generate ONLY the student3dMission section (the single
   * section the runtime consumes at mission start). ~4-6× smaller than the full
   * six-section compile(), so it finishes inside the timeout and AI content is
   * the norm, not the fallback. Falls back to the student3dMission slice of
   * MISSION_001_FALLBACK on a genuine API failure.
   */
  async compileStart(input: MissionCompilerInput): Promise<MissionStartCompilerOutput> {
    const modelVersion = resolveModelVersion();
    const aiTimeoutMs = resolveAiTimeoutMs();
    const traceId = uuidv4();
    const requestedAt = new Date().toISOString();

    const systemPrompt = buildMission0013dSystemPrompt();
    const userMessage = buildMission001UserMessage({
      parentIntent: input.parentIntent,
      childPersonalization: {
        displayName: input.childPersonalization.displayName,
        houseAffiliation: input.childPersonalization.houseAffiliation,
        companionName: input.childPersonalization.companionName,
        companionPersonality: input.childPersonalization.companionPersonality,
        learningPrefs: input.childPersonalization.learningPrefs,
      },
      masteryTargets: input.masteryTargets,
    });

    const result: AIOutputResult = await withAIRetry(
      async () => {
        const response = await this.client.messages.create(
          {
            model: modelVersion,
            max_tokens: 4000, // student3dMission alone fits well under this
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            tools: [
              {
                name: "generate_student_3d_mission",
                description:
                  "Generate the student-facing 3D mission for Mission 001: story hook, " +
                  "companion dialogue, ordered tasks, and reward preview.",
                input_schema: MISSION_3D_JSON_SCHEMA,
              },
            ],
            tool_choice: { type: "tool", name: "generate_student_3d_mission" },
          },
          { timeout: aiTimeoutMs, maxRetries: 0 },
        );

        const toolUseBlock = response.content.find((block) => block.type === "tool_use");
        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          throw new Error("Claude did not return a tool_use block for generate_student_3d_mission");
        }
        return toolUseBlock.input;
      },
      (raw: unknown) => AI3dMissionSchema.parse(raw),
      () => MISSION_001_FALLBACK,
      isNonRetryableAiError,
    );

    const envelope = this.buildEnvelope(traceId, requestedAt, result, modelVersion, input);

    if (result.status === "validated") {
      const student3dMission = Student3dMissionSchema.parse(result.data);
      return { student3dMission, usedFallback: false, envelope };
    }

    console.warn(
      `[MissionCompiler] compileStart fallback for childProfileId=${input.childProfileId}. ` +
        `Notification: ${result.notificationLevel}. FallbackId: ${result.fallbackId}. TraceId: ${traceId}.`,
    );
    return {
      student3dMission: getMission001FallbackStudent3d(),
      usedFallback: true,
      envelope,
    };
  }
```

- [ ] **Step 5: Export the new type + predicate from the package barrel**

In `packages/mission-compiler/src/index.ts`, add (match the file's existing export style):

```typescript
export { MissionCompiler, isNonRetryableAiError } from "./compiler";
export type { MissionStartCompilerOutput } from "./compiler";
```

(If `MissionCompiler` is already exported there, extend that line rather than duplicating it.)

- [ ] **Step 6: Write the failing tests for `compileStart`**

Create `compiler.compile-start.test.ts`:

```typescript
import { MissionCompiler } from "./compiler";
import type { MissionCompilerInput } from "./compiler";
import { getMission001FallbackStudent3d } from "./fallbacks/mission-001.fallback";

process.env.ANTHROPIC_MODEL = "claude-sonnet-4-6";

const INPUT: MissionCompilerInput = {
  parentIntent: { curriculumGoals: [], gradeLevel: "Grade 4", blockedTopics: [], subjectFocus: ["Math"] },
  childPersonalization: {
    displayName: "QuasarKid3",
    houseAffiliation: "Novari",
    companionName: "Ziggy",
    companionPersonality: "playful",
    learningPrefs: [],
  },
  masteryTargets: { standardIds: ["L3ARN-SORT-001"], targetSkills: ["Sort by one attribute"] },
  childProfileId: "child-1",
  childSessionId: "sess-1",
};

// A valid student3dMission the fake model "returns" via tool_use.
const VALID_3D = {
  storyHook: "Ziggy needs your help sorting the Novari crystals!",
  worldRoomId: "great-hall",
  companionDialogue: [{ companionId: "ziggy", line: "Let's go!", trigger: "on-start" }],
  tasks: [{ id: "t1", description: "Sort the red crystals.", interactionType: "drag", isEvidenceCapturePoint: false }],
  rewardPreviewLabel: "10 Moolah + 50 XP",
};

function fakeClient(behavior: () => Promise<unknown>) {
  return { messages: { create: behavior } } as unknown as import("@anthropic-ai/sdk").default;
}

describe("MissionCompiler.compileStart", () => {
  it("returns AI content (usedFallback false) when the tool call validates", async () => {
    const client = fakeClient(async () => ({ content: [{ type: "tool_use", input: VALID_3D }] }));
    const compiler = new MissionCompiler(undefined, client);
    const out = await compiler.compileStart(INPUT);
    expect(out.usedFallback).toBe(false);
    expect(out.student3dMission.storyHook).toContain("Ziggy");
    expect(out.envelope.result.status).toBe("validated");
  });

  it("falls back to the student3dMission slice on a timeout (short-circuit, one attempt)", async () => {
    let calls = 0;
    const client = fakeClient(async () => {
      calls++;
      throw { name: "APIConnectionTimeoutError", message: "Request timed out." };
    });
    const compiler = new MissionCompiler(undefined, client);
    const out = await compiler.compileStart(INPUT);
    expect(calls).toBe(1); // did not retry 3×
    expect(out.usedFallback).toBe(true);
    expect(out.student3dMission.worldRoomId).toBe(getMission001FallbackStudent3d().worldRoomId);
  });
});
```

- [ ] **Step 7: Run the tests to confirm they pass**

Run: `cd packages/mission-compiler && pnpm test compile-start`
Expected: PASS (2 tests). If the first fails on model resolution, confirm `process.env.ANTHROPIC_MODEL` is set at the top of the test file (it is).

- [ ] **Step 8: Full package test + typecheck**

Run: `cd packages/mission-compiler && pnpm test && pnpm typecheck`
Expected: all tests PASS, 0 type errors.

- [ ] **Step 9: Commit**

```bash
git add packages/mission-compiler/src/compiler.ts packages/mission-compiler/src/index.ts \
  packages/mission-compiler/src/compiler.compile-start.test.ts
git commit -m "feat(mission-compiler): compileStart() generates student3dMission only"
```

---

## Task 6: Wire the runtime to `compileStart` + lower the timeout default

**Files:**
- Modify: `packages/mission-compiler/src/compiler.ts` (`resolveAiTimeoutMs` default)
- Modify: `services/ai-workers/src/missions/mission-runtime.ts:100-164`

- [ ] **Step 1: Lower the timeout default**

In `compiler.ts`, change the default in the timeout resolver (added in PR #20):

```typescript
const DEFAULT_AI_TIMEOUT_MS = 30_000; // small student3dMission call; rarely approached
```

(Keep the `MISSION_AI_TIMEOUT_MS` env override.)

- [ ] **Step 2: Switch the runtime to `compileStart`**

In `mission-runtime.ts`, replace the `compiler.compile({...})` call (around line 100) with `compiler.compileStart({...})` — the input object is unchanged:

```typescript
  const compiler = new MissionCompiler();
  const output = await compiler.compileStart({
    parentIntent: { curriculumGoals: [], gradeLevel: grade, blockedTopics: [], subjectFocus: [] },
    childPersonalization: {
      displayName,
      houseAffiliation,
      companionName,
      companionPersonality,
      learningPrefs: [],
      audioEnabled: false,
    },
    masteryTargets: {
      standardIds: ["L3ARN-SORT-001"],
      targetSkills: ["Sort by one attribute", "Explain sorting logic"],
    },
    childProfileId: session.child_profile_id,
    childSessionId: session.id,
  });
```

- [ ] **Step 3: Read `student3dMission` from the new output shape**

Change line ~145 from `const m = output.missionData.student3dMission;` to:

```typescript
  const m = output.student3dMission;
```

(`output.usedFallback` and `output.envelope.id` are unchanged — `compileStart` returns both.)

- [ ] **Step 4: Typecheck the whole workspace**

Run: `pnpm --filter @l3arn/shared-types build && pnpm -r typecheck`
Expected: all 7 packages Done, 0 errors. (`shared-types` build first so `ai-workers` sees any type exports; no shared-types change here, but the build keeps dist current.)

- [ ] **Step 5: Build the ai-workers service**

Run: `pnpm --filter @l3arn/ai-workers build`
Expected: exit 0 (the bundle compiles with `compileStart`).

- [ ] **Step 6: Commit**

```bash
git add packages/mission-compiler/src/compiler.ts services/ai-workers/src/missions/mission-runtime.ts
git commit -m "feat(ai-workers): mission start uses compileStart (fast, AI-by-default)"
```

---

## Task 7: Verify end-to-end

**Files:** none (verification only).

- [ ] **Step 1: Full workspace checks**

Run: `pnpm -r typecheck && cd packages/mission-compiler && pnpm test`
Expected: 7/7 typecheck Done; mission-compiler jest suite all green (including the new tests).

- [ ] **Step 2: Web build (contract unchanged)**

Run: `pnpm --filter @l3arn/web build`
Expected: exit 0, 21-route table (the `StartMissionResponse` wire shape is unchanged, so the frontend is unaffected).

- [ ] **Step 3: Push + PR**

```bash
git push -u origin perf/mission-generation-fast-start
gh pr create --base main --head perf/mission-generation-fast-start \
  --title "perf(mission): fast start — generate student3dMission only (AI by default)" \
  --body "See docs/superpowers/specs/2026-07-04-mission-generation-latency-design.md. Generates only the one mission section the runtime consumes; fixes the #20 retry-predicate prod miss; lowers timeout to 30s. Wire contract unchanged."
```

- [ ] **Step 4: After merge + Railway redeploy — live E2E regression (owner-run or agent-run with a session)**

Reproduce the 2026-07-04 prod flow (see spec §9): launch a session for a fresh child → open the mission → **confirm the briefing appears in a few seconds** (not 90–270s) → play the 6 gameplay steps → complete → `POST /session/holdings` returns 200 → the Fractions Observatory appears and persists after reload.
**Additionally assert `contentSource: "ai"`** on `POST /mission/start` (network response) — proving AI is now the default, not the fallback. Capture the start latency.

---

## Self-Review Notes

- **Spec coverage:** §4.1 narrow generation → Tasks 1,2,5. §4.2 narrow fallback → Task 3, used in Task 5. §4.3 retry-predicate fix → Task 4; timeout default → Task 6; prompt-caching intentionally **deferred** (the focused prompt is likely under the 1024-token cache minimum, so caching would be a no-op — call it out, don't build it). §5 data flow → Task 6. §9 testing → Tasks 1–5 unit + Task 7 E2E.
- **Unchanged surfaces (guarded):** `StartMissionResponse` shape, completion path, rewards/evidence/mastery, Task 14 holding unlock — none are touched; Task 7 Step 2 + Step 4 regress them.
- **Opt-in preserved:** `compile()` and the full six-section schema/prompt/fallback remain for a future multi-format runtime; only the runtime's call site changes.
- **Naming consistency:** `compileStart`, `MissionStartCompilerOutput`, `isNonRetryableAiError`, `MISSION_3D_JSON_SCHEMA`, `buildMission0013dSystemPrompt`, `getMission001FallbackStudent3d`, `AI3dMissionSchema` used identically across all tasks.
