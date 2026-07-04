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
