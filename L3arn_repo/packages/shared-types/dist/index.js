"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AIFallbackNotificationLevelSchema: () => AIFallbackNotificationLevelSchema,
  AIOutputEnvelopeSchema: () => AIOutputEnvelopeSchema,
  AIOutputResultSchema: () => AIOutputResultSchema,
  AIValidationAttemptSchema: () => AIValidationAttemptSchema,
  AI_MAX_RETRY_ATTEMPTS: () => AI_MAX_RETRY_ATTEMPTS,
  AcademyIdentityResponseSchema: () => AcademyIdentityResponseSchema,
  AcademyIdentitySchema: () => AcademyIdentitySchema,
  AcademySeasonalEventPayloadSchema: () => AcademySeasonalEventPayloadSchema,
  AcademyUnlockTriggeredPayloadSchema: () => AcademyUnlockTriggeredPayloadSchema,
  AdminAccessRecordSchema: () => AdminAccessRecordSchema,
  AdminAccessRoleSchema: () => AdminAccessRoleSchema,
  AdminRoleSchema: () => AdminRoleSchema,
  AdminUserSchema: () => AdminUserSchema,
  ApprovalModeSchema: () => ApprovalModeSchema,
  ArtifactSchema: () => ArtifactSchema,
  ArtifactTypeSchema: () => ArtifactTypeSchema,
  AuditActionSchema: () => AuditActionSchema,
  AuditLogEntrySchema: () => AuditLogEntrySchema,
  AvatarMovedPayloadSchema: () => AvatarMovedPayloadSchema,
  BadgeAwardSchema: () => BadgeAwardSchema,
  BadgeAwardedPayloadSchema: () => BadgeAwardedPayloadSchema,
  BadgeCategorySchema: () => BadgeCategorySchema,
  BadgeSchema: () => BadgeSchema,
  CalibrationEvidenceCaptureTypeSchema: () => CalibrationEvidenceCaptureTypeSchema,
  CalibrationSignalSchema: () => CalibrationSignalSchema,
  CalibrationSignalTypeSchema: () => CalibrationSignalTypeSchema,
  CalibrationStageSchema: () => CalibrationStageSchema,
  ChatMessageSchema: () => ChatMessageSchema,
  ChatMessageTypeSchema: () => ChatMessageTypeSchema,
  ChatModeSchema: () => ChatModeSchema,
  ChildBadgeSchema: () => ChildBadgeSchema,
  ChildPermissionsSchema: () => ChildPermissionsSchema,
  ChildPersonalizationSchema: () => ChildPersonalizationSchema,
  ChildProfileSchema: () => ChildProfileSchema,
  ChildSessionSchema: () => ChildSessionSchema,
  ChildSessionScopeSchema: () => ChildSessionScopeSchema,
  CompanionBondIncreasedPayloadSchema: () => CompanionBondIncreasedPayloadSchema,
  CompanionDialogueLineSchema: () => CompanionDialogueLineSchema,
  CompanionGrowthEventSchema: () => CompanionGrowthEventSchema,
  CompanionGrowthTypeSchema: () => CompanionGrowthTypeSchema,
  CompanionMilestoneReachedPayloadSchema: () => CompanionMilestoneReachedPayloadSchema,
  CompleteMissionRequestSchema: () => CompleteMissionRequestSchema,
  CompleteMissionResponseSchema: () => CompleteMissionResponseSchema,
  ConsentTypeSchema: () => ConsentTypeSchema,
  DataAccessScopeSchema: () => DataAccessScopeSchema,
  DataDomainSchema: () => DataDomainSchema,
  DataPrincipalSchema: () => DataPrincipalSchema,
  DatasetEligibilitySchema: () => DatasetEligibilitySchema,
  DeidentifiedEventSchema: () => DeidentifiedEventSchema,
  DeidentifiedEventTypeSchema: () => DeidentifiedEventTypeSchema,
  DeliveryModeSchema: () => DeliveryModeSchema,
  DistractorRuleSchema: () => DistractorRuleSchema,
  EscalationRecordSchema: () => EscalationRecordSchema,
  EscalationSeveritySchema: () => EscalationSeveritySchema,
  EvidenceCapturePointSchema: () => EvidenceCapturePointSchema,
  EvidenceCaptureTypeSchema: () => EvidenceCaptureTypeSchema,
  EvidenceHighlightSchema: () => EvidenceHighlightSchema,
  EvidenceHighlightTypeSchema: () => EvidenceHighlightTypeSchema,
  EvidencePlanSchema: () => EvidencePlanSchema,
  GameProgressSummarySchema: () => GameProgressSummarySchema,
  GradeSchema: () => GradeSchema,
  HintLadderSchema: () => HintLadderSchema,
  HintTierSchema: () => HintTierSchema,
  HouseLeaderboardPeriodSchema: () => HouseLeaderboardPeriodSchema,
  HouseLeaderboardSnapshotSchema: () => HouseLeaderboardSnapshotSchema,
  HouseLeaderboardUpdatedPayloadSchema: () => HouseLeaderboardUpdatedPayloadSchema,
  HousePointEventSchema: () => HousePointEventSchema,
  HousePointsEarnedPayloadSchema: () => HousePointsEarnedPayloadSchema,
  HousePointsReasonSchema: () => HousePointsReasonSchema,
  HousePointsRecordSchema: () => HousePointsRecordSchema,
  HouseRankingSchema: () => HouseRankingSchema,
  HouseSchema: () => HouseSchema,
  HouseholdSchema: () => HouseholdSchema,
  ItemAttributesSchema: () => ItemAttributesSchema,
  LaunchModeSchema: () => LaunchModeSchema,
  LearnerCalibrationScoreSchema: () => LearnerCalibrationScoreSchema,
  LearningEvidenceEventSchema: () => LearningEvidenceEventSchema,
  LearningStyleSchema: () => LearningStyleSchema,
  LessonTaskSkeletonSchema: () => LessonTaskSkeletonSchema,
  LessonTaskTypeSchema: () => LessonTaskTypeSchema,
  LiteCardSchema: () => LiteCardSchema,
  LiteInteractionSchema: () => LiteInteractionSchema,
  MasteryLevelSchema: () => MasteryLevelSchema,
  MasteryProgressLevelSchema: () => MasteryProgressLevelSchema,
  MasteryProgressSummarySchema: () => MasteryProgressSummarySchema,
  MasteryRecordSchema: () => MasteryRecordSchema,
  MissionAbandonedPayloadSchema: () => MissionAbandonedPayloadSchema,
  MissionAttemptSchema: () => MissionAttemptSchema,
  MissionCompletedPayloadSchema: () => MissionCompletedPayloadSchema,
  MissionOutputSchema: () => MissionOutputSchema,
  MissionReplayEventSchema: () => MissionReplayEventSchema,
  MissionRewardSummarySchema: () => MissionRewardSummarySchema,
  MissionSchema: () => MissionSchema,
  MissionStartedPayloadSchema: () => MissionStartedPayloadSchema,
  MissionStatusSchema: () => MissionStatusSchema,
  MissionStepCompletedPayloadSchema: () => MissionStepCompletedPayloadSchema,
  MissionTaskSchema: () => MissionTaskSchema,
  ModelImprovementConsentSchema: () => ModelImprovementConsentSchema,
  ModerationCheckResultSchema: () => ModerationCheckResultSchema,
  ModerationCheckTypeSchema: () => ModerationCheckTypeSchema,
  ModerationEventSchema: () => ModerationEventSchema,
  ModerationOutcomeSchema: () => ModerationOutcomeSchema,
  ModerationTriggerSchema: () => ModerationTriggerSchema,
  MoolahEarnedPayloadSchema: () => MoolahEarnedPayloadSchema,
  MoolahLedgerEntrySchema: () => MoolahLedgerEntrySchema,
  MoolahReasonSchema: () => MoolahReasonSchema,
  MoolahSpentPayloadSchema: () => MoolahSpentPayloadSchema,
  MoolahWalletSchema: () => MoolahWalletSchema,
  NextMissionRecommendationSchema: () => NextMissionRecommendationSchema,
  ParentAccountSchema: () => ParentAccountSchema,
  ParentConsentSchema: () => ParentConsentSchema,
  ParentIntentSchema: () => ParentIntentSchema,
  ParentPlanSchema: () => ParentPlanSchema,
  ParentReportSchema: () => ParentReportSchema,
  ParentReportTypeSchema: () => ParentReportTypeSchema,
  ParentVisibilityFlagsSchema: () => ParentVisibilityFlagsSchema,
  ParentVisibilityModeSchema: () => ParentVisibilityModeSchema,
  PortfolioItemSchema: () => PortfolioItemSchema,
  QuickChatCategorySchema: () => QuickChatCategorySchema,
  QuickChatOptionSchema: () => QuickChatOptionSchema,
  ReadingTierSchema: () => ReadingTierSchema,
  RewardPlanSchema: () => RewardPlanSchema,
  RoomJoinedPayloadSchema: () => RoomJoinedPayloadSchema,
  RoomLeftPayloadSchema: () => RoomLeftPayloadSchema,
  RulePredicateLeafSchema: () => RulePredicateLeafSchema,
  RulePredicateSchema: () => RulePredicateSchema,
  SafeFallbackContextSchema: () => SafeFallbackContextSchema,
  SafeFallbackSchema: () => SafeFallbackSchema,
  SelectCompanionRequestSchema: () => SelectCompanionRequestSchema,
  SelectCompanionResponseSchema: () => SelectCompanionResponseSchema,
  SelectableHouseSchema: () => SelectableHouseSchema,
  SessionEntryMethodSchema: () => SessionEntryMethodSchema,
  SetHouseRequestSchema: () => SetHouseRequestSchema,
  SetHouseResponseSchema: () => SetHouseResponseSchema,
  SkeletonFillItemSchema: () => SkeletonFillItemSchema,
  SkeletonFillSchema: () => SkeletonFillSchema,
  StandardsAlignmentSchema: () => StandardsAlignmentSchema,
  StartMissionRequestSchema: () => StartMissionRequestSchema,
  StartMissionResponseSchema: () => StartMissionResponseSchema,
  StartSessionRequestSchema: () => StartSessionRequestSchema,
  StartSessionResponseSchema: () => StartSessionResponseSchema,
  Student3dMissionSchema: () => Student3dMissionSchema,
  StudentInteractiveLiteSchema: () => StudentInteractiveLiteSchema,
  StudentMissionTaskSchema: () => StudentMissionTaskSchema,
  StudentTextAudioOfflineSchema: () => StudentTextAudioOfflineSchema,
  TrustedDeviceSchema: () => TrustedDeviceSchema,
  VariantKeySchema: () => VariantKeySchema,
  VerifySessionResponseSchema: () => VerifySessionResponseSchema,
  VisibilityTierSchema: () => VisibilityTierSchema,
  WORLD_EVENT_PAYLOAD_SCHEMAS: () => WORLD_EVENT_PAYLOAD_SCHEMAS,
  WorldDecorationPlacedPayloadSchema: () => WorldDecorationPlacedPayloadSchema,
  WorldEventSchema: () => WorldEventSchema,
  WorldEventTypeSchema: () => WorldEventTypeSchema,
  WorldRepairCompletedPayloadSchema: () => WorldRepairCompletedPayloadSchema,
  XPEventSchema: () => XPEventSchema,
  XpEarnedPayloadSchema: () => XpEarnedPayloadSchema,
  XpEventSchema: () => XpEventSchema,
  buildChatMessage: () => buildChatMessage,
  buildChildSessionScope: () => buildChildSessionScope,
  dbRowToMoolahLedgerEntry: () => dbRowToMoolahLedgerEntry,
  moolahLedgerEntryToDb: () => moolahLedgerEntryToDb
});
module.exports = __toCommonJS(index_exports);

