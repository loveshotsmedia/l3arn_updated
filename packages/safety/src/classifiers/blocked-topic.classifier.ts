/**
 * Blocked Topic Classifier
 *
 * Checks AI-generated content against:
 *   1. Parent-configured blocked topics (from ChildPermissions.blockedTopics)
 *   2. Platform-level blocked categories (hardcoded; NOT configurable by parents)
 *
 * Platform blocked categories are safety and legal baselines. Parents may ADD
 * additional blocked topics on top of these, but they cannot remove or soften
 * platform-level blocks. This is enforced by design — the platform list is
 * hardcoded here and is never sourced from parent input.
 *
 * Safety stack: safety/legal → parent boundaries → mastery/standards → personalization
 * (CONTEXT.md §6 decision #17; agent_operating_rules.md Conflict Resolution Protocol)
 *
 * Grounded in: ADR-014 (mission constraint), ADR-015 (conflict resolution),
 * MASTER_HANDOFF §9.3 (child social safety rules).
 */

// ─── Platform Blocked Categories ─────────────────────────────────────────────
// Hardcoded. NOT configurable by parents. Parents can add their own topic blocks
// but cannot override or remove these platform-level categories.
// Adding a new category here requires a filed ADR.

export type BlockedCategory =
  | "sexual-content"
  | "graphic-violence"
  | "off-platform-contact"
  | "political-persuasion"
  | "medical-advice"
  | "legal-advice"
  | "substance-use";

export const PLATFORM_BLOCKED_CATEGORIES: readonly BlockedCategory[] = [
  "sexual-content",
  "graphic-violence",
  "off-platform-contact",   // e.g. "add me on Discord", "give me your email"
  "political-persuasion",   // opinion content trying to influence child's politics
  "medical-advice",         // diagnosis, medication recommendations
  "legal-advice",
  "substance-use",
] as const;

// ─── Keyword Maps per Platform Category ──────────────────────────────────────
// These are conservative, broad-first keyword lists. They are checked via
// case-insensitive substring match. This approach is intentionally higher
// recall / lower precision — safety errs toward blocking over permitting.
//
// OPEN QUESTION: Should keyword maps be sourced from a versioned, admin-managed
// database instead of being hardcoded here? A DB-backed list would allow rapid
// updates without a deploy, but introduces a runtime dependency into a pure
// stateless package. Defer to Phase 2 when the admin dashboard is scoped.
// — Agent 7, Phase 0

const CATEGORY_KEYWORDS: Record<BlockedCategory, readonly string[]> = {
  "sexual-content": [
    "sex", "sexual", "nude", "naked", "porn", "pornography", "erotic",
    "intercourse", "genitalia", "genital", "breasts", "penis", "vagina",
    "masturbat", "orgasm", "sexually",
  ],
  "graphic-violence": [
    "gore", "dismember", "decapitat", "torture", "mutilat", "graphic killing",
    "gruesome", "eviscerat", "brutally murder", "graphic death",
  ],
  "off-platform-contact": [
    "discord", "snapchat", "instagram", "tiktok", "telegram", "whatsapp",
    "give me your number", "give me your email", "text me", "dm me",
    "add me on", "follow me on", "my username is", "my handle is",
    "meet me", "contact me outside", "reach me at",
  ],
  "political-persuasion": [
    "you should vote", "you should support", "is the best president",
    "is a great leader", "is a bad president", "political party",
    "republicans are", "democrats are", "liberals are", "conservatives are",
    "vote for", "elect", "political opinion",
  ],
  "medical-advice": [
    "take this medication", "you should take", "dosage", "prescri",
    "diagnos", "you have", "you might have", "symptoms of",
    "medical condition", "treat yourself", "home remedy for your",
    "you are sick with",
  ],
  "legal-advice": [
    "you should sue", "file a lawsuit", "legal action", "consult a lawyer",
    "attorney", "you have a case", "legally speaking", "your rights are",
    "you are entitled to", "sign this contract",
  ],
  "substance-use": [
    "alcohol", "beer", "wine", "vodka", "whiskey", "marijuana", "cannabis",
    "cocaine", "heroin", "meth", "drug use", "how to get high",
    "how to get drunk", "vape", "cigarette", "tobacco",
  ],
};

// ─── Result Types ─────────────────────────────────────────────────────────────

export type BlockedTopicConfidence = "high" | "medium" | "low";

export interface BlockedTopicResult {
  blocked: boolean;
  matchedTopic: string | null;          // null when not blocked
  confidence: BlockedTopicConfidence;
  source: "platform" | "parent" | null; // null when not blocked
}

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classifies content against platform blocked categories and parent blocked topics.
 *
 * Platform categories are checked first (higher priority).
 * Parent blocked topics are checked via simple substring matching after
 * optional keyword expansion (plurals, common suffixes).
 *
 * Returns on first match — does not aggregate all violations.
 * Callers that need all violations should run checkCompanionBoundaries instead.
 *
 * OPEN QUESTION: Should this return ALL matched violations rather than
 * short-circuiting on first? The boundary checker (companion-boundary.checker.ts)
 * already collects all violations. For this classifier (used on mission output),
 * returning first match may be sufficient — revisit when the moderation event
 * schema is wired to a UI. — Agent 7, Phase 0
 */
export function classifyBlockedTopics(
  content: string,
  parentBlockedTopics: string[],
  platformBlockedCategories: BlockedCategory[] = [...PLATFORM_BLOCKED_CATEGORIES],
): BlockedTopicResult {
  const normalized = content.toLowerCase();

  // 1. Platform-level check (always runs; cannot be skipped by parent config)
  for (const category of platformBlockedCategories) {
    const keywords = CATEGORY_KEYWORDS[category];
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        // High confidence for exact keyword matches; medium if keyword is short
        // (short keywords have higher false-positive risk)
        const confidence: BlockedTopicConfidence = keyword.length >= 6 ? "high" : "medium";
        return {
          blocked: true,
          matchedTopic: category,
          confidence,
          source: "platform",
        };
      }
    }
  }

  // 2. Parent-configured topic check
  // Expands each parent topic to include basic plural/suffix variants.
  for (const topic of parentBlockedTopics) {
    if (!topic || topic.trim().length === 0) continue;

    const variants = expandParentTopic(topic.toLowerCase().trim());
    for (const variant of variants) {
      if (normalized.includes(variant)) {
        return {
          blocked: true,
          matchedTopic: topic,
          confidence: variant === topic.toLowerCase().trim() ? "high" : "medium",
          source: "parent",
        };
      }
    }
  }

  return {
    blocked: false,
    matchedTopic: null,
    confidence: "low",
    source: null,
  };
}

// ─── Keyword Expansion ────────────────────────────────────────────────────────
// Simple expansion of a parent-provided topic to catch obvious variants.
// Not a full stemmer — keeps logic stateless and dependency-free.

function expandParentTopic(topic: string): string[] {
  const variants = new Set<string>([topic]);

  // Plurals
  variants.add(topic + "s");
  variants.add(topic + "es");
  variants.add(topic + "ing");
  variants.add(topic + "ed");

  // If topic ends in 'y', try 'ies'
  if (topic.endsWith("y")) {
    variants.add(topic.slice(0, -1) + "ies");
  }

  return Array.from(variants);
}
