"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BetaApplicationFormData {
  first_name: string;
  email: string;
  child_count: number;
  grade_levels: string[];
  family_type: string;
  teaching_style: string;
  ai_curiosity_score: number;
  current_subjects: string;
  biggest_challenge: string;
  three_d_excitement: number;
  inner_circle_willing: string;
  referral_source: string;
}

export interface SubmitResult {
  error?: string;
}

// ---------------------------------------------------------------------------
// Fit score computation (server-side only — ADR-041, agent_operating_rules.md)
//
// Max 100 points:
//   Homeschool/co-op relevance    max 25
//   AI/STEAM curiosity            max 20
//   Age fit (grade levels K–8)    max 15
//   Pain urgency (default 10)     max 15  — manual review adjusts
//   Feedback commitment           max 15
//   3D excitement                 max 10
//
// Note: "Inner Circle potential" (max 5 per ADR-041) is folded into
// feedback commitment and AI curiosity for now — manual review determines
// Inner Circle designation. OQ-GTM-003: confirm scoring weights with founder.
// ---------------------------------------------------------------------------

function computeFitScore(data: BetaApplicationFormData): number {
  let score = 0;

  // Homeschool/co-op relevance (max 25)
  switch (data.family_type) {
    case "full-time-homeschool":
      score += 25;
      break;
    case "hybrid":
      score += 20;
      break;
    case "microschool":
    case "co-op-pod":
      score += 15;
      break;
    case "afterschool-enrichment":
      score += 10;
      break;
    default:
      score += 5;
  }

  // AI/STEAM curiosity (max 20): scale 1–5 → 0–20
  // 1 → 0, 2 → 5, 3 → 10, 4 → 15, 5 → 20
  const curiosityMapped = Math.max(0, (data.ai_curiosity_score - 1) * 5);
  score += Math.min(20, curiosityMapped);

  // Age fit (max 15): K–8 is fully in scope; outside K–8 reduces score
  const validGrades = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];
  const gradesInScope = data.grade_levels.filter((g) =>
    validGrades.includes(g)
  );
  if (data.grade_levels.length === 0) {
    score += 5; // No grades listed — small signal
  } else if (gradesInScope.length === data.grade_levels.length) {
    score += 15; // All grades in K–8 range
  } else if (gradesInScope.length > 0) {
    score += 10; // Mixed — some in scope
  } else {
    score += 5; // None in K–8 range
  }

  // Pain urgency (max 15): default 10 — manual review will adjust based on
  // biggest_challenge free-text. We leave this as a fixed default for now.
  // OQ-GTM-003: consider basic keyword detection in Sprint 2.
  score += 10;

  // Feedback commitment (max 15)
  switch (data.inner_circle_willing) {
    case "yes":
      score += 15;
      break;
    case "maybe":
      score += 7;
      break;
    case "no":
    default:
      score += 0;
  }

  // 3D excitement (max 10): scale 1–5 → 0–10
  // 1 → 0, 2 → 2, 3 → 5, 4 → 7, 5 → 10
  const excitementMap: Record<number, number> = { 1: 0, 2: 2, 3: 5, 4: 7, 5: 10 };
  score += excitementMap[data.three_d_excitement] ?? 0;

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Service role client (bypasses RLS for secure server-side INSERT)
// The beta_applications table has NO authenticated insert policy by design.
// Server Actions run on the server and use SUPABASE_SERVICE_ROLE_KEY.
// ---------------------------------------------------------------------------

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[L3ARN] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
        "Beta application submission requires both to be set on the server."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_GRADE_LEVELS = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];
const VALID_FAMILY_TYPES = [
  "full-time-homeschool",
  "hybrid",
  "afterschool-enrichment",
  "microschool",
  "co-op-pod",
];
const VALID_TEACHING_STYLES = [
  "structured",
  "flexible",
  "eclectic",
  "still-figuring-it-out",
];
const VALID_INNER_CIRCLE = ["yes", "maybe", "no"];