// src/identity.schema.ts
var import_zod = require("zod");
var HouseSchema = import_zod.z.enum(["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]);
var GradeSchema = import_zod.z.enum(["K", "1", "2", "3", "4", "5", "6", "7", "8"]);
var ApprovalModeSchema = import_zod.z.enum(["high-control", "balanced", "autopilot"]);
var DeliveryModeSchema = import_zod.z.enum(["3d", "interactive-lite", "text-audio-offline"]);
var ChatModeSchema = import_zod.z.enum(["quick-chat-only", "moderated-free-text"]);
var VisibilityTierSchema = import_zod.z.enum([
  "full",
  // K-5 default: parent sees everything
  "summary",
  // grades 6-8 default: summary with expand-on-demand
  "safety-override"
  // always available regardless of tier
]);
var ParentAccountSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  email: import_zod.z.string().email(),
  createdAt: import_zod.z.string().datetime(),
  updatedAt: import_zod.z.string().datetime()
});
var HouseholdSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  parentAccountId: import_zod.z.string().uuid(),
  name: import_zod.z.string().min(1).max(100),
  createdAt: import_zod.z.string().datetime()
});
var ChildProfileSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  householdId: import_zod.z.string().uuid(),
  parentAccountId: import_zod.z.string().uuid(),
  legalFirstName: import_zod.z.string().min(1).max(100),
  legalLastName: import_zod.z.string().min(1).max(100),
  grade: GradeSchema,
  dateOfBirth: import_zod.z.string().date(),
  // YYYY-MM-DD; retained for COPPA age verification only
  createdAt: import_zod.z.string().datetime(),
  updatedAt: import_zod.z.string().datetime()
});
var AcademyIdentitySchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  childProfileId: import_zod.z.string().uuid(),
  displayName: import_zod.z.string().min(2).max(32),
  // parent-approved Academy Display Name
  house: HouseSchema,
  avatarAssetId: import_zod.z.string().optional(),
  // reference to a pre-built avatar asset; no face data
  createdAt: import_zod.z.string().datetime(),
  updatedAt: import_zod.z.string().datetime()
});
var ChildPermissionsSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  childProfileId: import_zod.z.string().uuid(),
  // Chat (ADR-006): parent sets which chat mode the child operates under
  chatMode: ChatModeSchema,
  // Audio (ADR-027): push-to-talk only when enabled; never always-on
  audioEnabled: import_zod.z.boolean(),
  // AI interaction (ADR-009): parent enables/disables AI companion chat
  aiInteractionEnabled: import_zod.z.boolean(),
  // Delivery modes the child may access (ADR-017: parent governs, student chooses within)
  allowedDeliveryModes: import_zod.z.array(DeliveryModeSchema).min(1),
  // Curriculum approval mode (ADR-012)
  curriculumApprovalMode: ApprovalModeSchema,
  // Model improvement opt-in (ADR-029): false = opted out; this is the safe default
  modelImprovementOptIn: import_zod.z.boolean(),
  // Parent visibility tier for this child's data (ADR-008)
  parentVisibilityTier: VisibilityTierSchema,
  // Optional hard limits
  screenLimitMinutesPerDay: import_zod.z.number().int().positive().optional(),
  blockedTopics: import_zod.z.array(import_zod.z.string()).default([]),
  updatedAt: import_zod.z.string().datetime(),
  updatedByParentAccountId: import_zod.z.string().uuid()
});
var TrustedDeviceSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  childProfileId: import_zod.z.string().uuid(),
  parentAccountId: import_zod.z.string().uuid(),
  deviceFingerprint: import_zod.z.string(),
  nickname: import_zod.z.string().optional(),
  approvedAt: import_zod.z.string().datetime(),
  lastUsedAt: import_zod.z.string().datetime().optional(),
  revokedAt: import_zod.z.string().datetime().optional()
});
var SessionEntryMethodSchema = import_zod.z.enum([
  "parent-launch",
  "avatar-pin-trusted-device"
]);
var ChildSessionSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  childProfileId: import_zod.z.string().uuid(),
  academyIdentityId: import_zod.z.string().uuid(),
  entryMethod: SessionEntryMethodSchema,
  trustedDeviceId: import_zod.z.string().uuid().optional(),
  startedAt: import_zod.z.string().datetime(),
  endedAt: import_zod.z.string().datetime().optional(),
  currentRoomId: import_zod.z.string().optional()
});
var ConsentTypeSchema = import_zod.z.enum([
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
var ParentConsentSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  parentAccountId: import_zod.z.string().uuid(),
  childProfileId: import_zod.z.string().uuid().optional(),
  // null = account-level consent
  consentType: ConsentTypeSchema,
  granted: import_zod.z.boolean(),
  grantedAt: import_zod.z.string().datetime(),
  ipAddress: import_zod.z.string().optional(),
  // retained for COPPA audit; not surfaced to UI
  revokedAt: import_zod.z.string().datetime().optional()
});

