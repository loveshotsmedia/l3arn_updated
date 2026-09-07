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
