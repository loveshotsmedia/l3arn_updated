import { z } from 'zod';

/**
 * Identity Contract — Foundation
 *
 * Covers every entity that has an account, session, or permission in L3ARN.
 * This is the root schema module; all other schemas import from here.
 *
 * Grounded in: ADR-007 (child identity), ADR-008 (parent visibility),
 * ADR-009 (AI interaction), ADR-012 (curriculum approval), ADR-027 (audio),
 * ADR-029 (model improvement opt-out), ADR-030 (account ownership),
 * ADR-031 (child session model), COPPA baseline.
 */

declare const HouseSchema: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
type House = z.infer<typeof HouseSchema>;
declare const GradeSchema: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8"]>;
type Grade = z.infer<typeof GradeSchema>;
declare const ApprovalModeSchema: z.ZodEnum<["high-control", "balanced", "autopilot"]>;
type ApprovalMode = z.infer<typeof ApprovalModeSchema>;
declare const DeliveryModeSchema: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
type DeliveryMode = z.infer<typeof DeliveryModeSchema>;
declare const ChatModeSchema: z.ZodEnum<["quick-chat-only", "moderated-free-text"]>;
type ChatMode = z.infer<typeof ChatModeSchema>;
declare const VisibilityTierSchema: z.ZodEnum<["full", "summary", "safety-override"]>;
type VisibilityTier = z.infer<typeof VisibilityTierSchema>;
declare const ParentAccountSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}>;
type ParentAccount = z.infer<typeof ParentAccountSchema>;
declare const HouseholdSchema: z.ZodObject<{
    id: z.ZodString;
    parentAccountId: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    parentAccountId: string;
    name: string;
}, {
    id: string;
    createdAt: string;
    parentAccountId: string;
    name: string;
}>;
type Household = z.infer<typeof HouseholdSchema>;
declare const ChildProfileSchema: z.ZodObject<{
    id: z.ZodString;
    householdId: z.ZodString;
    parentAccountId: z.ZodString;
    legalFirstName: z.ZodString;
    legalLastName: z.ZodString;
    grade: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8"]>;
    dateOfBirth: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    parentAccountId: string;
    householdId: string;
    legalFirstName: string;
    legalLastName: string;
    grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
    dateOfBirth: string;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    parentAccountId: string;
    householdId: string;
    legalFirstName: string;
    legalLastName: string;
    grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
    dateOfBirth: string;
}>;
type ChildProfile = z.infer<typeof ChildProfileSchema>;
declare const AcademyIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    displayName: z.ZodString;
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    avatarAssetId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    childProfileId: string;
    displayName: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    avatarAssetId?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    childProfileId: string;
    displayName: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    avatarAssetId?: string | undefined;
}>;
type AcademyIdentity = z.infer<typeof AcademyIdentitySchema>;
declare const ChildPermissionsSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    chatMode: z.ZodEnum<["quick-chat-only", "moderated-free-text"]>;
    audioEnabled: z.ZodBoolean;
    aiInteractionEnabled: z.ZodBoolean;
    allowedDeliveryModes: z.ZodArray<z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>, "many">;
    curriculumApprovalMode: z.ZodEnum<["high-control", "balanced", "autopilot"]>;
    modelImprovementOptIn: z.ZodBoolean;
    parentVisibilityTier: z.ZodEnum<["full", "summary", "safety-override"]>;
    screenLimitMinutesPerDay: z.ZodOptional<z.ZodNumber>;
    blockedTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    updatedAt: z.ZodString;
    updatedByParentAccountId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    updatedAt: string;
    childProfileId: string;
    chatMode: "quick-chat-only" | "moderated-free-text";
    audioEnabled: boolean;
    aiInteractionEnabled: boolean;
    allowedDeliveryModes: ("3d" | "interactive-lite" | "text-audio-offline")[];
    curriculumApprovalMode: "high-control" | "balanced" | "autopilot";
    modelImprovementOptIn: boolean;
    parentVisibilityTier: "full" | "summary" | "safety-override";
    blockedTopics: string[];
    updatedByParentAccountId: string;
    screenLimitMinutesPerDay?: number | undefined;
}, {
    id: string;
    updatedAt: string;
    childProfileId: string;
    chatMode: "quick-chat-only" | "moderated-free-text";
    audioEnabled: boolean;
    aiInteractionEnabled: boolean;
    allowedDeliveryModes: ("3d" | "interactive-lite" | "text-audio-offline")[];
    curriculumApprovalMode: "high-control" | "balanced" | "autopilot";
    modelImprovementOptIn: boolean;
    parentVisibilityTier: "full" | "summary" | "safety-override";
    updatedByParentAccountId: string;
    screenLimitMinutesPerDay?: number | undefined;
    blockedTopics?: string[] | undefined;
}>;
type ChildPermissions = z.infer<typeof ChildPermissionsSchema>;
declare const TrustedDeviceSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    parentAccountId: z.ZodString;
    deviceFingerprint: z.ZodString;
    nickname: z.ZodOptional<z.ZodString>;
    approvedAt: z.ZodString;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentAccountId: string;
    childProfileId: string;
    deviceFingerprint: string;
    approvedAt: string;
    nickname?: string | undefined;
    lastUsedAt?: string | undefined;
    revokedAt?: string | undefined;
}, {
    id: string;
    parentAccountId: string;
    childProfileId: string;
    deviceFingerprint: string;
    approvedAt: string;
    nickname?: string | undefined;
    lastUsedAt?: string | undefined;
    revokedAt?: string | undefined;
}>;
type TrustedDevice = z.infer<typeof TrustedDeviceSchema>;
declare const SessionEntryMethodSchema: z.ZodEnum<["parent-launch", "avatar-pin-trusted-device"]>;
type SessionEntryMethod = z.infer<typeof SessionEntryMethodSchema>;
declare const ChildSessionSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    academyIdentityId: z.ZodString;
    entryMethod: z.ZodEnum<["parent-launch", "avatar-pin-trusted-device"]>;
    trustedDeviceId: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodString;
    endedAt: z.ZodOptional<z.ZodString>;
    currentRoomId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    academyIdentityId: string;
    entryMethod: "parent-launch" | "avatar-pin-trusted-device";
    startedAt: string;
    trustedDeviceId?: string | undefined;
    endedAt?: string | undefined;
    currentRoomId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    academyIdentityId: string;
    entryMethod: "parent-launch" | "avatar-pin-trusted-device";
    startedAt: string;
    trustedDeviceId?: string | undefined;
    endedAt?: string | undefined;
    currentRoomId?: string | undefined;
}>;
type ChildSession = z.infer<typeof ChildSessionSchema>;
declare const ConsentTypeSchema: z.ZodEnum<["coppa-data-collection", "audio-push-to-talk", "ai-interaction", "model-improvement", "moderated-free-text-chat", "visibility-reduction"]>;
type ConsentType = z.infer<typeof ConsentTypeSchema>;
declare const ParentConsentSchema: z.ZodObject<{
    id: z.ZodString;
    parentAccountId: z.ZodString;
    childProfileId: z.ZodOptional<z.ZodString>;
    consentType: z.ZodEnum<["coppa-data-collection", "audio-push-to-talk", "ai-interaction", "model-improvement", "moderated-free-text-chat", "visibility-reduction"]>;
    granted: z.ZodBoolean;
    grantedAt: z.ZodString;
    ipAddress: z.ZodOptional<z.ZodString>;
    revokedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentAccountId: string;
    consentType: "coppa-data-collection" | "audio-push-to-talk" | "ai-interaction" | "model-improvement" | "moderated-free-text-chat" | "visibility-reduction";
    granted: boolean;
    grantedAt: string;
    childProfileId?: string | undefined;
    revokedAt?: string | undefined;
    ipAddress?: string | undefined;
}, {
    id: string;
    parentAccountId: string;
    consentType: "coppa-data-collection" | "audio-push-to-talk" | "ai-interaction" | "model-improvement" | "moderated-free-text-chat" | "visibility-reduction";
    granted: boolean;
    grantedAt: string;
    childProfileId?: string | undefined;
    revokedAt?: string | undefined;
    ipAddress?: string | undefined;
}>;
type ParentConsent = z.infer<typeof ParentConsentSchema>;

/**
 * Mission Contract — Foundation
 *
 * Covers the three-part constraint, all six mission output types,
 * and mission attempt records.
 *
 * Grounded in: ADR-014 (mission compiler constraint), ADR-015 (conflict resolution),
 * ADR-016 (mission output model), ADR-017 (delivery mode control),
 * ADR-010 (academic progress), ADR-011 (reward economy), ADR-026 (evidence capture),
 * architecture.md §6 (Mission Compiler Architecture).
 */