// src/mission.schema.ts
var import_zod2 = require("zod");
var MasteryLevelSchema = import_zod2.z.enum([
  "emerging",
  "developing",
  "proficient",
  "advanced"
]);
var ParentIntentSchema = import_zod2.z.object({
  approvalMode: ApprovalModeSchema,
  emphasizeTopics: import_zod2.z.array(import_zod2.z.string()).default([]),
  blockedTopics: import_zod2.z.array(import_zod2.z.string()).default([]),
  preferredDeliveryModes: import_zod2.z.array(DeliveryModeSchema).optional(),
  customInstructions: import_zod2.z.string().max(1e3).optional()
});
var StandardsAlignmentSchema = import_zod2.z.object({
  masterySkillId: import_zod2.z.string(),
  masteryDomainId: import_zod2.z.string(),
  masteryObjective: import_zod2.z.string(),
  floridaStandardCode: import_zod2.z.string().optional(),
  // e.g. "LAFS.3.RI.1.1"; optional for non-FL families
  l3arnMasteryLevel: MasteryLevelSchema,
  evidenceThreshold: import_zod2.z.string()
  // human-readable mastery bar description
});
var ChildPersonalizationSchema = import_zod2.z.object({
  childProfileId: import_zod2.z.string().uuid(),
  grade: GradeSchema,
  preferredDeliveryMode: DeliveryModeSchema,
  instructionChunkSize: import_zod2.z.enum(["short", "medium", "long"]),
  hintFrequency: import_zod2.z.enum(["high", "medium", "low"]),
  interests: import_zod2.z.array(import_zod2.z.string()),
  house: HouseSchema,
  companionId: import_zod2.z.string().uuid().optional(),
  accessibilityFlags: import_zod2.z.object({
    audioSupport: import_zod2.z.boolean(),
    visualSupport: import_zod2.z.boolean(),
    lowTextMode: import_zod2.z.boolean(),
    parentReadAloud: import_zod2.z.boolean()
  })
});
var ParentPlanSchema = import_zod2.z.object({
  objective: import_zod2.z.string(),
  standardsAlignment: StandardsAlignmentSchema,
  materials: import_zod2.z.array(import_zod2.z.string()),
  steps: import_zod2.z.array(import_zod2.z.string()),
  safetyNotes: import_zod2.z.string().optional(),
  evidenceSummary: import_zod2.z.string(),
  masteryThreshold: import_zod2.z.string(),
  whyChosen: import_zod2.z.string()
  // explains how personalization + alignment produced this mission
});
var CompanionDialogueLineSchema = import_zod2.z.object({
  companionId: import_zod2.z.string(),
  line: import_zod2.z.string(),
  trigger: import_zod2.z.enum([
    "on-start",
    "on-hint-requested",
    "on-step-complete",
    "on-mistake",
    "on-mission-complete"
  ])
});
var MissionTaskSchema = import_zod2.z.object({
  id: import_zod2.z.string(),
  description: import_zod2.z.string(),
  interactionType: import_zod2.z.enum([
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
  assetRefs: import_zod2.z.array(import_zod2.z.string()).optional(),
  isEvidenceCapturePoint: import_zod2.z.boolean()
});
var Student3dMissionSchema = import_zod2.z.object({
  storyHook: import_zod2.z.string(),
  worldRoomId: import_zod2.z.string(),
  // maps to a room in the Core Academy Map (ADR-018)
  companionDialogue: import_zod2.z.array(CompanionDialogueLineSchema),
  tasks: import_zod2.z.array(MissionTaskSchema).min(1),
  rewardPreviewLabel: import_zod2.z.string()
  // what the student sees they'll earn before starting
});
var LiteInteractionSchema = import_zod2.z.object({
  type: import_zod2.z.enum(["choice", "tap", "drag"]),
  prompt: import_zod2.z.string(),
  options: import_zod2.z.array(import_zod2.z.string()).optional()
});
var LiteCardSchema = import_zod2.z.object({
  id: import_zod2.z.string(),
  contentText: import_zod2.z.string(),
  illustrationRef: import_zod2.z.string().optional(),
  audioRef: import_zod2.z.string().optional(),
  // parent-controlled audio (ADR-027)
  interactions: import_zod2.z.array(LiteInteractionSchema)
});
var StudentInteractiveLiteSchema = import_zod2.z.object({
  cards: import_zod2.z.array(LiteCardSchema).min(1)
});
var StudentTextAudioOfflineSchema = import_zod2.z.object({
  steps: import_zod2.z.array(import_zod2.z.string()).min(1),
  readAloudScript: import_zod2.z.string().optional(),
  printableTaskDescription: import_zod2.z.string(),
  artifactUploadInstructions: import_zod2.z.string().optional()
});
var EvidenceCapturePointSchema = import_zod2.z.object({
  stepId: import_zod2.z.string(),
  captureType: import_zod2.z.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "artifact-upload",
    "structured-replay"
  ]),
  retentionDays: import_zod2.z.number().int().positive(),
  parentVisible: import_zod2.z.boolean(),
  portfolioEligible: import_zod2.z.boolean()
});
var EvidencePlanSchema = import_zod2.z.object({
  capturePoints: import_zod2.z.array(EvidenceCapturePointSchema).min(1),
  noWebcam: import_zod2.z.literal(true),
  // compile-time privacy invariant; never set to false
  noFaceCapture: import_zod2.z.literal(true)
  // compile-time privacy invariant; never set to false
});
var RewardPlanSchema = import_zod2.z.object({
  effortMoolah: import_zod2.z.number().int().nonnegative(),
  effortXp: import_zod2.z.number().int().nonnegative(),
  masteryMoolah: import_zod2.z.number().int().nonnegative().optional(),
  // awarded only if masteryAchieved
  masteryXp: import_zod2.z.number().int().nonnegative().optional(),
  // awarded only if masteryAchieved
  companionBondIncrease: import_zod2.z.number().int().nonnegative(),
  housePointsContribution: import_zod2.z.number().int().nonnegative(),
  badgeIds: import_zod2.z.array(import_zod2.z.string()).optional(),
  masteryGated: import_zod2.z.boolean()
  // true = major progression (companion evolution, room unlock) requires mastery evidence
});
var MissionOutputSchema = import_zod2.z.object({
  parentPlan: ParentPlanSchema,
  student3dMission: Student3dMissionSchema,
  studentInteractiveLite: StudentInteractiveLiteSchema,
  studentTextAudioOffline: StudentTextAudioOfflineSchema,
  evidencePlan: EvidencePlanSchema,
  rewardPlan: RewardPlanSchema
});
var MissionStatusSchema = import_zod2.z.enum([
  "draft",
  // compiled but not yet approved
  "pending-approval",
  // awaiting parent approval in high-control mode (ADR-012)
  "active",
  // approved and available to student
  "completed",
  "archived"
]);
var MissionSchema = import_zod2.z.object({
  id: import_zod2.z.string().uuid(),
  childProfileId: import_zod2.z.string().uuid(),
  version: import_zod2.z.number().int().positive(),
  status: MissionStatusSchema,
  // The three constraint dimensions (ADR-014)
  parentIntent: ParentIntentSchema,
  childPersonalization: ChildPersonalizationSchema,
  standardsAlignment: StandardsAlignmentSchema,
  output: MissionOutputSchema,
  compiledAt: import_zod2.z.string().datetime(),
  approvedByParentAt: import_zod2.z.string().datetime().optional(),
  // required in high-control mode
  startedAt: import_zod2.z.string().datetime().optional(),
  completedAt: import_zod2.z.string().datetime().optional()
});
var MissionAttemptSchema = import_zod2.z.object({
  id: import_zod2.z.string().uuid(),
  missionId: import_zod2.z.string().uuid(),
  childProfileId: import_zod2.z.string().uuid(),
  childSessionId: import_zod2.z.string().uuid(),
  deliveryMode: DeliveryModeSchema,
  startedAt: import_zod2.z.string().datetime(),
  completedAt: import_zod2.z.string().datetime().optional(),
  masteryEvidenceScore: import_zod2.z.number().min(0).max(1).optional(),
  // 0.0–1.0
  masteryAchieved: import_zod2.z.boolean().optional()
  // set after evidence evaluation
});

