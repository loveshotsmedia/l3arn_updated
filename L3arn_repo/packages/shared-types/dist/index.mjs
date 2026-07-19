// src/identity.schema.ts
import { z } from "zod";
var HouseSchema = z.enum(["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]);
var GradeSchema = z.enum(["K", "1", "2", "3", "4", "5", "6", "7", "8"]);
var ApprovalModeSchema = z.enum(["high-control", "balanced", "autopilot"]);
var DeliveryModeSchema = z.enum(["3d", "interactive-lite", "text-audio-offline"]);
var ChatModeSchema = z.enum(["quick-chat-only", "moderated-free-text"]);
var VisibilityTierSchema = z.enum([
  "full",
  // K-5 default: parent sees everything
  "summary",
  // grades 6-8 default: summary with expand-on-demand
  "safety-override"
  // always available regardless of tier
]);
var ParentAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
var HouseholdSchema = z.object({
  id: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime()
});
var ChildProfileSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  legalFirstName: z.string().min(1).max(100),
  legalLastName: z.string().min(1).max(100),
  grade: GradeSchema,
  dateOfBirth: z.string().date(),
  // YYYY-MM-DD; retained for COPPA age verification only
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
var AcademyIdentitySchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  displayName: z.string().min(2).max(32),
  // parent-approved Academy Display Name
  house: HouseSchema,
  avatarAssetId: z.string().optional(),
  // reference to a pre-built avatar asset; no face data
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
var ChildPermissionsSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  // Chat (ADR-006): parent sets which chat mode the child operates under
  chatMode: ChatModeSchema,
  // Audio (ADR-027): push-to-talk only when enabled; never always-on
  audioEnabled: z.boolean(),
  // AI interaction (ADR-009): parent enables/disables AI companion chat
  aiInteractionEnabled: z.boolean(),
  // Delivery modes the child may access (ADR-017: parent governs, student chooses within)
  allowedDeliveryModes: z.array(DeliveryModeSchema).min(1),
  // Curriculum approval mode (ADR-012)
  curriculumApprovalMode: ApprovalModeSchema,
  // Model improvement opt-in (ADR-029): false = opted out; this is the safe default
  modelImprovementOptIn: z.boolean(),
  // Parent visibility tier for this child's data (ADR-008)
  parentVisibilityTier: VisibilityTierSchema,
  // Optional hard limits
  screenLimitMinutesPerDay: z.number().int().positive().optional(),
  blockedTopics: z.array(z.string()).default([]),
  updatedAt: z.string().datetime(),
  updatedByParentAccountId: z.string().uuid()
});
var TrustedDeviceSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  deviceFingerprint: z.string(),
  nickname: z.string().optional(),
  approvedAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional()
});
var SessionEntryMethodSchema = z.enum([
  "parent-launch",
  "avatar-pin-trusted-device"
]);
var ChildSessionSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  academyIdentityId: z.string().uuid(),
  entryMethod: SessionEntryMethodSchema,
  trustedDeviceId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  currentRoomId: z.string().optional()
});
var ConsentTypeSchema = z.enum([
  "coppa-data-collection",
  // base COPPA consent; required before any child data is collected
  "audio-push-to-talk",
  // parent enables push-to-talk for the child
  "ai-interaction",
  // parent enables AI companion chat
  "model-improvement",
  // parent opts in to model improvement (default: NOT granted)
  "moderated-free-text-chat",
  // parent approves grades 6-8 free-text chat (ADR-006)
  "visibility-reduction"
  // parent downgrades from full to summary visibility (ADR-008)
]);
var ParentConsentSchema = z.object({
  id: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  childProfileId: z.string().uuid().optional(),
  // null = account-level consent
  consentType: ConsentTypeSchema,
  granted: z.boolean(),
  grantedAt: z.string().datetime(),
  ipAddress: z.string().optional(),
  // retained for COPPA audit; not surfaced to UI
  revokedAt: z.string().datetime().optional()
});

// src/mission.schema.ts
import { z as z2 } from "zod";
var MasteryLevelSchema = z2.enum([
  "emerging",
  "developing",
  "proficient",
  "advanced"
]);
var ParentIntentSchema = z2.object({
  approvalMode: ApprovalModeSchema,
  emphasizeTopics: z2.array(z2.string()).default([]),
  blockedTopics: z2.array(z2.string()).default([]),
  preferredDeliveryModes: z2.array(DeliveryModeSchema).optional(),
  customInstructions: z2.string().max(1e3).optional()
});
var StandardsAlignmentSchema = z2.object({
  masterySkillId: z2.string(),
  masteryDomainId: z2.string(),
  masteryObjective: z2.string(),
  floridaStandardCode: z2.string().optional(),
  // e.g. "LAFS.3.RI.1.1"; optional for non-FL families
  l3arnMasteryLevel: MasteryLevelSchema,
  evidenceThreshold: z2.string()
  // human-readable mastery bar description
});
var ChildPersonalizationSchema = z2.object({
  childProfileId: z2.string().uuid(),
  grade: GradeSchema,
  preferredDeliveryMode: DeliveryModeSchema,
  instructionChunkSize: z2.enum(["short", "medium", "long"]),
  hintFrequency: z2.enum(["high", "medium", "low"]),
  interests: z2.array(z2.string()),
  house: HouseSchema,
  companionId: z2.string().uuid().optional(),
  accessibilityFlags: z2.object({
    audioSupport: z2.boolean(),
    visualSupport: z2.boolean(),
    lowTextMode: z2.boolean(),
    parentReadAloud: z2.boolean()
  })
});
var ParentPlanSchema = z2.object({
  objective: z2.string(),
  standardsAlignment: StandardsAlignmentSchema,
  materials: z2.array(z2.string()),
  steps: z2.array(z2.string()),
  safetyNotes: z2.string().optional(),
  evidenceSummary: z2.string(),
  masteryThreshold: z2.string(),
  whyChosen: z2.string()
  // explains how personalization + alignment produced this mission
});
var CompanionDialogueLineSchema = z2.object({
  companionId: z2.string(),
  line: z2.string(),
  trigger: z2.enum([
    "on-start",
    "on-hint-requested",
    "on-step-complete",
    "on-mistake",
    "on-mission-complete"
  ])
});
var MissionTaskSchema = z2.object({
  id: z2.string(),
  description: z2.string(),
  interactionType: z2.enum([
    "click",
    "drag",
    "choice",
    "text-input",
    "observe",
    "sequence",
    "sort-categorize",
    "apply-to-new",
    "ai-mistake-check"
  ]),
  assetRefs: z2.array(z2.string()).optional(),
  isEvidenceCapturePoint: z2.boolean()
});
var Student3dMissionSchema = z2.object({
  storyHook: z2.string(),
  worldRoomId: z2.string(),
  // maps to a room in the Core Academy Map (ADR-018)
  companionDialogue: z2.array(CompanionDialogueLineSchema),
  tasks: z2.array(MissionTaskSchema).min(1),
  rewardPreviewLabel: z2.string()
  // what the student sees they'll earn before starting
});
var LiteInteractionSchema = z2.object({
  type: z2.enum(["choice", "tap", "drag"]),
  prompt: z2.string(),
  options: z2.array(z2.string()).optional()
});
var LiteCardSchema = z2.object({
  id: z2.string(),
  contentText: z2.string(),
  illustrationRef: z2.string().optional(),
  audioRef: z2.string().optional(),
  // parent-controlled audio (ADR-027)
  interactions: z2.array(LiteInteractionSchema)
});
var StudentInteractiveLiteSchema = z2.object({
  cards: z2.array(LiteCardSchema).min(1)
});
var StudentTextAudioOfflineSchema = z2.object({
  steps: z2.array(z2.string()).min(1),
  readAloudScript: z2.string().optional(),
  printableTaskDescription: z2.string(),
  artifactUploadInstructions: z2.string().optional()
});
var EvidenceCapturePointSchema = z2.object({
  stepId: z2.string(),
  captureType: z2.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "artifact-upload",
    "structured-replay"
  ]),
  retentionDays: z2.number().int().positive(),
  parentVisible: z2.boolean(),
  portfolioEligible: z2.boolean()
});
var EvidencePlanSchema = z2.object({
  capturePoints: z2.array(EvidenceCapturePointSchema).min(1),
  noWebcam: z2.literal(true),
  // compile-time privacy invariant; never set to false
  noFaceCapture: z2.literal(true)
  // compile-time privacy invariant; never set to false
});
var RewardPlanSchema = z2.object({
  effortMoolah: z2.number().int().nonnegative(),
  effortXp: z2.number().int().nonnegative(),
  masteryMoolah: z2.number().int().nonnegative().optional(),
  // awarded only if masteryAchieved
  masteryXp: z2.number().int().nonnegative().optional(),
  // awarded only if masteryAchieved
  companionBondIncrease: z2.number().int().nonnegative(),
  housePointsContribution: z2.number().int().nonnegative(),
  badgeIds: z2.array(z2.string()).optional(),
  masteryGated: z2.boolean()
  // true = major progression (companion evolution, room unlock) requires mastery evidence
});
var MissionOutputSchema = z2.object({
  parentPlan: ParentPlanSchema,
  student3dMission: Student3dMissionSchema,
  studentInteractiveLite: StudentInteractiveLiteSchema,
  studentTextAudioOffline: StudentTextAudioOfflineSchema,
  evidencePlan: EvidencePlanSchema,
  rewardPlan: RewardPlanSchema
});
var MissionStatusSchema = z2.enum([
  "draft",
  // compiled but not yet approved
  "pending-approval",
  // awaiting parent approval in high-control mode (ADR-012)
  "active",
  // approved and available to student
  "completed",
  "archived"
]);
var MissionSchema = z2.object({
  id: z2.string().uuid(),
  childProfileId: z2.string().uuid(),
  version: z2.number().int().positive(),
  status: MissionStatusSchema,
  // The three constraint dimensions (ADR-014)
  parentIntent: ParentIntentSchema,
  childPersonalization: ChildPersonalizationSchema,
  standardsAlignment: StandardsAlignmentSchema,
  output: MissionOutputSchema,
  compiledAt: z2.string().datetime(),
  approvedByParentAt: z2.string().datetime().optional(),
  // required in high-control mode
  startedAt: z2.string().datetime().optional(),
  completedAt: z2.string().datetime().optional()
});
var MissionAttemptSchema = z2.object({
  id: z2.string().uuid(),
  missionId: z2.string().uuid(),
  childProfileId: z2.string().uuid(),
  childSessionId: z2.string().uuid(),
  deliveryMode: DeliveryModeSchema,
  startedAt: z2.string().datetime(),
  completedAt: z2.string().datetime().optional(),
  masteryEvidenceScore: z2.number().min(0).max(1).optional(),
  // 0.0–1.0
  masteryAchieved: z2.boolean().optional()
  // set after evidence evaluation
});

