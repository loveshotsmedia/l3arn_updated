/**
 * Beta Application Form — Agent 12 Task 2
 *
 * This is a Client Component because the form uses useActionState/useFormStatus
 * for progressive enhancement (React 19 + Next.js 15 App Router pattern).
 *
 * Rules enforced:
 * - No PII beyond email + first_name collected
 * - No child names, birthdates, or school records
 * - Fit score computed server-side only (in actions.ts)
 * - Duplicate submissions blocked by email uniqueness (DB constraint)
 * - 10–12 questions per ADR-040 spec
 */
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitBetaApplication, type SubmitResult } from "./actions";

// Note: This is a Client Component ("use client") for form interactivity.
// Metadata for /apply is set in the root layout (apps/web/src/app/layout.tsx).
// If /apply-specific metadata is needed, create a server component wrapper
// or a dedicated metadata.ts file in this directory.
// TODO (OQ-GTM-005): Add /apply-specific page title and OG metadata.

const GRADE_OPTIONS = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st Grade" },
  { value: "2", label: "2nd Grade" },
  { value: "3", label: "3rd Grade" },
  { value: "4", label: "4th Grade" },
  { value: "5", label: "5th Grade" },
  { value: "6", label: "6th Grade" },
  { value: "7", label: "7th Grade" },
  { value: "8", label: "8th Grade" },
];

const FAMILY_TYPE_OPTIONS = [
  { value: "full-time-homeschool", label: "Full-time homeschool" },
  { value: "hybrid", label: "Hybrid (part-time school + home)" },
  { value: "afterschool-enrichment", label: "Afterschool enrichment" },
  { value: "microschool", label: "Microschool" },
  { value: "co-op-pod", label: "Co-op pod" },
];

const TEACHING_STYLE_OPTIONS = [
  { value: "structured", label: "Structured" },
  { value: "flexible", label: "Flexible" },
  { value: "eclectic", label: "Eclectic" },
  { value: "still-figuring-it-out", label: "Still figuring it out" },
];

// ---------------------------------------------------------------------------
// Submit Button (uses useFormStatus for pending state)
// ---------------------------------------------------------------------------

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        padding: "1rem",
        backgroundColor: pending ? "#a0aec0" : "#4f6ef7",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        fontWeight: 700,
        fontSize: "1.05rem",
        cursor: pending ? "not-allowed" : "pointer",
        marginTop: "1rem",
        transition: "background-color 0.2s",
      }}
    >
      {pending ? "Submitting your application…" : "Submit Application"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scale Question Component (1–5 rating)
// ---------------------------------------------------------------------------

function ScaleQuestion({
  name,
  id,
  lowLabel,
  highLabel,
  required,
}: {
  name: string;
  id: string;
  lowLabel: string;
  highLabel: string;
  required?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{ fontSize: "0.85rem", color: "#6b6b8a", minWidth: "80px" }}
        >
          {lowLabel}
        </span>
        {[1, 2, 3, 4, 5].map((val) => (
          <label
            key={val}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}
          >
            <input
              type="radio"
              name={name}
              id={`${id}-${val}`}
              value={String(val)}
              required={required && val === 1}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.85rem", color: "#4a4a6a" }}>{val}</span>
          </label>
        ))}
        <span
          style={{ fontSize: "0.85rem", color: "#6b6b8a", minWidth: "80px" }}
        >
          {highLabel}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "0.95rem",
  color: "#1a1a2e",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  color: "#1a1a2e",
  marginBottom: "0.5rem",
  fontSize: "0.95rem",
};

const questionBlockStyle: React.CSSProperties = {
  marginBottom: "1.75rem",
};

// ---------------------------------------------------------------------------
// Main form component
// ---------------------------------------------------------------------------

const initialState: SubmitResult = {};

