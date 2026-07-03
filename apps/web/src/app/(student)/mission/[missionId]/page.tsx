"use client";

import { MissionExperience } from "./MissionExperience";

/**
 * Route entry for /student/mission/[missionId].
 *
 * This is a thin Next.js Page wrapper: the actual Mission 001 experience lives
 * in MissionExperience.tsx so it can ALSO be rendered as an in-world overlay
 * from the Academy (Task 13) without violating Next's requirement that a
 * page.tsx default export satisfy `PageProps`. Rendered with no props here,
 * MissionExperience reads its missionId from useParams() exactly as before, and
 * its "back to the Academy" buttons fall back to router.push — so the standalone
 * route behaves identically to how it did prior to Task 13.
 */
export default function MissionPage() {
  return <MissionExperience />;
}