// src/world-event.schema.ts
import { z as z3 } from "zod";
var WorldEventTypeSchema = z3.enum([
  // Presence
  "room.joined",
  "room.left",
  "avatar.moved",
  // Mission lifecycle
  "mission.started",
  "mission.step-completed",
  "mission.completed",
  "mission.abandoned",
  // Economy
  "moolah.earned",
  "moolah.spent",
  "xp.earned",
  "badge.awarded",
  // House
  "house.points-earned",
  "house.leaderboard-updated",
  // Companion
  "companion.bond-increased",
  "companion.milestone-reached",
  // Living Academy (ADR-019)
  "academy.unlock-triggered",
  "academy.seasonal-event-started",
  "academy.seasonal-event-ended",
  "world.repair-completed",
  "world.decoration-placed"
]);
var WorldEventSchema = z3.object({
  id: z3.string().uuid(),
  type: WorldEventTypeSchema,
  // Actor — null for Academy-wide events (seasonal, House leaderboard)
  childProfileId: z3.string().uuid().optional(),
  childSessionId: z3.string().uuid().optional(),
  academyIdentityId: z3.string().uuid().optional(),
  roomId: z3.string().optional(),
  occurredAt: z3.string().datetime(),
  // Every persistent change must be reversible (architecture.md §5)
  reversible: z3.boolean(),
  // Whether this event appears in parent reports/visibility (ADR-008)
  parentVisible: z3.boolean(),
  // Compile-time invariant: all world events are audit-logged (ADR-020)
  auditLogged: z3.literal(true),
  // Typed payload — parse using the per-type schemas below
  payload: z3.record(z3.unknown())
});
var RoomJoinedPayloadSchema = z3.object({
  roomId: z3.string(),
  academyIdentityId: z3.string().uuid()
});
var RoomLeftPayloadSchema = z3.object({
  roomId: z3.string(),
  academyIdentityId: z3.string().uuid(),
  durationSeconds: z3.number().int().nonnegative()
});
var AvatarMovedPayloadSchema = z3.object({
  academyIdentityId: z3.string().uuid(),
  roomId: z3.string(),
  position: z3.object({
    x: z3.number(),
    y: z3.number(),
    z: z3.number()
  })
});
var MissionStartedPayloadSchema = z3.object({
  missionId: z3.string().uuid(),
  missionAttemptId: z3.string().uuid(),
  deliveryMode: z3.enum(["3d", "interactive-lite", "text-audio-offline"])
});
var MissionStepCompletedPayloadSchema = z3.object({
  missionAttemptId: z3.string().uuid(),
  stepId: z3.string(),
  evidenceCaptured: z3.boolean()
});
var MissionCompletedPayloadSchema = z3.object({
  missionId: z3.string().uuid(),
  missionAttemptId: z3.string().uuid(),
  deliveryMode: z3.enum(["3d", "interactive-lite", "text-audio-offline"]),
  masteryAchieved: z3.boolean(),
  masteryEvidenceScore: z3.number().min(0).max(1)
});
var MissionAbandonedPayloadSchema = z3.object({
  missionAttemptId: z3.string().uuid(),
  lastStepId: z3.string().optional()
});
var MoolahEarnedPayloadSchema = z3.object({
  walletId: z3.string().uuid(),
  amount: z3.number().int().positive(),
  reason: z3.enum([
    "mission-effort",
    "mission-mastery",
    "house-bonus",
    "event-reward"
  ]),
  referenceId: z3.string().optional()
  // missionAttemptId, eventId, etc.
});
var MoolahSpentPayloadSchema = z3.object({
  walletId: z3.string().uuid(),
  amount: z3.number().int().positive(),
  itemId: z3.string(),
  itemType: z3.enum(["cosmetic", "companion-accessory", "house-item"])
});
var XpEarnedPayloadSchema = z3.object({
  amount: z3.number().int().positive(),
  reason: z3.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction"
  ]),
  referenceId: z3.string().optional()
});
var BadgeAwardedPayloadSchema = z3.object({
  badgeId: z3.string(),
  missionAttemptId: z3.string().uuid().optional(),
  masteryRecordId: z3.string().uuid().optional()
});
var HousePointsEarnedPayloadSchema = z3.object({
  house: HouseSchema,
  points: z3.number().int().positive(),
  contributingChildProfileId: z3.string().uuid(),
  reason: z3.enum([
    "mission-mastery",
    "mission-effort",
    "event-participation",
    "companion-growth"
  ]),
  referenceId: z3.string().optional()
});
var HouseLeaderboardUpdatedPayloadSchema = z3.object({
  period: z3.enum(["weekly", "monthly", "all-time"]),
  rankings: z3.array(z3.object({
    house: HouseSchema,
    totalPoints: z3.number().int().nonnegative(),
    rank: z3.number().int().positive()
  }))
});
var CompanionBondIncreasedPayloadSchema = z3.object({
  companionId: z3.string().uuid(),
  bondIncrease: z3.number().int().positive(),
  newBondLevel: z3.number().int().nonnegative(),
  reason: z3.enum(["mission-completed", "daily-interaction", "mastery-milestone"])
});
var CompanionMilestoneReachedPayloadSchema = z3.object({
  companionId: z3.string().uuid(),
  milestoneId: z3.string(),
  newFormId: z3.string().optional(),
  // visual form evolution
  masteryRequired: z3.boolean(),
  masteryRecordId: z3.string().uuid().optional()
});
var AcademyUnlockTriggeredPayloadSchema = z3.object({
  unlockId: z3.string(),
  unlockType: z3.enum([
    "room-decoration",
    "npc-activation",
    "grove-bloom",
    "market-item",
    "ai-lab-repair",
    "outdoor-grounds-change"
  ]),
  triggerReason: z3.string(),
  // e.g. "Cytrex House reached 500 collective points"
  affectedRoomId: z3.string().optional()
});
var AcademySeasonalEventPayloadSchema = z3.object({
  seasonalEventId: z3.string(),
  eventName: z3.string(),
  affectedRoomIds: z3.array(z3.string())
});
var WorldRepairCompletedPayloadSchema = z3.object({
  repairTargetId: z3.string(),
  roomId: z3.string(),
  triggeredByMissionId: z3.string().uuid().optional()
});
var WorldDecorationPlacedPayloadSchema = z3.object({
  decorationId: z3.string(),
  roomId: z3.string(),
  placedByChildProfileId: z3.string().uuid().optional(),
  houseSource: HouseSchema.optional()
});
var WORLD_EVENT_PAYLOAD_SCHEMAS = {
  "room.joined": RoomJoinedPayloadSchema,
  "room.left": RoomLeftPayloadSchema,
  "avatar.moved": AvatarMovedPayloadSchema,
  "mission.started": MissionStartedPayloadSchema,
  "mission.step-completed": MissionStepCompletedPayloadSchema,
  "mission.completed": MissionCompletedPayloadSchema,
  "mission.abandoned": MissionAbandonedPayloadSchema,
  "moolah.earned": MoolahEarnedPayloadSchema,
  "moolah.spent": MoolahSpentPayloadSchema,
  "xp.earned": XpEarnedPayloadSchema,
  "badge.awarded": BadgeAwardedPayloadSchema,
  "house.points-earned": HousePointsEarnedPayloadSchema,
  "house.leaderboard-updated": HouseLeaderboardUpdatedPayloadSchema,
  "companion.bond-increased": CompanionBondIncreasedPayloadSchema,
  "companion.milestone-reached": CompanionMilestoneReachedPayloadSchema,
  "academy.unlock-triggered": AcademyUnlockTriggeredPayloadSchema,
  "academy.seasonal-event-started": AcademySeasonalEventPayloadSchema,
  "academy.seasonal-event-ended": AcademySeasonalEventPayloadSchema,
  "world.repair-completed": WorldRepairCompletedPayloadSchema,
  "world.decoration-placed": WorldDecorationPlacedPayloadSchema
};

