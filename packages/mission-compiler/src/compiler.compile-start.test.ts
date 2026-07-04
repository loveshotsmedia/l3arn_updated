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

function fakeClient(behavior: () => Promise<unknown>) {
  return {
    messages: { create: behavior },
  } as unknown as import("@anthropic-ai/sdk").default;
}

describe("MissionCompiler.compileStart", () => {
  it("returns AI content (usedFallback false) when the tool call validates", async () => {
    const client = fakeClient(async () => ({
      content: [{ type: "tool_use", input: VALID_3D }],
    }));
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
    expect(calls).toBe(1);
    expect(out.usedFallback).toBe(true);
    expect(out.student3dMission.worldRoomId).toBe(
      getMission001FallbackStudent3d().worldRoomId,
    );
  });
});
