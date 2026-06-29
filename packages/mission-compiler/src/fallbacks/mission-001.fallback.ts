/**
 * Mission 001 Safe Fallback
 *
 * Pre-built, human-authored starter mission used when AI generation fails all
 * 3 retry attempts. This content is NEVER AI-generated.
 *
 * Invariants (compile-time, enforced by SafeFallbackSchema from ai.schema.ts):
 *   - isAIGenerated: false  — this is a z.literal(false) in the schema
 *   - parentVisible: true   — fallback usage is always parent-visible
 *
 * Content: A simple color-sorting task in the Great Hall. Human-authored to be
 * safe, grade-appropriate for K-3, and teachable without personalization.
 *
 * Grounded in: ADR-054 (confirmed June 2026 — safe fallbacks never AI-generated),
 * ai.schema.ts SafeFallbackSchema.
 *
 * NOTE: This is a compile-time constant, not a database record. It is bundled
 * with the Mission Compiler package. If a database-backed fallback library is
 * adopted in a future phase, this file should be replaced with a loader.
 * — Agent 6, Phase 0
 */

import type { SafeFallback } from "@l3arn/shared-types";

/**
 * The fallback ID used to reference this fallback in AIOutputResult records.
 * Must be stable — changing this breaks existing audit log references.
 */
export const MISSION_001_FALLBACK_ID = "mission-001-fallback-v1";

/**
 * Mission 001 safe fallback content.
 *
 * isAIGenerated is z.literal(false) in SafeFallbackSchema — this object
 * will fail type-checking if isAIGenerated is ever set to true.
 */