// src/evidence.schema.ts
import { z as z4 } from "zod";
var EvidenceCaptureTypeSchema = z4.enum([
  "decision-log",
  // structured record of choices made during a mission task
  "sequence-completion",
  // ordered task completion record
  "ai-mistake-check",
  // student identifies/corrects an AI error (Mission 001)
  "explanation",
  // student explains a concept in their own words
  "reflection",
  // post-mission reflection prompt response
  "artifact-upload",
  // parent/student uploads external work product
  "audio-response",
  // push-to-talk response; parent must have enabled audio (ADR-027)
  "structured-replay",
  // system-generated replay of mission interaction steps
  "screenshot"
  // 3D scene screenshot; no face data, no webcam
]);
var LearningEvidenceEventSchema = z4.object({
  id: z4.string().uuid(),
  missionAttemptId: z4.string().uuid(),
  childProfileId: z4.string().uuid(),
  childSessionId: z4.string().uuid(),
  captureType: EvidenceCaptureTypeSchema,
  stepId: z4.string(),
  // which mission step this evidence is from
  content: z4.record(z4.unknown()),
  // structured content; shape varies by captureType
  capturedAt: z4.string().datetime(),
  retentionUntil: z4.string().datetime(),
  // data is not retained indefinitely (COPPA/privacy)
  parentVisible: z4.boolean(),
  portfolioEligible: z4.boolean(),
  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcam: z4.literal(true),
  noFaceCapture: z4.literal(true),
  noVoiceBiometrics: z4.literal(true)
});
var MissionReplayEventSchema = z4.object({
  id: z4.string().uuid(),
  missionAttemptId: z4.string().uuid(),
  childProfileId: z4.string().uuid(),
  interactionSequence: z4.array(z4.object({
    stepId: z4.string(),
    action: z4.string(),
    outcome: z4.string(),
    timestampOffset: z4.number().int().nonnegative()
    // ms from mission start
  })),
  totalDurationMs: z4.number().int().positive(),
  capturedAt: z4.string().datetime(),
  retentionUntil: z4.string().datetime(),
  parentVisible: z4.boolean(),
  noWebcam: z4.literal(true),
  noFaceCapture: z4.literal(true)
});
var ArtifactTypeSchema = z4.enum([
  "written-work",
  "drawing",
  "audio-recording",
  // push-to-talk only; no always-on capture (ADR-027)
  "structured-output"
]);
var ArtifactSchema = z4.object({
  id: z4.string().uuid(),
  childProfileId: z4.string().uuid(),
  missionAttemptId: z4.string().uuid(),
  artifactType: ArtifactTypeSchema,
  storageRef: z4.string(),
  // Supabase Storage path
  title: z4.string().optional(),
  parentApproved: z4.boolean(),
  // must be true before artifact enters portfolio
  parentApprovedAt: z4.string().datetime().optional(),
  createdAt: z4.string().datetime(),
  retentionUntil: z4.string().datetime()
});
var MasteryRecordSchema = z4.object({
  id: z4.string().uuid(),
  childProfileId: z4.string().uuid(),
  masterySkillId: z4.string(),
  masteryDomainId: z4.string(),
  floridaStandardCode: z4.string().optional(),
  level: MasteryLevelSchema,
  evidenceEventIds: z4.array(z4.string().uuid()).min(1),
  // the proof chain
  achievedAt: z4.string().datetime(),
  lastVerifiedAt: z4.string().datetime()
});
var PortfolioItemSchema = z4.object({
  id: z4.string().uuid(),
  childProfileId: z4.string().uuid(),
  evidenceEventId: z4.string().uuid().optional(),
  artifactId: z4.string().uuid().optional(),
  masteryRecordId: z4.string().uuid().optional(),
  highlightNote: z4.string().max(500).optional(),
  // parent-added annotation
  includedAt: z4.string().datetime(),
  parentConsentedAt: z4.string().datetime()
  // required; no portfolio item without consent
});