// src/world-event.schema.ts
var import_zod3 = require("zod");
var WorldEventTypeSchema = import_zod3.z.enum([
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
var WorldEventSchema = import_zod3.z.object({
  id: import_zod3.z.string().uuid(),
  type: WorldEventTypeSchema,
  // Actor — null for Academy-wide events (seasonal, House leaderboard)
  childProfileId: import_zod3.z.string().uuid().optional(),
  childSessionId: import_zod3.z.string().uuid().optional(),
  academyIdentityId: import_zod3.z.string().uuid().optional(),
  roomId: import_zod3.z.string().optional(),
  occurredAt: import_zod3.z.string().datetime(),
  // Every persistent change must be reversible (architecture.md §5)
  reversible: import_zod3.z.boolean(),
  // Whether this event appears in parent reports/visibility (ADR-008)
  parentVisible: import_zod3.z.boolean(),
  // Compile-time invariant: all world events are audit-logged (ADR-020)
  auditLogged: import_zod3.z.literal(true),
  // Typed payload — parse using the per-type schemas below
  payload: import_zod3.z.record(import_zod3.z.unknown())
});
var RoomJoinedPayloadSchema = import_zod3.z.object({
  roomId: import_zod3.z.string(),
  academyIdentityId: import_zod3.z.string().uuid()
});
var RoomLeftPayloadSchema = import_zod3.z.object({
  roomId: import_zod3.z.string(),
  academyIdentityId: import_zod3.z.string().uuid(),
  durationSeconds: import_zod3.z.number().int().nonnegative()
});
var AvatarMovedPayloadSchema = import_zod3.z.object({
  academyIdentityId: import_zod3.z.string().uuid(),
  roomId: import_zod3.z.string(),
  position: import_zod3.z.object({
    x: import_zod3.z.number(),
    y: import_zod3.z.number(),
    z: import_zod3.z.number()
  })
});
var MissionStartedPayloadSchema = import_zod3.z.object({
  missionId: import_zod3.z.string().uuid(),
  missionAttemptId: import_zod3.z.string().uuid(),
  deliveryMode: import_zod3.z.enum(["3d", "interactive-lite", "text-audio-offline"])
});
var MissionStepCompletedPayloadSchema = import_zod3.z.object({
  missionAttemptId: import_zod3.z.string().uuid(),
  stepId: import_zod3.z.string(),
  evidenceCaptured: import_zod3.z.boolean()
});
var MissionCompletedPayloadSchema = import_zod3.z.object({
  missionId: import_zod3.z.string().uuid(),
  missionAttemptId: import_zod3.z.string().uuid(),
  deliveryMode: import_zod3.z.enum(["3d", "interactive-lite", "text-audio-offline"]),
  masteryAchieved: import_zod3.z.boolean(),
  masteryEvidenceScore: import_zod3.z.number().min(0).max(1)
});
var MissionAbandonedPayloadSchema = import_zod3.z.object({
  missionAttemptId: import_zod3.z.string().uuid(),
  lastStepId: import_zod3.z.string().optional()
});
var MoolahEarnedPayloadSchema = import_zod3.z.object({
  walletId: import_zod3.z.string().uuid(),
  amount: import_zod3.z.number().int().positive(),
  reason: import_zod3.z.enum([
    "mission-effort",
    "mission-mastery",
    "house-bonus",
    "event-reward"
  ]),
  referenceId: import_zod3.z.string().optional()
  // missionAttemptId, eventId, etc.
});
var MoolahSpentPayloadSchema = import_zod3.z.object({
  walletId: import_zod3.z.string().uuid(),
  amount: import_zod3.z.number().int().positive(),
  itemId: import_zod3.z.string(),
  itemType: import_zod3.z.enum(["cosmetic", "companion-accessory", "house-item"])
});
var XpEarnedPayloadSchema = import_zod3.z.object({
  amount: import_zod3.z.number().int().positive(),
  reason: import_zod3.z.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction"
  ]),
  referenceId: import_zod3.z.string().optional()
});
var BadgeAwardedPayloadSchema = import_zod3.z.object({
  badgeId: import_zod3.z.string(),
  missionAttemptId: import_zod3.z.string().uuid().optional(),
  masteryRecordId: import_zod3.z.string().uuid().optional()
});
var HousePointsEarnedPayloadSchema = import_zod3.z.object({
  house: HouseSchema,
  points: import_zod3.z.number().int().positive(),
  contributingChildProfileId: import_zod3.z.string().uuid(),
  reason: import_zod3.z.enum([
    "mission-mastery",
    "mission-effort",
    "event-participation",
    "companion-growth"
  ]),
  referenceId: import_zod3.z.string().optional()
});
var HouseLeaderboardUpdatedPayloadSchema = import_zod3.z.object({
  period: import_zod3.z.enum(["weekly", "monthly", "all-time"]),
  rankings: import_zod3.z.array(import_zod3.z.object({
    house: HouseSchema,
    totalPoints: import_zod3.z.number().int().nonnegative(),
    rank: import_zod3.z.number().int().positive()
  }))
});
var CompanionBondIncreasedPayloadSchema = import_zod3.z.object({
  companionId: import_zod3.z.string().uuid(),
  bondIncrease: import_zod3.z.number().int().positive(),
  newBondLevel: import_zod3.z.number().int().nonnegative(),
  reason: import_zod3.z.enum(["mission-completed", "daily-interaction", "mastery-milestone"])
});
var CompanionMilestoneReachedPayloadSchema = import_zod3.z.object({
  companionId: import_zod3.z.string().uuid(),
  milestoneId: import_zod3.z.string(),
  newFormId: import_zod3.z.string().optional(),
  // visual form evolution
  masteryRequired: import_zod3.z.boolean(),
  masteryRecordId: import_zod3.z.string().uuid().optional()
});
var AcademyUnlockTriggeredPayloadSchema = import_zod3.z.object({
  unlockId: import_zod3.z.string(),
  unlockType: import_zod3.z.enum([
    "room-decoration",
    "npc-activation",
    "grove-bloom",
    "market-item",
    "ai-lab-repair",
    "outdoor-grounds-change"
  ]),
  triggerReason: import_zod3.z.string(),
  // e.g. "Cytrex House reached 500 collective points"
  affectedRoomId: import_zod3.z.string().optional()
});
var AcademySeasonalEventPayloadSchema = import_zod3.z.object({
  seasonalEventId: import_zod3.z.string(),
  eventName: import_zod3.z.string(),
  affectedRoomIds: import_zod3.z.array(import_zod3.z.string())
});
var WorldRepairCompletedPayloadSchema = import_zod3.z.object({
  repairTargetId: import_zod3.z.string(),
  roomId: import_zod3.z.string(),
  triggeredByMissionId: import_zod3.z.string().uuid().optional()
});
var WorldDecorationPlacedPayloadSchema = import_zod3.z.object({
  decorationId: import_zod3.z.string(),
  roomId: import_zod3.z.string(),
  placedByChildProfileId: import_zod3.z.string().uuid().optional(),
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
var import_zod4 = require("zod");
var EvidenceCaptureTypeSchema = import_zod4.z.enum([
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
var LearningEvidenceEventSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  missionAttemptId: import_zod4.z.string().uuid(),
  childProfileId: import_zod4.z.string().uuid(),
  childSessionId: import_zod4.z.string().uuid(),
  captureType: EvidenceCaptureTypeSchema,
  stepId: import_zod4.z.string(),
  // which mission step this evidence is from
  content: import_zod4.z.record(import_zod4.z.unknown()),
  // structured content; shape varies by captureType
  capturedAt: import_zod4.z.string().datetime(),
  retentionUntil: import_zod4.z.string().datetime(),
  // data is not retained indefinitely (COPPA/privacy)
  parentVisible: import_zod4.z.boolean(),
  portfolioEligible: import_zod4.z.boolean(),
  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcam: import_zod4.z.literal(true),
  noFaceCapture: import_zod4.z.literal(true),
  noVoiceBiometrics: import_zod4.z.literal(true)
});
var MissionReplayEventSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  missionAttemptId: import_zod4.z.string().uuid(),
  childProfileId: import_zod4.z.string().uuid(),
  interactionSequence: import_zod4.z.array(import_zod4.z.object({
    stepId: import_zod4.z.string(),
    action: import_zod4.z.string(),
    outcome: import_zod4.z.string(),
    timestampOffset: import_zod4.z.number().int().nonnegative()
    // ms from mission start
  })),
  totalDurationMs: import_zod4.z.number().int().positive(),
  capturedAt: import_zod4.z.string().datetime(),
  retentionUntil: import_zod4.z.string().datetime(),
  parentVisible: import_zod4.z.boolean(),
  noWebcam: import_zod4.z.literal(true),
  noFaceCapture: import_zod4.z.literal(true)
});
var ArtifactTypeSchema = import_zod4.z.enum([
  "written-work",
  "drawing",
  "audio-recording",
  // push-to-talk only; no always-on capture (ADR-027)
  "structured-output"
]);
var ArtifactSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  childProfileId: import_zod4.z.string().uuid(),
  missionAttemptId: import_zod4.z.string().uuid(),
  artifactType: ArtifactTypeSchema,
  storageRef: import_zod4.z.string(),
  // Supabase Storage path
  title: import_zod4.z.string().optional(),
  parentApproved: import_zod4.z.boolean(),
  // must be true before artifact enters portfolio
  parentApprovedAt: import_zod4.z.string().datetime().optional(),
  createdAt: import_zod4.z.string().datetime(),
  retentionUntil: import_zod4.z.string().datetime()
});
var MasteryRecordSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  childProfileId: import_zod4.z.string().uuid(),
  masterySkillId: import_zod4.z.string(),
  masteryDomainId: import_zod4.z.string(),
  floridaStandardCode: import_zod4.z.string().optional(),
  level: MasteryLevelSchema,
  evidenceEventIds: import_zod4.z.array(import_zod4.z.string().uuid()).min(1),
  // the proof chain
  achievedAt: import_zod4.z.string().datetime(),
  lastVerifiedAt: import_zod4.z.string().datetime()
});
var PortfolioItemSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  childProfileId: import_zod4.z.string().uuid(),
  evidenceEventId: import_zod4.z.string().uuid().optional(),
  artifactId: import_zod4.z.string().uuid().optional(),
  masteryRecordId: import_zod4.z.string().uuid().optional(),
  highlightNote: import_zod4.z.string().max(500).optional(),
  // parent-added annotation
  includedAt: import_zod4.z.string().datetime(),
  parentConsentedAt: import_zod4.z.string().datetime()
  // required; no portfolio item without consent
});