declare const MasteryLevelSchema: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
type MasteryLevel = z.infer<typeof MasteryLevelSchema>;
declare const ParentIntentSchema: z.ZodObject<{
    approvalMode: z.ZodEnum<["high-control", "balanced", "autopilot"]>;
    emphasizeTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    blockedTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    preferredDeliveryModes: z.ZodOptional<z.ZodArray<z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>, "many">>;
    customInstructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    blockedTopics: string[];
    approvalMode: "high-control" | "balanced" | "autopilot";
    emphasizeTopics: string[];
    preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
    customInstructions?: string | undefined;
}, {
    approvalMode: "high-control" | "balanced" | "autopilot";
    blockedTopics?: string[] | undefined;
    emphasizeTopics?: string[] | undefined;
    preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
    customInstructions?: string | undefined;
}>;
type ParentIntent = z.infer<typeof ParentIntentSchema>;
declare const StandardsAlignmentSchema: z.ZodObject<{
    masterySkillId: z.ZodString;
    masteryDomainId: z.ZodString;
    masteryObjective: z.ZodString;
    floridaStandardCode: z.ZodOptional<z.ZodString>;
    l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
    evidenceThreshold: z.ZodString;
}, "strip", z.ZodTypeAny, {
    masterySkillId: string;
    masteryDomainId: string;
    masteryObjective: string;
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    evidenceThreshold: string;
    floridaStandardCode?: string | undefined;
}, {
    masterySkillId: string;
    masteryDomainId: string;
    masteryObjective: string;
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    evidenceThreshold: string;
    floridaStandardCode?: string | undefined;
}>;
type StandardsAlignment = z.infer<typeof StandardsAlignmentSchema>;
declare const ChildPersonalizationSchema: z.ZodObject<{
    childProfileId: z.ZodString;
    grade: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8"]>;
    preferredDeliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
    instructionChunkSize: z.ZodEnum<["short", "medium", "long"]>;
    hintFrequency: z.ZodEnum<["high", "medium", "low"]>;
    interests: z.ZodArray<z.ZodString, "many">;
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    companionId: z.ZodOptional<z.ZodString>;
    accessibilityFlags: z.ZodObject<{
        audioSupport: z.ZodBoolean;
        visualSupport: z.ZodBoolean;
        lowTextMode: z.ZodBoolean;
        parentReadAloud: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        audioSupport: boolean;
        visualSupport: boolean;
        lowTextMode: boolean;
        parentReadAloud: boolean;
    }, {
        audioSupport: boolean;
        visualSupport: boolean;
        lowTextMode: boolean;
        parentReadAloud: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
    childProfileId: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    instructionChunkSize: "short" | "medium" | "long";
    hintFrequency: "medium" | "high" | "low";
    interests: string[];
    accessibilityFlags: {
        audioSupport: boolean;
        visualSupport: boolean;
        lowTextMode: boolean;
        parentReadAloud: boolean;
    };
    companionId?: string | undefined;
}, {
    grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
    childProfileId: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    instructionChunkSize: "short" | "medium" | "long";
    hintFrequency: "medium" | "high" | "low";
    interests: string[];
    accessibilityFlags: {
        audioSupport: boolean;
        visualSupport: boolean;
        lowTextMode: boolean;
        parentReadAloud: boolean;
    };
    companionId?: string | undefined;
}>;
type ChildPersonalization = z.infer<typeof ChildPersonalizationSchema>;
declare const ParentPlanSchema: z.ZodObject<{
    objective: z.ZodString;
    standardsAlignment: z.ZodObject<{
        masterySkillId: z.ZodString;
        masteryDomainId: z.ZodString;
        masteryObjective: z.ZodString;
        floridaStandardCode: z.ZodOptional<z.ZodString>;
        l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
        evidenceThreshold: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    }, {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    }>;
    materials: z.ZodArray<z.ZodString, "many">;
    steps: z.ZodArray<z.ZodString, "many">;
    safetyNotes: z.ZodOptional<z.ZodString>;
    evidenceSummary: z.ZodString;
    masteryThreshold: z.ZodString;
    whyChosen: z.ZodString;
}, "strip", z.ZodTypeAny, {
    objective: string;
    standardsAlignment: {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    };
    materials: string[];
    steps: string[];
    evidenceSummary: string;
    masteryThreshold: string;
    whyChosen: string;
    safetyNotes?: string | undefined;
}, {
    objective: string;
    standardsAlignment: {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    };
    materials: string[];
    steps: string[];
    evidenceSummary: string;
    masteryThreshold: string;
    whyChosen: string;
    safetyNotes?: string | undefined;
}>;
type ParentPlan = z.infer<typeof ParentPlanSchema>;
declare const CompanionDialogueLineSchema: z.ZodObject<{
    companionId: z.ZodString;
    line: z.ZodString;
    trigger: z.ZodEnum<["on-start", "on-hint-requested", "on-step-complete", "on-mistake", "on-mission-complete"]>;
}, "strip", z.ZodTypeAny, {
    companionId: string;
    line: string;
    trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
}, {
    companionId: string;
    line: string;
    trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
}>;
type CompanionDialogueLine = z.infer<typeof CompanionDialogueLineSchema>;
declare const MissionTaskSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    interactionType: z.ZodEnum<["click", "drag", "choice", "text-input", "observe", "sequence", "sort-categorize", "apply-to-new", "ai-mistake-check"]>;
    assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isEvidenceCapturePoint: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
    isEvidenceCapturePoint: boolean;
    assetRefs?: string[] | undefined;
}, {
    id: string;
    description: string;
    interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
    isEvidenceCapturePoint: boolean;
    assetRefs?: string[] | undefined;
}>;
type MissionTask = z.infer<typeof MissionTaskSchema>;
declare const Student3dMissionSchema: z.ZodObject<{
    storyHook: z.ZodString;
    worldRoomId: z.ZodString;
    companionDialogue: z.ZodArray<z.ZodObject<{
        companionId: z.ZodString;
        line: z.ZodString;
        trigger: z.ZodEnum<["on-start", "on-hint-requested", "on-step-complete", "on-mistake", "on-mission-complete"]>;
    }, "strip", z.ZodTypeAny, {
        companionId: string;
        line: string;
        trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
    }, {
        companionId: string;
        line: string;
        trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
    }>, "many">;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        interactionType: z.ZodEnum<["click", "drag", "choice", "text-input", "observe", "sequence", "sort-categorize", "apply-to-new", "ai-mistake-check"]>;
        assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isEvidenceCapturePoint: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
        isEvidenceCapturePoint: boolean;
        assetRefs?: string[] | undefined;
    }, {
        id: string;
        description: string;
        interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
        isEvidenceCapturePoint: boolean;
        assetRefs?: string[] | undefined;
    }>, "many">;
    rewardPreviewLabel: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storyHook: string;
    worldRoomId: string;
    companionDialogue: {
        companionId: string;
        line: string;
        trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
    }[];
    tasks: {
        id: string;
        description: string;
        interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
        isEvidenceCapturePoint: boolean;
        assetRefs?: string[] | undefined;
    }[];
    rewardPreviewLabel: string;
}, {
    storyHook: string;
    worldRoomId: string;
    companionDialogue: {
        companionId: string;
        line: string;
        trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
    }[];
    tasks: {
        id: string;
        description: string;
        interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
        isEvidenceCapturePoint: boolean;
        assetRefs?: string[] | undefined;
    }[];
    rewardPreviewLabel: string;
}>;
type Student3dMission = z.infer<typeof Student3dMissionSchema>;
declare const LiteInteractionSchema: z.ZodObject<{
    type: z.ZodEnum<["choice", "tap", "drag"]>;
    prompt: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "drag" | "choice" | "tap";
    prompt: string;
    options?: string[] | undefined;
}, {
    type: "drag" | "choice" | "tap";
    prompt: string;
    options?: string[] | undefined;
}>;
type LiteInteraction = z.infer<typeof LiteInteractionSchema>;
declare const LiteCardSchema: z.ZodObject<{
    id: z.ZodString;
    contentText: z.ZodString;
    illustrationRef: z.ZodOptional<z.ZodString>;
    audioRef: z.ZodOptional<z.ZodString>;
    interactions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["choice", "tap", "drag"]>;
        prompt: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "drag" | "choice" | "tap";
        prompt: string;
        options?: string[] | undefined;
    }, {
        type: "drag" | "choice" | "tap";
        prompt: string;
        options?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    contentText: string;
    interactions: {
        type: "drag" | "choice" | "tap";
        prompt: string;
        options?: string[] | undefined;
    }[];
    illustrationRef?: string | undefined;
    audioRef?: string | undefined;
}, {
    id: string;
    contentText: string;
    interactions: {
        type: "drag" | "choice" | "tap";
        prompt: string;
        options?: string[] | undefined;
    }[];
    illustrationRef?: string | undefined;
    audioRef?: string | undefined;
}>;
type LiteCard = z.infer<typeof LiteCardSchema>;
declare const StudentInteractiveLiteSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        contentText: z.ZodString;
        illustrationRef: z.ZodOptional<z.ZodString>;
        audioRef: z.ZodOptional<z.ZodString>;
        interactions: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["choice", "tap", "drag"]>;
            prompt: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }, {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        contentText: string;
        interactions: {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }[];
        illustrationRef?: string | undefined;
        audioRef?: string | undefined;
    }, {
        id: string;
        contentText: string;
        interactions: {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }[];
        illustrationRef?: string | undefined;
        audioRef?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cards: {
        id: string;
        contentText: string;
        interactions: {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }[];
        illustrationRef?: string | undefined;
        audioRef?: string | undefined;
    }[];
}, {
    cards: {
        id: string;
        contentText: string;
        interactions: {
            type: "drag" | "choice" | "tap";
            prompt: string;
            options?: string[] | undefined;
        }[];
        illustrationRef?: string | undefined;
        audioRef?: string | undefined;
    }[];
}>;
type StudentInteractiveLite = z.infer<typeof StudentInteractiveLiteSchema>;
declare const StudentTextAudioOfflineSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodString, "many">;
    readAloudScript: z.ZodOptional<z.ZodString>;
    printableTaskDescription: z.ZodString;
    artifactUploadInstructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    steps: string[];
    printableTaskDescription: string;
    readAloudScript?: string | undefined;
    artifactUploadInstructions?: string | undefined;
}, {
    steps: string[];
    printableTaskDescription: string;
    readAloudScript?: string | undefined;
    artifactUploadInstructions?: string | undefined;
}>;
type StudentTextAudioOffline = z.infer<typeof StudentTextAudioOfflineSchema>;
declare const EvidenceCapturePointSchema: z.ZodObject<{
    stepId: z.ZodString;
    captureType: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "structured-replay"]>;
    retentionDays: z.ZodNumber;
    parentVisible: z.ZodBoolean;
    portfolioEligible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    stepId: string;
    captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
    retentionDays: number;
    parentVisible: boolean;
    portfolioEligible: boolean;
}, {
    stepId: string;
    captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
    retentionDays: number;
    parentVisible: boolean;
    portfolioEligible: boolean;
}>;
type EvidenceCapturePoint = z.infer<typeof EvidenceCapturePointSchema>;
declare const EvidencePlanSchema: z.ZodObject<{
    capturePoints: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        captureType: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "structured-replay"]>;
        retentionDays: z.ZodNumber;
        parentVisible: z.ZodBoolean;
        portfolioEligible: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
        retentionDays: number;
        parentVisible: boolean;
        portfolioEligible: boolean;
    }, {
        stepId: string;
        captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
        retentionDays: number;
        parentVisible: boolean;
        portfolioEligible: boolean;
    }>, "many">;
    noWebcam: z.ZodLiteral<true>;
    noFaceCapture: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    capturePoints: {
        stepId: string;
        captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
        retentionDays: number;
        parentVisible: boolean;
        portfolioEligible: boolean;
    }[];
    noWebcam: true;
    noFaceCapture: true;
}, {
    capturePoints: {
        stepId: string;
        captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
        retentionDays: number;
        parentVisible: boolean;
        portfolioEligible: boolean;
    }[];
    noWebcam: true;
    noFaceCapture: true;
}>;
type EvidencePlan = z.infer<typeof EvidencePlanSchema>;
declare const RewardPlanSchema: z.ZodObject<{
    effortMoolah: z.ZodNumber;
    effortXp: z.ZodNumber;
    masteryMoolah: z.ZodOptional<z.ZodNumber>;
    masteryXp: z.ZodOptional<z.ZodNumber>;
    companionBondIncrease: z.ZodNumber;
    housePointsContribution: z.ZodNumber;
    badgeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    masteryGated: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    effortMoolah: number;
    effortXp: number;
    companionBondIncrease: number;
    housePointsContribution: number;
    masteryGated: boolean;
    masteryMoolah?: number | undefined;
    masteryXp?: number | undefined;
    badgeIds?: string[] | undefined;
}, {
    effortMoolah: number;
    effortXp: number;
    companionBondIncrease: number;
    housePointsContribution: number;
    masteryGated: boolean;
    masteryMoolah?: number | undefined;
    masteryXp?: number | undefined;
    badgeIds?: string[] | undefined;
}>;
type RewardPlan = z.infer<typeof RewardPlanSchema>;
declare const MissionOutputSchema: z.ZodObject<{
    parentPlan: z.ZodObject<{
        objective: z.ZodString;
        standardsAlignment: z.ZodObject<{
            masterySkillId: z.ZodString;
            masteryDomainId: z.ZodString;
            masteryObjective: z.ZodString;
            floridaStandardCode: z.ZodOptional<z.ZodString>;
            l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
            evidenceThreshold: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        }, {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        }>;
        materials: z.ZodArray<z.ZodString, "many">;
        steps: z.ZodArray<z.ZodString, "many">;
        safetyNotes: z.ZodOptional<z.ZodString>;
        evidenceSummary: z.ZodString;
        masteryThreshold: z.ZodString;
        whyChosen: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        objective: string;
        standardsAlignment: {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        };
        materials: string[];
        steps: string[];
        evidenceSummary: string;
        masteryThreshold: string;
        whyChosen: string;
        safetyNotes?: string | undefined;
    }, {
        objective: string;
        standardsAlignment: {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        };
        materials: string[];
        steps: string[];
        evidenceSummary: string;
        masteryThreshold: string;
        whyChosen: string;
        safetyNotes?: string | undefined;
    }>;
    student3dMission: z.ZodObject<{
        storyHook: z.ZodString;
        worldRoomId: z.ZodString;
        companionDialogue: z.ZodArray<z.ZodObject<{
            companionId: z.ZodString;
            line: z.ZodString;
            trigger: z.ZodEnum<["on-start", "on-hint-requested", "on-step-complete", "on-mistake", "on-mission-complete"]>;
        }, "strip", z.ZodTypeAny, {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }, {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }>, "many">;
        tasks: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodString;
            interactionType: z.ZodEnum<["click", "drag", "choice", "text-input", "observe", "sequence", "sort-categorize", "apply-to-new", "ai-mistake-check"]>;
            assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            isEvidenceCapturePoint: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }, {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }>, "many">;
        rewardPreviewLabel: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        storyHook: string;
        worldRoomId: string;
        companionDialogue: {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }[];
        tasks: {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }[];
        rewardPreviewLabel: string;
    }, {
        storyHook: string;
        worldRoomId: string;
        companionDialogue: {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }[];
        tasks: {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }[];
        rewardPreviewLabel: string;
    }>;
    studentInteractiveLite: z.ZodObject<{
        cards: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            contentText: z.ZodString;
            illustrationRef: z.ZodOptional<z.ZodString>;
            audioRef: z.ZodOptional<z.ZodString>;
            interactions: z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["choice", "tap", "drag"]>;
                prompt: z.ZodString;
                options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }, {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }, {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        cards: {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }[];
    }, {
        cards: {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }[];
    }>;
    studentTextAudioOffline: z.ZodObject<{
        steps: z.ZodArray<z.ZodString, "many">;
        readAloudScript: z.ZodOptional<z.ZodString>;
        printableTaskDescription: z.ZodString;
        artifactUploadInstructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        steps: string[];
        printableTaskDescription: string;
        readAloudScript?: string | undefined;
        artifactUploadInstructions?: string | undefined;
    }, {
        steps: string[];
        printableTaskDescription: string;
        readAloudScript?: string | undefined;
        artifactUploadInstructions?: string | undefined;
    }>;
    evidencePlan: z.ZodObject<{
        capturePoints: z.ZodArray<z.ZodObject<{
            stepId: z.ZodString;
            captureType: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "structured-replay"]>;
            retentionDays: z.ZodNumber;
            parentVisible: z.ZodBoolean;
            portfolioEligible: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }, {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }>, "many">;
        noWebcam: z.ZodLiteral<true>;
        noFaceCapture: z.ZodLiteral<true>;
    }, "strip", z.ZodTypeAny, {
        capturePoints: {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }[];
        noWebcam: true;
        noFaceCapture: true;
    }, {
        capturePoints: {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }[];
        noWebcam: true;
        noFaceCapture: true;
    }>;
    rewardPlan: z.ZodObject<{
        effortMoolah: z.ZodNumber;
        effortXp: z.ZodNumber;
        masteryMoolah: z.ZodOptional<z.ZodNumber>;
        masteryXp: z.ZodOptional<z.ZodNumber>;
        companionBondIncrease: z.ZodNumber;
        housePointsContribution: z.ZodNumber;
        badgeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        masteryGated: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        effortMoolah: number;
        effortXp: number;
        companionBondIncrease: number;
        housePointsContribution: number;
        masteryGated: boolean;
        masteryMoolah?: number | undefined;
        masteryXp?: number | undefined;
        badgeIds?: string[] | undefined;
    }, {
        effortMoolah: number;
        effortXp: number;
        companionBondIncrease: number;
        housePointsContribution: number;
        masteryGated: boolean;
        masteryMoolah?: number | undefined;
        masteryXp?: number | undefined;
        badgeIds?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    parentPlan: {
        objective: string;
        standardsAlignment: {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        };
        materials: string[];
        steps: string[];
        evidenceSummary: string;
        masteryThreshold: string;
        whyChosen: string;
        safetyNotes?: string | undefined;
    };
    student3dMission: {
        storyHook: string;
        worldRoomId: string;
        companionDialogue: {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }[];
        tasks: {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }[];
        rewardPreviewLabel: string;
    };
    studentInteractiveLite: {
        cards: {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }[];
    };
    studentTextAudioOffline: {
        steps: string[];
        printableTaskDescription: string;
        readAloudScript?: string | undefined;
        artifactUploadInstructions?: string | undefined;
    };
    evidencePlan: {
        capturePoints: {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }[];
        noWebcam: true;
        noFaceCapture: true;
    };
    rewardPlan: {
        effortMoolah: number;
        effortXp: number;
        companionBondIncrease: number;
        housePointsContribution: number;
        masteryGated: boolean;
        masteryMoolah?: number | undefined;
        masteryXp?: number | undefined;
        badgeIds?: string[] | undefined;
    };
}, {
    parentPlan: {
        objective: string;
        standardsAlignment: {
            masterySkillId: string;
            masteryDomainId: string;
            masteryObjective: string;
            l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
            evidenceThreshold: string;
            floridaStandardCode?: string | undefined;
        };
        materials: string[];
        steps: string[];
        evidenceSummary: string;
        masteryThreshold: string;
        whyChosen: string;
        safetyNotes?: string | undefined;
    };
    student3dMission: {
        storyHook: string;
        worldRoomId: string;
        companionDialogue: {
            companionId: string;
            line: string;
            trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
        }[];
        tasks: {
            id: string;
            description: string;
            interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
            isEvidenceCapturePoint: boolean;
            assetRefs?: string[] | undefined;
        }[];
        rewardPreviewLabel: string;
    };
    studentInteractiveLite: {
        cards: {
            id: string;
            contentText: string;
            interactions: {
                type: "drag" | "choice" | "tap";
                prompt: string;
                options?: string[] | undefined;
            }[];
            illustrationRef?: string | undefined;
            audioRef?: string | undefined;
        }[];
    };
    studentTextAudioOffline: {
        steps: string[];
        printableTaskDescription: string;
        readAloudScript?: string | undefined;
        artifactUploadInstructions?: string | undefined;
    };
    evidencePlan: {
        capturePoints: {
            stepId: string;
            captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
            retentionDays: number;
            parentVisible: boolean;
            portfolioEligible: boolean;
        }[];
        noWebcam: true;
        noFaceCapture: true;
    };
    rewardPlan: {
        effortMoolah: number;
        effortXp: number;
        companionBondIncrease: number;
        housePointsContribution: number;
        masteryGated: boolean;
        masteryMoolah?: number | undefined;
        masteryXp?: number | undefined;
        badgeIds?: string[] | undefined;
    };
}>;
type MissionOutput = z.infer<typeof MissionOutputSchema>;
declare const MissionStatusSchema: z.ZodEnum<["draft", "pending-approval", "active", "completed", "archived"]>;
type MissionStatus = z.infer<typeof MissionStatusSchema>;
declare const MissionSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    version: z.ZodNumber;
    status: z.ZodEnum<["draft", "pending-approval", "active", "completed", "archived"]>;
    parentIntent: z.ZodObject<{
        approvalMode: z.ZodEnum<["high-control", "balanced", "autopilot"]>;
        emphasizeTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        blockedTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        preferredDeliveryModes: z.ZodOptional<z.ZodArray<z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>, "many">>;
        customInstructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        blockedTopics: string[];
        approvalMode: "high-control" | "balanced" | "autopilot";
        emphasizeTopics: string[];
        preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
        customInstructions?: string | undefined;
    }, {
        approvalMode: "high-control" | "balanced" | "autopilot";
        blockedTopics?: string[] | undefined;
        emphasizeTopics?: string[] | undefined;
        preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
        customInstructions?: string | undefined;
    }>;
    childPersonalization: z.ZodObject<{
        childProfileId: z.ZodString;
        grade: z.ZodEnum<["K", "1", "2", "3", "4", "5", "6", "7", "8"]>;
        preferredDeliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
        instructionChunkSize: z.ZodEnum<["short", "medium", "long"]>;
        hintFrequency: z.ZodEnum<["high", "medium", "low"]>;
        interests: z.ZodArray<z.ZodString, "many">;
        house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
        companionId: z.ZodOptional<z.ZodString>;
        accessibilityFlags: z.ZodObject<{
            audioSupport: z.ZodBoolean;
            visualSupport: z.ZodBoolean;
            lowTextMode: z.ZodBoolean;
            parentReadAloud: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        }, {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
        childProfileId: string;
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        instructionChunkSize: "short" | "medium" | "long";
        hintFrequency: "medium" | "high" | "low";
        interests: string[];
        accessibilityFlags: {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        };
        companionId?: string | undefined;
    }, {
        grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
        childProfileId: string;
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        instructionChunkSize: "short" | "medium" | "long";
        hintFrequency: "medium" | "high" | "low";
        interests: string[];
        accessibilityFlags: {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        };
        companionId?: string | undefined;
    }>;
    standardsAlignment: z.ZodObject<{
        masterySkillId: z.ZodString;
        masteryDomainId: z.ZodString;
        masteryObjective: z.ZodString;
        floridaStandardCode: z.ZodOptional<z.ZodString>;
        l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
        evidenceThreshold: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    }, {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    }>;
    output: z.ZodObject<{
        parentPlan: z.ZodObject<{
            objective: z.ZodString;
            standardsAlignment: z.ZodObject<{
                masterySkillId: z.ZodString;
                masteryDomainId: z.ZodString;
                masteryObjective: z.ZodString;
                floridaStandardCode: z.ZodOptional<z.ZodString>;
                l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
                evidenceThreshold: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            }, {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            }>;
            materials: z.ZodArray<z.ZodString, "many">;
            steps: z.ZodArray<z.ZodString, "many">;
            safetyNotes: z.ZodOptional<z.ZodString>;
            evidenceSummary: z.ZodString;
            masteryThreshold: z.ZodString;
            whyChosen: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        }, {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        }>;
        student3dMission: z.ZodObject<{
            storyHook: z.ZodString;
            worldRoomId: z.ZodString;
            companionDialogue: z.ZodArray<z.ZodObject<{
                companionId: z.ZodString;
                line: z.ZodString;
                trigger: z.ZodEnum<["on-start", "on-hint-requested", "on-step-complete", "on-mistake", "on-mission-complete"]>;
            }, "strip", z.ZodTypeAny, {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }, {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }>, "many">;
            tasks: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                description: z.ZodString;
                interactionType: z.ZodEnum<["click", "drag", "choice", "text-input", "observe", "sequence", "sort-categorize", "apply-to-new", "ai-mistake-check"]>;
                assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                isEvidenceCapturePoint: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }, {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }>, "many">;
            rewardPreviewLabel: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        }, {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        }>;
        studentInteractiveLite: z.ZodObject<{
            cards: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                contentText: z.ZodString;
                illustrationRef: z.ZodOptional<z.ZodString>;
                audioRef: z.ZodOptional<z.ZodString>;
                interactions: z.ZodArray<z.ZodObject<{
                    type: z.ZodEnum<["choice", "tap", "drag"]>;
                    prompt: z.ZodString;
                    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }, {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }, {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        }, {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        }>;
        studentTextAudioOffline: z.ZodObject<{
            steps: z.ZodArray<z.ZodString, "many">;
            readAloudScript: z.ZodOptional<z.ZodString>;
            printableTaskDescription: z.ZodString;
            artifactUploadInstructions: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        }, {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        }>;
        evidencePlan: z.ZodObject<{
            capturePoints: z.ZodArray<z.ZodObject<{
                stepId: z.ZodString;
                captureType: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "structured-replay"]>;
                retentionDays: z.ZodNumber;
                parentVisible: z.ZodBoolean;
                portfolioEligible: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }, {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }>, "many">;
            noWebcam: z.ZodLiteral<true>;
            noFaceCapture: z.ZodLiteral<true>;
        }, "strip", z.ZodTypeAny, {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        }, {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        }>;
        rewardPlan: z.ZodObject<{
            effortMoolah: z.ZodNumber;
            effortXp: z.ZodNumber;
            masteryMoolah: z.ZodOptional<z.ZodNumber>;
            masteryXp: z.ZodOptional<z.ZodNumber>;
            companionBondIncrease: z.ZodNumber;
            housePointsContribution: z.ZodNumber;
            badgeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            masteryGated: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        }, {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        parentPlan: {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        };
        student3dMission: {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        };
        studentInteractiveLite: {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        };
        studentTextAudioOffline: {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        };
        evidencePlan: {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        };
        rewardPlan: {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        };
    }, {
        parentPlan: {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        };
        student3dMission: {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        };
        studentInteractiveLite: {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        };
        studentTextAudioOffline: {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        };
        evidencePlan: {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        };
        rewardPlan: {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        };
    }>;
    compiledAt: z.ZodString;
    approvedByParentAt: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "pending-approval" | "active" | "completed" | "archived";
    id: string;
    childProfileId: string;
    standardsAlignment: {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    };
    version: number;
    parentIntent: {
        blockedTopics: string[];
        approvalMode: "high-control" | "balanced" | "autopilot";
        emphasizeTopics: string[];
        preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
        customInstructions?: string | undefined;
    };
    childPersonalization: {
        grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
        childProfileId: string;
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        instructionChunkSize: "short" | "medium" | "long";
        hintFrequency: "medium" | "high" | "low";
        interests: string[];
        accessibilityFlags: {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        };
        companionId?: string | undefined;
    };
    output: {
        parentPlan: {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        };
        student3dMission: {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        };
        studentInteractiveLite: {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        };
        studentTextAudioOffline: {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        };
        evidencePlan: {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        };
        rewardPlan: {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        };
    };
    compiledAt: string;
    startedAt?: string | undefined;
    approvedByParentAt?: string | undefined;
    completedAt?: string | undefined;
}, {
    status: "draft" | "pending-approval" | "active" | "completed" | "archived";
    id: string;
    childProfileId: string;
    standardsAlignment: {
        masterySkillId: string;
        masteryDomainId: string;
        masteryObjective: string;
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        evidenceThreshold: string;
        floridaStandardCode?: string | undefined;
    };
    version: number;
    parentIntent: {
        approvalMode: "high-control" | "balanced" | "autopilot";
        blockedTopics?: string[] | undefined;
        emphasizeTopics?: string[] | undefined;
        preferredDeliveryModes?: ("3d" | "interactive-lite" | "text-audio-offline")[] | undefined;
        customInstructions?: string | undefined;
    };
    childPersonalization: {
        grade: "1" | "2" | "3" | "4" | "K" | "5" | "6" | "7" | "8";
        childProfileId: string;
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        preferredDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        instructionChunkSize: "short" | "medium" | "long";
        hintFrequency: "medium" | "high" | "low";
        interests: string[];
        accessibilityFlags: {
            audioSupport: boolean;
            visualSupport: boolean;
            lowTextMode: boolean;
            parentReadAloud: boolean;
        };
        companionId?: string | undefined;
    };
    output: {
        parentPlan: {
            objective: string;
            standardsAlignment: {
                masterySkillId: string;
                masteryDomainId: string;
                masteryObjective: string;
                l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
                evidenceThreshold: string;
                floridaStandardCode?: string | undefined;
            };
            materials: string[];
            steps: string[];
            evidenceSummary: string;
            masteryThreshold: string;
            whyChosen: string;
            safetyNotes?: string | undefined;
        };
        student3dMission: {
            storyHook: string;
            worldRoomId: string;
            companionDialogue: {
                companionId: string;
                line: string;
                trigger: "on-start" | "on-hint-requested" | "on-step-complete" | "on-mistake" | "on-mission-complete";
            }[];
            tasks: {
                id: string;
                description: string;
                interactionType: "click" | "drag" | "choice" | "text-input" | "observe" | "sequence" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
                isEvidenceCapturePoint: boolean;
                assetRefs?: string[] | undefined;
            }[];
            rewardPreviewLabel: string;
        };
        studentInteractiveLite: {
            cards: {
                id: string;
                contentText: string;
                interactions: {
                    type: "drag" | "choice" | "tap";
                    prompt: string;
                    options?: string[] | undefined;
                }[];
                illustrationRef?: string | undefined;
                audioRef?: string | undefined;
            }[];
        };
        studentTextAudioOffline: {
            steps: string[];
            printableTaskDescription: string;
            readAloudScript?: string | undefined;
            artifactUploadInstructions?: string | undefined;
        };
        evidencePlan: {
            capturePoints: {
                stepId: string;
                captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay";
                retentionDays: number;
                parentVisible: boolean;
                portfolioEligible: boolean;
            }[];
            noWebcam: true;
            noFaceCapture: true;
        };
        rewardPlan: {
            effortMoolah: number;
            effortXp: number;
            companionBondIncrease: number;
            housePointsContribution: number;
            masteryGated: boolean;
            masteryMoolah?: number | undefined;
            masteryXp?: number | undefined;
            badgeIds?: string[] | undefined;
        };
    };
    compiledAt: string;
    startedAt?: string | undefined;
    approvedByParentAt?: string | undefined;
    completedAt?: string | undefined;
}>;
type Mission = z.infer<typeof MissionSchema>;
declare const MissionAttemptSchema: z.ZodObject<{
    id: z.ZodString;
    missionId: z.ZodString;
    childProfileId: z.ZodString;
    childSessionId: z.ZodString;
    deliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    masteryEvidenceScore: z.ZodOptional<z.ZodNumber>;
    masteryAchieved: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    startedAt: string;
    missionId: string;
    childSessionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    completedAt?: string | undefined;
    masteryEvidenceScore?: number | undefined;
    masteryAchieved?: boolean | undefined;
}, {
    id: string;
    childProfileId: string;
    startedAt: string;
    missionId: string;
    childSessionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    completedAt?: string | undefined;
    masteryEvidenceScore?: number | undefined;
    masteryAchieved?: boolean | undefined;
}>;
type MissionAttempt = z.infer<typeof MissionAttemptSchema>;