// src/rewards.schema.ts
import { z as z5 } from "zod";
var MoolahWalletSchema = z5.object({
  id: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  balance: z5.number().int().nonnegative(),
  lifetimeEarned: z5.number().int().nonnegative().optional(),
  updatedAt: z5.string().datetime()
});
var MoolahReasonSchema = z5.enum([
  "mission-effort",
  // effort reward: unconditional on completion
  "mission-mastery",
  // mastery reward: gated on evidence
  "house-bonus",
  // House-level collective reward
  "event-reward",
  // seasonal or Academy event reward
  "purchase",
  // Moolah Market spend (negative delta)
  "admin-adjustment"
  // system correction; logged and parent-visible
]);
var MoolahLedgerEntrySchema = z5.object({
  id: z5.string().uuid(),
  walletId: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  delta: z5.number().int(),
  // positive = earned, negative = spent
  reason: MoolahReasonSchema,
  referenceId: z5.string().optional(),
  // missionAttemptId, eventId, itemId, etc.
  idempotencyKey: z5.string().optional(),
  // prevents duplicate reward events; maps to moolah_ledger.idempotency_key
  occurredAt: z5.string().datetime()
});
var XpEventSchema = z5.object({
  id: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  amount: z5.number().int().positive(),
  reason: z5.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction"
  ]),
  referenceId: z5.string().optional(),
  occurredAt: z5.string().datetime()
});
var CompanionGrowthTypeSchema = z5.enum([
  "bond-increase",
  "form-evolution",
  // major visual/behavioral upgrade; typically mastery-gated
  "milestone"
]);
var CompanionGrowthEventSchema = z5.object({
  id: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  companionId: z5.string().uuid(),
  growthType: CompanionGrowthTypeSchema,
  previousBondLevel: z5.number().int().nonnegative(),
  newBondLevel: z5.number().int().nonnegative(),
  newFormId: z5.string().optional(),
  // set when a form evolution occurs
  masteryRequired: z5.boolean(),
  // true = this growth required mastery evidence
  masteryRecordId: z5.string().uuid().optional(),
  triggerMissionAttemptId: z5.string().uuid().optional(),
  occurredAt: z5.string().datetime()
});
var BadgeCategorySchema = z5.enum([
  "mastery",
  "effort",
  "house",
  "ai-literacy",
  "exploration",
  "companion"
]);
var BadgeSchema = z5.object({
  id: z5.string(),
  name: z5.string(),
  description: z5.string(),
  iconAssetId: z5.string(),
  category: BadgeCategorySchema,
  masteryGated: z5.boolean()
  // true = earning requires verified mastery evidence
});
var BadgeAwardSchema = z5.object({
  id: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  badgeId: z5.string(),
  awardedAt: z5.string().datetime(),
  missionAttemptId: z5.string().uuid().optional(),
  masteryRecordId: z5.string().uuid().optional()
});
var HousePointsReasonSchema = z5.enum([
  "mission-mastery",
  "mission-effort",
  "event-participation",
  "companion-growth"
]);
var HousePointsRecordSchema = z5.object({
  id: z5.string().uuid(),
  house: HouseSchema,
  points: z5.number().int().positive(),
  contributingChildProfileId: z5.string().uuid(),
  reason: HousePointsReasonSchema,
  referenceId: z5.string().optional(),
  occurredAt: z5.string().datetime()
});
var ChildBadgeSchema = z5.object({
  id: z5.string().uuid(),
  childProfileId: z5.string().uuid(),
  badgeId: z5.string().uuid(),
  awardedAt: z5.string().datetime(),
  sourceId: z5.string().uuid().optional()
  // mission_attempts.id, mastery_records.id, etc.
});
var XPEventSchema = XpEventSchema;
var HousePointEventSchema = HousePointsRecordSchema;
var HouseLeaderboardPeriodSchema = z5.enum(["weekly", "monthly", "all-time"]);
var HouseRankingSchema = z5.object({
  house: HouseSchema,
  totalPoints: z5.number().int().nonnegative(),
  rank: z5.number().int().positive()
});
var HouseLeaderboardSnapshotSchema = z5.object({
  id: z5.string().uuid(),
  period: HouseLeaderboardPeriodSchema,
  rankings: z5.array(HouseRankingSchema).length(4),
  // exactly 4 Houses
  recordedAt: z5.string().datetime()
});

// src/parent-report.schema.ts
import { z as z6 } from "zod";
var CalibrationStageSchema = z6.enum([
  "parent-onboarding",
  // 20–35% — age, grade, goals, boundaries
  "sorting-ceremony",
  // 40–55% — House choice, interests, motivation signals
  "mission-001",
  // 60–75% — reading/listening behavior, AI readiness, persistence
  "first-7-14-days"
  // 80–90% — progression, retention, frustration signals
]);
var LearnerCalibrationScoreSchema = z6.object({
  score: z6.number().min(0).max(100),
  stage: CalibrationStageSchema,
  confidence: z6.number().min(0).max(1),
  // 0 = no confidence, 1 = high confidence
  signalsContributing: z6.array(z6.string()),
  // human-readable signal names
  computedAt: z6.string().datetime()
});
var EvidenceHighlightTypeSchema = z6.enum([
  "mastery-moment",
  "persistence",
  "ai-readiness",
  "creative-expression",
  "help-seeking",
  "sequence-completion"
]);
var EvidenceHighlightSchema = z6.object({
  id: z6.string().uuid(),
  type: EvidenceHighlightTypeSchema,
  description: z6.string(),
  evidenceEventId: z6.string().uuid().optional(),
  artifactId: z6.string().uuid().optional(),
  portfolioItemId: z6.string().uuid().optional(),
  parentConsentedAt: z6.string().datetime()
  // consent required before inclusion
});
var MasteryProgressLevelSchema = z6.enum([
  "not-started",
  "emerging",
  "developing",
  "proficient",
  "advanced"
]);
var MasteryProgressSummarySchema = z6.object({
  masterySkillId: z6.string(),
  masteryDomainId: z6.string(),
  skillName: z6.string(),
  currentLevel: MasteryProgressLevelSchema,
  evidenceCount: z6.number().int().nonnegative(),
  lastActivityAt: z6.string().datetime().optional(),
  floridaStandardCodes: z6.array(z6.string()).optional()
  // ADR-013: FL + L3ARN Mastery Map
});
var GameProgressSummarySchema = z6.object({
  house: z6.string(),
  // House name
  companionName: z6.string(),
  companionBondLevel: z6.number().int().nonnegative(),
  moolahBalance: z6.number().int().nonnegative(),
  totalXp: z6.number().int().nonnegative(),
  badgesEarned: z6.array(z6.string()),
  // badge IDs
  missionsCompleted: z6.number().int().nonnegative(),
  missionsAttempted: z6.number().int().nonnegative(),
  academyUnlocksContributed: z6.number().int().nonnegative()
});
var NextMissionRecommendationSchema = z6.object({
  summary: z6.string(),
  rationale: z6.string(),
  // must reference learner model + parent intent — not generic
  targetMasterySkillId: z6.string(),
  targetMasteryDomainId: z6.string(),
  suggestedDeliveryMode: z6.enum(["3d", "interactive-lite", "text-audio-offline"])
});
var ParentReportTypeSchema = z6.enum([
  "unified-first-learning-map",
  // output of Mission 001 (MASTER_HANDOFF §5.1)
  "weekly-summary",
  "mission-completion",
  "portfolio"
]);
var ParentReportSchema = z6.object({
  id: z6.string().uuid(),
  childProfileId: z6.string().uuid(),
  reportType: ParentReportTypeSchema,
  generatedAt: z6.string().datetime(),
  // Academic proof (the core of every report)
  masteryProgress: z6.array(MasteryProgressSummarySchema),
  // Learner calibration — present on mission-001 and first-7-14-days reports
  calibrationScore: LearnerCalibrationScoreSchema.optional(),
  // Evidence highlights — require parent consent before inclusion
  evidenceHighlights: z6.array(EvidenceHighlightSchema),
  // Game/world progress — always shown separately from mastery (ADR-011)
  gameProgress: GameProgressSummarySchema.optional(),
  // System's next-path recommendation
  nextMissionRecommendation: NextMissionRecommendationSchema.optional(),
  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcamContent: z6.literal(true),
  noFaceCaptureContent: z6.literal(true)
});
var ParentVisibilityModeSchema = z6.enum([
  "full",
  // K-5 default: all detail visible
  "summary",
  // grades 6-8 default: summary with expand-on-demand
  "safety-override"
  // always available; overrides summary mode for flagged content
]);