// src/rewards.schema.ts
var import_zod5 = require("zod");
var MoolahWalletSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  balance: import_zod5.z.number().int().nonnegative(),
  lifetimeEarned: import_zod5.z.number().int().nonnegative().optional(),
  updatedAt: import_zod5.z.string().datetime()
});
var MoolahReasonSchema = import_zod5.z.enum([
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
var MoolahLedgerEntrySchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  walletId: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  delta: import_zod5.z.number().int(),
  // positive = earned, negative = spent
  reason: MoolahReasonSchema,
  referenceId: import_zod5.z.string().optional(),
  // missionAttemptId, eventId, itemId, etc.
  idempotencyKey: import_zod5.z.string().optional(),
  // prevents duplicate reward events; maps to moolah_ledger.idempotency_key
  occurredAt: import_zod5.z.string().datetime()
});
var XpEventSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  amount: import_zod5.z.number().int().positive(),
  reason: import_zod5.z.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction"
  ]),
  referenceId: import_zod5.z.string().optional(),
  occurredAt: import_zod5.z.string().datetime()
});
var CompanionGrowthTypeSchema = import_zod5.z.enum([
  "bond-increase",
  "form-evolution",
  // major visual/behavioral upgrade; typically mastery-gated
  "milestone"
]);
var CompanionGrowthEventSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  companionId: import_zod5.z.string().uuid(),
  growthType: CompanionGrowthTypeSchema,
  previousBondLevel: import_zod5.z.number().int().nonnegative(),
  newBondLevel: import_zod5.z.number().int().nonnegative(),
  newFormId: import_zod5.z.string().optional(),
  // set when a form evolution occurs
  masteryRequired: import_zod5.z.boolean(),
  // true = this growth required mastery evidence
  masteryRecordId: import_zod5.z.string().uuid().optional(),
  triggerMissionAttemptId: import_zod5.z.string().uuid().optional(),
  occurredAt: import_zod5.z.string().datetime()
});
var BadgeCategorySchema = import_zod5.z.enum([
  "mastery",
  "effort",
  "house",
  "ai-literacy",
  "exploration",
  "companion"
]);
var BadgeSchema = import_zod5.z.object({
  id: import_zod5.z.string(),
  name: import_zod5.z.string(),
  description: import_zod5.z.string(),
  iconAssetId: import_zod5.z.string(),
  category: BadgeCategorySchema,
  masteryGated: import_zod5.z.boolean()
  // true = earning requires verified mastery evidence
});
var BadgeAwardSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  badgeId: import_zod5.z.string(),
  awardedAt: import_zod5.z.string().datetime(),
  missionAttemptId: import_zod5.z.string().uuid().optional(),
  masteryRecordId: import_zod5.z.string().uuid().optional()
});
var HousePointsReasonSchema = import_zod5.z.enum([
  "mission-mastery",
  "mission-effort",
  "event-participation",
  "companion-growth"
]);
var HousePointsRecordSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  house: HouseSchema,
  points: import_zod5.z.number().int().positive(),
  contributingChildProfileId: import_zod5.z.string().uuid(),
  reason: HousePointsReasonSchema,
  referenceId: import_zod5.z.string().optional(),
  occurredAt: import_zod5.z.string().datetime()
});
var ChildBadgeSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  childProfileId: import_zod5.z.string().uuid(),
  badgeId: import_zod5.z.string().uuid(),
  awardedAt: import_zod5.z.string().datetime(),
  sourceId: import_zod5.z.string().uuid().optional()
  // mission_attempts.id, mastery_records.id, etc.
});
var XPEventSchema = XpEventSchema;
var HousePointEventSchema = HousePointsRecordSchema;
var HouseLeaderboardPeriodSchema = import_zod5.z.enum(["weekly", "monthly", "all-time"]);
var HouseRankingSchema = import_zod5.z.object({
  house: HouseSchema,
  totalPoints: import_zod5.z.number().int().nonnegative(),
  rank: import_zod5.z.number().int().positive()
});
var HouseLeaderboardSnapshotSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  period: HouseLeaderboardPeriodSchema,
  rankings: import_zod5.z.array(HouseRankingSchema).length(4),
  // exactly 4 Houses
  recordedAt: import_zod5.z.string().datetime()
});

// src/parent-report.schema.ts
var import_zod6 = require("zod");
var CalibrationStageSchema = import_zod6.z.enum([
  "parent-onboarding",
  // 20–35% — age, grade, goals, boundaries
  "sorting-ceremony",
  // 40–55% — House choice, interests, motivation signals
  "mission-001",
  // 60–75% — reading/listening behavior, AI readiness, persistence
  "first-7-14-days"
  // 80–90% — progression, retention, frustration signals
]);
var LearnerCalibrationScoreSchema = import_zod6.z.object({
  score: import_zod6.z.number().min(0).max(100),
  stage: CalibrationStageSchema,
  confidence: import_zod6.z.number().min(0).max(1),
  // 0 = no confidence, 1 = high confidence
  signalsContributing: import_zod6.z.array(import_zod6.z.string()),
  // human-readable signal names
  computedAt: import_zod6.z.string().datetime()
});
var EvidenceHighlightTypeSchema = import_zod6.z.enum([
  "mastery-moment",
  "persistence",
  "ai-readiness",
  "creative-expression",
  "help-seeking",
  "sequence-completion"
]);
var EvidenceHighlightSchema = import_zod6.z.object({
  id: import_zod6.z.string().uuid(),
  type: EvidenceHighlightTypeSchema,
  description: import_zod6.z.string(),
  evidenceEventId: import_zod6.z.string().uuid().optional(),
  artifactId: import_zod6.z.string().uuid().optional(),
  portfolioItemId: import_zod6.z.string().uuid().optional(),
  parentConsentedAt: import_zod6.z.string().datetime()
  // consent required before inclusion
});
var MasteryProgressLevelSchema = import_zod6.z.enum([
  "not-started",
  "emerging",
  "developing",
  "proficient",
  "advanced"
]);
var MasteryProgressSummarySchema = import_zod6.z.object({
  masterySkillId: import_zod6.z.string(),
  masteryDomainId: import_zod6.z.string(),
  skillName: import_zod6.z.string(),
  currentLevel: MasteryProgressLevelSchema,
  evidenceCount: import_zod6.z.number().int().nonnegative(),
  lastActivityAt: import_zod6.z.string().datetime().optional(),
  floridaStandardCodes: import_zod6.z.array(import_zod6.z.string()).optional()
  // ADR-013: FL + L3ARN Mastery Map
});
var GameProgressSummarySchema = import_zod6.z.object({
  house: import_zod6.z.string(),
  // House name
  companionName: import_zod6.z.string(),
  companionBondLevel: import_zod6.z.number().int().nonnegative(),
  moolahBalance: import_zod6.z.number().int().nonnegative(),
  totalXp: import_zod6.z.number().int().nonnegative(),
  badgesEarned: import_zod6.z.array(import_zod6.z.string()),
  // badge IDs
  missionsCompleted: import_zod6.z.number().int().nonnegative(),
  missionsAttempted: import_zod6.z.number().int().nonnegative(),
  academyUnlocksContributed: import_zod6.z.number().int().nonnegative()
});
var NextMissionRecommendationSchema = import_zod6.z.object({
  summary: import_zod6.z.string(),
  rationale: import_zod6.z.string(),
  // must reference learner model + parent intent — not generic
  targetMasterySkillId: import_zod6.z.string(),
  targetMasteryDomainId: import_zod6.z.string(),
  suggestedDeliveryMode: import_zod6.z.enum(["3d", "interactive-lite", "text-audio-offline"])
});
var ParentReportTypeSchema = import_zod6.z.enum([
  "unified-first-learning-map",
  // output of Mission 001 (MASTER_HANDOFF §5.1)
  "weekly-summary",
  "mission-completion",
  "portfolio"
]);
var ParentReportSchema = import_zod6.z.object({
  id: import_zod6.z.string().uuid(),
  childProfileId: import_zod6.z.string().uuid(),
  reportType: ParentReportTypeSchema,
  generatedAt: import_zod6.z.string().datetime(),
  // Academic proof (the core of every report)
  masteryProgress: import_zod6.z.array(MasteryProgressSummarySchema),
  // Learner calibration — present on mission-001 and first-7-14-days reports
  calibrationScore: LearnerCalibrationScoreSchema.optional(),
  // Evidence highlights — require parent consent before inclusion
  evidenceHighlights: import_zod6.z.array(EvidenceHighlightSchema),
  // Game/world progress — always shown separately from mastery (ADR-011)
  gameProgress: GameProgressSummarySchema.optional(),
  // System's next-path recommendation
  nextMissionRecommendation: NextMissionRecommendationSchema.optional(),
  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcamContent: import_zod6.z.literal(true),
  noFaceCaptureContent: import_zod6.z.literal(true)
});
var ParentVisibilityModeSchema = import_zod6.z.enum([
  "full",
  // K-5 default: all detail visible
  "summary",
  // grades 6-8 default: summary with expand-on-demand
  "safety-override"
  // always available; overrides summary mode for flagged content
]);