export const MISSION_001_FALLBACK: SafeFallback = {
  id: MISSION_001_FALLBACK_ID,
  context: "mission-generation",
  title: "Sort the Colored Blocks",
  content: JSON.stringify({
    parentPlan: {
      objective:
        "Students sort 5 colored blocks into matching color groups, demonstrating understanding of sorting by a single attribute.",
      standardsAlignment: {
        masterySkillId: "L3ARN-SORT-001",
        masteryDomainId: "L3ARN-MATH-PATTERNS",
        masteryObjective:
          "Sort a set of objects by a single attribute (color) and explain the sorting rule.",
        floridaStandardCode: "MA.K.DP.1.1",
        l3arnMasteryLevel: "emerging",
        evidenceThreshold:
          "Student correctly sorts all 5 blocks and can name the attribute used (color).",
      },
      materials: [
        "5 colored blocks or colored paper squares (red, blue, green, yellow, purple)",
        "3 sorting trays or areas labeled by color",
      ],
      steps: [
        "Show your child the 5 colored blocks mixed together.",
        "Ask: 'Can you put all the blocks that are the same color together?'",
        "Allow the child to sort independently. Offer a hint only if they are stuck after 2 minutes.",
        "Once sorted, ask: 'How did you decide where each block goes?'",
        "Record whether the child sorted correctly and could explain their rule.",
      ],
      safetyNotes: undefined,
      evidenceSummary:
        "Decision log capturing sort completion and child's verbal explanation of the sorting rule.",
      masteryThreshold:
        "All 5 blocks correctly sorted AND child can name 'color' as the sorting rule.",
      whyChosen:
        "This is a pre-built starter mission used because personalized mission generation was temporarily unavailable. " +
        "It covers foundational sorting skills appropriate for K-3 students and can be completed with common household items.",
    },
    student3dMission: {
      storyHook:
        "Oh no! The Sorting Machine in the Great Hall has mixed up all the colored crystals! " +
        "Can you help sort them back into the right bins before the Academy runs out of power?",
      worldRoomId: "great-hall",
      companionDialogue: [
        {
          companionId: "default-companion",
          line: "Let's figure this out together! Which crystal should go first?",
          trigger: "on-start",
        },
        {
          companionId: "default-companion",
          line: "Look closely — what do all the crystals in that group have in common?",
          trigger: "on-hint-requested",
        },
        {
          companionId: "default-companion",
          line: "Great work! The machine is getting stronger!",
          trigger: "on-step-complete",
        },
        {
          companionId: "default-companion",
          line: "Almost! Try looking at the color again.",
          trigger: "on-mistake",
        },
        {
          companionId: "default-companion",
          line: "You fixed the Sorting Machine! The Academy is saved!",
          trigger: "on-mission-complete",
        },
      ],
      tasks: [
        {
          id: "task-sort-red",
          description: "Drag the red crystals into the red bin.",
          interactionType: "drag",
          assetRefs: [],
          isEvidenceCapturePoint: false,
        },
        {
          id: "task-sort-blue",
          description: "Drag the blue crystals into the blue bin.",
          interactionType: "drag",
          assetRefs: [],
          isEvidenceCapturePoint: false,
        },
        {
          id: "task-sort-green",
          description: "Drag the green crystals into the green bin.",
          interactionType: "drag",
          assetRefs: [],
          isEvidenceCapturePoint: false,
        },
        {
          id: "task-explain-rule",
          description:
            "Tell your companion: how did you decide where each crystal goes?",
          interactionType: "choice",
          assetRefs: [],
          isEvidenceCapturePoint: true,
        },
      ],
      rewardPreviewLabel: "10 Moolah + 50 XP for completing the mission!",
    },
    studentInteractiveLite: {
      cards: [
        {
          id: "card-intro",
          contentText:
            "The crystals are all mixed up! Let's sort them by color.",
          illustrationRef: undefined,
          audioRef: undefined,
          interactions: [
            {
              type: "tap",
              prompt: "Tap START when you are ready to sort!",
              options: undefined,
            },
          ],
        },
        {
          id: "card-sort",
          contentText:
            "Drag each crystal to the bin that matches its color. Red goes with red. Blue goes with blue.",
          illustrationRef: undefined,
          audioRef: undefined,
          interactions: [
            {
              type: "drag",
              prompt: "Drag the crystals to the matching color bins.",
              options: undefined,
            },
          ],
        },
        {
          id: "card-explain",
          contentText: "You sorted all the crystals! How did you know where each one goes?",
          illustrationRef: undefined,
          audioRef: undefined,
          interactions: [
            {
              type: "choice",
              prompt: "How did you sort them?",
              options: [
                "I looked at the color.",
                "I looked at the size.",
                "I guessed.",
              ],
            },
          ],
        },
      ],
    },
    studentTextAudioOffline: {
      steps: [
        "Look at the 5 colored blocks.",
        "Put all the same-color blocks together.",
        "Make one group for each color.",
        "Tell a grown-up how you decided where each block goes.",
      ],
      readAloudScript:
        "Today we are going to sort some blocks! Look at all the blocks. " +
        "Can you put all the blocks that are the same color together? " +
        "Make one pile for each color. When you are done, tell me how you decided where each block goes.",
      printableTaskDescription:
        "Sort 5 colored blocks into groups by color. Make one group for each color. " +
        "Then explain your sorting rule to a grown-up.",
      artifactUploadInstructions:
        "Optional: Take a photo of your sorted groups and upload it when you are done.",
    },
    evidencePlan: {
      capturePoints: [
        {
          stepId: "task-explain-rule",
          captureType: "decision-log",
          retentionDays: 365,
          parentVisible: true,
          portfolioEligible: true,
        },
        {
          stepId: "task-sort-green",
          captureType: "sequence-completion",
          retentionDays: 365,
          parentVisible: true,
          portfolioEligible: false,
        },
      ],
      noWebcam: true,
      noFaceCapture: true,
    },
    rewardPlan: {
      effortMoolah: 10,
      effortXp: 50,
      masteryMoolah: 25,
      masteryXp: 100,
      companionBondIncrease: 5,
      housePointsContribution: 3,
      badgeIds: [],
      masteryGated: false,
    },
  }),
  parentNote:
    "L3ARN could not generate a personalized mission for your child at this time. " +
    "Your child completed a standard starter mission: sorting colored blocks by color. " +
    "This mission covers foundational K-3 sorting skills. " +
    "A personalized mission will be generated for the next session.",
  parentVisible: true,
  isAIGenerated: false,
} as const;