// src/lesson-skeleton.schema.ts
import { z as z7 } from "zod";
var RulePredicateValueSchema = z7.union([
  z7.string(),
  z7.number(),
  z7.boolean(),
  z7.array(z7.union([z7.string(), z7.number()]))
]);
var RulePredicateLeafSchema = z7.object({
  field: z7.string().min(1),
  op: z7.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in"]),
  value: RulePredicateValueSchema.optional(),
  compareField: z7.string().min(1).optional()
}).refine((leaf) => leaf.value !== void 0 !== (leaf.compareField !== void 0), {
  message: "Exactly one of `value` or `compareField` must be set on a rule predicate leaf"
});
var RulePredicateSchema = z7.lazy(
  () => z7.union([
    RulePredicateLeafSchema,
    z7.object({ allOf: z7.array(RulePredicateSchema).min(1) }),
    z7.object({ anyOf: z7.array(RulePredicateSchema).min(1) }),
    z7.object({ not: RulePredicateSchema })
  ])
);
var ItemAttributesSchema = z7.record(z7.union([z7.string(), z7.number(), z7.boolean()]));
var LearningStyleSchema = z7.enum(["visual", "auditory", "reading-writing", "kinesthetic"]);
var ReadingTierSchema = z7.enum(["pre-reader", "grade-level", "advanced"]);
var LessonTaskTypeSchema = z7.enum([
  "sort-categorize",
  "choice",
  "apply-to-new",
  "ai-mistake-check"
]);
var VariantKeySchema = z7.object({
  skeletonId: z7.string().uuid(),
  learningStyle: LearningStyleSchema,
  readingTier: ReadingTierSchema,
  l3arnMasteryLevel: MasteryLevelSchema
});
var HintTierSchema = z7.object({
  tier: z7.union([z7.literal(1), z7.literal(2), z7.literal(3)]),
  kind: z7.enum(["nudge", "re-explain", "state-rule"]),
  content: z7.string().min(1),
  readAloudScript: z7.string().min(1)
});
var HintLadderSchema = z7.tuple([HintTierSchema, HintTierSchema, HintTierSchema]).refine((ladder) => ladder[0].tier === 1 && ladder[1].tier === 2 && ladder[2].tier === 3, {
  message: "Hint ladder must be exactly 3 tiers in order: 1 (nudge), 2 (re-explain), 3 (state-rule)"
});
var DistractorRuleSchema = z7.object({
  count: z7.number().int().min(1).max(6),
  plausibilityRule: RulePredicateSchema.optional()
});
var LessonTaskSkeletonSchema = z7.object({
  id: z7.string().uuid(),
  masterySkillId: z7.string().uuid(),
  l3arnMasteryLevel: MasteryLevelSchema,
  taskType: LessonTaskTypeSchema,
  correctAnswerRule: RulePredicateSchema,
  distractorRule: DistractorRuleSchema,
  transferExampleRule: RulePredicateSchema,
  hintLadder: HintLadderSchema,
  isActive: z7.boolean(),
  version: z7.number().int().positive()
});
var SkeletonFillItemSchema = z7.object({
  itemId: z7.string().min(1),
  attributes: ItemAttributesSchema,
  presentationText: z7.string().min(1),
  readAloudScript: z7.string().min(1)
});
var SkeletonFillSchema = z7.object({
  skeletonId: z7.string().uuid(),
  variantKey: VariantKeySchema,
  storyFlavor: z7.string().min(1),
  correctItem: SkeletonFillItemSchema,
  distractorItems: z7.array(SkeletonFillItemSchema).min(1),
  transferItem: SkeletonFillItemSchema,
  hintLadderFill: HintLadderSchema,
  companionDialogueLine: z7.string().min(1)
});

// src/permissions.schema.ts
import { z as z8 } from "zod";
var DataPrincipalSchema = z8.enum([
  "parent",
  // authenticated parent account holder
  "child-session",
  // active child session — strictly scoped (see ChildSessionScopeSchema)
  "admin",
  // L3ARN admin; subject to ADR-049 confirmation
  "system"
  // internal service-to-service calls
]);
var ChildSessionScopeSchema = z8.object({
  sessionId: z8.string().uuid(),
  childProfileId: z8.string().uuid(),
  householdId: z8.string().uuid(),
  // Permitted access
  canAccessOwnMissions: z8.literal(true),
  canAccessOwnRewards: z8.literal(true),
  canAccessSharedAcademyWorld: z8.literal(true),
  // Structural prohibitions — compile-time invariants
  canAccessParentDashboard: z8.literal(false),
  canAccessSiblingProfiles: z8.literal(false),
  canAccessOtherHouseholds: z8.literal(false),
  canSendPrivateMessages: z8.literal(false),
  // No DMs in MVP (ADR-006)
  canReadCurriculumTablesDirectly: z8.literal(false)
  // API only (ADR-060 provisional)
});
function buildChildSessionScope(sessionId, childProfileId, householdId) {
  return ChildSessionScopeSchema.parse({
    sessionId,
    childProfileId,
    householdId,
    canAccessOwnMissions: true,
    canAccessOwnRewards: true,
    canAccessSharedAcademyWorld: true,
    canAccessParentDashboard: false,
    canAccessSiblingProfiles: false,
    canAccessOtherHouseholds: false,
    canSendPrivateMessages: false,
    canReadCurriculumTablesDirectly: false
  });
}
var ParentVisibilityFlagsSchema = z8.object({
  parentVisible: z8.boolean(),
  requiresParentConsent: z8.boolean(),
  // must have a ConsentRecord before surfacing
  includeInPortfolio: z8.boolean(),
  retentionDays: z8.number().int().positive().nullable(),
  // null = keep until parent deletes
  visibilityTier: VisibilityTierSchema
  // which tier can see this record (ADR-008)
});
var AdminAccessRoleSchema = z8.enum([
  "founder",
  "safety-admin",
  "support-admin",
  "curriculum-admin",
  "technical-admin",
  "ai-agent-operator"
]);
var AdminAccessRecordSchema = z8.object({
  id: z8.string().uuid(),
  adminUserId: z8.string().uuid(),
  adminRole: AdminAccessRoleSchema,
  resourceType: z8.string(),
  // e.g. "child_profile", "chat_message", "escalation_record"
  resourceId: z8.string().uuid(),
  householdId: z8.string().uuid(),
  justification: z8.string().min(10).max(500),
  // required; short justification logged
  accessedAt: z8.string().datetime(),
  sessionExpiresAt: z8.string().datetime(),
  // admin sessions must time out
  ipAddress: z8.string().optional()
  // retained for audit; never surfaced to UI
});
var DataDomainSchema = z8.enum([
  "identity-auth",
  "learner-model",
  "curriculum-spine",
  // read via Mission Compiler API only (ADR-060 provisional)
  "mission-system",
  "evidence-reports",
  "rewards-economy",
  "world-state",
  "network-safety",
  "learning-intelligence"
  // de-identified only; requires explicit parent opt-in (ADR-029)
]);
var DataAccessScopeSchema = z8.object({
  principal: DataPrincipalSchema,
  householdId: z8.string().uuid().nullable(),
  // null for system/admin cross-household access
  allowedDomains: z8.array(DataDomainSchema).min(1),
  restrictions: z8.array(z8.string())
  // human-readable additional constraints
});