/**
 * World Event Contract — Foundation
 *
 * Covers every event that flows through the Railway → Supabase
 * hybrid event-sourced world state system.
 *
 * Pattern: `WorldEventSchema` is the generic envelope stored in Supabase and
 * broadcast by Railway. Consumers discriminate on `event.type`, then parse
 * `event.payload` using the per-type payload schemas defined below.
 *
 * Grounded in: ADR-019 (living academy model), ADR-020 (world state source of truth),
 * ADR-008 (parent visibility), ADR-011 (reward economy),
 * architecture.md §5 (World State Architecture).
 *
 * Master rule (architecture.md §5): every persistent world change must be
 * system-approved, reversible, logged, parent-visible when child-specific, and
 * connected to mastery, effort, House contribution, companion growth, or a
 * scheduled Academy event.
 */

declare const WorldEventTypeSchema: z.ZodEnum<["room.joined", "room.left", "avatar.moved", "mission.started", "mission.step-completed", "mission.completed", "mission.abandoned", "moolah.earned", "moolah.spent", "xp.earned", "badge.awarded", "house.points-earned", "house.leaderboard-updated", "companion.bond-increased", "companion.milestone-reached", "academy.unlock-triggered", "academy.seasonal-event-started", "academy.seasonal-event-ended", "world.repair-completed", "world.decoration-placed"]>;
type WorldEventType = z.infer<typeof WorldEventTypeSchema>;
declare const WorldEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["room.joined", "room.left", "avatar.moved", "mission.started", "mission.step-completed", "mission.completed", "mission.abandoned", "moolah.earned", "moolah.spent", "xp.earned", "badge.awarded", "house.points-earned", "house.leaderboard-updated", "companion.bond-increased", "companion.milestone-reached", "academy.unlock-triggered", "academy.seasonal-event-started", "academy.seasonal-event-ended", "world.repair-completed", "world.decoration-placed"]>;
    childProfileId: z.ZodOptional<z.ZodString>;
    childSessionId: z.ZodOptional<z.ZodString>;
    academyIdentityId: z.ZodOptional<z.ZodString>;
    roomId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    reversible: z.ZodBoolean;
    parentVisible: z.ZodBoolean;
    auditLogged: z.ZodLiteral<true>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "room.joined" | "room.left" | "avatar.moved" | "mission.started" | "mission.step-completed" | "mission.completed" | "mission.abandoned" | "moolah.earned" | "moolah.spent" | "xp.earned" | "badge.awarded" | "house.points-earned" | "house.leaderboard-updated" | "companion.bond-increased" | "companion.milestone-reached" | "academy.unlock-triggered" | "academy.seasonal-event-started" | "academy.seasonal-event-ended" | "world.repair-completed" | "world.decoration-placed";
    id: string;
    parentVisible: boolean;
    occurredAt: string;
    reversible: boolean;
    auditLogged: true;
    payload: Record<string, unknown>;
    childProfileId?: string | undefined;
    academyIdentityId?: string | undefined;
    childSessionId?: string | undefined;
    roomId?: string | undefined;
}, {
    type: "room.joined" | "room.left" | "avatar.moved" | "mission.started" | "mission.step-completed" | "mission.completed" | "mission.abandoned" | "moolah.earned" | "moolah.spent" | "xp.earned" | "badge.awarded" | "house.points-earned" | "house.leaderboard-updated" | "companion.bond-increased" | "companion.milestone-reached" | "academy.unlock-triggered" | "academy.seasonal-event-started" | "academy.seasonal-event-ended" | "world.repair-completed" | "world.decoration-placed";
    id: string;
    parentVisible: boolean;
    occurredAt: string;
    reversible: boolean;
    auditLogged: true;
    payload: Record<string, unknown>;
    childProfileId?: string | undefined;
    academyIdentityId?: string | undefined;
    childSessionId?: string | undefined;
    roomId?: string | undefined;
}>;
type WorldEvent = z.infer<typeof WorldEventSchema>;
declare const RoomJoinedPayloadSchema: z.ZodObject<{
    roomId: z.ZodString;
    academyIdentityId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    academyIdentityId: string;
    roomId: string;
}, {
    academyIdentityId: string;
    roomId: string;
}>;
type RoomJoinedPayload = z.infer<typeof RoomJoinedPayloadSchema>;
declare const RoomLeftPayloadSchema: z.ZodObject<{
    roomId: z.ZodString;
    academyIdentityId: z.ZodString;
    durationSeconds: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    academyIdentityId: string;
    roomId: string;
    durationSeconds: number;
}, {
    academyIdentityId: string;
    roomId: string;
    durationSeconds: number;
}>;
type RoomLeftPayload = z.infer<typeof RoomLeftPayloadSchema>;
declare const AvatarMovedPayloadSchema: z.ZodObject<{
    academyIdentityId: z.ZodString;
    roomId: z.ZodString;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
}, "strip", z.ZodTypeAny, {
    academyIdentityId: string;
    roomId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
}, {
    academyIdentityId: string;
    roomId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
}>;
type AvatarMovedPayload = z.infer<typeof AvatarMovedPayloadSchema>;
declare const MissionStartedPayloadSchema: z.ZodObject<{
    missionId: z.ZodString;
    missionAttemptId: z.ZodString;
    deliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
}, "strip", z.ZodTypeAny, {
    missionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    missionAttemptId: string;
}, {
    missionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    missionAttemptId: string;
}>;
type MissionStartedPayload = z.infer<typeof MissionStartedPayloadSchema>;
declare const MissionStepCompletedPayloadSchema: z.ZodObject<{
    missionAttemptId: z.ZodString;
    stepId: z.ZodString;
    evidenceCaptured: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    stepId: string;
    missionAttemptId: string;
    evidenceCaptured: boolean;
}, {
    stepId: string;
    missionAttemptId: string;
    evidenceCaptured: boolean;
}>;
type MissionStepCompletedPayload = z.infer<typeof MissionStepCompletedPayloadSchema>;
declare const MissionCompletedPayloadSchema: z.ZodObject<{
    missionId: z.ZodString;
    missionAttemptId: z.ZodString;
    deliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
    masteryAchieved: z.ZodBoolean;
    masteryEvidenceScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    missionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    masteryEvidenceScore: number;
    masteryAchieved: boolean;
    missionAttemptId: string;
}, {
    missionId: string;
    deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    masteryEvidenceScore: number;
    masteryAchieved: boolean;
    missionAttemptId: string;
}>;
type MissionCompletedPayload = z.infer<typeof MissionCompletedPayloadSchema>;
declare const MissionAbandonedPayloadSchema: z.ZodObject<{
    missionAttemptId: z.ZodString;
    lastStepId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    missionAttemptId: string;
    lastStepId?: string | undefined;
}, {
    missionAttemptId: string;
    lastStepId?: string | undefined;
}>;
type MissionAbandonedPayload = z.infer<typeof MissionAbandonedPayloadSchema>;
declare const MoolahEarnedPayloadSchema: z.ZodObject<{
    walletId: z.ZodString;
    amount: z.ZodNumber;
    reason: z.ZodEnum<["mission-effort", "mission-mastery", "house-bonus", "event-reward"]>;
    referenceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    walletId: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward";
    referenceId?: string | undefined;
}, {
    walletId: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward";
    referenceId?: string | undefined;
}>;
type MoolahEarnedPayload = z.infer<typeof MoolahEarnedPayloadSchema>;
declare const MoolahSpentPayloadSchema: z.ZodObject<{
    walletId: z.ZodString;
    amount: z.ZodNumber;
    itemId: z.ZodString;
    itemType: z.ZodEnum<["cosmetic", "companion-accessory", "house-item"]>;
}, "strip", z.ZodTypeAny, {
    walletId: string;
    amount: number;
    itemId: string;
    itemType: "cosmetic" | "companion-accessory" | "house-item";
}, {
    walletId: string;
    amount: number;
    itemId: string;
    itemType: "cosmetic" | "companion-accessory" | "house-item";
}>;
type MoolahSpentPayload = z.infer<typeof MoolahSpentPayloadSchema>;
declare const XpEarnedPayloadSchema: z.ZodObject<{
    amount: z.ZodNumber;
    reason: z.ZodEnum<["mission-effort", "mission-mastery", "daily-streak", "companion-interaction"]>;
    referenceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}, {
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}>;
type XpEarnedPayload = z.infer<typeof XpEarnedPayloadSchema>;
declare const BadgeAwardedPayloadSchema: z.ZodObject<{
    badgeId: z.ZodString;
    missionAttemptId: z.ZodOptional<z.ZodString>;
    masteryRecordId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    badgeId: string;
    missionAttemptId?: string | undefined;
    masteryRecordId?: string | undefined;
}, {
    badgeId: string;
    missionAttemptId?: string | undefined;
    masteryRecordId?: string | undefined;
}>;
type BadgeAwardedPayload = z.infer<typeof BadgeAwardedPayloadSchema>;
declare const HousePointsEarnedPayloadSchema: z.ZodObject<{
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    points: z.ZodNumber;
    contributingChildProfileId: z.ZodString;
    reason: z.ZodEnum<["mission-mastery", "mission-effort", "event-participation", "companion-growth"]>;
    referenceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}, {
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}>;
type HousePointsEarnedPayload = z.infer<typeof HousePointsEarnedPayloadSchema>;
declare const HouseLeaderboardUpdatedPayloadSchema: z.ZodObject<{
    period: z.ZodEnum<["weekly", "monthly", "all-time"]>;
    rankings: z.ZodArray<z.ZodObject<{
        house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
        totalPoints: z.ZodNumber;
        rank: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    period: "weekly" | "monthly" | "all-time";
    rankings: {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }[];
}, {
    period: "weekly" | "monthly" | "all-time";
    rankings: {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }[];
}>;
type HouseLeaderboardUpdatedPayload = z.infer<typeof HouseLeaderboardUpdatedPayloadSchema>;
declare const CompanionBondIncreasedPayloadSchema: z.ZodObject<{
    companionId: z.ZodString;
    bondIncrease: z.ZodNumber;
    newBondLevel: z.ZodNumber;
    reason: z.ZodEnum<["mission-completed", "daily-interaction", "mastery-milestone"]>;
}, "strip", z.ZodTypeAny, {
    companionId: string;
    reason: "mission-completed" | "daily-interaction" | "mastery-milestone";
    bondIncrease: number;
    newBondLevel: number;
}, {
    companionId: string;
    reason: "mission-completed" | "daily-interaction" | "mastery-milestone";
    bondIncrease: number;
    newBondLevel: number;
}>;
type CompanionBondIncreasedPayload = z.infer<typeof CompanionBondIncreasedPayloadSchema>;
declare const CompanionMilestoneReachedPayloadSchema: z.ZodObject<{
    companionId: z.ZodString;
    milestoneId: z.ZodString;
    newFormId: z.ZodOptional<z.ZodString>;
    masteryRequired: z.ZodBoolean;
    masteryRecordId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companionId: string;
    milestoneId: string;
    masteryRequired: boolean;
    masteryRecordId?: string | undefined;
    newFormId?: string | undefined;
}, {
    companionId: string;
    milestoneId: string;
    masteryRequired: boolean;
    masteryRecordId?: string | undefined;
    newFormId?: string | undefined;
}>;
type CompanionMilestoneReachedPayload = z.infer<typeof CompanionMilestoneReachedPayloadSchema>;
declare const AcademyUnlockTriggeredPayloadSchema: z.ZodObject<{
    unlockId: z.ZodString;
    unlockType: z.ZodEnum<["room-decoration", "npc-activation", "grove-bloom", "market-item", "ai-lab-repair", "outdoor-grounds-change"]>;
    triggerReason: z.ZodString;
    affectedRoomId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unlockId: string;
    unlockType: "room-decoration" | "npc-activation" | "grove-bloom" | "market-item" | "ai-lab-repair" | "outdoor-grounds-change";
    triggerReason: string;
    affectedRoomId?: string | undefined;
}, {
    unlockId: string;
    unlockType: "room-decoration" | "npc-activation" | "grove-bloom" | "market-item" | "ai-lab-repair" | "outdoor-grounds-change";
    triggerReason: string;
    affectedRoomId?: string | undefined;
}>;
type AcademyUnlockTriggeredPayload = z.infer<typeof AcademyUnlockTriggeredPayloadSchema>;
declare const AcademySeasonalEventPayloadSchema: z.ZodObject<{
    seasonalEventId: z.ZodString;
    eventName: z.ZodString;
    affectedRoomIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    seasonalEventId: string;
    eventName: string;
    affectedRoomIds: string[];
}, {
    seasonalEventId: string;
    eventName: string;
    affectedRoomIds: string[];
}>;
type AcademySeasonalEventPayload = z.infer<typeof AcademySeasonalEventPayloadSchema>;
declare const WorldRepairCompletedPayloadSchema: z.ZodObject<{
    repairTargetId: z.ZodString;
    roomId: z.ZodString;
    triggeredByMissionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    repairTargetId: string;
    triggeredByMissionId?: string | undefined;
}, {
    roomId: string;
    repairTargetId: string;
    triggeredByMissionId?: string | undefined;
}>;
type WorldRepairCompletedPayload = z.infer<typeof WorldRepairCompletedPayloadSchema>;
declare const WorldDecorationPlacedPayloadSchema: z.ZodObject<{
    decorationId: z.ZodString;
    roomId: z.ZodString;
    placedByChildProfileId: z.ZodOptional<z.ZodString>;
    houseSource: z.ZodOptional<z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    decorationId: string;
    placedByChildProfileId?: string | undefined;
    houseSource?: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex" | undefined;
}, {
    roomId: string;
    decorationId: string;
    placedByChildProfileId?: string | undefined;
    houseSource?: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex" | undefined;
}>;
type WorldDecorationPlacedPayload = z.infer<typeof WorldDecorationPlacedPayloadSchema>;
declare const WORLD_EVENT_PAYLOAD_SCHEMAS: {
    readonly "room.joined": z.ZodObject<{
        roomId: z.ZodString;
        academyIdentityId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        academyIdentityId: string;
        roomId: string;
    }, {
        academyIdentityId: string;
        roomId: string;
    }>;
    readonly "room.left": z.ZodObject<{
        roomId: z.ZodString;
        academyIdentityId: z.ZodString;
        durationSeconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        academyIdentityId: string;
        roomId: string;
        durationSeconds: number;
    }, {
        academyIdentityId: string;
        roomId: string;
        durationSeconds: number;
    }>;
    readonly "avatar.moved": z.ZodObject<{
        academyIdentityId: z.ZodString;
        roomId: z.ZodString;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        academyIdentityId: string;
        roomId: string;
        position: {
            x: number;
            y: number;
            z: number;
        };
    }, {
        academyIdentityId: string;
        roomId: string;
        position: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    readonly "mission.started": z.ZodObject<{
        missionId: z.ZodString;
        missionAttemptId: z.ZodString;
        deliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
    }, "strip", z.ZodTypeAny, {
        missionId: string;
        deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        missionAttemptId: string;
    }, {
        missionId: string;
        deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        missionAttemptId: string;
    }>;
    readonly "mission.step-completed": z.ZodObject<{
        missionAttemptId: z.ZodString;
        stepId: z.ZodString;
        evidenceCaptured: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        missionAttemptId: string;
        evidenceCaptured: boolean;
    }, {
        stepId: string;
        missionAttemptId: string;
        evidenceCaptured: boolean;
    }>;
    readonly "mission.completed": z.ZodObject<{
        missionId: z.ZodString;
        missionAttemptId: z.ZodString;
        deliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
        masteryAchieved: z.ZodBoolean;
        masteryEvidenceScore: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        missionId: string;
        deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        masteryEvidenceScore: number;
        masteryAchieved: boolean;
        missionAttemptId: string;
    }, {
        missionId: string;
        deliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
        masteryEvidenceScore: number;
        masteryAchieved: boolean;
        missionAttemptId: string;
    }>;
    readonly "mission.abandoned": z.ZodObject<{
        missionAttemptId: z.ZodString;
        lastStepId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        missionAttemptId: string;
        lastStepId?: string | undefined;
    }, {
        missionAttemptId: string;
        lastStepId?: string | undefined;
    }>;
    readonly "moolah.earned": z.ZodObject<{
        walletId: z.ZodString;
        amount: z.ZodNumber;
        reason: z.ZodEnum<["mission-effort", "mission-mastery", "house-bonus", "event-reward"]>;
        referenceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        walletId: string;
        amount: number;
        reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward";
        referenceId?: string | undefined;
    }, {
        walletId: string;
        amount: number;
        reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward";
        referenceId?: string | undefined;
    }>;
    readonly "moolah.spent": z.ZodObject<{
        walletId: z.ZodString;
        amount: z.ZodNumber;
        itemId: z.ZodString;
        itemType: z.ZodEnum<["cosmetic", "companion-accessory", "house-item"]>;
    }, "strip", z.ZodTypeAny, {
        walletId: string;
        amount: number;
        itemId: string;
        itemType: "cosmetic" | "companion-accessory" | "house-item";
    }, {
        walletId: string;
        amount: number;
        itemId: string;
        itemType: "cosmetic" | "companion-accessory" | "house-item";
    }>;
    readonly "xp.earned": z.ZodObject<{
        amount: z.ZodNumber;
        reason: z.ZodEnum<["mission-effort", "mission-mastery", "daily-streak", "companion-interaction"]>;
        referenceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
        referenceId?: string | undefined;
    }, {
        amount: number;
        reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
        referenceId?: string | undefined;
    }>;
    readonly "badge.awarded": z.ZodObject<{
        badgeId: z.ZodString;
        missionAttemptId: z.ZodOptional<z.ZodString>;
        masteryRecordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        badgeId: string;
        missionAttemptId?: string | undefined;
        masteryRecordId?: string | undefined;
    }, {
        badgeId: string;
        missionAttemptId?: string | undefined;
        masteryRecordId?: string | undefined;
    }>;
    readonly "house.points-earned": z.ZodObject<{
        house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
        points: z.ZodNumber;
        contributingChildProfileId: z.ZodString;
        reason: z.ZodEnum<["mission-mastery", "mission-effort", "event-participation", "companion-growth"]>;
        referenceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
        points: number;
        contributingChildProfileId: string;
        referenceId?: string | undefined;
    }, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
        points: number;
        contributingChildProfileId: string;
        referenceId?: string | undefined;
    }>;
    readonly "house.leaderboard-updated": z.ZodObject<{
        period: z.ZodEnum<["weekly", "monthly", "all-time"]>;
        rankings: z.ZodArray<z.ZodObject<{
            house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
            totalPoints: z.ZodNumber;
            rank: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
            totalPoints: number;
            rank: number;
        }, {
            house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
            totalPoints: number;
            rank: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        period: "weekly" | "monthly" | "all-time";
        rankings: {
            house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
            totalPoints: number;
            rank: number;
        }[];
    }, {
        period: "weekly" | "monthly" | "all-time";
        rankings: {
            house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
            totalPoints: number;
            rank: number;
        }[];
    }>;
    readonly "companion.bond-increased": z.ZodObject<{
        companionId: z.ZodString;
        bondIncrease: z.ZodNumber;
        newBondLevel: z.ZodNumber;
        reason: z.ZodEnum<["mission-completed", "daily-interaction", "mastery-milestone"]>;
    }, "strip", z.ZodTypeAny, {
        companionId: string;
        reason: "mission-completed" | "daily-interaction" | "mastery-milestone";
        bondIncrease: number;
        newBondLevel: number;
    }, {
        companionId: string;
        reason: "mission-completed" | "daily-interaction" | "mastery-milestone";
        bondIncrease: number;
        newBondLevel: number;
    }>;
    readonly "companion.milestone-reached": z.ZodObject<{
        companionId: z.ZodString;
        milestoneId: z.ZodString;
        newFormId: z.ZodOptional<z.ZodString>;
        masteryRequired: z.ZodBoolean;
        masteryRecordId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        companionId: string;
        milestoneId: string;
        masteryRequired: boolean;
        masteryRecordId?: string | undefined;
        newFormId?: string | undefined;
    }, {
        companionId: string;
        milestoneId: string;
        masteryRequired: boolean;
        masteryRecordId?: string | undefined;
        newFormId?: string | undefined;
    }>;
    readonly "academy.unlock-triggered": z.ZodObject<{
        unlockId: z.ZodString;
        unlockType: z.ZodEnum<["room-decoration", "npc-activation", "grove-bloom", "market-item", "ai-lab-repair", "outdoor-grounds-change"]>;
        triggerReason: z.ZodString;
        affectedRoomId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        unlockId: string;
        unlockType: "room-decoration" | "npc-activation" | "grove-bloom" | "market-item" | "ai-lab-repair" | "outdoor-grounds-change";
        triggerReason: string;
        affectedRoomId?: string | undefined;
    }, {
        unlockId: string;
        unlockType: "room-decoration" | "npc-activation" | "grove-bloom" | "market-item" | "ai-lab-repair" | "outdoor-grounds-change";
        triggerReason: string;
        affectedRoomId?: string | undefined;
    }>;
    readonly "academy.seasonal-event-started": z.ZodObject<{
        seasonalEventId: z.ZodString;
        eventName: z.ZodString;
        affectedRoomIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        seasonalEventId: string;
        eventName: string;
        affectedRoomIds: string[];
    }, {
        seasonalEventId: string;
        eventName: string;
        affectedRoomIds: string[];
    }>;
    readonly "academy.seasonal-event-ended": z.ZodObject<{
        seasonalEventId: z.ZodString;
        eventName: z.ZodString;
        affectedRoomIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        seasonalEventId: string;
        eventName: string;
        affectedRoomIds: string[];
    }, {
        seasonalEventId: string;
        eventName: string;
        affectedRoomIds: string[];
    }>;
    readonly "world.repair-completed": z.ZodObject<{
        repairTargetId: z.ZodString;
        roomId: z.ZodString;
        triggeredByMissionId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        roomId: string;
        repairTargetId: string;
        triggeredByMissionId?: string | undefined;
    }, {
        roomId: string;
        repairTargetId: string;
        triggeredByMissionId?: string | undefined;
    }>;
    readonly "world.decoration-placed": z.ZodObject<{
        decorationId: z.ZodString;
        roomId: z.ZodString;
        placedByChildProfileId: z.ZodOptional<z.ZodString>;
        houseSource: z.ZodOptional<z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>>;
    }, "strip", z.ZodTypeAny, {
        roomId: string;
        decorationId: string;
        placedByChildProfileId?: string | undefined;
        houseSource?: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex" | undefined;
    }, {
        roomId: string;
        decorationId: string;
        placedByChildProfileId?: string | undefined;
        houseSource?: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex" | undefined;
    }>;
};

/**
 * Evidence Contract
 *
 * Covers structured learning events, artifacts, mastery records, and
 * portfolio items that together form the academic proof chain.
 *
 * Grounded in: ADR-026 (evidence capture), ADR-010 (academic progress),
 * ADR-029 (model improvement opt-out), MASTER_HANDOFF §9.2 (hard privacy rules),
 * architecture.md §8 (Evidence/Reports domain).
 *
 * Privacy invariants in this contract (enforced as z.literal(true)):
 *   - noWebcam: no webcam content is ever captured
 *   - noFaceCapture: no face capture or facial recognition data
 *   - noVoiceBiometrics: push-to-talk audio is never processed for voice ID
 *     or emotion detection
 */

declare const EvidenceCaptureTypeSchema: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "audio-response", "structured-replay", "screenshot"]>;
type EvidenceCaptureType = z.infer<typeof EvidenceCaptureTypeSchema>;
declare const LearningEvidenceEventSchema: z.ZodObject<{
    id: z.ZodString;
    missionAttemptId: z.ZodString;
    childProfileId: z.ZodString;
    childSessionId: z.ZodString;
    captureType: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "artifact-upload", "audio-response", "structured-replay", "screenshot"]>;
    stepId: z.ZodString;
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    capturedAt: z.ZodString;
    retentionUntil: z.ZodString;
    parentVisible: z.ZodBoolean;
    portfolioEligible: z.ZodBoolean;
    noWebcam: z.ZodLiteral<true>;
    noFaceCapture: z.ZodLiteral<true>;
    noVoiceBiometrics: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    stepId: string;
    captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay" | "audio-response" | "screenshot";
    parentVisible: boolean;
    portfolioEligible: boolean;
    noWebcam: true;
    noFaceCapture: true;
    childSessionId: string;
    missionAttemptId: string;
    content: Record<string, unknown>;
    capturedAt: string;
    retentionUntil: string;
    noVoiceBiometrics: true;
}, {
    id: string;
    childProfileId: string;
    stepId: string;
    captureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "artifact-upload" | "structured-replay" | "audio-response" | "screenshot";
    parentVisible: boolean;
    portfolioEligible: boolean;
    noWebcam: true;
    noFaceCapture: true;
    childSessionId: string;
    missionAttemptId: string;
    content: Record<string, unknown>;
    capturedAt: string;
    retentionUntil: string;
    noVoiceBiometrics: true;
}>;
type LearningEvidenceEvent = z.infer<typeof LearningEvidenceEventSchema>;
declare const MissionReplayEventSchema: z.ZodObject<{
    id: z.ZodString;
    missionAttemptId: z.ZodString;
    childProfileId: z.ZodString;
    interactionSequence: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        action: z.ZodString;
        outcome: z.ZodString;
        timestampOffset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        action: string;
        outcome: string;
        timestampOffset: number;
    }, {
        stepId: string;
        action: string;
        outcome: string;
        timestampOffset: number;
    }>, "many">;
    totalDurationMs: z.ZodNumber;
    capturedAt: z.ZodString;
    retentionUntil: z.ZodString;
    parentVisible: z.ZodBoolean;
    noWebcam: z.ZodLiteral<true>;
    noFaceCapture: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    parentVisible: boolean;
    noWebcam: true;
    noFaceCapture: true;
    missionAttemptId: string;
    capturedAt: string;
    retentionUntil: string;
    interactionSequence: {
        stepId: string;
        action: string;
        outcome: string;
        timestampOffset: number;
    }[];
    totalDurationMs: number;
}, {
    id: string;
    childProfileId: string;
    parentVisible: boolean;
    noWebcam: true;
    noFaceCapture: true;
    missionAttemptId: string;
    capturedAt: string;
    retentionUntil: string;
    interactionSequence: {
        stepId: string;
        action: string;
        outcome: string;
        timestampOffset: number;
    }[];
    totalDurationMs: number;
}>;
type MissionReplayEvent = z.infer<typeof MissionReplayEventSchema>;
declare const ArtifactTypeSchema: z.ZodEnum<["written-work", "drawing", "audio-recording", "structured-output"]>;
type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
declare const ArtifactSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    missionAttemptId: z.ZodString;
    artifactType: z.ZodEnum<["written-work", "drawing", "audio-recording", "structured-output"]>;
    storageRef: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    parentApproved: z.ZodBoolean;
    parentApprovedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    retentionUntil: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    childProfileId: string;
    missionAttemptId: string;
    retentionUntil: string;
    artifactType: "written-work" | "drawing" | "audio-recording" | "structured-output";
    storageRef: string;
    parentApproved: boolean;
    title?: string | undefined;
    parentApprovedAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    childProfileId: string;
    missionAttemptId: string;
    retentionUntil: string;
    artifactType: "written-work" | "drawing" | "audio-recording" | "structured-output";
    storageRef: string;
    parentApproved: boolean;
    title?: string | undefined;
    parentApprovedAt?: string | undefined;
}>;
type Artifact = z.infer<typeof ArtifactSchema>;

