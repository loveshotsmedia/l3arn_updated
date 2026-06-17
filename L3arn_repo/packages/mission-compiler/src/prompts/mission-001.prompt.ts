/**
 * Mission 001 Prompt Template
 *
 * Generates the structured prompt sent to Claude (via @anthropic-ai/sdk) for
 * Mission 001: "Repair the Sorting Computer + Learner Calibration."
 *
 * Conflict resolution order (ADR-015), embedded directly in the prompt so
 * Claude applies it before generating output:
 *   1. Safety/legal boundaries (always win — never violate)
 *   2. Parent-set boundaries (blockedTopics, customInstructions)
 *   3. Mastery/standards alignment (reformatted if needed, never discarded)
 *   4. Child personalization (delivery format and scaffolding)
 *   5. Child theme/preference (decorates the mission)
 *
 * Three-part constraint (ADR-014): every call must supply all three:
 *   - parentIntent
 *   - childPersonalization
 *   - masteryTargets
 *
 * OPEN QUESTION: The prompt currently targets claude-3-5-sonnet-20241022. If the
 * project moves to a different model family (e.g. claude-3-7-sonnet), the
 * promptTemplateVersion should be bumped and the model's JSON-mode behavior
 * re-verified. — Agent 6, Phase 0
 *
 * OPEN QUESTION: The JSON schema embedded in the prompt is a simplified
 * description, not a formal JSON Schema object. If Claude's structured output
 * feature (tool_use/response_format) is adopted for this call, this prompt
 * should be refactored to use the tool_use pattern with a formal schema.
 * — Agent 6, Phase 0
 */

export const MISSION_001_PROMPT_TEMPLATE_VERSION = "0.1.0";

export interface Mission001PromptInput {
  parentIntent: {
    curriculumGoals: string[];
    gradeLevel: string;
    blockedTopics: string[];
    subjectFocus: string[];
  };
  childPersonalization: {
    displayName: string;
    houseAffiliation: string;
    companionPersonality: string;
    learningPrefs: string[];
  };
  masteryTargets: {
    standardIds: string[];
    targetSkills: string[];
  };
}

/**
 * Build the system prompt for Mission 001. This prompt:
 * 1. Tells Claude its role and constraints
 * 2. Specifies the exact JSON shape it must return
 * 3. Enforces the conflict resolution order
 */