// src/moderation.schema.ts
import { z as z9 } from "zod";
var QuickChatCategorySchema = z9.enum([
  "greeting",
  "encouragement",
  "reaction",
  "game-callout",
  "help-request"
]);
var QuickChatOptionSchema = z9.object({
  id: z9.string(),
  category: QuickChatCategorySchema,
  text: z9.string().min(1).max(80),
  // short, pre-approved text; no links, no PII
  emojiCode: z9.string().optional()
  // reference to a safe emoji asset ID; not a raw char
});
var ChatMessageTypeSchema = z9.enum([
  "quick-chat",
  // pre-defined option; K-5 default; content from quickChatOptionId
  "free-text",
  // moderated; grades 6-8 only; requires parent approval (ADR-006)
  "system-message"
  // platform-generated; never from a student; never moderated
]);
var ChatMessageSchema = z9.object({
  id: z9.string().uuid(),
  roomId: z9.string(),
  // Sender identity: Academy Display Name + House only — never real name (ADR-007)
  senderAcademyIdentityId: z9.string().uuid(),
  messageType: ChatMessageTypeSchema,
  // Quick Chat: populated for "quick-chat" messages
  quickChatOptionId: z9.string().optional(),
  // Free text: populated for "free-text" messages only
  // Max 280 chars. Content has already passed pre-send moderation before storage.
  content: z9.string().max(280).optional(),
  sentAt: z9.string().datetime(),
  // ── Safety Invariants (MASTER_HANDOFF §9.3; ADR-006) ────────────────────
  // These z.literal(true) fields are compile-time invariants.
  // Attempting to set any of them to false will cause a TypeScript error.
  noImageContent: z9.literal(true),
  // no image URLs, base64, or file refs
  noFileAttachments: z9.literal(true),
  // no file attachments of any kind
  noExternalLinks: z9.literal(true),
  // no hyperlinks to external sites
  noPrivateChannel: z9.literal(true),
  // all messages are room-scoped; no DMs (ADR-006)
  // All K-8 messages are logged and parent-visible (ADR-006, ADR-008)
  parentVisible: z9.literal(true),
  // Messages are never removed from the audit record
  neverDeleted: z9.literal(true)
});
function buildChatMessage(partial) {
  return ChatMessageSchema.parse({
    ...partial,
    noImageContent: true,
    noFileAttachments: true,
    noExternalLinks: true,
    noPrivateChannel: true,
    parentVisible: true,
    neverDeleted: true
  });
}
var ModerationCheckTypeSchema = z9.enum([
  "pii-scan",
  // phone numbers, emails, real names, addresses
  "link-scan",
  // URLs and external links of any kind
  "contact-info-scan",
  // social handles, usernames, external contact attempts
  "keyword-filter"
  // blocked-keyword list maintained by Agent H
]);
var ModerationOutcomeSchema = z9.enum([
  "approved",
  "blocked",
  "flagged-for-review"
]);
var ModerationCheckResultSchema = z9.object({
  checkType: ModerationCheckTypeSchema,
  outcome: ModerationOutcomeSchema,
  matchedPatterns: z9.array(z9.string())
  // what triggered the flag; no raw PII stored here
});
var ModerationTriggerSchema = z9.enum([
  "chat-message",
  // triggered by student free-text or Quick Chat message
  "ai-output",
  // triggered by AI-generated content (mission, companion dialogue, etc.)
  "user-input"
  // triggered by raw student input before AI processing
]);
var ModerationEventSchema = z9.object({
  id: z9.string().uuid(),
  triggerSource: ModerationTriggerSchema,
  chatMessageId: z9.string().uuid().optional(),
  // set when triggerSource = "chat-message"
  aiOutputEnvelopeId: z9.string().uuid().optional(),
  // set when triggerSource = "ai-output"
  senderChildProfileId: z9.string().uuid(),
  roomId: z9.string().optional(),
  // absent for AI output events
  messageType: ChatMessageTypeSchema.optional(),
  // absent for AI output events
  outcome: ModerationOutcomeSchema,
  checksRun: z9.array(ModerationCheckResultSchema),
  moderatedAt: z9.string().datetime(),
  parentNotified: z9.boolean(),
  parentNotifiedAt: z9.string().datetime().optional()
});
var EscalationSeveritySchema = z9.enum([
  "S0",
  // Informational — logged only, no action required
  "S1",
  // Low concern — logged, parent notified
  "S2",
  // Moderate concern — blocked, safe fallback shown, parent notified
  "S3",
  // High concern — blocked, session flagged, parent alerted
  "S4"
  // Critical — blocked, kill-switch triggered, platform admin notified (CSAM / self-harm)
]);
var EscalationRecordSchema = z9.object({
  id: z9.string().uuid(),
  moderationEventId: z9.string().uuid(),
  severity: EscalationSeveritySchema,
  escalatedAt: z9.string().datetime(),
  escalatedTo: z9.literal("founder"),
  // MVP: all escalations go to founder (ADR-048)
  context: z9.string().max(500),
  // summary for reviewer; no raw message content
  resolutionNotes: z9.string().optional(),
  resolvedAt: z9.string().datetime().optional(),
  resolvedByAdminId: z9.string().uuid().optional(),
  parentNotified: z9.boolean(),
  parentNotifiedAt: z9.string().datetime().optional()
});
var AuditActionSchema = z9.enum([
  "chat-message-sent",
  "chat-message-blocked",
  "chat-message-flagged",
  "ai-output-blocked",
  // AI-generated content blocked by safety pipeline
  "ai-output-safety-check-failed",
  // AI output failed envelope validation or boundary check
  "escalation-created",
  "escalation-resolved",
  "parent-notified",
  "session-terminated-safety",
  // safety-triggered session termination
  "kill-switch-invoked",
  // (ADR-047 provisional)
  "admin-data-accessed",
  // (ADR-049 provisional)
  "moderation-override"
  // manual moderation decision by safety reviewer
]);
var AuditLogEntrySchema = z9.object({
  id: z9.string().uuid(),
  action: AuditActionSchema,
  actorType: z9.enum(["child-session", "parent", "system", "admin"]),
  actorId: z9.string().uuid(),
  targetResourceType: z9.string(),
  targetResourceId: z9.string().uuid().optional(),
  householdId: z9.string().uuid().nullable(),
  // null for Academy-wide or system actions
  occurredAt: z9.string().datetime(),
  metadata: z9.record(z9.unknown()).optional()
  // additional context; never raw child PII
});

// src/ai.schema.ts
import { z as z10 } from "zod";
var AI_MAX_RETRY_ATTEMPTS = 3;
var AIValidationAttemptSchema = z10.object({
  attemptNumber: z10.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
  failureReason: z10.string(),
  // human-readable; logged for debugging
  failedAt: z10.string().datetime()
});
var AIFallbackNotificationLevelSchema = z10.enum([
  "none",
  "soft-notice",
  "safety-alert"
]);
var AIOutputResultSchema = z10.discriminatedUnion("status", [
  z10.object({
    status: z10.literal("validated"),
    data: z10.unknown(),
    // strongly typed by each consumer's target schema
    attemptsUsed: z10.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
    validatedAt: z10.string().datetime()
  }),
  z10.object({
    status: z10.literal("failed-with-fallback"),
    attemptsUsed: z10.literal(3),
    attempts: z10.array(AIValidationAttemptSchema).length(3),
    fallbackId: z10.string(),
    // references a SafeFallbackSchema record
    fallbackUsedAt: z10.string().datetime(),
    notificationLevel: AIFallbackNotificationLevelSchema
    // see AIFallbackNotificationLevelSchema
  })
]);
var SafeFallbackContextSchema = z10.enum([
  "mission-generation",
  // Mission Compiler failed; pre-built starter mission used
  "mission-step",
  // One step failed; simplified static alternative shown
  "companion-dialogue",
  // Companion AI failed; pre-written dialogue shown
  "parent-plan",
  // Parent plan generation failed; generic template shown
  "evidence-summary",
  // Evidence summary failed; placeholder shown
  "calibration-summary",
  // Calibration narrative failed; generic progress note shown
  "user-input"
  // Input moderation fallback; safe guided response shown
]);
var SafeFallbackSchema = z10.object({
  id: z10.string(),
  context: SafeFallbackContextSchema,
  title: z10.string(),
  content: z10.string(),
  parentNote: z10.string(),
  // plain-language note explaining what happened
  parentVisible: z10.literal(true),
  // fallback usage is always parent-visible
  isAIGenerated: z10.literal(false)
  // invariant: safe fallbacks are NEVER AI-generated
});
var AIOutputEnvelopeSchema = z10.object({
  id: z10.string().uuid(),
  traceId: z10.string().uuid(),
  // unique trace ID for cross-service debugging
  generationContext: z10.string(),
  // e.g. "mission-compiler", "companion-dialogue"
  childProfileId: z10.string().uuid(),
  childSessionId: z10.string().uuid().optional(),
  requestedAt: z10.string().datetime(),
  result: AIOutputResultSchema,
  modelProvider: z10.string(),
  // e.g. "anthropic", "openai" — provider, not model
  modelVersion: z10.string().optional(),
  // model name + version if available
  promptTemplateVersion: z10.string().optional(),
  // version of the prompt template used
  schemaVersion: z10.string(),
  // version of the validation schema applied
  safetyPolicyVersion: z10.string().optional(),
  // safety policy version; populated when applicable
  missionCompilerVersion: z10.string().optional(),
  // populated when generationContext is mission-related
  parentVisible: z10.boolean()
});
var DeidentifiedEventTypeSchema = z10.enum([
  "mission-step-interaction",
  // step type, interaction type, outcome, time-on-task bucket
  "delivery-mode-choice",
  // which delivery mode the student selected
  "hint-requested",
  // hint usage signal (boolean + sequence position)
  "persistence-signal",
  // time-on-task / retry count (bucketed, not exact)
  "mastery-signal",
  // mastery achieved / not achieved (no skill name in record)
  "calibration-signal"
  // which calibration stage, no identifying data
]);
var DeidentifiedEventSchema = z10.object({
  id: z10.string().uuid(),
  // De-identification: no real child profile ID, no household ID.
  // deidentifiedTokenId is a rotating pseudonymous learner key issued by the
  // learning intelligence domain. It cannot be joined back to a production child
  // record by model-training or analytics systems. The join-back mapping between
  // child profile ID and pseudonymous learner key is stored in a separate,
  // restricted-access table that is not available to model-training jobs.
  // Rotation occurs quarterly or at each dataset export boundary. (ADR-029)
  deidentifiedTokenId: z10.string(),
  eventType: DeidentifiedEventTypeSchema,
  gradeLevel: z10.string(),
  // e.g. "K", "3" — cohort-level signal, not individual
  // Structured categorical features only; no free text, no audio, no PII
  features: z10.record(z10.union([z10.string(), z10.number(), z10.boolean()])),
  occurredAt: z10.string().datetime(),
  datasetEligibilityId: z10.string().uuid(),
  // links to the consent record that authorized this
  // De-identification invariants — compile-time constraints
  containsRawPii: z10.literal(false),
  containsAudioContent: z10.literal(false),
  containsFreeTextContent: z10.literal(false)
});
var DatasetEligibilitySchema = z10.object({
  id: z10.string().uuid(),
  childProfileId: z10.string().uuid(),
  householdId: z10.string().uuid(),
  eligible: z10.boolean(),
  // true only with parent model improvement opt-in
  parentConsentRecordId: z10.string().uuid().nullable(),
  // null when opted out
  datasetVersionId: z10.string(),
  // which training dataset version this consent covers
  assessedAt: z10.string().datetime(),
  revokedAt: z10.string().datetime().optional()
  // set when parent opts out
});
var ModelImprovementConsentSchema = z10.object({
  id: z10.string().uuid(),
  parentAccountId: z10.string().uuid(),
  childProfileId: z10.string().uuid(),
  granted: z10.boolean(),
  // false = opted out (safe default)
  grantedAt: z10.string().datetime().nullable(),
  revokedAt: z10.string().datetime().nullable(),
  consentVersion: z10.string(),
  // versioned so updates can require re-consent
  scopeDescription: z10.string()
  // plain-language description of what was consented to
});