declare const MasteryRecordSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    masterySkillId: z.ZodString;
    masteryDomainId: z.ZodString;
    floridaStandardCode: z.ZodOptional<z.ZodString>;
    level: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
    evidenceEventIds: z.ZodArray<z.ZodString, "many">;
    achievedAt: z.ZodString;
    lastVerifiedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    masterySkillId: string;
    masteryDomainId: string;
    level: "emerging" | "developing" | "proficient" | "advanced";
    evidenceEventIds: string[];
    achievedAt: string;
    lastVerifiedAt: string;
    floridaStandardCode?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    masterySkillId: string;
    masteryDomainId: string;
    level: "emerging" | "developing" | "proficient" | "advanced";
    evidenceEventIds: string[];
    achievedAt: string;
    lastVerifiedAt: string;
    floridaStandardCode?: string | undefined;
}>;
type MasteryRecord = z.infer<typeof MasteryRecordSchema>;
declare const PortfolioItemSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    evidenceEventId: z.ZodOptional<z.ZodString>;
    artifactId: z.ZodOptional<z.ZodString>;
    masteryRecordId: z.ZodOptional<z.ZodString>;
    highlightNote: z.ZodOptional<z.ZodString>;
    includedAt: z.ZodString;
    parentConsentedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    includedAt: string;
    parentConsentedAt: string;
    masteryRecordId?: string | undefined;
    evidenceEventId?: string | undefined;
    artifactId?: string | undefined;
    highlightNote?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    includedAt: string;
    parentConsentedAt: string;
    masteryRecordId?: string | undefined;
    evidenceEventId?: string | undefined;
    artifactId?: string | undefined;
    highlightNote?: string | undefined;
}>;
type PortfolioItem = z.infer<typeof PortfolioItemSchema>;

/**
 * Rewards Contract
 *
 * Covers the Moolah economy, XP, companion growth, badges, and House points.
 *
 * Key rule (ADR-011): reward economy is split into two distinct tracks:
 *   - Effort rewards (Moolah, XP, companion bond): unconditional on mission completion
 *   - Mastery rewards (major progression, form evolutions, rare items): gated on
 *     mastery evidence — students cannot grind their way through academic gateposts
 *
 * Grounded in: ADR-011 (reward economy), ADR-019 (living academy model),
 * MASTER_HANDOFF §8.2 (Living Academy Engine), architecture.md §8.
 */

declare const MoolahWalletSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    balance: z.ZodNumber;
    lifetimeEarned: z.ZodOptional<z.ZodNumber>;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    updatedAt: string;
    childProfileId: string;
    balance: number;
    lifetimeEarned?: number | undefined;
}, {
    id: string;
    updatedAt: string;
    childProfileId: string;
    balance: number;
    lifetimeEarned?: number | undefined;
}>;
type MoolahWallet = z.infer<typeof MoolahWalletSchema>;
declare const MoolahReasonSchema: z.ZodEnum<["mission-effort", "mission-mastery", "house-bonus", "event-reward", "purchase", "admin-adjustment"]>;
type MoolahReason = z.infer<typeof MoolahReasonSchema>;
declare const MoolahLedgerEntrySchema: z.ZodObject<{
    id: z.ZodString;
    walletId: z.ZodString;
    childProfileId: z.ZodString;
    delta: z.ZodNumber;
    reason: z.ZodEnum<["mission-effort", "mission-mastery", "house-bonus", "event-reward", "purchase", "admin-adjustment"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    walletId: string;
    reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward" | "purchase" | "admin-adjustment";
    delta: number;
    referenceId?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    walletId: string;
    reason: "mission-effort" | "mission-mastery" | "house-bonus" | "event-reward" | "purchase" | "admin-adjustment";
    delta: number;
    referenceId?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
type MoolahLedgerEntry = z.infer<typeof MoolahLedgerEntrySchema>;
declare const XpEventSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    amount: z.ZodNumber;
    reason: z.ZodEnum<["mission-effort", "mission-mastery", "daily-streak", "companion-interaction"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}>;
type XpEvent = z.infer<typeof XpEventSchema>;
declare const CompanionGrowthTypeSchema: z.ZodEnum<["bond-increase", "form-evolution", "milestone"]>;
type CompanionGrowthType = z.infer<typeof CompanionGrowthTypeSchema>;
declare const CompanionGrowthEventSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    companionId: z.ZodString;
    growthType: z.ZodEnum<["bond-increase", "form-evolution", "milestone"]>;
    previousBondLevel: z.ZodNumber;
    newBondLevel: z.ZodNumber;
    newFormId: z.ZodOptional<z.ZodString>;
    masteryRequired: z.ZodBoolean;
    masteryRecordId: z.ZodOptional<z.ZodString>;
    triggerMissionAttemptId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    companionId: string;
    occurredAt: string;
    newBondLevel: number;
    masteryRequired: boolean;
    growthType: "bond-increase" | "form-evolution" | "milestone";
    previousBondLevel: number;
    masteryRecordId?: string | undefined;
    newFormId?: string | undefined;
    triggerMissionAttemptId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    companionId: string;
    occurredAt: string;
    newBondLevel: number;
    masteryRequired: boolean;
    growthType: "bond-increase" | "form-evolution" | "milestone";
    previousBondLevel: number;
    masteryRecordId?: string | undefined;
    newFormId?: string | undefined;
    triggerMissionAttemptId?: string | undefined;
}>;
type CompanionGrowthEvent = z.infer<typeof CompanionGrowthEventSchema>;
declare const BadgeCategorySchema: z.ZodEnum<["mastery", "effort", "house", "ai-literacy", "exploration", "companion"]>;
type BadgeCategory = z.infer<typeof BadgeCategorySchema>;
declare const BadgeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    iconAssetId: z.ZodString;
    category: z.ZodEnum<["mastery", "effort", "house", "ai-literacy", "exploration", "companion"]>;
    masteryGated: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    masteryGated: boolean;
    iconAssetId: string;
    category: "house" | "mastery" | "effort" | "ai-literacy" | "exploration" | "companion";
}, {
    id: string;
    name: string;
    description: string;
    masteryGated: boolean;
    iconAssetId: string;
    category: "house" | "mastery" | "effort" | "ai-literacy" | "exploration" | "companion";
}>;
type Badge = z.infer<typeof BadgeSchema>;
declare const BadgeAwardSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    badgeId: z.ZodString;
    awardedAt: z.ZodString;
    missionAttemptId: z.ZodOptional<z.ZodString>;
    masteryRecordId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    badgeId: string;
    awardedAt: string;
    missionAttemptId?: string | undefined;
    masteryRecordId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    badgeId: string;
    awardedAt: string;
    missionAttemptId?: string | undefined;
    masteryRecordId?: string | undefined;
}>;
type BadgeAward = z.infer<typeof BadgeAwardSchema>;
declare const HousePointsReasonSchema: z.ZodEnum<["mission-mastery", "mission-effort", "event-participation", "companion-growth"]>;
type HousePointsReason = z.infer<typeof HousePointsReasonSchema>;
declare const HousePointsRecordSchema: z.ZodObject<{
    id: z.ZodString;
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    points: z.ZodNumber;
    contributingChildProfileId: z.ZodString;
    reason: z.ZodEnum<["mission-mastery", "mission-effort", "event-participation", "companion-growth"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    occurredAt: string;
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}, {
    id: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    occurredAt: string;
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}>;
type HousePointsRecord = z.infer<typeof HousePointsRecordSchema>;
declare const ChildBadgeSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    badgeId: z.ZodString;
    awardedAt: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    badgeId: string;
    awardedAt: string;
    sourceId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    badgeId: string;
    awardedAt: string;
    sourceId?: string | undefined;
}>;
type ChildBadge = z.infer<typeof ChildBadgeSchema>;
declare const XPEventSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    amount: z.ZodNumber;
    reason: z.ZodEnum<["mission-effort", "mission-mastery", "daily-streak", "companion-interaction"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    occurredAt: string;
    amount: number;
    reason: "mission-effort" | "mission-mastery" | "daily-streak" | "companion-interaction";
    referenceId?: string | undefined;
}>;
type XPEvent = XpEvent;
declare const HousePointEventSchema: z.ZodObject<{
    id: z.ZodString;
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    points: z.ZodNumber;
    contributingChildProfileId: z.ZodString;
    reason: z.ZodEnum<["mission-mastery", "mission-effort", "event-participation", "companion-growth"]>;
    referenceId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    occurredAt: string;
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}, {
    id: string;
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    occurredAt: string;
    reason: "mission-effort" | "mission-mastery" | "event-participation" | "companion-growth";
    points: number;
    contributingChildProfileId: string;
    referenceId?: string | undefined;
}>;
type HousePointEvent = HousePointsRecord;
declare const HouseLeaderboardPeriodSchema: z.ZodEnum<["weekly", "monthly", "all-time"]>;
type HouseLeaderboardPeriod = z.infer<typeof HouseLeaderboardPeriodSchema>;
declare const HouseRankingSchema: z.ZodObject<{
    house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
    totalPoints: z.ZodNumber;
    rank: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    totalPoints: number;
    rank: number;
}, {
    house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
    totalPoints: number;
    rank: number;
}>;
type HouseRanking = z.infer<typeof HouseRankingSchema>;
declare const HouseLeaderboardSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    period: z.ZodEnum<["weekly", "monthly", "all-time"]>;
    rankings: z.ZodArray<z.ZodObject<{
        house: z.ZodEnum<["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]>;
        totalPoints: z.ZodNumber;
        rank: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }, {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }>, "many">;
    recordedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    period: "weekly" | "monthly" | "all-time";
    rankings: {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }[];
    recordedAt: string;
}, {
    id: string;
    period: "weekly" | "monthly" | "all-time";
    rankings: {
        house: "pre_sorting" | "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
        totalPoints: number;
        rank: number;
    }[];
    recordedAt: string;
}>;
type HouseLeaderboardSnapshot = z.infer<typeof HouseLeaderboardSnapshotSchema>;

/**
 * Parent Report Contract
 *
 * Covers parent-facing report types, including the Unified First Learning Map
 * (Mission 001 output), learner calibration scores, evidence highlights,
 * mastery progress summaries, and game progress summaries.
 *
 * Key rule (MASTER_HANDOFF §8, ADR-011): game progress and academic mastery
 * are related but not identical. Reports expose both — separately.
 *
 * Key rule (MASTER_HANDOFF §7.1): L3ARN does not claim to fully know a child
 * on day one. Calibration scores carry explicit confidence levels.
 *
 * Privacy invariants (MASTER_HANDOFF §9.2):
 *   - noWebcamContent: no report contains webcam-sourced content
 *   - noFaceCaptureContent: no report contains face capture or biometric data
 *
 * Grounded in: MASTER_HANDOFF §5.1 (Mission 001), §7 (Learner Model),
 * ADR-008 (parent visibility), ADR-010 (academic progress), ADR-011 (rewards),
 * ADR-026 (evidence capture), ADR-029 (opt-out), architecture.md §8.
 */

