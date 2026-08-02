/**
 * Mission 001's fixed lesson task sequence — sub-project 2 (adaptive lesson
 * runtime). This is the fixture-backed content served by
 * GET /api/student/mission/:missionId/lesson, standing in for the real
 * generation pipeline (sub-project 4) until it exists.
 *
 * Order: 3 color-sort discrimination rounds (red, blue, green) → 1
 * apply-to-new transfer check (a novel color) → the existing sub-project 1
 * worked example for the AI-literacy beat.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §1.3
 */

import type { MissionLessonTask } from "@l3arn/shared-types";
import {
  SORT_COLOR_CRYSTALS_SKELETON,
  SORT_ROUND_RED_FILL,
  SORT_ROUND_BLUE_FILL,
  SORT_ROUND_GREEN_FILL,
} from "./skeletons/sort-color-crystals.skeleton";
import { APPLY_TO_NEW_COLOR_SKELETON, APPLY_TO_NEW_COLOR_FILL } from "./skeletons/apply-to-new-color.skeleton";
import { AI_MISTAKE_SHAPE_SIDES_SKELETON, AI_MISTAKE_SHAPE_SIDES_FILL } from "./skeletons/ai-mistake-shape-sides.skeleton";

// Reuses @l3arn/shared-types' MissionLessonTask (the GET .../lesson response
// item shape) rather than declaring a structurally-identical local type —
// this sequence IS served as that response's tasks[], so it should be typed
// as exactly that from the start, not a coincidentally-matching duplicate.
export const MISSION_001_LESSON_SEQUENCE: MissionLessonTask[] = [
  { taskInstanceId: "mission-001-sort-red", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_RED_FILL },
  { taskInstanceId: "mission-001-sort-blue", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_BLUE_FILL },
  { taskInstanceId: "mission-001-sort-green", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_GREEN_FILL },
  { taskInstanceId: "mission-001-apply-to-new", skeleton: APPLY_TO_NEW_COLOR_SKELETON, fill: APPLY_TO_NEW_COLOR_FILL },
  { taskInstanceId: "mission-001-ai-mistake-check", skeleton: AI_MISTAKE_SHAPE_SIDES_SKELETON, fill: AI_MISTAKE_SHAPE_SIDES_FILL },
];