// src/lesson-skeleton.schema.ts
var import_zod7 = require("zod");
var RulePredicateValueSchema = import_zod7.z.union([
  import_zod7.z.string(),
  import_zod7.z.number(),
  import_zod7.z.boolean(),
  import_zod7.z.array(import_zod7.z.union([import_zod7.z.string(), import_zod7.z.number()]))
]);
var RulePredicateLeafSchema = import_zod7.z.object({
  field: import_zod7.z.string().min(1),
  op: import_zod7.z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in"]),
  value: RulePredicateValueSchema.optional(),
  compareField: import_zod7.z.string().min(1).optional()
}).refine((leaf) => leaf.value !== void 0 !== (leaf.compareField !== void 0), {
  message: "Exactly one of `value` or `compareField` must be set on a rule predicate leaf"
});
var RulePredicateSchema = import_zod7.z.lazy(
  () => import_zod7.z.union([
    RulePredicateLeafSchema,
    import_zod7.z.object({ allOf: import_zod7.z.array(RulePredicateSchema).min(1) }),
    import_zod7.z.object({ anyOf: import_zod7.z.array(RulePredicateSchema).min(1) }),
    import_zod7.z.object({ not: RulePredicateSchema })
  ])
);
var ItemAttributesSchema = import_zod7.z.record(import_zod7.z.union([import_zod7.z.string(), import_zod7.z.number(), import_zod7.z.boolean()]));
var LearningStyleSchema = import_zod7.z.enum(["visual", "auditory", "reading-writing", "kinesthetic"]);
var ReadingTierSchema = import_zod7.z.enum(["pre-reader", "grade-level", "advanced"]);
var LessonTaskTypeSchema = import_zod7.z.enum([
  "sort-categorize",
  "choice",
  "apply-to-new",
  "ai-mistake-check"
]);
var VariantKeySchema = import_zod7.z.object({
  skeletonId: import_zod7.z.string().uuid(),
  learningStyle: LearningStyleSchema,
  readingTier: ReadingTierSchema,
  l3arnMasteryLevel: MasteryLevelSchema
});
var HintTierSchema = import_zod7.z.object({
  tier: import_zod7.z.union([import_zod7.z.literal(1), import_zod7.z.literal(2), import_zod7.z.literal(3)]),
  kind: import_zod7.z.enum(["nudge", "re-explain", "state-rule"]),
  content: import_zod7.z.string().min(1),
  readAloudScript: import_zod7.z.string().min(1)
});
var HintLadderSchema = import_zod7.z.tuple([HintTierSchema, HintTierSchema, HintTierSchema]).refine((ladder) => ladder[0].tier === 1 && ladder[1].tier === 2 && ladder[2].tier === 3, {
  message: "Hint ladder must be exactly 3 tiers in order: 1 (nudge), 2 (re-explain), 3 (state-rule)"
});
var DistractorRuleSchema = import_zod7.z.object({
  count: import_zod7.z.number().int().min(1).max(6),
  plausibilityRule: RulePredicateSchema.optional()
});
var LessonTaskSkeletonSchema = import_zod7.z.object({
  id: import_zod7.z.string().uuid(),
  masterySkillId: import_zod7.z.string().uuid(),
  l3arnMasteryLevel: MasteryLevelSchema,
  taskType: LessonTaskTypeSchema,
  correctAnswerRule: RulePredicateSchema,
  distractorRule: DistractorRuleSchema,
  transferExampleRule: RulePredicateSchema,
  hintLadder: HintLadderSchema,
  isActive: import_zod7.z.boolean(),
  version: import_zod7.z.number().int().positive()
});
var SkeletonFillItemSchema = import_zod7.z.object({
  itemId: import_zod7.z.string().min(1),
  attributes: ItemAttributesSchema,
  presentationText: import_zod7.z.string().min(1),
  readAloudScript: import_zod7.z.string().min(1)
});
var SkeletonFillSchema = import_zod7.z.object({
  skeletonId: import_zod7.z.string().uuid(),
  variantKey: VariantKeySchema,
  storyFlavor: import_zod7.z.string().min(1),
  correctItem: SkeletonFillItemSchema,
  distractorItems: import_zod7.z.array(SkeletonFillItemSchema).min(1),
  transferItem: SkeletonFillItemSchema,
  hintLadderFill: HintLadderSchema,
  companionDialogueLine: import_zod7.z.string().min(1)
});