declare const CalibrationStageSchema: z.ZodEnum<["parent-onboarding", "sorting-ceremony", "mission-001", "first-7-14-days"]>;
type CalibrationStage = z.infer<typeof CalibrationStageSchema>;
declare const LearnerCalibrationScoreSchema: z.ZodObject<{
    score: z.ZodNumber;
    stage: z.ZodEnum<["parent-onboarding", "sorting-ceremony", "mission-001", "first-7-14-days"]>;
    confidence: z.ZodNumber;
    signalsContributing: z.ZodArray<z.ZodString, "many">;
    computedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    score: number;
    stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
    confidence: number;
    signalsContributing: string[];
    computedAt: string;
}, {
    score: number;
    stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
    confidence: number;
    signalsContributing: string[];
    computedAt: string;
}>;
type LearnerCalibrationScore = z.infer<typeof LearnerCalibrationScoreSchema>;
declare const EvidenceHighlightTypeSchema: z.ZodEnum<["mastery-moment", "persistence", "ai-readiness", "creative-expression", "help-seeking", "sequence-completion"]>;
type EvidenceHighlightType = z.infer<typeof EvidenceHighlightTypeSchema>;
declare const EvidenceHighlightSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["mastery-moment", "persistence", "ai-readiness", "creative-expression", "help-seeking", "sequence-completion"]>;
    description: z.ZodString;
    evidenceEventId: z.ZodOptional<z.ZodString>;
    artifactId: z.ZodOptional<z.ZodString>;
    portfolioItemId: z.ZodOptional<z.ZodString>;
    parentConsentedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
    id: string;
    description: string;
    parentConsentedAt: string;
    evidenceEventId?: string | undefined;
    artifactId?: string | undefined;
    portfolioItemId?: string | undefined;
}, {
    type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
    id: string;
    description: string;
    parentConsentedAt: string;
    evidenceEventId?: string | undefined;
    artifactId?: string | undefined;
    portfolioItemId?: string | undefined;
}>;
type EvidenceHighlight = z.infer<typeof EvidenceHighlightSchema>;
declare const MasteryProgressLevelSchema: z.ZodEnum<["not-started", "emerging", "developing", "proficient", "advanced"]>;
type MasteryProgressLevel = z.infer<typeof MasteryProgressLevelSchema>;
declare const MasteryProgressSummarySchema: z.ZodObject<{
    masterySkillId: z.ZodString;
    masteryDomainId: z.ZodString;
    skillName: z.ZodString;
    currentLevel: z.ZodEnum<["not-started", "emerging", "developing", "proficient", "advanced"]>;
    evidenceCount: z.ZodNumber;
    lastActivityAt: z.ZodOptional<z.ZodString>;
    floridaStandardCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    masterySkillId: string;
    masteryDomainId: string;
    skillName: string;
    currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
    evidenceCount: number;
    lastActivityAt?: string | undefined;
    floridaStandardCodes?: string[] | undefined;
}, {
    masterySkillId: string;
    masteryDomainId: string;
    skillName: string;
    currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
    evidenceCount: number;
    lastActivityAt?: string | undefined;
    floridaStandardCodes?: string[] | undefined;
}>;
type MasteryProgressSummary = z.infer<typeof MasteryProgressSummarySchema>;
declare const GameProgressSummarySchema: z.ZodObject<{
    house: z.ZodString;
    companionName: z.ZodString;
    companionBondLevel: z.ZodNumber;
    moolahBalance: z.ZodNumber;
    totalXp: z.ZodNumber;
    badgesEarned: z.ZodArray<z.ZodString, "many">;
    missionsCompleted: z.ZodNumber;
    missionsAttempted: z.ZodNumber;
    academyUnlocksContributed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    house: string;
    companionName: string;
    companionBondLevel: number;
    moolahBalance: number;
    totalXp: number;
    badgesEarned: string[];
    missionsCompleted: number;
    missionsAttempted: number;
    academyUnlocksContributed: number;
}, {
    house: string;
    companionName: string;
    companionBondLevel: number;
    moolahBalance: number;
    totalXp: number;
    badgesEarned: string[];
    missionsCompleted: number;
    missionsAttempted: number;
    academyUnlocksContributed: number;
}>;
type GameProgressSummary = z.infer<typeof GameProgressSummarySchema>;
declare const NextMissionRecommendationSchema: z.ZodObject<{
    summary: z.ZodString;
    rationale: z.ZodString;
    targetMasterySkillId: z.ZodString;
    targetMasteryDomainId: z.ZodString;
    suggestedDeliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    rationale: string;
    targetMasterySkillId: string;
    targetMasteryDomainId: string;
    suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
}, {
    summary: string;
    rationale: string;
    targetMasterySkillId: string;
    targetMasteryDomainId: string;
    suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
}>;
type NextMissionRecommendation = z.infer<typeof NextMissionRecommendationSchema>;
declare const ParentReportTypeSchema: z.ZodEnum<["unified-first-learning-map", "weekly-summary", "mission-completion", "portfolio"]>;
type ParentReportType = z.infer<typeof ParentReportTypeSchema>;
declare const ParentReportSchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    reportType: z.ZodEnum<["unified-first-learning-map", "weekly-summary", "mission-completion", "portfolio"]>;
    generatedAt: z.ZodString;
    masteryProgress: z.ZodArray<z.ZodObject<{
        masterySkillId: z.ZodString;
        masteryDomainId: z.ZodString;
        skillName: z.ZodString;
        currentLevel: z.ZodEnum<["not-started", "emerging", "developing", "proficient", "advanced"]>;
        evidenceCount: z.ZodNumber;
        lastActivityAt: z.ZodOptional<z.ZodString>;
        floridaStandardCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        masterySkillId: string;
        masteryDomainId: string;
        skillName: string;
        currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
        evidenceCount: number;
        lastActivityAt?: string | undefined;
        floridaStandardCodes?: string[] | undefined;
    }, {
        masterySkillId: string;
        masteryDomainId: string;
        skillName: string;
        currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
        evidenceCount: number;
        lastActivityAt?: string | undefined;
        floridaStandardCodes?: string[] | undefined;
    }>, "many">;
    calibrationScore: z.ZodOptional<z.ZodObject<{
        score: z.ZodNumber;
        stage: z.ZodEnum<["parent-onboarding", "sorting-ceremony", "mission-001", "first-7-14-days"]>;
        confidence: z.ZodNumber;
        signalsContributing: z.ZodArray<z.ZodString, "many">;
        computedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        score: number;
        stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
        confidence: number;
        signalsContributing: string[];
        computedAt: string;
    }, {
        score: number;
        stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
        confidence: number;
        signalsContributing: string[];
        computedAt: string;
    }>>;
    evidenceHighlights: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["mastery-moment", "persistence", "ai-readiness", "creative-expression", "help-seeking", "sequence-completion"]>;
        description: z.ZodString;
        evidenceEventId: z.ZodOptional<z.ZodString>;
        artifactId: z.ZodOptional<z.ZodString>;
        portfolioItemId: z.ZodOptional<z.ZodString>;
        parentConsentedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
        id: string;
        description: string;
        parentConsentedAt: string;
        evidenceEventId?: string | undefined;
        artifactId?: string | undefined;
        portfolioItemId?: string | undefined;
    }, {
        type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
        id: string;
        description: string;
        parentConsentedAt: string;
        evidenceEventId?: string | undefined;
        artifactId?: string | undefined;
        portfolioItemId?: string | undefined;
    }>, "many">;
    gameProgress: z.ZodOptional<z.ZodObject<{
        house: z.ZodString;
        companionName: z.ZodString;
        companionBondLevel: z.ZodNumber;
        moolahBalance: z.ZodNumber;
        totalXp: z.ZodNumber;
        badgesEarned: z.ZodArray<z.ZodString, "many">;
        missionsCompleted: z.ZodNumber;
        missionsAttempted: z.ZodNumber;
        academyUnlocksContributed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        house: string;
        companionName: string;
        companionBondLevel: number;
        moolahBalance: number;
        totalXp: number;
        badgesEarned: string[];
        missionsCompleted: number;
        missionsAttempted: number;
        academyUnlocksContributed: number;
    }, {
        house: string;
        companionName: string;
        companionBondLevel: number;
        moolahBalance: number;
        totalXp: number;
        badgesEarned: string[];
        missionsCompleted: number;
        missionsAttempted: number;
        academyUnlocksContributed: number;
    }>>;
    nextMissionRecommendation: z.ZodOptional<z.ZodObject<{
        summary: z.ZodString;
        rationale: z.ZodString;
        targetMasterySkillId: z.ZodString;
        targetMasteryDomainId: z.ZodString;
        suggestedDeliveryMode: z.ZodEnum<["3d", "interactive-lite", "text-audio-offline"]>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        rationale: string;
        targetMasterySkillId: string;
        targetMasteryDomainId: string;
        suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    }, {
        summary: string;
        rationale: string;
        targetMasterySkillId: string;
        targetMasteryDomainId: string;
        suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    }>>;
    noWebcamContent: z.ZodLiteral<true>;
    noFaceCaptureContent: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    reportType: "unified-first-learning-map" | "weekly-summary" | "mission-completion" | "portfolio";
    generatedAt: string;
    masteryProgress: {
        masterySkillId: string;
        masteryDomainId: string;
        skillName: string;
        currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
        evidenceCount: number;
        lastActivityAt?: string | undefined;
        floridaStandardCodes?: string[] | undefined;
    }[];
    evidenceHighlights: {
        type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
        id: string;
        description: string;
        parentConsentedAt: string;
        evidenceEventId?: string | undefined;
        artifactId?: string | undefined;
        portfolioItemId?: string | undefined;
    }[];
    noWebcamContent: true;
    noFaceCaptureContent: true;
    calibrationScore?: {
        score: number;
        stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
        confidence: number;
        signalsContributing: string[];
        computedAt: string;
    } | undefined;
    gameProgress?: {
        house: string;
        companionName: string;
        companionBondLevel: number;
        moolahBalance: number;
        totalXp: number;
        badgesEarned: string[];
        missionsCompleted: number;
        missionsAttempted: number;
        academyUnlocksContributed: number;
    } | undefined;
    nextMissionRecommendation?: {
        summary: string;
        rationale: string;
        targetMasterySkillId: string;
        targetMasteryDomainId: string;
        suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    } | undefined;
}, {
    id: string;
    childProfileId: string;
    reportType: "unified-first-learning-map" | "weekly-summary" | "mission-completion" | "portfolio";
    generatedAt: string;
    masteryProgress: {
        masterySkillId: string;
        masteryDomainId: string;
        skillName: string;
        currentLevel: "emerging" | "developing" | "proficient" | "advanced" | "not-started";
        evidenceCount: number;
        lastActivityAt?: string | undefined;
        floridaStandardCodes?: string[] | undefined;
    }[];
    evidenceHighlights: {
        type: "sequence-completion" | "mastery-moment" | "persistence" | "ai-readiness" | "creative-expression" | "help-seeking";
        id: string;
        description: string;
        parentConsentedAt: string;
        evidenceEventId?: string | undefined;
        artifactId?: string | undefined;
        portfolioItemId?: string | undefined;
    }[];
    noWebcamContent: true;
    noFaceCaptureContent: true;
    calibrationScore?: {
        score: number;
        stage: "parent-onboarding" | "sorting-ceremony" | "mission-001" | "first-7-14-days";
        confidence: number;
        signalsContributing: string[];
        computedAt: string;
    } | undefined;
    gameProgress?: {
        house: string;
        companionName: string;
        companionBondLevel: number;
        moolahBalance: number;
        totalXp: number;
        badgesEarned: string[];
        missionsCompleted: number;
        missionsAttempted: number;
        academyUnlocksContributed: number;
    } | undefined;
    nextMissionRecommendation?: {
        summary: string;
        rationale: string;
        targetMasterySkillId: string;
        targetMasteryDomainId: string;
        suggestedDeliveryMode: "3d" | "interactive-lite" | "text-audio-offline";
    } | undefined;
}>;
type ParentReport = z.infer<typeof ParentReportSchema>;
declare const ParentVisibilityModeSchema: z.ZodEnum<["full", "summary", "safety-override"]>;
type ParentVisibilityMode = z.infer<typeof ParentVisibilityModeSchema>;

/**
 * Lesson Task Skeleton Contract
 *
 * The adaptive lesson content model: humans author a "skeleton" per
 * (masterySkillId, l3arnMasteryLevel) carrying a checkable correct-answer
 * rule, a distractor rule, a transfer-example rule, and a 3-tier hint
 * ladder. The AI fills in concrete items constrained by that rule — it
 * never invents the rule itself.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md
 * (sub-project 1 of the lesson-engine redesign), ADR-014, ADR-054.
 */

declare const RulePredicateLeafSchema: z.ZodEffects<z.ZodObject<{
    field: z.ZodString;
    op: z.ZodEnum<["eq", "neq", "gt", "gte", "lt", "lte", "in"]>;
    value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">]>>;
    compareField: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    field: string;
    op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
    value?: string | number | boolean | (string | number)[] | undefined;
    compareField?: string | undefined;
}, {
    field: string;
    op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
    value?: string | number | boolean | (string | number)[] | undefined;
    compareField?: string | undefined;
}>, {
    field: string;
    op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
    value?: string | number | boolean | (string | number)[] | undefined;
    compareField?: string | undefined;
}, {
    field: string;
    op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
    value?: string | number | boolean | (string | number)[] | undefined;
    compareField?: string | undefined;
}>;
type RulePredicateLeaf = z.infer<typeof RulePredicateLeafSchema>;
type RulePredicate = RulePredicateLeaf | {
    allOf: RulePredicate[];
} | {
    anyOf: RulePredicate[];
} | {
    not: RulePredicate;
};
declare const RulePredicateSchema: z.ZodType<RulePredicate>;
declare const ItemAttributesSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
type ItemAttributes = z.infer<typeof ItemAttributesSchema>;
declare const LearningStyleSchema: z.ZodEnum<["visual", "auditory", "reading-writing", "kinesthetic"]>;
type LearningStyle = z.infer<typeof LearningStyleSchema>;
declare const ReadingTierSchema: z.ZodEnum<["pre-reader", "grade-level", "advanced"]>;
type ReadingTier = z.infer<typeof ReadingTierSchema>;
declare const LessonTaskTypeSchema: z.ZodEnum<["sort-categorize", "choice", "apply-to-new", "ai-mistake-check"]>;
type LessonTaskType = z.infer<typeof LessonTaskTypeSchema>;
declare const VariantKeySchema: z.ZodObject<{
    skeletonId: z.ZodString;
    learningStyle: z.ZodEnum<["visual", "auditory", "reading-writing", "kinesthetic"]>;
    readingTier: z.ZodEnum<["pre-reader", "grade-level", "advanced"]>;
    l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
}, "strip", z.ZodTypeAny, {
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    skeletonId: string;
    learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
    readingTier: "advanced" | "pre-reader" | "grade-level";
}, {
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    skeletonId: string;
    learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
    readingTier: "advanced" | "pre-reader" | "grade-level";
}>;
type VariantKey = z.infer<typeof VariantKeySchema>;
declare const HintTierSchema: z.ZodObject<{
    tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
    content: z.ZodString;
    readAloudScript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}>;
type HintTier = z.infer<typeof HintTierSchema>;
declare const HintLadderSchema: z.ZodEffects<z.ZodTuple<[z.ZodObject<{
    tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
    content: z.ZodString;
    readAloudScript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}>, z.ZodObject<{
    tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
    content: z.ZodString;
    readAloudScript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}>, z.ZodObject<{
    tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
    content: z.ZodString;
    readAloudScript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}>], null>, [{
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}], [{
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}, {
    readAloudScript: string;
    content: string;
    tier: 1 | 2 | 3;
    kind: "nudge" | "re-explain" | "state-rule";
}]>;
type HintLadder = z.infer<typeof HintLadderSchema>;
declare const DistractorRuleSchema: z.ZodObject<{
    count: z.ZodNumber;
    plausibilityRule: z.ZodOptional<z.ZodType<RulePredicate, z.ZodTypeDef, RulePredicate>>;
}, "strip", z.ZodTypeAny, {
    count: number;
    plausibilityRule?: RulePredicate | undefined;
}, {
    count: number;
    plausibilityRule?: RulePredicate | undefined;
}>;
type DistractorRule = z.infer<typeof DistractorRuleSchema>;
declare const LessonTaskSkeletonSchema: z.ZodObject<{
    id: z.ZodString;
    masterySkillId: z.ZodString;
    l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
    taskType: z.ZodEnum<["sort-categorize", "choice", "apply-to-new", "ai-mistake-check"]>;
    correctAnswerRule: z.ZodType<RulePredicate, z.ZodTypeDef, RulePredicate>;
    distractorRule: z.ZodObject<{
        count: z.ZodNumber;
        plausibilityRule: z.ZodOptional<z.ZodType<RulePredicate, z.ZodTypeDef, RulePredicate>>;
    }, "strip", z.ZodTypeAny, {
        count: number;
        plausibilityRule?: RulePredicate | undefined;
    }, {
        count: number;
        plausibilityRule?: RulePredicate | undefined;
    }>;
    transferExampleRule: z.ZodType<RulePredicate, z.ZodTypeDef, RulePredicate>;
    hintLadder: z.ZodEffects<z.ZodTuple<[z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>, z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>, z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>], null>, [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }], [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }]>;
    isActive: z.ZodBoolean;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    masterySkillId: string;
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    version: number;
    taskType: "choice" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
    correctAnswerRule: RulePredicate;
    distractorRule: {
        count: number;
        plausibilityRule?: RulePredicate | undefined;
    };
    transferExampleRule: RulePredicate;
    hintLadder: [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }];
    isActive: boolean;
}, {
    id: string;
    masterySkillId: string;
    l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
    version: number;
    taskType: "choice" | "sort-categorize" | "apply-to-new" | "ai-mistake-check";
    correctAnswerRule: RulePredicate;
    distractorRule: {
        count: number;
        plausibilityRule?: RulePredicate | undefined;
    };
    transferExampleRule: RulePredicate;
    hintLadder: [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }];
    isActive: boolean;
}>;
type LessonTaskSkeleton = z.infer<typeof LessonTaskSkeletonSchema>;
declare const SkeletonFillItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    attributes: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    presentationText: z.ZodString;
    readAloudScript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    readAloudScript: string;
    itemId: string;
    attributes: Record<string, string | number | boolean>;
    presentationText: string;
}, {
    readAloudScript: string;
    itemId: string;
    attributes: Record<string, string | number | boolean>;
    presentationText: string;
}>;
type SkeletonFillItem = z.infer<typeof SkeletonFillItemSchema>;
declare const SkeletonFillSchema: z.ZodObject<{
    skeletonId: z.ZodString;
    variantKey: z.ZodObject<{
        skeletonId: z.ZodString;
        learningStyle: z.ZodEnum<["visual", "auditory", "reading-writing", "kinesthetic"]>;
        readingTier: z.ZodEnum<["pre-reader", "grade-level", "advanced"]>;
        l3arnMasteryLevel: z.ZodEnum<["emerging", "developing", "proficient", "advanced"]>;
    }, "strip", z.ZodTypeAny, {
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        skeletonId: string;
        learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
        readingTier: "advanced" | "pre-reader" | "grade-level";
    }, {
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        skeletonId: string;
        learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
        readingTier: "advanced" | "pre-reader" | "grade-level";
    }>;
    storyFlavor: z.ZodString;
    correctItem: z.ZodObject<{
        itemId: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        presentationText: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }>;
    distractorItems: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        presentationText: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }>, "many">;
    transferItem: z.ZodObject<{
        itemId: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        presentationText: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }, {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }>;
    hintLadderFill: z.ZodEffects<z.ZodTuple<[z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>, z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>, z.ZodObject<{
        tier: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
        kind: z.ZodEnum<["nudge", "re-explain", "state-rule"]>;
        content: z.ZodString;
        readAloudScript: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }>], null>, [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }], [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }]>;
    companionDialogueLine: z.ZodString;
}, "strip", z.ZodTypeAny, {
    skeletonId: string;
    variantKey: {
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        skeletonId: string;
        learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
        readingTier: "advanced" | "pre-reader" | "grade-level";
    };
    storyFlavor: string;
    correctItem: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    };
    distractorItems: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }[];
    transferItem: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    };
    hintLadderFill: [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }];
    companionDialogueLine: string;
}, {
    skeletonId: string;
    variantKey: {
        l3arnMasteryLevel: "emerging" | "developing" | "proficient" | "advanced";
        skeletonId: string;
        learningStyle: "visual" | "auditory" | "reading-writing" | "kinesthetic";
        readingTier: "advanced" | "pre-reader" | "grade-level";
    };
    storyFlavor: string;
    correctItem: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    };
    distractorItems: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    }[];
    transferItem: {
        readAloudScript: string;
        itemId: string;
        attributes: Record<string, string | number | boolean>;
        presentationText: string;
    };
    hintLadderFill: [{
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }, {
        readAloudScript: string;
        content: string;
        tier: 1 | 2 | 3;
        kind: "nudge" | "re-explain" | "state-rule";
    }];
    companionDialogueLine: string;
}>;
type SkeletonFill = z.infer<typeof SkeletonFillSchema>;