export default function ApplyPage() {
  const [state, formAction] = useActionState(submitBetaApplication, initialState);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f7f4",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem 1rem",
      }}
    >
      {/* Back link */}
      <div style={{ maxWidth: "660px", margin: "0 auto 1.5rem" }}>
        <a
          href="/"
          style={{
            color: "#4f6ef7",
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          &#8592; Back to home
        </a>
      </div>

      <div
        style={{
          maxWidth: "660px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "2.5rem 2rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#6b6b8a",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.5rem",
            }}
          >
            Founding Family Beta
          </p>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#1a1a2e",
              lineHeight: 1.3,
              marginBottom: "0.75rem",
            }}
          >
            Apply for L3ARN Founding Family Beta
          </h1>
          <p style={{ color: "#4a4a6a", lineHeight: 1.6, fontSize: "0.95rem" }}>
            We review every application personally. Limited to 100 founding
            families. We&apos;ll be in touch within 2 weeks.
          </p>
        </div>

        {/* Error message (from server action) */}
        {state.error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              padding: "0.85rem 1rem",
              marginBottom: "1.5rem",
              color: "#7f1d1d",
              fontSize: "0.9rem",
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction} noValidate>
          {/* Q1 — First name */}
          <div style={questionBlockStyle}>
            <label htmlFor="first_name" style={labelStyle}>
              1. What&apos;s your first name? <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              required
              maxLength={100}
              autoComplete="given-name"
              placeholder="First name"
              style={inputStyle}
            />
          </div>

          {/* Q2 — Email */}
          <div style={questionBlockStyle}>
            <label htmlFor="email" style={labelStyle}>
              2. Email address <span aria-hidden="true">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* Q3 — Number of children */}
          <div style={questionBlockStyle}>
            <label htmlFor="child_count" style={labelStyle}>
              3. How many children will use L3ARN?{" "}
              <span aria-hidden="true">*</span>
            </label>
            <input
              type="number"
              id="child_count"
              name="child_count"
              required
              min={0}
              max={20}
              placeholder="e.g. 2"
              style={{ ...inputStyle, width: "120px" }}
            />
          </div>

          {/* Q4 — Grade levels (multi-select checkboxes) */}
          <div style={questionBlockStyle}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ ...labelStyle, display: "block" }}>
                4. Grade levels of your children{" "}
                <span aria-hidden="true">*</span>
              </legend>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem 1.25rem",
                  marginTop: "0.25rem",
                }}
              >
                {GRADE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.9rem",
                      color: "#1a1a2e",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="grade_levels"
                      value={opt.value}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Q5 — Family type */}
          <div style={questionBlockStyle}>
            <label htmlFor="family_type" style={labelStyle}>
              5. Which best describes your family?{" "}
              <span aria-hidden="true">*</span>
            </label>
            <select
              id="family_type"
              name="family_type"
              required
              defaultValue=""
              style={inputStyle}
            >
              <option value="" disabled>
                Select one…
              </option>
              {FAMILY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Q6 — Teaching style */}
          <div style={questionBlockStyle}>
            <label htmlFor="teaching_style" style={labelStyle}>
              6. How would you describe your teaching style?{" "}
              <span aria-hidden="true">*</span>
            </label>
            <select
              id="teaching_style"
              name="teaching_style"
              required
              defaultValue=""
              style={inputStyle}
            >
              <option value="" disabled>
                Select one…
              </option>
              {TEACHING_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Q7 — AI curiosity (1–5 scale) */}
          <div style={questionBlockStyle}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ ...labelStyle, display: "block" }}>
                7. How curious are you about AI and technology in education?{" "}
                <span aria-hidden="true">*</span>
              </legend>
              <ScaleQuestion
                name="ai_curiosity_score"
                id="ai_curiosity"
                lowLabel="Not my focus"
                highLabel="Very curious"
                required
              />
            </fieldset>
          </div>

          {/* Q8 — Current subjects */}
          <div style={questionBlockStyle}>
            <label htmlFor="current_subjects" style={labelStyle}>
              8. What subjects are your kids working on most right now?
            </label>
            <input
              type="text"
              id="current_subjects"
              name="current_subjects"
              maxLength={500}
              placeholder="e.g. Math, reading, science projects…"
              style={inputStyle}
            />
          </div>

          {/* Q9 — Biggest challenge */}
          <div style={questionBlockStyle}>
            <label htmlFor="biggest_challenge" style={labelStyle}>
              9. What&apos;s the biggest challenge you face with homeschooling
              right now?
            </label>
            <textarea
              id="biggest_challenge"
              name="biggest_challenge"
              maxLength={500}
              rows={3}
              placeholder="A sentence or two is fine…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Q10 — 3D excitement (1–5 scale) */}
          <div style={questionBlockStyle}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ ...labelStyle, display: "block" }}>
                10. How excited are you about a true 3D learning world for your
                kids? <span aria-hidden="true">*</span>
              </legend>
              <ScaleQuestion
                name="three_d_excitement"
                id="three_d_excitement"
                lowLabel="Not for us"
                highLabel="Very excited"
                required
              />
            </fieldset>
          </div>

          {/* Q11 — Inner Circle willingness */}
          <div style={questionBlockStyle}>
            <label htmlFor="inner_circle_willing" style={labelStyle}>
              11. Would you be willing to give feedback 2–3x per week as an
              Inner Circle family? <span aria-hidden="true">*</span>
            </label>
            <select
              id="inner_circle_willing"
              name="inner_circle_willing"
              required
              defaultValue=""
              style={inputStyle}
            >
              <option value="" disabled>
                Select one…
              </option>
              <option value="yes">Yes — I&apos;m in</option>
              <option value="maybe">Maybe — depends on schedule</option>
              <option value="no">No — Founding Family is enough for me</option>
            </select>
          </div>

          {/* Q12 — Referral source */}
          <div style={questionBlockStyle}>
            <label htmlFor="referral_source" style={labelStyle}>
              12. How did you hear about L3ARN?
            </label>
            <input
              type="text"
              id="referral_source"
              name="referral_source"
              maxLength={300}
              placeholder="e.g. a friend, homeschool group, social media…"
              style={inputStyle}
            />
          </div>

          {/* Privacy note */}
          <p
            style={{
              fontSize: "0.8rem",
              color: "#6b6b8a",
              marginBottom: "1rem",
              lineHeight: 1.5,
            }}
          >
            We collect only what you provide here. No child names or birthdates
            are collected in this form. See our privacy information on the home
            page.
          </p>

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