export function buildMission001SystemPrompt(): string {
  return `You are the L3ARN Mission Compiler — an AI system that generates educational missions for K-8 students in a safe, parent-controlled homeschool platform.

## Your Role
Generate Mission 001: "Repair the Sorting Computer + Learner Calibration" — a starter mission that teaches a sorting/classification concept while gathering calibration signals about how this student learns best.

## Conflict Resolution Order (MANDATORY — apply in this sequence)
1. SAFETY/LEGAL: Never generate content that is harmful, inappropriate for K-8, or violates child safety standards. This always wins.
2. PARENT BOUNDARIES: Honor all blocked topics and parent instructions exactly.
3. MASTERY/STANDARDS: The skill target cannot be discarded — reformat it if needed to fit personalization, but always preserve the core academic objective.
4. CHILD PERSONALIZATION: Adapt delivery format, scaffolding, and pacing to the child's learning preferences.
5. CHILD THEME/PREFERENCE: Use the child's house, companion personality, and interests to decorate the mission.

## Output Requirements
You MUST return ONLY valid JSON matching the schema below. No preamble, no explanation, no markdown fencing — just the JSON object.

## Required JSON Schema
{
  "parentPlan": {
    "objective": "string — what skill this mission teaches",
    "standardsAlignment": {
      "masterySkillId": "string",
      "masteryDomainId": "string",
      "masteryObjective": "string — clear learning objective",
      "floridaStandardCode": "string (optional)",
      "l3arnMasteryLevel": "emerging | developing | proficient | advanced",
      "evidenceThreshold": "string — what counts as mastery"
    },
    "materials": ["array of strings — materials needed"],
    "steps": ["array of strings — what the parent should know"],
    "safetyNotes": "string (optional)",
    "evidenceSummary": "string — what evidence this mission captures",
    "masteryThreshold": "string — how mastery is determined",
    "whyChosen": "string — how the mission satisfies the three-part constraint"
  },
  "student3dMission": {
    "storyHook": "string — the in-world narrative hook for the student",
    "worldRoomId": "great-hall",
    "companionDialogue": [
      {
        "companionId": "string",
        "line": "string",
        "trigger": "on-start | on-hint-requested | on-step-complete | on-mistake | on-mission-complete"
      }
    ],
    "tasks": [
      {
        "id": "string",
        "description": "string — what the student does",
        "interactionType": "click | drag | choice | text-input | observe | sequence",
        "assetRefs": ["optional array of asset IDs"],
        "isEvidenceCapturePoint": true | false
      }
    ],
    "rewardPreviewLabel": "string — reward summary shown before starting"
  },
  "studentInteractiveLite": {
    "cards": [
      {
        "id": "string",
        "contentText": "string",
        "illustrationRef": "string (optional)",
        "audioRef": "string (optional)",
        "interactions": [
          {
            "type": "choice | tap | drag",
            "prompt": "string",
            "options": ["optional array for choice interactions"]
          }
        ]
      }
    ]
  },
  "studentTextAudioOffline": {
    "steps": ["array of plain-text step descriptions"],
    "readAloudScript": "string (optional)",
    "printableTaskDescription": "string",
    "artifactUploadInstructions": "string (optional)"
  },
  "evidencePlan": {
    "capturePoints": [
      {
        "stepId": "string — matches a task id",
        "captureType": "decision-log | sequence-completion | ai-mistake-check | explanation | reflection | artifact-upload | structured-replay",
        "retentionDays": 365,
        "parentVisible": true,
        "portfolioEligible": true | false
      }
    ],
    "noWebcam": true,
    "noFaceCapture": true
  },
  "rewardPlan": {
    "effortMoolah": 10,
    "effortXp": 50,
    "masteryMoolah": 25,
    "masteryXp": 100,
    "companionBondIncrease": 5,
    "housePointsContribution": 3,
    "badgeIds": ["optional"],
    "masteryGated": false
  }
}

## Privacy Rules (NON-NEGOTIABLE)
- noWebcam MUST be true — never suggest or require webcam use
- noFaceCapture MUST be true — no facial recognition or face capture
- Never include real student names, addresses, or identifying information in mission content
- Audio is optional and parent-controlled — never require it

## Mission 001 Calibration Signals
This mission should help calibrate:
- Reading/listening behavior (does the student prefer text or audio prompts?)
- Cognitive load (do they need hints? how quickly do they proceed?)
- AI readiness (are they comfortable interacting with the AI companion?)
- Persistence (do they retry on mistakes?)
- Delivery mode preference (3D, interactive-lite, or text/offline?)

Include at least one "ai-mistake-check" evidence capture point — this is the signature of Mission 001 where the student corrects a deliberate sorting error made by the AI.`;
}

/**
 * Build the user message for Mission 001 — the three-part constraint input.
 */
export function buildMission001UserMessage(input: Mission001PromptInput): string {
  const { parentIntent, childPersonalization, masteryTargets } = input;

  return `Generate Mission 001 for this student.

## Constraint 1: Parent Intent
- Grade Level: ${parentIntent.gradeLevel}
- Curriculum Goals: ${parentIntent.curriculumGoals.join(", ") || "General K-8 foundational skills"}
- Subject Focus: ${parentIntent.subjectFocus.join(", ") || "General"}
- Blocked Topics: ${parentIntent.blockedTopics.length > 0 ? parentIntent.blockedTopics.join(", ") : "None specified"}

## Constraint 2: Child Personalization
- Academy Display Name: ${childPersonalization.displayName}
- House Affiliation: ${childPersonalization.houseAffiliation}
- Companion Personality: ${childPersonalization.companionPersonality}
- Learning Preferences: ${childPersonalization.learningPrefs.join(", ") || "Not yet specified — use calibration signals"}

## Constraint 3: Mastery / Standards Targets
- Standard IDs: ${masteryTargets.standardIds.join(", ") || "L3ARN-SORT-001 (sorting and classification)"}
- Target Skills: ${masteryTargets.targetSkills.join(", ") || "Sorting by one attribute, recognizing patterns, explaining sorting logic"}

## Mission Theme
The Sorting Computer in the Great Hall has malfunctioned. The student's companion needs their help to sort objects correctly so the Academy can run the Sorting Ceremony. Personalize this theme to the child's house and companion.

Return ONLY the JSON object. No other text.`;
}