/**
 * Permissions Contract
 *
 * Cross-cutting trust boundaries, data access scopes, parent visibility flags,
 * and the admin access model for L3ARN.
 *
 * Core principle: child sessions are strictly scoped. A child session cannot
 * access parent dashboard data, sibling profiles, or any other household's
 * data. These boundaries are enforced by Supabase RLS; this contract lets
 * application code reason about them explicitly and prevents silent violations.
 *
 * Admin access model is Provisional per ADR-049. The role matrix and full
 * permission levels require founding-team source confirmation. The types here
 * establish the shape and audit invariants that any confirmed model must satisfy.
 *
 * Grounded in: ADR-007 (child identity), ADR-008 (parent visibility),
 * ADR-030 (account ownership), ADR-031 (child session model),
 * ADR-049 (admin access model — provisional), ADR-059 (RLS before UI),
 * ADR-060 (curriculum tables via API only — provisional), COPPA baseline.
 */

declare const DataPrincipalSchema: z.ZodEnum<["parent", "child-session", "admin", "system"]>;
type DataPrincipal = z.infer<typeof DataPrincipalSchema>;
declare const ChildSessionScopeSchema: z.ZodObject<{
    sessionId: z.ZodString;
    childProfileId: z.ZodString;
    householdId: z.ZodString;
    canAccessOwnMissions: z.ZodLiteral<true>;
    canAccessOwnRewards: z.ZodLiteral<true>;
    canAccessSharedAcademyWorld: z.ZodLiteral<true>;
    canAccessParentDashboard: z.ZodLiteral<false>;
    canAccessSiblingProfiles: z.ZodLiteral<false>;
    canAccessOtherHouseholds: z.ZodLiteral<false>;
    canSendPrivateMessages: z.ZodLiteral<false>;
    canReadCurriculumTablesDirectly: z.ZodLiteral<false>;
}, "strip", z.ZodTypeAny, {
    householdId: string;
    childProfileId: string;
    sessionId: string;
    canAccessOwnMissions: true;
    canAccessOwnRewards: true;
    canAccessSharedAcademyWorld: true;
    canAccessParentDashboard: false;
    canAccessSiblingProfiles: false;
    canAccessOtherHouseholds: false;
    canSendPrivateMessages: false;
    canReadCurriculumTablesDirectly: false;
}, {
    householdId: string;
    childProfileId: string;
    sessionId: string;
    canAccessOwnMissions: true;
    canAccessOwnRewards: true;
    canAccessSharedAcademyWorld: true;
    canAccessParentDashboard: false;
    canAccessSiblingProfiles: false;
    canAccessOtherHouseholds: false;
    canSendPrivateMessages: false;
    canReadCurriculumTablesDirectly: false;
}>;
type ChildSessionScope = z.infer<typeof ChildSessionScopeSchema>;
declare function buildChildSessionScope(sessionId: string, childProfileId: string, householdId: string): ChildSessionScope;
declare const ParentVisibilityFlagsSchema: z.ZodObject<{
    parentVisible: z.ZodBoolean;
    requiresParentConsent: z.ZodBoolean;
    includeInPortfolio: z.ZodBoolean;
    retentionDays: z.ZodNullable<z.ZodNumber>;
    visibilityTier: z.ZodEnum<["full", "summary", "safety-override"]>;
}, "strip", z.ZodTypeAny, {
    retentionDays: number | null;
    parentVisible: boolean;
    requiresParentConsent: boolean;
    includeInPortfolio: boolean;
    visibilityTier: "full" | "summary" | "safety-override";
}, {
    retentionDays: number | null;
    parentVisible: boolean;
    requiresParentConsent: boolean;
    includeInPortfolio: boolean;
    visibilityTier: "full" | "summary" | "safety-override";
}>;
type ParentVisibilityFlags = z.infer<typeof ParentVisibilityFlagsSchema>;
declare const AdminAccessRoleSchema: z.ZodEnum<["founder", "safety-admin", "support-admin", "curriculum-admin", "technical-admin", "ai-agent-operator"]>;
type AdminAccessRole = z.infer<typeof AdminAccessRoleSchema>;
declare const AdminAccessRecordSchema: z.ZodObject<{
    id: z.ZodString;
    adminUserId: z.ZodString;
    adminRole: z.ZodEnum<["founder", "safety-admin", "support-admin", "curriculum-admin", "technical-admin", "ai-agent-operator"]>;
    resourceType: z.ZodString;
    resourceId: z.ZodString;
    householdId: z.ZodString;
    justification: z.ZodString;
    accessedAt: z.ZodString;
    sessionExpiresAt: z.ZodString;
    ipAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    householdId: string;
    adminUserId: string;
    adminRole: "founder" | "safety-admin" | "support-admin" | "curriculum-admin" | "technical-admin" | "ai-agent-operator";
    resourceType: string;
    resourceId: string;
    justification: string;
    accessedAt: string;
    sessionExpiresAt: string;
    ipAddress?: string | undefined;
}, {
    id: string;
    householdId: string;
    adminUserId: string;
    adminRole: "founder" | "safety-admin" | "support-admin" | "curriculum-admin" | "technical-admin" | "ai-agent-operator";
    resourceType: string;
    resourceId: string;
    justification: string;
    accessedAt: string;
    sessionExpiresAt: string;
    ipAddress?: string | undefined;
}>;
type AdminAccessRecord = z.infer<typeof AdminAccessRecordSchema>;
declare const DataDomainSchema: z.ZodEnum<["identity-auth", "learner-model", "curriculum-spine", "mission-system", "evidence-reports", "rewards-economy", "world-state", "network-safety", "learning-intelligence"]>;
type DataDomain = z.infer<typeof DataDomainSchema>;
declare const DataAccessScopeSchema: z.ZodObject<{
    principal: z.ZodEnum<["parent", "child-session", "admin", "system"]>;
    householdId: z.ZodNullable<z.ZodString>;
    allowedDomains: z.ZodArray<z.ZodEnum<["identity-auth", "learner-model", "curriculum-spine", "mission-system", "evidence-reports", "rewards-economy", "world-state", "network-safety", "learning-intelligence"]>, "many">;
    restrictions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    householdId: string | null;
    principal: "parent" | "child-session" | "admin" | "system";
    allowedDomains: ("identity-auth" | "learner-model" | "curriculum-spine" | "mission-system" | "evidence-reports" | "rewards-economy" | "world-state" | "network-safety" | "learning-intelligence")[];
    restrictions: string[];
}, {
    householdId: string | null;
    principal: "parent" | "child-session" | "admin" | "system";
    allowedDomains: ("identity-auth" | "learner-model" | "curriculum-spine" | "mission-system" | "evidence-reports" | "rewards-economy" | "world-state" | "network-safety" | "learning-intelligence")[];
    restrictions: string[];
}>;
type DataAccessScope = z.infer<typeof DataAccessScopeSchema>;

/**
 * Moderation Contract
 *
 * Covers the hybrid student chat system: Quick Chat options, chat messages,
 * pre-send validation, moderation events, escalation records, and the audit
 * log for all safety-relevant actions.
 *
 * Safety invariants baked in as z.literal values (non-negotiable; breaking them
 * requires an explicit architectural review):
 *
 *   noImageContent: true         — no image URLs, base64, or file references
 *   noFileAttachments: true      — no file attachments of any kind
 *   noExternalLinks: true        — no hyperlinks to external sites
 *   noPrivateChannel: true       — no private DM context; all messages are room-scoped
 *   parentVisible: true          — all messages are parent-visible
 *   neverDeleted: true           — messages are never removed from the audit record
 *
 * These literals make it a TypeScript compile error to emit a message that
 * violates the rules, even before runtime moderation runs.
 *
 * Grounded in: ADR-006 (student chat model), ADR-007 (child identity),
 * ADR-008 (parent visibility), COPPA/FERPA posture,
 * MASTER_HANDOFF §9.3 (child social safety rules),
 * architecture.md §3 (Chat + Moderation Relay component on Railway).
 */

declare const QuickChatCategorySchema: z.ZodEnum<["greeting", "encouragement", "reaction", "game-callout", "help-request"]>;
type QuickChatCategory = z.infer<typeof QuickChatCategorySchema>;
declare const QuickChatOptionSchema: z.ZodObject<{
    id: z.ZodString;
    category: z.ZodEnum<["greeting", "encouragement", "reaction", "game-callout", "help-request"]>;
    text: z.ZodString;
    emojiCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: "greeting" | "encouragement" | "reaction" | "game-callout" | "help-request";
    text: string;
    emojiCode?: string | undefined;
}, {
    id: string;
    category: "greeting" | "encouragement" | "reaction" | "game-callout" | "help-request";
    text: string;
    emojiCode?: string | undefined;
}>;
type QuickChatOption = z.infer<typeof QuickChatOptionSchema>;
declare const ChatMessageTypeSchema: z.ZodEnum<["quick-chat", "free-text", "system-message"]>;
type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;
declare const ChatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    roomId: z.ZodString;
    senderAcademyIdentityId: z.ZodString;
    messageType: z.ZodEnum<["quick-chat", "free-text", "system-message"]>;
    quickChatOptionId: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    sentAt: z.ZodString;
    noImageContent: z.ZodLiteral<true>;
    noFileAttachments: z.ZodLiteral<true>;
    noExternalLinks: z.ZodLiteral<true>;
    noPrivateChannel: z.ZodLiteral<true>;
    parentVisible: z.ZodLiteral<true>;
    neverDeleted: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentVisible: true;
    roomId: string;
    senderAcademyIdentityId: string;
    messageType: "quick-chat" | "free-text" | "system-message";
    sentAt: string;
    noImageContent: true;
    noFileAttachments: true;
    noExternalLinks: true;
    noPrivateChannel: true;
    neverDeleted: true;
    content?: string | undefined;
    quickChatOptionId?: string | undefined;
}, {
    id: string;
    parentVisible: true;
    roomId: string;
    senderAcademyIdentityId: string;
    messageType: "quick-chat" | "free-text" | "system-message";
    sentAt: string;
    noImageContent: true;
    noFileAttachments: true;
    noExternalLinks: true;
    noPrivateChannel: true;
    neverDeleted: true;
    content?: string | undefined;
    quickChatOptionId?: string | undefined;
}>;
type ChatMessage = z.infer<typeof ChatMessageSchema>;
declare function buildChatMessage(partial: Pick<ChatMessage, "roomId" | "senderAcademyIdentityId" | "messageType" | "quickChatOptionId" | "content" | "sentAt"> & {
    id: string;
}): ChatMessage;
declare const ModerationCheckTypeSchema: z.ZodEnum<["pii-scan", "link-scan", "contact-info-scan", "keyword-filter"]>;
type ModerationCheckType = z.infer<typeof ModerationCheckTypeSchema>;
declare const ModerationOutcomeSchema: z.ZodEnum<["approved", "blocked", "flagged-for-review"]>;
type ModerationOutcome = z.infer<typeof ModerationOutcomeSchema>;
declare const ModerationCheckResultSchema: z.ZodObject<{
    checkType: z.ZodEnum<["pii-scan", "link-scan", "contact-info-scan", "keyword-filter"]>;
    outcome: z.ZodEnum<["approved", "blocked", "flagged-for-review"]>;
    matchedPatterns: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    outcome: "approved" | "blocked" | "flagged-for-review";
    checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
    matchedPatterns: string[];
}, {
    outcome: "approved" | "blocked" | "flagged-for-review";
    checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
    matchedPatterns: string[];
}>;
type ModerationCheckResult = z.infer<typeof ModerationCheckResultSchema>;
declare const ModerationTriggerSchema: z.ZodEnum<["chat-message", "ai-output", "user-input"]>;
type ModerationTrigger = z.infer<typeof ModerationTriggerSchema>;
declare const ModerationEventSchema: z.ZodObject<{
    id: z.ZodString;
    triggerSource: z.ZodEnum<["chat-message", "ai-output", "user-input"]>;
    chatMessageId: z.ZodOptional<z.ZodString>;
    aiOutputEnvelopeId: z.ZodOptional<z.ZodString>;
    senderChildProfileId: z.ZodString;
    roomId: z.ZodOptional<z.ZodString>;
    messageType: z.ZodOptional<z.ZodEnum<["quick-chat", "free-text", "system-message"]>>;
    outcome: z.ZodEnum<["approved", "blocked", "flagged-for-review"]>;
    checksRun: z.ZodArray<z.ZodObject<{
        checkType: z.ZodEnum<["pii-scan", "link-scan", "contact-info-scan", "keyword-filter"]>;
        outcome: z.ZodEnum<["approved", "blocked", "flagged-for-review"]>;
        matchedPatterns: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        outcome: "approved" | "blocked" | "flagged-for-review";
        checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
        matchedPatterns: string[];
    }, {
        outcome: "approved" | "blocked" | "flagged-for-review";
        checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
        matchedPatterns: string[];
    }>, "many">;
    moderatedAt: z.ZodString;
    parentNotified: z.ZodBoolean;
    parentNotifiedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    outcome: "approved" | "blocked" | "flagged-for-review";
    triggerSource: "chat-message" | "ai-output" | "user-input";
    senderChildProfileId: string;
    checksRun: {
        outcome: "approved" | "blocked" | "flagged-for-review";
        checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
        matchedPatterns: string[];
    }[];
    moderatedAt: string;
    parentNotified: boolean;
    roomId?: string | undefined;
    messageType?: "quick-chat" | "free-text" | "system-message" | undefined;
    chatMessageId?: string | undefined;
    aiOutputEnvelopeId?: string | undefined;
    parentNotifiedAt?: string | undefined;
}, {
    id: string;
    outcome: "approved" | "blocked" | "flagged-for-review";
    triggerSource: "chat-message" | "ai-output" | "user-input";
    senderChildProfileId: string;
    checksRun: {
        outcome: "approved" | "blocked" | "flagged-for-review";
        checkType: "pii-scan" | "link-scan" | "contact-info-scan" | "keyword-filter";
        matchedPatterns: string[];
    }[];
    moderatedAt: string;
    parentNotified: boolean;
    roomId?: string | undefined;
    messageType?: "quick-chat" | "free-text" | "system-message" | undefined;
    chatMessageId?: string | undefined;
    aiOutputEnvelopeId?: string | undefined;
    parentNotifiedAt?: string | undefined;
}>;
type ModerationEvent = z.infer<typeof ModerationEventSchema>;
declare const EscalationSeveritySchema: z.ZodEnum<["S0", "S1", "S2", "S3", "S4"]>;
type EscalationSeverity = z.infer<typeof EscalationSeveritySchema>;
declare const EscalationRecordSchema: z.ZodObject<{
    id: z.ZodString;
    moderationEventId: z.ZodString;
    severity: z.ZodEnum<["S0", "S1", "S2", "S3", "S4"]>;
    escalatedAt: z.ZodString;
    escalatedTo: z.ZodLiteral<"founder">;
    context: z.ZodString;
    resolutionNotes: z.ZodOptional<z.ZodString>;
    resolvedAt: z.ZodOptional<z.ZodString>;
    resolvedByAdminId: z.ZodOptional<z.ZodString>;
    parentNotified: z.ZodBoolean;
    parentNotifiedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentNotified: boolean;
    moderationEventId: string;
    severity: "S0" | "S1" | "S2" | "S3" | "S4";
    escalatedAt: string;
    escalatedTo: "founder";
    context: string;
    parentNotifiedAt?: string | undefined;
    resolutionNotes?: string | undefined;
    resolvedAt?: string | undefined;
    resolvedByAdminId?: string | undefined;
}, {
    id: string;
    parentNotified: boolean;
    moderationEventId: string;
    severity: "S0" | "S1" | "S2" | "S3" | "S4";
    escalatedAt: string;
    escalatedTo: "founder";
    context: string;
    parentNotifiedAt?: string | undefined;
    resolutionNotes?: string | undefined;
    resolvedAt?: string | undefined;
    resolvedByAdminId?: string | undefined;
}>;
type EscalationRecord = z.infer<typeof EscalationRecordSchema>;
declare const AuditActionSchema: z.ZodEnum<["chat-message-sent", "chat-message-blocked", "chat-message-flagged", "ai-output-blocked", "ai-output-safety-check-failed", "escalation-created", "escalation-resolved", "parent-notified", "session-terminated-safety", "kill-switch-invoked", "admin-data-accessed", "moderation-override"]>;
type AuditAction = z.infer<typeof AuditActionSchema>;
declare const AuditLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    action: z.ZodEnum<["chat-message-sent", "chat-message-blocked", "chat-message-flagged", "ai-output-blocked", "ai-output-safety-check-failed", "escalation-created", "escalation-resolved", "parent-notified", "session-terminated-safety", "kill-switch-invoked", "admin-data-accessed", "moderation-override"]>;
    actorType: z.ZodEnum<["child-session", "parent", "system", "admin"]>;
    actorId: z.ZodString;
    targetResourceType: z.ZodString;
    targetResourceId: z.ZodOptional<z.ZodString>;
    householdId: z.ZodNullable<z.ZodString>;
    occurredAt: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    householdId: string | null;
    occurredAt: string;
    action: "chat-message-sent" | "chat-message-blocked" | "chat-message-flagged" | "ai-output-blocked" | "ai-output-safety-check-failed" | "escalation-created" | "escalation-resolved" | "parent-notified" | "session-terminated-safety" | "kill-switch-invoked" | "admin-data-accessed" | "moderation-override";
    actorType: "parent" | "child-session" | "admin" | "system";
    actorId: string;
    targetResourceType: string;
    targetResourceId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    householdId: string | null;
    occurredAt: string;
    action: "chat-message-sent" | "chat-message-blocked" | "chat-message-flagged" | "ai-output-blocked" | "ai-output-safety-check-failed" | "escalation-created" | "escalation-resolved" | "parent-notified" | "session-terminated-safety" | "kill-switch-invoked" | "admin-data-accessed" | "moderation-override";
    actorType: "parent" | "child-session" | "admin" | "system";
    actorId: string;
    targetResourceType: string;
    targetResourceId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

/**
 * AI Contract
 *
 * Covers the AI output validation pipeline, retry/fallback policy, safe
 * fallback content model, AI output audit envelopes, de-identified learning
 * events, dataset eligibility, and model improvement consent.
 *
 * Validation policy (ADR-054 — confirmed June 2026):
 *   1. Validate AI output against target schema
 *   2. If validation fails, regenerate — up to 3 attempts total (hard cap)
 *   3. If all 3 attempts fail, use a pre-defined safe fallback
 *   4. Safe fallbacks are NEVER AI-generated (z.literal(false) invariant)
 *   5. Parent notification level depends on whether the failure affects child experience
 *
 * De-identification rules (ADR-029, ADR-028 — confirmed June 2026):
 *   - No raw child PII enters the learning intelligence pipeline
 *   - Production child ID replaced with a rotating pseudonymous learner key
 *   - Join-back mapping stored separately in a restricted-access table; not
 *     available to model-training jobs; rotation quarterly or at dataset export
 *   - Only structured interaction signals — no free text, no audio content
 *   - Model improvement requires explicit parent opt-in; default is opted out
 *
 * Grounded in: ADR-028 (AI model strategy), ADR-029 (model improvement opt-out),
 * ADR-054 (AI output validation/retry/fallback),
 * MASTER_HANDOFF §9.2 (hard privacy rules), MASTER_HANDOFF §10 (data model),
 * architecture.md §10 (AI model strategy), architecture.md §11 (AI output rules),
 * architecture.md §12 (learning intelligence domain).
 */