// src/calibration.schema.ts
import { z as z11 } from "zod";
var CalibrationSignalTypeSchema = z11.enum([
  "reading-vs-listening",
  // whether student activates audio vs. reads independently
  "cognitive-load",
  // time-on-task + hint usage = chunk size signal
  "ai-readiness",
  // engagement with companion dialogue and AI prompts
  "persistence",
  // retry-after-failure vs. help-seeking behavior
  "delivery-mode-preference",
  // which of the three delivery modes the student chooses
  "hint-frequency"
  // how often the student requests companion hints
]);
var CalibrationEvidenceCaptureTypeSchema = z11.enum([
  "decision-log",
  "sequence-completion",
  "ai-mistake-check",
  "explanation",
  "reflection",
  "structured-replay"
]);
var CalibrationSignalSchema = z11.object({
  signalType: CalibrationSignalTypeSchema,
  description: z11.string(),
  sourceMissionTaskId: z11.string().nullable(),
  evidenceCaptureType: CalibrationEvidenceCaptureTypeSchema.nullable()
});

// src/admin.schema.ts
import { z as z12 } from "zod";
var AdminRoleSchema = z12.enum([
  "founder",
  "safety_admin",
  "support_admin",
  "curriculum_admin",
  "technical_admin",
  "ai_agent_operator"
]);
var AdminUserSchema = z12.object({
  id: z12.string().uuid(),
  user_id: z12.string(),
  // auth.users.id — authorization key
  email: z12.string().email(),
  // display only, NOT authorization source
  role: AdminRoleSchema,
  granted_by: z12.string().nullable(),
  granted_at: z12.string().datetime(),
  revoked_at: z12.string().datetime().nullable(),
  notes: z12.string().nullable()
});

// src/session.schema.ts
import { z as z13 } from "zod";
var LaunchModeSchema = z13.enum(["parent_launched", "trusted_device_pin"]);
var StartSessionRequestSchema = z13.object({
  /** The child's profile UUID — parent must own this profile (enforced by Railway). */
  childProfileId: z13.string().uuid({ message: "childProfileId must be a valid UUID" }),
  /**
   * How the session is being launched.
   * Only "parent_launched" is implemented in Phase 0.
   * "trusted_device_pin" scaffolded; returns 400 until Phase 1.
   */
  launchMode: LaunchModeSchema.default("parent_launched")
});
var AcademyIdentityResponseSchema = z13.object({
  /** Child's Academy display name (2–32 chars, unique Academy-wide). */
  displayName: z13.string(),
  /**
   * Current house affiliation.
   * "pre_sorting" if Sorting Ceremony has not yet been completed.
   */
  house: z13.string()
});
var StartSessionResponseSchema = z13.object({
  /**
   * Opaque session token issued by Railway.
   * NOT the childProfileId — generated via crypto.randomUUID().
   * The child app uses this token to authenticate Railway API calls for this session.
   */
  childSessionToken: z13.string(),
  /** UUID of the newly created child_sessions row. */
  childSessionId: z13.string().uuid(),
  /** ISO 8601 timestamp when this session expires. Default: 2h from creation. */
  expiresAt: z13.string().datetime(),
  /** Academy identity for display in the child entry experience. */
  academyIdentity: AcademyIdentityResponseSchema
});
var VerifySessionResponseSchema = z13.object({
  /** UUID of the verified child_sessions row. */
  childSessionId: z13.string().uuid(),
  /** UUID of the academy_identities row bound to this session. */
  academyIdentityId: z13.string().uuid(),
  /** ISO 8601 timestamp when this session expires. */
  expiresAt: z13.string().datetime(),
  /** Verified academy identity (display name + house) — the entry authority. */
  academyIdentity: AcademyIdentityResponseSchema
});
var SelectableHouseSchema = HouseSchema.exclude(["pre_sorting"]);
var SetHouseRequestSchema = z13.object({
  /** The house the child chose during the Sorting Ceremony. */
  house: SelectableHouseSchema
});
var SetHouseResponseSchema = z13.object({
  success: z13.literal(true),
  /** The updated academy identity (so the client can refresh display state). */
  academyIdentity: AcademyIdentityResponseSchema
});
var SelectCompanionRequestSchema = z13.object({
  /** Stable key used across growth/rewards events, e.g. "comp-001-spark". */
  companionKey: z13.string().min(1).max(64),
  /** Display name the child sees, e.g. "Spark". */
  characterName: z13.string().min(1).max(48),
  /** Personality/teaching style descriptor from the chosen template. */
  characterStyle: z13.string().max(64).optional(),
  /** Teaching tone descriptor from the chosen template. */
  teachingTone: z13.string().max(64).optional(),
  /** Original template id the selection came from (provenance). */
  templateId: z13.string().max(64).optional()
});
var SelectCompanionResponseSchema = z13.object({
  success: z13.literal(true),
  companion: z13.object({
    companionKey: z13.string(),
    characterName: z13.string(),
    bondLevel: z13.number().int().nonnegative(),
    isActive: z13.boolean()
  })
});
var StartMissionRequestSchema = z13.object({
  /** Canonical mission identifier. Hero Slice = "mission-001". */
  missionId: z13.string().min(1).max(64).default("mission-001")
});
var StudentMissionTaskSchema = z13.object({
  id: z13.string(),
  description: z13.string(),
  interactionType: z13.string()
});
var StartMissionResponseSchema = z13.object({
  missionAttemptId: z13.string().uuid(),
  missionId: z13.string(),
  /** Provenance: 'ai' = compiled+validated; 'fallback' = static safe content. */
  contentSource: z13.enum(["ai", "fallback"]),
  storyHook: z13.string(),
  tasks: z13.array(StudentMissionTaskSchema),
  rewardPreviewLabel: z13.string()
});
var CompleteMissionRequestSchema = z13.object({
  missionAttemptId: z13.string().uuid(),
  /** Did the child finish all tasks (vs. just attempt)? Gates completion bonuses. */
  completedAllTasks: z13.boolean().default(true),
  /** Did the child demonstrate the mastery bar (e.g. caught the AI mistake)? */
  masteryThresholdMet: z13.boolean().default(false),
  /** Optional 0–1 evidence-weighted score. */
  masteryEvidenceScore: z13.number().min(0).max(1).optional()
});
var MissionRewardSummarySchema = z13.object({
  moolahEarned: z13.number().int().nonnegative(),
  xpEarned: z13.number().int().nonnegative(),
  housePointsEarned: z13.number().int().nonnegative(),
  companionBondDelta: z13.number().int().nonnegative(),
  badgesAwarded: z13.array(z13.string())
});
var CompleteMissionResponseSchema = z13.object({
  missionAttemptId: z13.string().uuid(),
  status: z13.literal("completed"),
  /** True if this completion was already recorded — no rewards were re-applied. */
  alreadyCompleted: z13.boolean(),
  rewards: MissionRewardSummarySchema,
  evidenceCount: z13.number().int().nonnegative(),
  masteryRecordsWritten: z13.number().int().nonnegative(),
  /** parent_reports row id (First Learning Map), or null if assembly was skipped. */
  reportId: z13.string().uuid().nullable()
});