// src/permissions.schema.ts
var import_zod8 = require("zod");
var DataPrincipalSchema = import_zod8.z.enum([
  "parent",
  // authenticated parent account holder
  "child-session",
  // active child session — strictly scoped (see ChildSessionScopeSchema)
  "admin",
  // L3ARN admin; subject to ADR-049 confirmation
  "system"
  // internal service-to-service calls
]);
var ChildSessionScopeSchema = import_zod8.z.object({
  sessionId: import_zod8.z.string().uuid(),
  childProfileId: import_zod8.z.string().uuid(),
  householdId: import_zod8.z.string().uuid(),
  // Permitted access
  canAccessOwnMissions: import_zod8.z.literal(true),
  canAccessOwnRewards: import_zod8.z.literal(true),
  canAccessSharedAcademyWorld: import_zod8.z.literal(true),
  // Structural prohibitions — compile-time invariants
  canAccessParentDashboard: import_zod8.z.literal(false),
  canAccessSiblingProfiles: import_zod8.z.literal(false),
  canAccessOtherHouseholds: import_zod8.z.literal(false),
  canSendPrivateMessages: import_zod8.z.literal(false),
  // No DMs in MVP (ADR-006)
  canReadCurriculumTablesDirectly: import_zod8.z.literal(false)
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
var ParentVisibilityFlagsSchema = import_zod8.z.object({
  parentVisible: import_zod8.z.boolean(),
  requiresParentConsent: import_zod8.z.boolean(),
  // must have a ConsentRecord before surfacing
  includeInPortfolio: import_zod8.z.boolean(),
  retentionDays: import_zod8.z.number().int().positive().nullable(),
  // null = keep until parent deletes
  visibilityTier: VisibilityTierSchema
  // which tier can see this record (ADR-008)
});
var AdminAccessRoleSchema = import_zod8.z.enum([
  "founder",
  "safety-admin",
  "support-admin",
  "curriculum-admin",
  "technical-admin",
  "ai-agent-operator"
]);
var AdminAccessRecordSchema = import_zod8.z.object({
  id: import_zod8.z.string().uuid(),
  adminUserId: import_zod8.z.string().uuid(),
  adminRole: AdminAccessRoleSchema,
  resourceType: import_zod8.z.string(),
  // e.g. "child_profile", "chat_message", "escalation_record"
  resourceId: import_zod8.z.string().uuid(),
  householdId: import_zod8.z.string().uuid(),
  justification: import_zod8.z.string().min(10).max(500),
  // required; short justification logged
  accessedAt: import_zod8.z.string().datetime(),
  sessionExpiresAt: import_zod8.z.string().datetime(),
  // admin sessions must time out
  ipAddress: import_zod8.z.string().optional()
  // retained for audit; never surfaced to UI
});
var DataDomainSchema = import_zod8.z.enum([
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
var DataAccessScopeSchema = import_zod8.z.object({
  principal: DataPrincipalSchema,
  householdId: import_zod8.z.string().uuid().nullable(),
  // null for system/admin cross-household access
  allowedDomains: import_zod8.z.array(DataDomainSchema).min(1),
  restrictions: import_zod8.z.array(import_zod8.z.string())
  // human-readable additional constraints
});

// src/moderation.schema.ts
var import_zod9 = require("zod");
var QuickChatCategorySchema = import_zod9.z.enum([
  "greeting",
  "encouragement",
  "reaction",
  "game-callout",
  "help-request"
]);
var QuickChatOptionSchema = import_zod9.z.object({
  id: import_zod9.z.string(),
  category: QuickChatCategorySchema,
  text: import_zod9.z.string().min(1).max(80),
  // short, pre-approved text; no links, no PII
  emojiCode: import_zod9.z.string().optional()
  // reference to a safe emoji asset ID; not a raw char
});
var ChatMessageTypeSchema = import_zod9.z.enum([
  "quick-chat",
  // pre-defined option; K-5 default; content from quickChatOptionId
  "free-text",
  // moderated; grades 6-8 only; requires parent approval (ADR-006)
  "system-message"
  // platform-generated; never from a student; never moderated
]);
var ChatMessageSchema = import_zod9.z.object({
  id: import_zod9.z.string().uuid(),
  roomId: import_zod9.z.string(),
  // Sender identity: Academy Display Name + House only — never real name (ADR-007)
  senderAcademyIdentityId: import_zod9.z.string().uuid(),
  messageType: ChatMessageTypeSchema,
  // Quick Chat: populated for "quick-chat" messages
  quickChatOptionId: import_zod9.z.string().optional(),
  // Free text: populated for "free-text" messages only
  // Max 280 chars. Content has already passed pre-send moderation before storage.
  content: import_zod9.z.string().max(280).optional(),
  sentAt: import_zod9.z.string().datetime(),
  // ── Safety Invariants (MASTER_HANDOFF §9.3; ADR-006) ────────────────────
  // These z.literal(true) fields are compile-time invariants.
  // Attempting to set any of them to false will cause a TypeScript error.
  noImageContent: import_zod9.z.literal(true),
  // no image URLs, base64, or file refs
  noFileAttachments: import_zod9.z.literal(true),
  // no file attachments of any kind
  noExternalLinks: import_zod9.z.literal(true),
  // no hyperlinks to external sites
  noPrivateChannel: import_zod9.z.literal(true),
  // all messages are room-scoped; no DMs (ADR-006)
  // All K-8 messages are logged and parent-visible (ADR-006, ADR-008)
  parentVisible: import_zod9.z.literal(true),
  // Messages are never removed from the audit record
  neverDeleted: import_zod9.z.literal(true)
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
var ModerationCheckTypeSchema = import_zod9.z.enum([
  "pii-scan",
  // phone numbers, emails, real names, addresses
  "link-scan",
  // URLs and external links of any kind
  "contact-info-scan",
  // social handles, usernames, external contact attempts
  "keyword-filter"
  // blocked-keyword list maintained by Agent H
]);
var ModerationOutcomeSchema = import_zod9.z.enum([
  "approved",
  "blocked",
  "flagged-for-review"
]);
var ModerationCheckResultSchema = import_zod9.z.object({
  checkType: ModerationCheckTypeSchema,
  outcome: ModerationOutcomeSchema,
  matchedPatterns: import_zod9.z.array(import_zod9.z.string())
  // what triggered the flag; no raw PII stored here
});
var ModerationTriggerSchema = import_zod9.z.enum([
  "chat-message",
  // triggered by student free-text or Quick Chat message
  "ai-output",
  // triggered by AI-generated content (mission, companion dialogue, etc.)
  "user-input"
  // triggered by raw student input before AI processing
]);
var ModerationEventSchema = import_zod9.z.object({
  id: import_zod9.z.string().uuid(),
  triggerSource: ModerationTriggerSchema,
  chatMessageId: import_zod9.z.string().uuid().optional(),
  // set when triggerSource = "chat-message"
  aiOutputEnvelopeId: import_zod9.z.string().uuid().optional(),
  // set when triggerSource = "ai-output"
  senderChildProfileId: import_zod9.z.string().uuid(),
  roomId: import_zod9.z.string().optional(),
  // absent for AI output events
  messageType: ChatMessageTypeSchema.optional(),
  // absent for AI output events
  outcome: ModerationOutcomeSchema,
  checksRun: import_zod9.z.array(ModerationCheckResultSchema),
  moderatedAt: import_zod9.z.string().datetime(),
  parentNotified: import_zod9.z.boolean(),
  parentNotifiedAt: import_zod9.z.string().datetime().optional()
});
var EscalationSeveritySchema = import_zod9.z.enum([
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
var EscalationRecordSchema = import_zod9.z.object({
  id: import_zod9.z.string().uuid(),
  moderationEventId: import_zod9.z.string().uuid(),
  severity: EscalationSeveritySchema,
  escalatedAt: import_zod9.z.string().datetime(),
  escalatedTo: import_zod9.z.literal("founder"),
  // MVP: all escalations go to founder (ADR-048)
  context: import_zod9.z.string().max(500),
  // summary for reviewer; no raw message content
  resolutionNotes: import_zod9.z.string().optional(),
  resolvedAt: import_zod9.z.string().datetime().optional(),
  resolvedByAdminId: import_zod9.z.string().uuid().optional(),
  parentNotified: import_zod9.z.boolean(),
  parentNotifiedAt: import_zod9.z.string().datetime().optional()
});
var AuditActionSchema = import_zod9.z.enum([
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
var AuditLogEntrySchema = import_zod9.z.object({
  id: import_zod9.z.string().uuid(),
  action: AuditActionSchema,
  actorType: import_zod9.z.enum(["child-session", "parent", "system", "admin"]),
  actorId: import_zod9.z.string().uuid(),
  targetResourceType: import_zod9.z.string(),
  targetResourceId: import_zod9.z.string().uuid().optional(),
  householdId: import_zod9.z.string().uuid().nullable(),
  // null for Academy-wide or system actions
  occurredAt: import_zod9.z.string().datetime(),
  metadata: import_zod9.z.record(import_zod9.z.unknown()).optional()
  // additional context; never raw child PII
});

// src/ai.schema.ts
var import_zod10 = require("zod");
var AI_MAX_RETRY_ATTEMPTS = 3;
var AIValidationAttemptSchema = import_zod10.z.object({
  attemptNumber: import_zod10.z.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
  failureReason: import_zod10.z.string(),
  // human-readable; logged for debugging
  failedAt: import_zod10.z.string().datetime()
});
var AIFallbackNotificationLevelSchema = import_zod10.z.enum([
  "none",
  "soft-notice",
  "safety-alert"
]);
var AIOutputResultSchema = import_zod10.z.discriminatedUnion("status", [
  import_zod10.z.object({
    status: import_zod10.z.literal("validated"),
    data: import_zod10.z.unknown(),
    // strongly typed by each consumer's target schema
    attemptsUsed: import_zod10.z.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
    validatedAt: import_zod10.z.string().datetime()
  }),
  import_zod10.z.object({
    status: import_zod10.z.literal("failed-with-fallback"),
    attemptsUsed: import_zod10.z.literal(3),
    attempts: import_zod10.z.array(AIValidationAttemptSchema).length(3),
    fallbackId: import_zod10.z.string(),
    // references a SafeFallbackSchema record
    fallbackUsedAt: import_zod10.z.string().datetime(),
    notificationLevel: AIFallbackNotificationLevelSchema
    // see AIFallbackNotificationLevelSchema
  })
]);
var SafeFallbackContextSchema = import_zod10.z.enum([
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
var SafeFallbackSchema = import_zod10.z.object({
  id: import_zod10.z.string(),
  context: SafeFallbackContextSchema,
  title: import_zod10.z.string(),
  content: import_zod10.z.string(),
  parentNote: import_zod10.z.string(),
  // plain-language note explaining what happened
  parentVisible: import_zod10.z.literal(true),
  // fallback usage is always parent-visible
  isAIGenerated: import_zod10.z.literal(false)
  // invariant: safe fallbacks are NEVER AI-generated
});
var AIOutputEnvelopeSchema = import_zod10.z.object({
  id: import_zod10.z.string().uuid(),
  traceId: import_zod10.z.string().uuid(),
  // unique trace ID for cross-service debugging
  generationContext: import_zod10.z.string(),
  // e.g. "mission-compiler", "companion-dialogue"
  childProfileId: import_zod10.z.string().uuid(),
  childSessionId: import_zod10.z.string().uuid().optional(),
  requestedAt: import_zod10.z.string().datetime(),
  result: AIOutputResultSchema,
  modelProvider: import_zod10.z.string(),
  // e.g. "anthropic", "openai" — provider, not model
  modelVersion: import_zod10.z.string().optional(),
  // model name + version if available
  promptTemplateVersion: import_zod10.z.string().optional(),
  // version of the prompt template used
  schemaVersion: import_zod10.z.string(),
  // version of the validation schema applied
  safetyPolicyVersion: import_zod10.z.string().optional(),
  // safety policy version; populated when applicable
  missionCompilerVersion: import_zod10.z.string().optional(),
  // populated when generationContext is mission-related
  parentVisible: import_zod10.z.boolean()
});
var DeidentifiedEventTypeSchema = import_zod10.z.enum([
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
var DeidentifiedEventSchema = import_zod10.z.object({
  id: import_zod10.z.string().uuid(),
  // De-identification: no real child profile ID, no household ID.
  // deidentifiedTokenId is a rotating pseudonymous learner key issued by the
  // learning intelligence domain. It cannot be joined back to a production child
  // record by model-training or analytics systems. The join-back mapping between
  // child profile ID and pseudonymous learner key is stored in a separate,
  // restricted-access table that is not available to model-training jobs.
  // Rotation occurs quarterly or at each dataset export boundary. (ADR-029)
  deidentifiedTokenId: import_zod10.z.string(),
  eventType: DeidentifiedEventTypeSchema,
  gradeLevel: import_zod10.z.string(),
  // e.g. "K", "3" — cohort-level signal, not individual
  // Structured categorical features only; no free text, no audio, no PII
  features: import_zod10.z.record(import_zod10.z.union([import_zod10.z.string(), import_zod10.z.number(), import_zod10.z.boolean()])),
  occurredAt: import_zod10.z.string().datetime(),
  datasetEligibilityId: import_zod10.z.string().uuid(),
  // links to the consent record that authorized this
  // De-identification invariants — compile-time constraints
  containsRawPii: import_zod10.z.literal(false),
  containsAudioContent: import_zod10.z.literal(false),
  containsFreeTextContent: import_zod10.z.literal(false)
});
var DatasetEligibilitySchema = import_zod10.z.object({
  id: import_zod10.z.string().uuid(),
  childProfileId: import_zod10.z.string().uuid(),
  householdId: import_zod10.z.string().uuid(),
  eligible: import_zod10.z.boolean(),
  // true only with parent model improvement opt-in
  parentConsentRecordId: import_zod10.z.string().uuid().nullable(),
  // null when opted out
  datasetVersionId: import_zod10.z.string(),
  // which training dataset version this consent covers
  assessedAt: import_zod10.z.string().datetime(),
  revokedAt: import_zod10.z.string().datetime().optional()
  // set when parent opts out
});
var ModelImprovementConsentSchema = import_zod10.z.object({
  id: import_zod10.z.string().uuid(),
  parentAccountId: import_zod10.z.string().uuid(),
  childProfileId: import_zod10.z.string().uuid(),
  granted: import_zod10.z.boolean(),
  // false = opted out (safe default)
  grantedAt: import_zod10.z.string().datetime().nullable(),
  revokedAt: import_zod10.z.string().datetime().nullable(),
  consentVersion: import_zod10.z.string(),
  // versioned so updates can require re-consent
  scopeDescription: import_zod10.z.string()
  // plain-language description of what was consented to
});

// src/calibration.schema.ts
var import_zod11 = require("zod");
var CalibrationSignalTypeSchema = import_zod11.z.enum([
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
var CalibrationEvidenceCaptureTypeSchema = import_zod11.z.enum([
  "decision-log",
  "sequence-completion",
  "ai-mistake-check",
  "explanation",
  "reflection",
  "structured-replay"
]);
var CalibrationSignalSchema = import_zod11.z.object({
  signalType: CalibrationSignalTypeSchema,
  description: import_zod11.z.string(),
  sourceMissionTaskId: import_zod11.z.string().nullable(),
  evidenceCaptureType: CalibrationEvidenceCaptureTypeSchema.nullable()
});

// src/admin.schema.ts
var import_zod12 = require("zod");
var AdminRoleSchema = import_zod12.z.enum([
  "founder",
  "safety_admin",
  "support_admin",
  "curriculum_admin",
  "technical_admin",
  "ai_agent_operator"
]);
var AdminUserSchema = import_zod12.z.object({
  id: import_zod12.z.string().uuid(),
  user_id: import_zod12.z.string(),
  // auth.users.id — authorization key
  email: import_zod12.z.string().email(),
  // display only, NOT authorization source
  role: AdminRoleSchema,
  granted_by: import_zod12.z.string().nullable(),
  granted_at: import_zod12.z.string().datetime(),
  revoked_at: import_zod12.z.string().datetime().nullable(),
  notes: import_zod12.z.string().nullable()
});

// src/session.schema.ts
var import_zod13 = require("zod");
var LaunchModeSchema = import_zod13.z.enum(["parent_launched", "trusted_device_pin"]);
var StartSessionRequestSchema = import_zod13.z.object({
  /** The child's profile UUID — parent must own this profile (enforced by Railway). */
  childProfileId: import_zod13.z.string().uuid({ message: "childProfileId must be a valid UUID" }),
  /**
   * How the session is being launched.
   * Only "parent_launched" is implemented in Phase 0.
   * "trusted_device_pin" scaffolded; returns 400 until Phase 1.
   */
  launchMode: LaunchModeSchema.default("parent_launched")
});
var AcademyIdentityResponseSchema = import_zod13.z.object({
  /** Child's Academy display name (2–32 chars, unique Academy-wide). */
  displayName: import_zod13.z.string(),
  /**
   * Current house affiliation.
   * "pre_sorting" if Sorting Ceremony has not yet been completed.
   */
  house: import_zod13.z.string()
});
var StartSessionResponseSchema = import_zod13.z.object({
  /**
   * Opaque session token issued by Railway.
   * NOT the childProfileId — generated via crypto.randomUUID().
   * The child app uses this token to authenticate Railway API calls for this session.
   */
  childSessionToken: import_zod13.z.string(),
  /** UUID of the newly created child_sessions row. */
  childSessionId: import_zod13.z.string().uuid(),
  /** ISO 8601 timestamp when this session expires. Default: 2h from creation. */
  expiresAt: import_zod13.z.string().datetime(),
  /** Academy identity for display in the child entry experience. */
  academyIdentity: AcademyIdentityResponseSchema
});
var VerifySessionResponseSchema = import_zod13.z.object({
  /** UUID of the verified child_sessions row. */
  childSessionId: import_zod13.z.string().uuid(),
  /** UUID of the academy_identities row bound to this session. */
  academyIdentityId: import_zod13.z.string().uuid(),
  /** ISO 8601 timestamp when this session expires. */
  expiresAt: import_zod13.z.string().datetime(),
  /** Verified academy identity (display name + house) — the entry authority. */
  academyIdentity: AcademyIdentityResponseSchema
});
var SelectableHouseSchema = HouseSchema.exclude(["pre_sorting"]);
var SetHouseRequestSchema = import_zod13.z.object({
  /** The house the child chose during the Sorting Ceremony. */
  house: SelectableHouseSchema
});
var SetHouseResponseSchema = import_zod13.z.object({
  success: import_zod13.z.literal(true),
  /** The updated academy identity (so the client can refresh display state). */
  academyIdentity: AcademyIdentityResponseSchema
});
var SelectCompanionRequestSchema = import_zod13.z.object({
  /** Stable key used across growth/rewards events, e.g. "comp-001-spark". */
  companionKey: import_zod13.z.string().min(1).max(64),
  /** Display name the child sees, e.g. "Spark". */
  characterName: import_zod13.z.string().min(1).max(48),
  /** Personality/teaching style descriptor from the chosen template. */
  characterStyle: import_zod13.z.string().max(64).optional(),
  /** Teaching tone descriptor from the chosen template. */
  teachingTone: import_zod13.z.string().max(64).optional(),
  /** Original template id the selection came from (provenance). */
  templateId: import_zod13.z.string().max(64).optional()
});
var SelectCompanionResponseSchema = import_zod13.z.object({
  success: import_zod13.z.literal(true),
  companion: import_zod13.z.object({
    companionKey: import_zod13.z.string(),
    characterName: import_zod13.z.string(),
    bondLevel: import_zod13.z.number().int().nonnegative(),
    isActive: import_zod13.z.boolean()
  })
});
var StartMissionRequestSchema = import_zod13.z.object({
  /** Canonical mission identifier. Hero Slice = "mission-001". */
  missionId: import_zod13.z.string().min(1).max(64).default("mission-001")
});
var StudentMissionTaskSchema = import_zod13.z.object({
  id: import_zod13.z.string(),
  description: import_zod13.z.string(),
  interactionType: import_zod13.z.string()
});
var StartMissionResponseSchema = import_zod13.z.object({
  missionAttemptId: import_zod13.z.string().uuid(),
  missionId: import_zod13.z.string(),
  /** Provenance: 'ai' = compiled+validated; 'fallback' = static safe content. */
  contentSource: import_zod13.z.enum(["ai", "fallback"]),
  storyHook: import_zod13.z.string(),
  tasks: import_zod13.z.array(StudentMissionTaskSchema),
  rewardPreviewLabel: import_zod13.z.string()
});
var CompleteMissionRequestSchema = import_zod13.z.object({
  missionAttemptId: import_zod13.z.string().uuid(),
  /** Did the child finish all tasks (vs. just attempt)? Gates completion bonuses. */
  completedAllTasks: import_zod13.z.boolean().default(true),
  /** Did the child demonstrate the mastery bar (e.g. caught the AI mistake)? */
  masteryThresholdMet: import_zod13.z.boolean().default(false),
  /** Optional 0–1 evidence-weighted score. */
  masteryEvidenceScore: import_zod13.z.number().min(0).max(1).optional()
});
var MissionRewardSummarySchema = import_zod13.z.object({
  moolahEarned: import_zod13.z.number().int().nonnegative(),
  xpEarned: import_zod13.z.number().int().nonnegative(),
  housePointsEarned: import_zod13.z.number().int().nonnegative(),
  companionBondDelta: import_zod13.z.number().int().nonnegative(),
  badgesAwarded: import_zod13.z.array(import_zod13.z.string())
});
var CompleteMissionResponseSchema = import_zod13.z.object({
  missionAttemptId: import_zod13.z.string().uuid(),
  status: import_zod13.z.literal("completed"),
  /** True if this completion was already recorded — no rewards were re-applied. */
  alreadyCompleted: import_zod13.z.boolean(),
  rewards: MissionRewardSummarySchema,
  evidenceCount: import_zod13.z.number().int().nonnegative(),
  masteryRecordsWritten: import_zod13.z.number().int().nonnegative(),
  /** parent_reports row id (First Learning Map), or null if assembly was skipped. */
  reportId: import_zod13.z.string().uuid().nullable()
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