declare const AI_MAX_RETRY_ATTEMPTS: 3;
declare const AIValidationAttemptSchema: z.ZodObject<{
    attemptNumber: z.ZodNumber;
    failureReason: z.ZodString;
    failedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    attemptNumber: number;
    failureReason: string;
    failedAt: string;
}, {
    attemptNumber: number;
    failureReason: string;
    failedAt: string;
}>;
type AIValidationAttempt = z.infer<typeof AIValidationAttemptSchema>;
declare const AIFallbackNotificationLevelSchema: z.ZodEnum<["none", "soft-notice", "safety-alert"]>;
type AIFallbackNotificationLevel = z.infer<typeof AIFallbackNotificationLevelSchema>;
declare const AIOutputResultSchema: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    status: z.ZodLiteral<"validated">;
    data: z.ZodUnknown;
    attemptsUsed: z.ZodNumber;
    validatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "validated";
    attemptsUsed: number;
    validatedAt: string;
    data?: unknown;
}, {
    status: "validated";
    attemptsUsed: number;
    validatedAt: string;
    data?: unknown;
}>, z.ZodObject<{
    status: z.ZodLiteral<"failed-with-fallback">;
    attemptsUsed: z.ZodLiteral<3>;
    attempts: z.ZodArray<z.ZodObject<{
        attemptNumber: z.ZodNumber;
        failureReason: z.ZodString;
        failedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        attemptNumber: number;
        failureReason: string;
        failedAt: string;
    }, {
        attemptNumber: number;
        failureReason: string;
        failedAt: string;
    }>, "many">;
    fallbackId: z.ZodString;
    fallbackUsedAt: z.ZodString;
    notificationLevel: z.ZodEnum<["none", "soft-notice", "safety-alert"]>;
}, "strip", z.ZodTypeAny, {
    status: "failed-with-fallback";
    attemptsUsed: 3;
    attempts: {
        attemptNumber: number;
        failureReason: string;
        failedAt: string;
    }[];
    fallbackId: string;
    fallbackUsedAt: string;
    notificationLevel: "none" | "soft-notice" | "safety-alert";
}, {
    status: "failed-with-fallback";
    attemptsUsed: 3;
    attempts: {
        attemptNumber: number;
        failureReason: string;
        failedAt: string;
    }[];
    fallbackId: string;
    fallbackUsedAt: string;
    notificationLevel: "none" | "soft-notice" | "safety-alert";
}>]>;
type AIOutputResult = z.infer<typeof AIOutputResultSchema>;
declare const SafeFallbackContextSchema: z.ZodEnum<["mission-generation", "mission-step", "companion-dialogue", "parent-plan", "evidence-summary", "calibration-summary", "user-input"]>;
type SafeFallbackContext = z.infer<typeof SafeFallbackContextSchema>;
declare const SafeFallbackSchema: z.ZodObject<{
    id: z.ZodString;
    context: z.ZodEnum<["mission-generation", "mission-step", "companion-dialogue", "parent-plan", "evidence-summary", "calibration-summary", "user-input"]>;
    title: z.ZodString;
    content: z.ZodString;
    parentNote: z.ZodString;
    parentVisible: z.ZodLiteral<true>;
    isAIGenerated: z.ZodLiteral<false>;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentVisible: true;
    content: string;
    title: string;
    context: "user-input" | "mission-generation" | "mission-step" | "companion-dialogue" | "parent-plan" | "evidence-summary" | "calibration-summary";
    parentNote: string;
    isAIGenerated: false;
}, {
    id: string;
    parentVisible: true;
    content: string;
    title: string;
    context: "user-input" | "mission-generation" | "mission-step" | "companion-dialogue" | "parent-plan" | "evidence-summary" | "calibration-summary";
    parentNote: string;
    isAIGenerated: false;
}>;
type SafeFallback = z.infer<typeof SafeFallbackSchema>;
declare const AIOutputEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    traceId: z.ZodString;
    generationContext: z.ZodString;
    childProfileId: z.ZodString;
    childSessionId: z.ZodOptional<z.ZodString>;
    requestedAt: z.ZodString;
    result: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
        status: z.ZodLiteral<"validated">;
        data: z.ZodUnknown;
        attemptsUsed: z.ZodNumber;
        validatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "validated";
        attemptsUsed: number;
        validatedAt: string;
        data?: unknown;
    }, {
        status: "validated";
        attemptsUsed: number;
        validatedAt: string;
        data?: unknown;
    }>, z.ZodObject<{
        status: z.ZodLiteral<"failed-with-fallback">;
        attemptsUsed: z.ZodLiteral<3>;
        attempts: z.ZodArray<z.ZodObject<{
            attemptNumber: z.ZodNumber;
            failureReason: z.ZodString;
            failedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }, {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }>, "many">;
        fallbackId: z.ZodString;
        fallbackUsedAt: z.ZodString;
        notificationLevel: z.ZodEnum<["none", "soft-notice", "safety-alert"]>;
    }, "strip", z.ZodTypeAny, {
        status: "failed-with-fallback";
        attemptsUsed: 3;
        attempts: {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }[];
        fallbackId: string;
        fallbackUsedAt: string;
        notificationLevel: "none" | "soft-notice" | "safety-alert";
    }, {
        status: "failed-with-fallback";
        attemptsUsed: 3;
        attempts: {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }[];
        fallbackId: string;
        fallbackUsedAt: string;
        notificationLevel: "none" | "soft-notice" | "safety-alert";
    }>]>;
    modelProvider: z.ZodString;
    modelVersion: z.ZodOptional<z.ZodString>;
    promptTemplateVersion: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodString;
    safetyPolicyVersion: z.ZodOptional<z.ZodString>;
    missionCompilerVersion: z.ZodOptional<z.ZodString>;
    parentVisible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    childProfileId: string;
    parentVisible: boolean;
    traceId: string;
    generationContext: string;
    requestedAt: string;
    result: {
        status: "validated";
        attemptsUsed: number;
        validatedAt: string;
        data?: unknown;
    } | {
        status: "failed-with-fallback";
        attemptsUsed: 3;
        attempts: {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }[];
        fallbackId: string;
        fallbackUsedAt: string;
        notificationLevel: "none" | "soft-notice" | "safety-alert";
    };
    modelProvider: string;
    schemaVersion: string;
    childSessionId?: string | undefined;
    modelVersion?: string | undefined;
    promptTemplateVersion?: string | undefined;
    safetyPolicyVersion?: string | undefined;
    missionCompilerVersion?: string | undefined;
}, {
    id: string;
    childProfileId: string;
    parentVisible: boolean;
    traceId: string;
    generationContext: string;
    requestedAt: string;
    result: {
        status: "validated";
        attemptsUsed: number;
        validatedAt: string;
        data?: unknown;
    } | {
        status: "failed-with-fallback";
        attemptsUsed: 3;
        attempts: {
            attemptNumber: number;
            failureReason: string;
            failedAt: string;
        }[];
        fallbackId: string;
        fallbackUsedAt: string;
        notificationLevel: "none" | "soft-notice" | "safety-alert";
    };
    modelProvider: string;
    schemaVersion: string;
    childSessionId?: string | undefined;
    modelVersion?: string | undefined;
    promptTemplateVersion?: string | undefined;
    safetyPolicyVersion?: string | undefined;
    missionCompilerVersion?: string | undefined;
}>;
type AIOutputEnvelope = z.infer<typeof AIOutputEnvelopeSchema>;
declare const DeidentifiedEventTypeSchema: z.ZodEnum<["mission-step-interaction", "delivery-mode-choice", "hint-requested", "persistence-signal", "mastery-signal", "calibration-signal"]>;
type DeidentifiedEventType = z.infer<typeof DeidentifiedEventTypeSchema>;
declare const DeidentifiedEventSchema: z.ZodObject<{
    id: z.ZodString;
    deidentifiedTokenId: z.ZodString;
    eventType: z.ZodEnum<["mission-step-interaction", "delivery-mode-choice", "hint-requested", "persistence-signal", "mastery-signal", "calibration-signal"]>;
    gradeLevel: z.ZodString;
    features: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    occurredAt: z.ZodString;
    datasetEligibilityId: z.ZodString;
    containsRawPii: z.ZodLiteral<false>;
    containsAudioContent: z.ZodLiteral<false>;
    containsFreeTextContent: z.ZodLiteral<false>;
}, "strip", z.ZodTypeAny, {
    id: string;
    occurredAt: string;
    deidentifiedTokenId: string;
    eventType: "mission-step-interaction" | "delivery-mode-choice" | "hint-requested" | "persistence-signal" | "mastery-signal" | "calibration-signal";
    gradeLevel: string;
    features: Record<string, string | number | boolean>;
    datasetEligibilityId: string;
    containsRawPii: false;
    containsAudioContent: false;
    containsFreeTextContent: false;
}, {
    id: string;
    occurredAt: string;
    deidentifiedTokenId: string;
    eventType: "mission-step-interaction" | "delivery-mode-choice" | "hint-requested" | "persistence-signal" | "mastery-signal" | "calibration-signal";
    gradeLevel: string;
    features: Record<string, string | number | boolean>;
    datasetEligibilityId: string;
    containsRawPii: false;
    containsAudioContent: false;
    containsFreeTextContent: false;
}>;
type DeidentifiedEvent = z.infer<typeof DeidentifiedEventSchema>;
declare const DatasetEligibilitySchema: z.ZodObject<{
    id: z.ZodString;
    childProfileId: z.ZodString;
    householdId: z.ZodString;
    eligible: z.ZodBoolean;
    parentConsentRecordId: z.ZodNullable<z.ZodString>;
    datasetVersionId: z.ZodString;
    assessedAt: z.ZodString;
    revokedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    householdId: string;
    childProfileId: string;
    eligible: boolean;
    parentConsentRecordId: string | null;
    datasetVersionId: string;
    assessedAt: string;
    revokedAt?: string | undefined;
}, {
    id: string;
    householdId: string;
    childProfileId: string;
    eligible: boolean;
    parentConsentRecordId: string | null;
    datasetVersionId: string;
    assessedAt: string;
    revokedAt?: string | undefined;
}>;
type DatasetEligibility = z.infer<typeof DatasetEligibilitySchema>;
declare const ModelImprovementConsentSchema: z.ZodObject<{
    id: z.ZodString;
    parentAccountId: z.ZodString;
    childProfileId: z.ZodString;
    granted: z.ZodBoolean;
    grantedAt: z.ZodNullable<z.ZodString>;
    revokedAt: z.ZodNullable<z.ZodString>;
    consentVersion: z.ZodString;
    scopeDescription: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    parentAccountId: string;
    childProfileId: string;
    revokedAt: string | null;
    granted: boolean;
    grantedAt: string | null;
    consentVersion: string;
    scopeDescription: string;
}, {
    id: string;
    parentAccountId: string;
    childProfileId: string;
    revokedAt: string | null;
    granted: boolean;
    grantedAt: string | null;
    consentVersion: string;
    scopeDescription: string;
}>;
type ModelImprovementConsent = z.infer<typeof ModelImprovementConsentSchema>;

/**
 * Calibration Contract
 *
 * Learner calibration signals — the structured behavioral dimensions that
 * Mission 001 (Repair the Sorting Computer) is designed to measure.
 *
 * Calibration signals describe what the system WILL capture, not what it
 * HAS captured. They are produced by the Mission Compiler alongside the
 * mission output, and consumed by the learner model pipeline to update
 * the learner profile confidence level (40-55% → 60-75% after Mission 001).
 *
 * Grounded in: architecture.md §9 (Learner Calibration Model),
 * CONTEXT.md §6 Decision 27 (First Mission = Calibration Mission),
 * evidence.schema.ts (EvidenceCaptureTypeSchema).
 */

declare const CalibrationSignalTypeSchema: z.ZodEnum<["reading-vs-listening", "cognitive-load", "ai-readiness", "persistence", "delivery-mode-preference", "hint-frequency"]>;
type CalibrationSignalType = z.infer<typeof CalibrationSignalTypeSchema>;
declare const CalibrationEvidenceCaptureTypeSchema: z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "structured-replay"]>;
type CalibrationEvidenceCaptureType = z.infer<typeof CalibrationEvidenceCaptureTypeSchema>;
declare const CalibrationSignalSchema: z.ZodObject<{
    signalType: z.ZodEnum<["reading-vs-listening", "cognitive-load", "ai-readiness", "persistence", "delivery-mode-preference", "hint-frequency"]>;
    description: z.ZodString;
    sourceMissionTaskId: z.ZodNullable<z.ZodString>;
    evidenceCaptureType: z.ZodNullable<z.ZodEnum<["decision-log", "sequence-completion", "ai-mistake-check", "explanation", "reflection", "structured-replay"]>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    signalType: "persistence" | "ai-readiness" | "reading-vs-listening" | "cognitive-load" | "delivery-mode-preference" | "hint-frequency";
    sourceMissionTaskId: string | null;
    evidenceCaptureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "structured-replay" | null;
}, {
    description: string;
    signalType: "persistence" | "ai-readiness" | "reading-vs-listening" | "cognitive-load" | "delivery-mode-preference" | "hint-frequency";
    sourceMissionTaskId: string | null;
    evidenceCaptureType: "ai-mistake-check" | "decision-log" | "sequence-completion" | "explanation" | "reflection" | "structured-replay" | null;
}>;
type CalibrationSignal = z.infer<typeof CalibrationSignalSchema>;

/**
 * Admin User Contract
 *
 * Zod schemas and TypeScript types for the admin_users table.
 * Admin role authorization is server-side only — never expose admin role
 * data to client components or browser bundles.
 *
 * Source of truth: infra/supabase/migrations/006_founder_mission_control.sql
 * Authorization logic: apps/web/src/lib/admin-auth.ts
 *
 * Grounded in: ADR-049 (Admin Access Model), OQ-A11-001 resolution.
 */

declare const AdminRoleSchema: z.ZodEnum<["founder", "safety_admin", "support_admin", "curriculum_admin", "technical_admin", "ai_agent_operator"]>;
type AdminRole = z.infer<typeof AdminRoleSchema>;
declare const AdminUserSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["founder", "safety_admin", "support_admin", "curriculum_admin", "technical_admin", "ai_agent_operator"]>;
    granted_by: z.ZodNullable<z.ZodString>;
    granted_at: z.ZodString;
    revoked_at: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    user_id: string;
    role: "founder" | "safety_admin" | "support_admin" | "curriculum_admin" | "technical_admin" | "ai_agent_operator";
    granted_by: string | null;
    granted_at: string;
    revoked_at: string | null;
    notes: string | null;
}, {
    id: string;
    email: string;
    user_id: string;
    role: "founder" | "safety_admin" | "support_admin" | "curriculum_admin" | "technical_admin" | "ai_agent_operator";
    granted_by: string | null;
    granted_at: string;
    revoked_at: string | null;
    notes: string | null;
}>;
type AdminUser = z.infer<typeof AdminUserSchema>;

/**
 * Session Contract — Child Session Launch
 *
 * Covers the POST /api/sessions/start endpoint contract:
 * parent-initiated child session creation.
 *
 * Grounded in: ADR-031 (child session model), OQ-A8-001 (session start endpoint).
 *
 * Rules:
 *  - LaunchMode is scaffolded for future trusted-device PIN sessions,
 *    but only "parent_launched" is implemented. Return 400 if
 *    "trusted_device_pin" is requested before Phase 1.
 *  - childSessionToken is ALWAYS opaque (crypto.randomUUID() result).
 *    It MUST never equal childProfileId.
 *  - AcademyIdentity in the response carries displayName + house only (ADR-007).
 *  - Session duration: 2 hours for parent_launched (ADR-031).
 */

/**
 * How the child session was initiated.
 * "trusted_device_pin" is scaffolded for future use only — returning 400
 * if requested until Phase 1 trusted-device flow is implemented.
 */
declare const LaunchModeSchema: z.ZodEnum<["parent_launched", "trusted_device_pin"]>;
type LaunchMode = z.infer<typeof LaunchModeSchema>;
declare const StartSessionRequestSchema: z.ZodObject<{
    /** The child's profile UUID — parent must own this profile (enforced by Railway). */
    childProfileId: z.ZodString;
    /**
     * How the session is being launched.
     * Only "parent_launched" is implemented in Phase 0.
     * "trusted_device_pin" scaffolded; returns 400 until Phase 1.
     */
    launchMode: z.ZodDefault<z.ZodEnum<["parent_launched", "trusted_device_pin"]>>;
}, "strip", z.ZodTypeAny, {
    childProfileId: string;
    launchMode: "parent_launched" | "trusted_device_pin";
}, {
    childProfileId: string;
    launchMode?: "parent_launched" | "trusted_device_pin" | undefined;
}>;
type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;
/**
 * Public academy identity included in the session response.
 * Display Name + House only — no legal name, no PII (ADR-007).
 */