function validateFormData(
  data: Partial<BetaApplicationFormData>
): string | null {
  if (!data.first_name || data.first_name.trim().length === 0) {
    return "First name is required.";
  }
  if (data.first_name.trim().length > 100) {
    return "First name is too long.";
  }
  if (!data.email || !/^[^@]+@[^@]+\.[^@]+$/.test(data.email.trim())) {
    return "A valid email address is required.";
  }
  if (data.child_count === undefined || data.child_count === null) {
    return "Number of children is required.";
  }
  if (data.child_count < 0 || data.child_count > 20) {
    return "Please enter a valid number of children.";
  }
  if (!data.grade_levels || data.grade_levels.length === 0) {
    return "Please select at least one grade level.";
  }
  const invalidGrades = data.grade_levels.filter(
    (g) => !VALID_GRADE_LEVELS.includes(g)
  );
  if (invalidGrades.length > 0) {
    return "One or more grade levels are invalid.";
  }
  if (!data.family_type || !VALID_FAMILY_TYPES.includes(data.family_type)) {
    return "Please select what best describes your family.";
  }
  if (
    !data.teaching_style ||
    !VALID_TEACHING_STYLES.includes(data.teaching_style)
  ) {
    return "Please select your teaching style.";
  }
  if (
    !data.ai_curiosity_score ||
    data.ai_curiosity_score < 1 ||
    data.ai_curiosity_score > 5
  ) {
    return "Please rate your AI curiosity (1–5).";
  }
  if (
    !data.three_d_excitement ||
    data.three_d_excitement < 1 ||
    data.three_d_excitement > 5
  ) {
    return "Please rate your 3D excitement (1–5).";
  }
  if (
    !data.inner_circle_willing ||
    !VALID_INNER_CIRCLE.includes(data.inner_circle_willing)
  ) {
    return "Please indicate your feedback commitment.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server Action: submitBetaApplication
// ---------------------------------------------------------------------------

export async function submitBetaApplication(
  _prevState: SubmitResult,
  formData: FormData
): Promise<SubmitResult> {
  // Parse form data
  const rawData: Partial<BetaApplicationFormData> = {
    first_name: (formData.get("first_name") as string | null)?.trim() ?? "",
    email: (formData.get("email") as string | null)?.trim().toLowerCase() ?? "",
    child_count: parseInt(formData.get("child_count") as string, 10) || 0,
    grade_levels: formData.getAll("grade_levels") as string[],
    family_type: (formData.get("family_type") as string | null) ?? "",
    teaching_style: (formData.get("teaching_style") as string | null) ?? "",
    ai_curiosity_score:
      parseInt(formData.get("ai_curiosity_score") as string, 10) || 0,
    current_subjects:
      (formData.get("current_subjects") as string | null)?.trim().slice(0, 500) ??
      "",
    biggest_challenge:
      (formData.get("biggest_challenge") as string | null)
        ?.trim()
        .slice(0, 500) ?? "",
    three_d_excitement:
      parseInt(formData.get("three_d_excitement") as string, 10) || 0,
    inner_circle_willing:
      (formData.get("inner_circle_willing") as string | null) ?? "",
    referral_source:
      (formData.get("referral_source") as string | null)?.trim().slice(0, 300) ??
      "",
  };

  // Server-side validation
  const validationError = validateFormData(rawData);
  if (validationError) {
    return { error: validationError };
  }

  const validData = rawData as BetaApplicationFormData;

  // Compute fit score server-side (never client-side)
  const fitScore = computeFitScore(validData);

  // Determine inner circle candidate: Yes + high fit score
  const innerCircleCandidate =
    validData.inner_circle_willing === "yes" && fitScore >= 70;

  // Insert into beta_applications using service role (bypasses RLS)
  const supabase = getServiceRoleClient();

  const { error: dbError } = await supabase
    .from("beta_applications")
    .insert({
      email: validData.email,
      first_name: validData.first_name,
      child_count: validData.child_count,
      grade_levels: validData.grade_levels,
      family_type: validData.family_type,
      teaching_style: validData.teaching_style,
      ai_curiosity_score: validData.ai_curiosity_score,
      current_subjects: validData.current_subjects || null,
      biggest_challenge: validData.biggest_challenge || null,
      three_d_excitement: validData.three_d_excitement,
      inner_circle_willing: validData.inner_circle_willing,
      referral_source: validData.referral_source || null,
      fit_score: fitScore,
      inner_circle_candidate: innerCircleCandidate,
      status: "pending-review",
    });

  if (dbError) {
    // Handle duplicate email (UNIQUE constraint violation)
    if (
      dbError.code === "23505" ||
      dbError.message?.includes("beta_applications_email_unique")
    ) {
      return {
        error:
          "An application with this email address already exists. If you need to update your application, please contact us.",
      };
    }

    console.error("[L3ARN] Beta application insert error:", dbError);
    return {
      error:
        "Something went wrong submitting your application. Please try again.",
    };
  }

  // TODO (Agent 12 / OQ-GTM-004): Trigger confirmation email to applicant.
  // Suggested provider: Resend or SendGrid. See docs/OPEN_QUESTIONS.md.
  // Do NOT implement email sending here until provider is confirmed.

  // Redirect to thank-you page with first_name as URL param.
  // No application data returned to the user — only their first name
  // (which they submitted) for personalization.
  redirect(
    `/apply/thank-you?name=${encodeURIComponent(validData.first_name)}`
  );
}
