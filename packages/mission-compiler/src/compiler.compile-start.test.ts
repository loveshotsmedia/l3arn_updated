import { MissionCompiler } from "./compiler";
import type { MissionCompilerInput } from "./compiler";
import { getMission001FallbackStudent3d } from "./fallbacks/mission-001.fallback";

process.env.ANTHROPIC_MODEL = "claude-sonnet-4-6";

const INPUT: MissionCompilerInput = {
  parentIntent: {
    curriculumGoals: [],
    gradeLevel: "Grade 4",
    blockedTopics: [],
    subjectFocus: ["Math"],
  },
  childPersonalization: {
    displayName: "QuasarKid3",
    houseAffiliation: "Novari",
    companionName: "Ziggy",
    companionPersonality: "playful",
    learningPrefs: [],
  },
  masteryTargets: {
    standardIds: ["L3ARN-SORT-001"],
    targetSkills: ["Sort by one attribute"],
  },
  childProfileId: "child-1",
  childSessionId: "sess-1",
};

// Satisfies AI3dMissionSchema (and Student3dMissionSchema): storyHook,
// worldRoomId, ≥1 companionDialogue (valid trigger), ≥1 task (valid
// interactionType + isEvidenceCapturePoint), rewardPreviewLabel.
const VALID_3D = {
  storyHook: "Ziggy needs your help sorting the Novari crystals!",
  worldRoomId: "great-hall",
  companionDialogue: [
    { companionId: "ziggy", line: "Let's go!", trigger: "on-start" },
  ],
  tasks: [
    {
      id: "t1",
      description: "Sort the red crystals.",
      interactionType: "drag",
      isEvidenceCapturePoint: false,
    },
  ],
  rewardPreviewLabel: "10 Moolah + 50 XP",
};

type StreamBehavior = (
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal; maxRetries?: number },
) => { finalMessage: () => Promise<unknown> };

/**
 * compileStart streams the response (client.messages.stream + finalMessage) so
 * bytes flow continuously — a non-streaming create() sat idle for the full
 * generation and got killed by intermediaries ("Premature close") or the
 * request timeout in production.
 */
function fakeStreamClient(behavior: StreamBehavior) {
  return {
    messages: { stream: behavior },
  } as unknown as import("@anthropic-ai/sdk").default;
}

afterEach(() => {
  delete process.env.MISSION_START_MODEL;
  delete process.env.MISSION_AI_TIMEOUT_MS;
});

describe("MissionCompiler.compileStart", () => {
  it("returns AI content (usedFallback false) via the streaming client", async () => {
    const client = fakeStreamClient(() => ({
      finalMessage: async () => ({
        content: [{ type: "tool_use", input: VALID_3D }],
      }),
    }));
    const compiler = new MissionCompiler(undefined, client);
    const out = await compiler.compileStart(INPUT);
    expect(out.usedFallback).toBe(false);
    expect(out.student3dMission.storyHook).toContain("Ziggy");
    expect(out.envelope.result.status).toBe("validated");
    // Audit envelope must attribute fast-start content to the 3D prompt version.
    expect(out.envelope.promptTemplateVersion).toBe("3d-0.2.0");
  });

  it("uses MISSION_START_MODEL for the call and records it in the envelope", async () => {
    process.env.MISSION_START_MODEL = "claude-haiku-4-5";
    let modelUsed: unknown;
    const client = fakeStreamClient((params) => {
      modelUsed = params.model;
      return {
        finalMessage: async () => ({
          content: [{ type: "tool_use", input: VALID_3D }],
        }),
      };
    });
    const compiler = new MissionCompiler(undefined, client);
    const out = await compiler.compileStart(INPUT);
    expect(modelUsed).toBe("claude-haiku-4-5");
    expect(out.envelope.modelVersion).toBe("claude-haiku-4-5");
  });

  it("falls back to ANTHROPIC_MODEL when MISSION_START_MODEL is unset", async () => {
    let modelUsed: unknown;
    const client = fakeStreamClient((params) => {
      modelUsed = params.model;
      return {
        finalMessage: async () => ({
          content: [{ type: "tool_use", input: VALID_3D }],
        }),
      };
    });
    const compiler = new MissionCompiler(undefined, client);
    await compiler.compileStart(INPUT);
    expect(modelUsed).toBe("claude-sonnet-4-6");
  });

  it("aborts a hung stream at MISSION_AI_TIMEOUT_MS and falls back after one attempt", async () => {
    process.env.MISSION_AI_TIMEOUT_MS = "100";
    let calls = 0;
    // Simulates the real SDK: finalMessage() rejects with APIUserAbortError
    // when the caller's AbortSignal fires. A stream that never resolves
    // otherwise = a hung upstream.
    const client = fakeStreamClient((_params, opts) => {
      calls++;
      return {
        finalMessage: () =>
          new Promise((_resolve, reject) => {
            opts.signal?.addEventListener("abort", () =>
              reject(
                Object.assign(new Error("Request was aborted."), {
                  name: "APIUserAbortError",
                }),
              ),
            );
          }),
      };
    });
    const compiler = new MissionCompiler(undefined, client);
    const t0 = Date.now();
    const out = await compiler.compileStart(INPUT);
    const elapsed = Date.now() - t0;
    expect(calls).toBe(1);
    expect(out.usedFallback).toBe(true);
    expect(elapsed).toBeLessThan(2000);
    expect(out.student3dMission.worldRoomId).toBe(
      getMission001FallbackStudent3d().worldRoomId,
    );
  });

  it("falls back on a timeout error (short-circuit, one attempt)", async () => {
    let calls = 0;
    const client = fakeStreamClient(() => {
      calls++;
      return {
        finalMessage: async () => {
          throw { name: "APIConnectionTimeoutError", message: "Request timed out." };
        },
      };
    });
    const compiler = new MissionCompiler(undefined, client);
    const out = await compiler.compileStart(INPUT);
    expect(calls).toBe(1);
    expect(out.usedFallback).toBe(true);
    expect(out.student3dMission.worldRoomId).toBe(
      getMission001FallbackStudent3d().worldRoomId,
    );
  });
});