// src/mappers/moolah-ledger.mapper.ts
function moolahLedgerEntryToDb(entry, humanReason) {
  return {
    child_profile_id: entry.childProfileId,
    wallet_id: entry.walletId,
    amount: entry.delta,
    // Zod: delta → DB: amount
    source_type: entry.reason,
    // Zod: reason (enum) → DB: source_type
    source_id: entry.referenceId,
    // Zod: referenceId → DB: source_id
    reason: humanReason,
    // DB: reason (human-readable, no Zod equivalent)
    idempotency_key: entry.idempotencyKey
    // Zod: idempotencyKey → DB: idempotency_key
    // balance_after: intentionally omitted — set by trigger
  };
}
function dbRowToMoolahLedgerEntry(row) {
  if (!row.wallet_id) {
    throw new Error(
      `moolah_ledger row ${row.id} has no wallet_id \u2014 row is inconsistent. Ensure the auto_create_moolah_wallet trigger ran before the ledger insert.`
    );
  }
  return {
    id: row.id,
    childProfileId: row.child_profile_id,
    walletId: row.wallet_id,
    delta: row.amount,
    // DB: amount → Zod: delta
    reason: row.source_type,
    // DB: source_type → Zod: reason (enum)
    referenceId: row.source_id ?? void 0,
    // DB: source_id → Zod: referenceId
    idempotencyKey: row.idempotency_key ?? void 0,
    // DB: idempotency_key → Zod: idempotencyKey
    occurredAt: row.created_at
    // DB: created_at → Zod: occurredAt
  };
}
export {
  AIFallbackNotificationLevelSchema,
  AIOutputEnvelopeSchema,
  AIOutputResultSchema,
  AIValidationAttemptSchema,
  AI_MAX_RETRY_ATTEMPTS,
  AcademyIdentityResponseSchema,
  AcademyIdentitySchema,
  AcademySeasonalEventPayloadSchema,
  AcademyUnlockTriggeredPayloadSchema,
  AdminAccessRecordSchema,
  AdminAccessRoleSchema,
  AdminRoleSchema,
  AdminUserSchema,
  ApprovalModeSchema,
  ArtifactSchema,
  ArtifactTypeSchema,
  AuditActionSchema,
  AuditLogEntrySchema,
  AvatarMovedPayloadSchema,
  BadgeAwardSchema,
  BadgeAwardedPayloadSchema,
  BadgeCategorySchema,
  BadgeSchema,
  CalibrationEvidenceCaptureTypeSchema,
  CalibrationSignalSchema,
  CalibrationSignalTypeSchema,
  CalibrationStageSchema,
  ChatMessageSchema,
  ChatMessageTypeSchema,
  ChatModeSchema,
  ChildBadgeSchema,
  ChildPermissionsSchema,
  ChildPersonalizationSchema,
  ChildProfileSchema,
  ChildSessionSchema,
  ChildSessionScopeSchema,
  CompanionBondIncreasedPayloadSchema,
  CompanionDialogueLineSchema,
  CompanionGrowthEventSchema,
  CompanionGrowthTypeSchema,
  CompanionMilestoneReachedPayloadSchema,
  CompleteMissionRequestSchema,
  CompleteMissionResponseSchema,
  ConsentTypeSchema,
  DataAccessScopeSchema,
  DataDomainSchema,
  DataPrincipalSchema,
  DatasetEligibilitySchema,
  DeidentifiedEventSchema,
  DeidentifiedEventTypeSchema,
  DeliveryModeSchema,
  DistractorRuleSchema,
  EscalationRecordSchema,
  EscalationSeveritySchema,
  EvidenceCapturePointSchema,
  EvidenceCaptureTypeSchema,
  EvidenceHighlightSchema,
  EvidenceHighlightTypeSchema,
  EvidencePlanSchema,
  GameProgressSummarySchema,
  GradeSchema,
  HintLadderSchema,
  HintTierSchema,
  HouseLeaderboardPeriodSchema,
  HouseLeaderboardSnapshotSchema,
  HouseLeaderboardUpdatedPayloadSchema,
  HousePointEventSchema,
  HousePointsEarnedPayloadSchema,
  HousePointsReasonSchema,
  HousePointsRecordSchema,
  HouseRankingSchema,
  HouseSchema,
  HouseholdSchema,
  ItemAttributesSchema,
  LaunchModeSchema,
  LearnerCalibrationScoreSchema,
  LearningEvidenceEventSchema,
  LearningStyleSchema,
  LessonTaskSkeletonSchema,
  LessonTaskTypeSchema,
  LiteCardSchema,
  LiteInteractionSchema,
  MasteryLevelSchema,
  MasteryProgressLevelSchema,
  MasteryProgressSummarySchema,
  MasteryRecordSchema,
  MissionAbandonedPayloadSchema,
  MissionAttemptSchema,
  MissionCompletedPayloadSchema,
  MissionOutputSchema,
  MissionReplayEventSchema,
  MissionRewardSummarySchema,
  MissionSchema,
  MissionStartedPayloadSchema,
  MissionStatusSchema,
  MissionStepCompletedPayloadSchema,
  MissionTaskSchema,
  ModelImprovementConsentSchema,
  ModerationCheckResultSchema,
  ModerationCheckTypeSchema,
  ModerationEventSchema,
  ModerationOutcomeSchema,
  ModerationTriggerSchema,
  MoolahEarnedPayloadSchema,
  MoolahLedgerEntrySchema,
  MoolahReasonSchema,
  MoolahSpentPayloadSchema,
  MoolahWalletSchema,
  NextMissionRecommendationSchema,
  ParentAccountSchema,
  ParentConsentSchema,
  ParentIntentSchema,
  ParentPlanSchema,
  ParentReportSchema,
  ParentReportTypeSchema,
  ParentVisibilityFlagsSchema,
  ParentVisibilityModeSchema,
  PortfolioItemSchema,
  QuickChatCategorySchema,
  QuickChatOptionSchema,
  ReadingTierSchema,
  RewardPlanSchema,
  RoomJoinedPayloadSchema,
  RoomLeftPayloadSchema,
  RulePredicateLeafSchema,
  RulePredicateSchema,
  SafeFallbackContextSchema,
  SafeFallbackSchema,
  SelectCompanionRequestSchema,
  SelectCompanionResponseSchema,
  SelectableHouseSchema,
  SessionEntryMethodSchema,
  SetHouseRequestSchema,
  SetHouseResponseSchema,
  SkeletonFillItemSchema,
  SkeletonFillSchema,
  StandardsAlignmentSchema,
  StartMissionRequestSchema,
  StartMissionResponseSchema,
  StartSessionRequestSchema,
  StartSessionResponseSchema,
  Student3dMissionSchema,
  StudentInteractiveLiteSchema,
  StudentMissionTaskSchema,
  StudentTextAudioOfflineSchema,
  TrustedDeviceSchema,
  VariantKeySchema,
  VerifySessionResponseSchema,
  VisibilityTierSchema,
  WORLD_EVENT_PAYLOAD_SCHEMAS,
  WorldDecorationPlacedPayloadSchema,
  WorldEventSchema,
  WorldEventTypeSchema,
  WorldRepairCompletedPayloadSchema,
  XPEventSchema,
  XpEarnedPayloadSchema,
  XpEventSchema,
  buildChatMessage,
  buildChildSessionScope,
  dbRowToMoolahLedgerEntry,
  moolahLedgerEntryToDb
};
