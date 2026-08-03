/**
 * Mission Lesson Response Contract
 *
 * The shape returned by GET /api/student/mission/:missionId/lesson — an
 * ordered sequence of skeleton+fill pairs the adaptive lesson runtime
 * renders. Sub-project 2 of the lesson-engine redesign.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md
 */

import { z } from "zod";
import { LessonTaskSkeletonSchema, SkeletonFillSchema } from "./lesson-skeleton.schema";

export const MissionLessonTaskSchema = z.object({
  taskInstanceId: z.string().min(1),
  skeleton: LessonTaskSkeletonSchema,
  fill: SkeletonFillSchema,
});
export type MissionLessonTask = z.infer<typeof MissionLessonTaskSchema>;

export const MissionLessonResponseSchema = z.object({
  missionId: z.string().min(1),
  missionAttemptId: z.string().uuid(),
  tasks: z.array(MissionLessonTaskSchema).min(1),
  resumeFromTaskIndex: z.number().int().min(0),
});
export type MissionLessonResponse = z.infer<typeof MissionLessonResponseSchema>;