declare const AcademyIdentityResponseSchema: z.ZodObject<{
    /** Child's Academy display name (2–32 chars, unique Academy-wide). */
    displayName: z.ZodString;
    /**
     * Current house affiliation.
     * "pre_sorting" if Sorting Ceremony has not yet been completed.
     */
    house: z.ZodString;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    house: string;
}, {
    displayName: string;
    house: string;
}>;
type AcademyIdentityResponse = z.infer<typeof AcademyIdentityResponseSchema>;
declare const StartSessionResponseSchema: z.ZodObject<{
    /**
     * Opaque session token issued by Railway.
     * NOT the childProfileId — generated via crypto.randomUUID().
     * The child app uses this token to authenticate Railway API calls for this session.
     */
    childSessionToken: z.ZodString;
    /** UUID of the newly created child_sessions row. */
    childSessionId: z.ZodString;
    /** ISO 8601 timestamp when this session expires. Default: 2h from creation. */
    expiresAt: z.ZodString;
    /** Academy identity for display in the child entry experience. */
    academyIdentity: z.ZodObject<{
        /** Child's Academy display name (2–32 chars, unique Academy-wide). */
        displayName: z.ZodString;
        /**
         * Current house affiliation.
         * "pre_sorting" if Sorting Ceremony has not yet been completed.
         */
        house: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        house: string;
    }, {
        displayName: string;
        house: string;
    }>;
}, "strip", z.ZodTypeAny, {
    childSessionId: string;
    childSessionToken: string;
    expiresAt: string;
    academyIdentity: {
        displayName: string;
        house: string;
    };
}, {
    childSessionId: string;
    childSessionToken: string;
    expiresAt: string;
    academyIdentity: {
        displayName: string;
        house: string;
    };
}>;
type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;
declare const VerifySessionResponseSchema: z.ZodObject<{
    /** UUID of the verified child_sessions row. */
    childSessionId: z.ZodString;
    /** UUID of the academy_identities row bound to this session. */
    academyIdentityId: z.ZodString;
    /** ISO 8601 timestamp when this session expires. */
    expiresAt: z.ZodString;
    /** Verified academy identity (display name + house) — the entry authority. */
    academyIdentity: z.ZodObject<{
        /** Child's Academy display name (2–32 chars, unique Academy-wide). */
        displayName: z.ZodString;
        /**
         * Current house affiliation.
         * "pre_sorting" if Sorting Ceremony has not yet been completed.
         */
        house: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        house: string;
    }, {
        displayName: string;
        house: string;
    }>;
}, "strip", z.ZodTypeAny, {
    academyIdentityId: string;
    childSessionId: string;
    expiresAt: string;
    academyIdentity: {
        displayName: string;
        house: string;
    };
}, {
    academyIdentityId: string;
    childSessionId: string;
    expiresAt: string;
    academyIdentity: {
        displayName: string;
        house: string;
    };
}>;
type VerifySessionResponse = z.infer<typeof VerifySessionResponseSchema>;
declare const SelectableHouseSchema: z.ZodEnum<["Valkryn", "Lyrion", "Novari", "Cytrex"]>;
type SelectableHouse = z.infer<typeof SelectableHouseSchema>;
declare const SetHouseRequestSchema: z.ZodObject<{
    /** The house the child chose during the Sorting Ceremony. */
    house: z.ZodEnum<["Valkryn", "Lyrion", "Novari", "Cytrex"]>;
}, "strip", z.ZodTypeAny, {
    house: "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
}, {
    house: "Valkryn" | "Lyrion" | "Novari" | "Cytrex";
}>;
type SetHouseRequest = z.infer<typeof SetHouseRequestSchema>;
declare const SetHouseResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    /** The updated academy identity (so the client can refresh display state). */
    academyIdentity: z.ZodObject<{
        /** Child's Academy display name (2–32 chars, unique Academy-wide). */
        displayName: z.ZodString;
        /**
         * Current house affiliation.
         * "pre_sorting" if Sorting Ceremony has not yet been completed.
         */
        house: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        house: string;
    }, {
        displayName: string;
        house: string;
    }>;
}, "strip", z.ZodTypeAny, {
    academyIdentity: {
        displayName: string;
        house: string;
    };
    success: true;
}, {
    academyIdentity: {
        displayName: string;
        house: string;
    };
    success: true;
}>;
type SetHouseResponse = z.infer<typeof SetHouseResponseSchema>;
declare const SelectCompanionRequestSchema: z.ZodObject<{
    /** Stable key used across growth/rewards events, e.g. "comp-001-spark". */
    companionKey: z.ZodString;
    /** Display name the child sees, e.g. "Spark". */
    characterName: z.ZodString;
    /** Personality/teaching style descriptor from the chosen template. */
    characterStyle: z.ZodOptional<z.ZodString>;
    /** Teaching tone descriptor from the chosen template. */
    teachingTone: z.ZodOptional<z.ZodString>;
    /** Original template id the selection came from (provenance). */
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companionKey: string;
    characterName: string;
    characterStyle?: string | undefined;
    teachingTone?: string | undefined;
    templateId?: string | undefined;
}, {
    companionKey: string;
    characterName: string;
    characterStyle?: string | undefined;
    teachingTone?: string | undefined;
    templateId?: string | undefined;
}>;
type SelectCompanionRequest = z.infer<typeof SelectCompanionRequestSchema>;
declare const SelectCompanionResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    companion: z.ZodObject<{
        companionKey: z.ZodString;
        characterName: z.ZodString;
        bondLevel: z.ZodNumber;
        isActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        isActive: boolean;
        companionKey: string;
        characterName: string;
        bondLevel: number;
    }, {
        isActive: boolean;
        companionKey: string;
        characterName: string;
        bondLevel: number;
    }>;
}, "strip", z.ZodTypeAny, {
    companion: {
        isActive: boolean;
        companionKey: string;
        characterName: string;
        bondLevel: number;
    };
    success: true;
}, {
    companion: {
        isActive: boolean;
        companionKey: string;
        characterName: string;
        bondLevel: number;
    };
    success: true;
}>;
type SelectCompanionResponse = z.infer<typeof SelectCompanionResponseSchema>;
declare const StartMissionRequestSchema: z.ZodObject<{
    /** Canonical mission identifier. Hero Slice = "mission-001". */
    missionId: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    missionId: string;
}, {
    missionId?: string | undefined;
}>;
type StartMissionRequest = z.infer<typeof StartMissionRequestSchema>;
declare const StudentMissionTaskSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    interactionType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    interactionType: string;
}, {
    id: string;
    description: string;
    interactionType: string;
}>;
declare const StartMissionResponseSchema: z.ZodObject<{
    missionAttemptId: z.ZodString;
    missionId: z.ZodString;
    /** Provenance: 'ai' = compiled+validated; 'fallback' = static safe content. */
    contentSource: z.ZodEnum<["ai", "fallback"]>;
    storyHook: z.ZodString;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        interactionType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        interactionType: string;
    }, {
        id: string;
        description: string;
        interactionType: string;
    }>, "many">;
    rewardPreviewLabel: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storyHook: string;
    tasks: {
        id: string;
        description: string;
        interactionType: string;
    }[];
    rewardPreviewLabel: string;
    missionId: string;
    missionAttemptId: string;
    contentSource: "ai" | "fallback";
}, {
    storyHook: string;
    tasks: {
        id: string;
        description: string;
        interactionType: string;
    }[];
    rewardPreviewLabel: string;
    missionId: string;
    missionAttemptId: string;
    contentSource: "ai" | "fallback";
}>;
type StartMissionResponse = z.infer<typeof StartMissionResponseSchema>;
declare const CompleteMissionRequestSchema: z.ZodObject<{
    missionAttemptId: z.ZodString;
    /** Did the child finish all tasks (vs. just attempt)? Gates completion bonuses. */
    completedAllTasks: z.ZodDefault<z.ZodBoolean>;
    /** Did the child demonstrate the mastery bar (e.g. caught the AI mistake)? */
    masteryThresholdMet: z.ZodDefault<z.ZodBoolean>;
    /** Optional 0–1 evidence-weighted score. */
    masteryEvidenceScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    missionAttemptId: string;
    completedAllTasks: boolean;
    masteryThresholdMet: boolean;
    masteryEvidenceScore?: number | undefined;
}, {
    missionAttemptId: string;
    masteryEvidenceScore?: number | undefined;
    completedAllTasks?: boolean | undefined;
    masteryThresholdMet?: boolean | undefined;
}>;
type CompleteMissionRequest = z.infer<typeof CompleteMissionRequestSchema>;
declare const MissionRewardSummarySchema: z.ZodObject<{
    moolahEarned: z.ZodNumber;
    xpEarned: z.ZodNumber;
    housePointsEarned: z.ZodNumber;
    companionBondDelta: z.ZodNumber;
    badgesAwarded: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    moolahEarned: number;
    xpEarned: number;
    housePointsEarned: number;
    companionBondDelta: number;
    badgesAwarded: string[];
}, {
    moolahEarned: number;
    xpEarned: number;
    housePointsEarned: number;
    companionBondDelta: number;
    badgesAwarded: string[];
}>;
declare const CompleteMissionResponseSchema: z.ZodObject<{
    missionAttemptId: z.ZodString;
    status: z.ZodLiteral<"completed">;
    /** True if this completion was already recorded — no rewards were re-applied. */
    alreadyCompleted: z.ZodBoolean;
    rewards: z.ZodObject<{
        moolahEarned: z.ZodNumber;
        xpEarned: z.ZodNumber;
        housePointsEarned: z.ZodNumber;
        companionBondDelta: z.ZodNumber;
        badgesAwarded: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        moolahEarned: number;
        xpEarned: number;
        housePointsEarned: number;
        companionBondDelta: number;
        badgesAwarded: string[];
    }, {
        moolahEarned: number;
        xpEarned: number;
        housePointsEarned: number;
        companionBondDelta: number;
        badgesAwarded: string[];
    }>;
    evidenceCount: z.ZodNumber;
    masteryRecordsWritten: z.ZodNumber;
    /** parent_reports row id (First Learning Map), or null if assembly was skipped. */
    reportId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed";
    missionAttemptId: string;
    evidenceCount: number;
    alreadyCompleted: boolean;
    rewards: {
        moolahEarned: number;
        xpEarned: number;
        housePointsEarned: number;
        companionBondDelta: number;
        badgesAwarded: string[];
    };
    masteryRecordsWritten: number;
    reportId: string | null;
}, {
    status: "completed";
    missionAttemptId: string;
    evidenceCount: number;
    alreadyCompleted: boolean;
    rewards: {
        moolahEarned: number;
        xpEarned: number;
        housePointsEarned: number;
        companionBondDelta: number;
        badgesAwarded: string[];
    };
    masteryRecordsWritten: number;
    reportId: string | null;
}>;
type CompleteMissionResponse = z.infer<typeof CompleteMissionResponseSchema>;

/**
 * Moolah Ledger Mapper
 *
 * Usage:
 *   Import this mapper in any service that writes to or reads from
 *   the moolah_ledger table. Canonical insertion points:
 *
 *   - apps/api/src/routes/rewards/moolah.ts (Railway API reward endpoint)
 *   - apps/api/src/workers/mission-complete.worker.ts (effort + mastery reward dispatch)
 *   - packages/mission-compiler/src/rewards/mission-001-reward-rules.ts
 *     (when reward rules are hydrated into actual DB inserts)
 *
 * Key mismatches resolved here (Patch 3):
 *   - Zod `delta`         → DB `amount`
 *   - Zod `reason`        → DB `source_type`
 *   - Zod `referenceId`   → DB `source_id`
 *   - Zod `idempotencyKey`→ DB `idempotency_key`
 *   - Zod `walletId`      → DB `wallet_id`
 *   - Zod `childProfileId`→ DB `child_profile_id`
 *   - Zod `occurredAt`    → DB `created_at` (DB column; pass-through on read only)
 *   - DB `reason`         → human-readable string (no Zod equivalent; caller must supply)
 *   - DB `balance_after`  → set by trigger; never set by caller on INSERT
 *
 * Grounded in:
 *   Migration 004 (infra/supabase/migrations/004_rewards_moolah_companion.sql)
 *   rewards.schema.ts (MoolahLedgerEntrySchema)
 *   ADR-011 (reward economy)
 */

/**
 * Shape for INSERT into public.moolah_ledger.
 * Column names match the DB exactly (snake_case).
 *
 * Notes:
 *   - `balance_after` is set by the update_moolah_wallet_balance() trigger — omit on insert.
 *   - `reason` is a human-readable description (e.g. "Mission 001 completion").
 *     It is separate from `source_type`, which is the machine-readable category.
 *   - `idempotency_key` is optional; when provided, the DB UNIQUE constraint prevents
 *     duplicate reward events.
 */
interface MoolahLedgerDbInsert {
    child_profile_id: string;
    wallet_id?: string;
    amount: number;
    source_type: string;
    source_id?: string;
    reason: string;
    idempotency_key?: string;
}
/**
 * Shape of a row returned from SELECT on public.moolah_ledger.
 * Includes columns written by the DB (id, balance_after, created_at).
 */
interface MoolahLedgerDbRow {
    id: string;
    child_profile_id: string;
    wallet_id: string | null;
    amount: number;
    source_type: string;
    source_id: string | null;
    reason: string;
    balance_after: number | null;
    idempotency_key: string | null;
    created_at: string;
}
/**
 * Maps a domain MoolahLedgerEntry (Zod shape) to a DB insert shape.
 *
 * @param entry - The Zod-validated domain object.
 * @param humanReason - Human-readable description for the DB `reason` column
 *   (e.g. "Mission 001 effort reward"). This is required because the Zod schema
 *   does not carry a human-readable reason — it stores the machine-readable enum.
 *
 * Usage example:
 *   const dbInsert = moolahLedgerEntryToDb(entry, "Mission 001 completion reward");
 *   await supabase.from("moolah_ledger").insert(dbInsert);
 */
declare function moolahLedgerEntryToDb(entry: MoolahLedgerEntry, humanReason: string): MoolahLedgerDbInsert;
/**
 * Maps a DB moolah_ledger row back to a domain MoolahLedgerEntry.
 *
 * Note: DB `reason` (human-readable) has no field in MoolahLedgerEntry and is dropped.
 * Note: DB `created_at` maps to domain `occurredAt`.
 *
 * Usage example:
 *   const { data } = await supabase.from("moolah_ledger").select("*").eq("id", id);
 *   const entry = dbRowToMoolahLedgerEntry(data[0]);
 */
declare function dbRowToMoolahLedgerEntry(row: MoolahLedgerDbRow): MoolahLedgerEntry;

export { type AIFallbackNotificationLevel, AIFallbackNotificationLevelSchema, type AIOutputEnvelope, AIOutputEnvelopeSchema, type AIOutputResult, AIOutputResultSchema, type AIValidationAttempt, AIValidationAttemptSchema, AI_MAX_RETRY_ATTEMPTS, type AcademyIdentity, type AcademyIdentityResponse, AcademyIdentityResponseSchema, AcademyIdentitySchema, type AcademySeasonalEventPayload, AcademySeasonalEventPayloadSchema, type AcademyUnlockTriggeredPayload, AcademyUnlockTriggeredPayloadSchema, type AdminAccessRecord, AdminAccessRecordSchema, type AdminAccessRole, AdminAccessRoleSchema, type AdminRole, AdminRoleSchema, type AdminUser, AdminUserSchema, type ApprovalMode, ApprovalModeSchema, type Artifact, ArtifactSchema, type ArtifactType, ArtifactTypeSchema, type AuditAction, AuditActionSchema, type AuditLogEntry, AuditLogEntrySchema, type AvatarMovedPayload, AvatarMovedPayloadSchema, type Badge, type BadgeAward, BadgeAwardSchema, type BadgeAwardedPayload, BadgeAwardedPayloadSchema, type BadgeCategory, BadgeCategorySchema, BadgeSchema, type CalibrationEvidenceCaptureType, CalibrationEvidenceCaptureTypeSchema, type CalibrationSignal, CalibrationSignalSchema, type CalibrationSignalType, CalibrationSignalTypeSchema, type CalibrationStage, CalibrationStageSchema, type ChatMessage, ChatMessageSchema, type ChatMessageType, ChatMessageTypeSchema, type ChatMode, ChatModeSchema, type ChildBadge, ChildBadgeSchema, type ChildPermissions, ChildPermissionsSchema, type ChildPersonalization, ChildPersonalizationSchema, type ChildProfile, ChildProfileSchema, type ChildSession, ChildSessionSchema, type ChildSessionScope, ChildSessionScopeSchema, type CompanionBondIncreasedPayload, CompanionBondIncreasedPayloadSchema, type CompanionDialogueLine, CompanionDialogueLineSchema, type CompanionGrowthEvent, CompanionGrowthEventSchema, type CompanionGrowthType, CompanionGrowthTypeSchema, type CompanionMilestoneReachedPayload, CompanionMilestoneReachedPayloadSchema, type CompleteMissionRequest, CompleteMissionRequestSchema, type CompleteMissionResponse, CompleteMissionResponseSchema, type ConsentType, ConsentTypeSchema, type DataAccessScope, DataAccessScopeSchema, type DataDomain, DataDomainSchema, type DataPrincipal, DataPrincipalSchema, type DatasetEligibility, DatasetEligibilitySchema, type DeidentifiedEvent, DeidentifiedEventSchema, type DeidentifiedEventType, DeidentifiedEventTypeSchema, type DeliveryMode, DeliveryModeSchema, type DistractorRule, DistractorRuleSchema, type EscalationRecord, EscalationRecordSchema, type EscalationSeverity, EscalationSeveritySchema, type EvidenceCapturePoint, EvidenceCapturePointSchema, type EvidenceCaptureType, EvidenceCaptureTypeSchema, type EvidenceHighlight, EvidenceHighlightSchema, type EvidenceHighlightType, EvidenceHighlightTypeSchema, type EvidencePlan, EvidencePlanSchema, type GameProgressSummary, GameProgressSummarySchema, type Grade, GradeSchema, type HintLadder, HintLadderSchema, type HintTier, HintTierSchema, type House, type HouseLeaderboardPeriod, HouseLeaderboardPeriodSchema, type HouseLeaderboardSnapshot, HouseLeaderboardSnapshotSchema, type HouseLeaderboardUpdatedPayload, HouseLeaderboardUpdatedPayloadSchema, type HousePointEvent, HousePointEventSchema, type HousePointsEarnedPayload, HousePointsEarnedPayloadSchema, type HousePointsReason, HousePointsReasonSchema, type HousePointsRecord, HousePointsRecordSchema, type HouseRanking, HouseRankingSchema, HouseSchema, type Household, HouseholdSchema, type ItemAttributes, ItemAttributesSchema, type LaunchMode, LaunchModeSchema, type LearnerCalibrationScore, LearnerCalibrationScoreSchema, type LearningEvidenceEvent, LearningEvidenceEventSchema, type LearningStyle, LearningStyleSchema, type LessonTaskSkeleton, LessonTaskSkeletonSchema, type LessonTaskType, LessonTaskTypeSchema, type LiteCard, LiteCardSchema, type LiteInteraction, LiteInteractionSchema, type MasteryLevel, MasteryLevelSchema, type MasteryProgressLevel, MasteryProgressLevelSchema, type MasteryProgressSummary, MasteryProgressSummarySchema, type MasteryRecord, MasteryRecordSchema, type Mission, type MissionAbandonedPayload, MissionAbandonedPayloadSchema, type MissionAttempt, MissionAttemptSchema, type MissionCompletedPayload, MissionCompletedPayloadSchema, type MissionOutput, MissionOutputSchema, type MissionReplayEvent, MissionReplayEventSchema, MissionRewardSummarySchema, MissionSchema, type MissionStartedPayload, MissionStartedPayloadSchema, type MissionStatus, MissionStatusSchema, type MissionStepCompletedPayload, MissionStepCompletedPayloadSchema, type MissionTask, MissionTaskSchema, type ModelImprovementConsent, ModelImprovementConsentSchema, type ModerationCheckResult, ModerationCheckResultSchema, type ModerationCheckType, ModerationCheckTypeSchema, type ModerationEvent, ModerationEventSchema, type ModerationOutcome, ModerationOutcomeSchema, type ModerationTrigger, ModerationTriggerSchema, type MoolahEarnedPayload, MoolahEarnedPayloadSchema, type MoolahLedgerDbInsert, type MoolahLedgerDbRow, type MoolahLedgerEntry, MoolahLedgerEntrySchema, type MoolahReason, MoolahReasonSchema, type MoolahSpentPayload, MoolahSpentPayloadSchema, type MoolahWallet, MoolahWalletSchema, type NextMissionRecommendation, NextMissionRecommendationSchema, type ParentAccount, ParentAccountSchema, type ParentConsent, ParentConsentSchema, type ParentIntent, ParentIntentSchema, type ParentPlan, ParentPlanSchema, type ParentReport, ParentReportSchema, type ParentReportType, ParentReportTypeSchema, type ParentVisibilityFlags, ParentVisibilityFlagsSchema, type ParentVisibilityMode, ParentVisibilityModeSchema, type PortfolioItem, PortfolioItemSchema, type QuickChatCategory, QuickChatCategorySchema, type QuickChatOption, QuickChatOptionSchema, type ReadingTier, ReadingTierSchema, type RewardPlan, RewardPlanSchema, type RoomJoinedPayload, RoomJoinedPayloadSchema, type RoomLeftPayload, RoomLeftPayloadSchema, type RulePredicate, type RulePredicateLeaf, RulePredicateLeafSchema, RulePredicateSchema, type SafeFallback, type SafeFallbackContext, SafeFallbackContextSchema, SafeFallbackSchema, type SelectCompanionRequest, SelectCompanionRequestSchema, type SelectCompanionResponse, SelectCompanionResponseSchema, type SelectableHouse, SelectableHouseSchema, type SessionEntryMethod, SessionEntryMethodSchema, type SetHouseRequest, SetHouseRequestSchema, type SetHouseResponse, SetHouseResponseSchema, type SkeletonFill, type SkeletonFillItem, SkeletonFillItemSchema, SkeletonFillSchema, type StandardsAlignment, StandardsAlignmentSchema, type StartMissionRequest, StartMissionRequestSchema, type StartMissionResponse, StartMissionResponseSchema, type StartSessionRequest, StartSessionRequestSchema, type StartSessionResponse, StartSessionResponseSchema, type Student3dMission, Student3dMissionSchema, type StudentInteractiveLite, StudentInteractiveLiteSchema, StudentMissionTaskSchema, type StudentTextAudioOffline, StudentTextAudioOfflineSchema, type TrustedDevice, TrustedDeviceSchema, type VariantKey, VariantKeySchema, type VerifySessionResponse, VerifySessionResponseSchema, type VisibilityTier, VisibilityTierSchema, WORLD_EVENT_PAYLOAD_SCHEMAS, type WorldDecorationPlacedPayload, WorldDecorationPlacedPayloadSchema, type WorldEvent, WorldEventSchema, type WorldEventType, WorldEventTypeSchema, type WorldRepairCompletedPayload, WorldRepairCompletedPayloadSchema, type XPEvent, XPEventSchema, type XpEarnedPayload, XpEarnedPayloadSchema, type XpEvent, XpEventSchema, buildChatMessage, buildChildSessionScope, dbRowToMoolahLedgerEntry, moolahLedgerEntryToDb };
