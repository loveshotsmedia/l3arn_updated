# Agent 12 — GTM / Beta Ops

_Spec issued 2026-06-17 | Phase 1 — Landing Page + Beta Application + Demo Shell_

---

## Clearance

Agent 12 is cleared to begin. This agent builds the public-facing acquisition surface. No child data, no child sessions, no admin tooling.

Read first:
- `docs/CONTEXT.md` §8 (GTM + Positioning), §9 (Beta Launch Sequencing and Wave Strategy)
- `docs/architecture.md` §3 (Runtime Components — "Parent Command Center" is on Vercel/React)
- `docs/sprint_map.md` §Hero Slice Specification (the demo must prove this)
- `docs/agent_operating_rules.md` (provisional decisions section, especially: minimum launch proof, public claims, demo data rules)
- `docs/ADR/ADR-000-index.md` (ADR-037: demo assets, ADR-038: landing positioning, ADR-039: primary CTA, ADR-040: beta application, ADR-041: beta scoring)

---

## Wave 1 Guardrails

1. No superiority claims until validated by real data. Use "designed to support mastery" and "standards-aware" language.
2. Demo uses fake/sample child data only — never real family data.
3. No paid acquisition launch until the interactive demo is stable.
4. Beta application is medium length (10–15 questions). No excessive data collection.
5. Launch waitlist only after landing page + 2–4 minute Hero Slice demo are present.
6. No webcam, face capture, biometric path — not even in marketing copy.
7. Add open questions instead of guessing.

---

## Product Decisions to Respect

From CONTEXT.md §8 (GTM):
- **Primary promise:** L3ARN helps parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy.
- **Primary CTA:** "Apply for Founding Family Beta"
- **Beta cap (provisional):** 100 Founding Families + 25–50 Inner Circle
- **Pricing:** $30/month beta → ~$129/month public (up to 2 children; +~$20 per additional child)
- **Founding Pricing:** Founding families get permanent discount after beta — not lifetime $30.

From agent_operating_rules.md (provisional decisions):
- Beta applicant scoring: Fit Score + manual review. Score: homeschool/co-op relevance, AI/STEAM curiosity, age fit, pain urgency, feedback commitment, 3D excitement, Inner Circle potential.
- First beta audience: current homeschool families, AI/STEAM-curious, co-ops/microschool pods.
- Acquisition strategy: local events + online homeschool communities + direct co-op outreach first; paid ads later.
- Demo data: interactive demo uses fake/sample child data only.
- Geography: Florida-first standards; national beta allowed if positioned as "L3ARN Mastery Map + Florida reference."

---

## Scope

### Task 1 — Landing Page

File: `apps/web/src/app/page.tsx` (check if this exists; if so, read it before editing)
File: `apps/web/src/app/layout.tsx` (root layout — check if it needs GTM script or metadata updates)

Build the main landing page. Design direction: clean, warm, trustworthy. No overdesign. The page must load fast — no heavy 3D on the landing page (3D lives inside the product, not in the marketing funnel).

**Sections (in order):**

1. **Hero section**
   - Headline: "An AI Homeschool OS. For Your Family." (or approved copy — don't invent claims)
   - Sub-headline: "L3ARN helps parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy."
   - CTA button: "Apply for Founding Family Beta" → links to `/apply`
   - Secondary: "Watch the Demo" → links to `/demo` (or anchors to demo section if no separate page)
   - Hero visual: static 3D Academy screenshot or illustrated placeholder — no video embed until demo video is ready. Add an `<!-- TODO: replace with Hero Slice demo video when available -->` comment.

2. **What it is section** (3 columns)
   - AI-powered curriculum: "Parent controls what's taught. AI generates the mission."
   - Standards-aware: "Every mission tied to real academic targets."
   - Living 3D Academy: "A world that grows as students learn."

3. **How it works** (numbered steps — aligned with Hero Slice)
   - Parent sets curriculum and boundaries
   - Child enters the Academy and chooses a House and companion
   - AI generates a personalized mission
   - Child completes the mission, earns rewards
   - Parent receives a learning map with evidence and progress

4. **Trust signals section**
   - "Parent-controlled from day one"
   - "No webcam. No face capture. Audio is optional."
   - "Standards-aware from K–8 with Florida CPALMS alignment"
   - "COPPA-aligned design" (not "COPPA certified" — never make compliance claims you haven't verified)

5. **Pricing section**
   - Beta: $30/month per family
   - Public: ~$129/month per family (up to 2 children)
   - Founding Family note: "Founding families keep a permanent discount — you'll never pay the full rate."
   - No pricing guarantee language — just informational

6. **CTA section**
   - "Ready to join the founding cohort?"
   - "Apply for Founding Family Beta" button → `/apply`
   - "Limited to 100 founding families."

**Acceptance criteria:**
- [ ] Page renders server-side (no "use client" on the page level — use React Server Component)
- [ ] No fake testimonials, fake names, or invented quotes
- [ ] No webcam/biometric features mentioned as available
- [ ] CTA links to `/apply`
- [ ] Page title and meta description set via Next.js `metadata` export
- [ ] No `<iframe>` with external video until demo video URL is confirmed

### Task 2 — Beta Application Form

File: `apps/web/src/app/apply/page.tsx` (new)
File: `apps/web/src/app/apply/actions.ts` (new — Server Action for form submission)

**Form questions (10–12, medium length):**

1. What's your first name? *(text)*
2. Email address *(email — required for follow-up)*
3. How many children will use L3ARN? *(number)*
4. Grade levels of your children *(multi-select: K, 1–8)*
5. Which best describes your family? *(single select: Full-time homeschool / Hybrid (part-time school + home) / Afterschool enrichment / Microschool / co-op pod)*
6. How would you describe your teaching style? *(single select: Structured / Flexible / Eclectic / Still figuring it out)*
7. How curious are you about AI and technology in education? *(1–5 scale — labeled: "Not my focus" to "Very curious")*
8. What subjects are your kids working on most right now? *(text — free field, short)*
9. What's the biggest challenge you face with homeschooling right now? *(text — short response)*
10. How excited are you about a true 3D learning world for your kids? *(1–5 scale)*
11. Would you be willing to give feedback 2–3x per week as an Inner Circle family? *(Yes / Maybe / No)*
12. How did you hear about L3ARN? *(text)*

**Fit Score calculation (per agent_operating_rules.md provisional decision):**

```typescript
function computeFitScore(answers: BetaApplicationAnswers): number {
  let score = 0;
  // homeschool/co-op relevance (max 25): Full-time homeschool = 25; hybrid = 20; microschool = 15; afterschool = 10
  // AI/STEAM curiosity (max 20): map 1–5 scale to 0–20
  // Age fit (max 15): K–8 match = 15; mixed = 10; outside K–8 = 5
  // Pain urgency (max 15): based on free-text hardship signal — leave as 10 default for now (manual review adjusts)
  // Feedback commitment (max 15): Yes = 15; Maybe = 7; No = 0
  // 3D excitement (max 10): map 1–5 scale to 0–10
  return Math.min(score, 100);
}
```

**Submission flow:**
1. Validate form client-side (required fields)
2. POST to Server Action
3. Server Action writes to a `beta_applications` table (see Task 3)
4. Redirect to `/apply/thank-you`

**Acceptance criteria:**
- [ ] Form has 10–12 questions
- [ ] No PII beyond email and first name collected
- [ ] Fit score computed server-side (not client-side)
- [ ] Duplicate submissions blocked (unique constraint on email)
- [ ] Thank-you page confirms submission

### Task 3 — Migration 007: Beta Applications Table

File: `infra/supabase/migrations/007_beta_applications.sql`

**beta_applications**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `email TEXT NOT NULL UNIQUE`
- `first_name TEXT NOT NULL`
- `child_count INTEGER`
- `grade_levels TEXT[]`
- `family_type TEXT`
- `teaching_style TEXT`
- `ai_curiosity_score INTEGER CHECK (ai_curiosity_score BETWEEN 1 AND 5)`
- `current_subjects TEXT`
- `biggest_challenge TEXT`
- `three_d_excitement INTEGER CHECK (three_d_excitement BETWEEN 1 AND 5)`
- `inner_circle_willing TEXT` (Yes / Maybe / No)
- `referral_source TEXT`
- `fit_score INTEGER`
- `inner_circle_candidate BOOLEAN NOT NULL DEFAULT false`
- `status TEXT NOT NULL DEFAULT 'pending-review'` (pending-review | accepted-founding | accepted-inner-circle | waitlisted | declined)
- `reviewed_by TEXT` (founder ID)
- `reviewed_at TIMESTAMPTZ`
- `review_notes TEXT`
- `submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()`

RLS: no public read or update; service role inserts (Server Action uses service role); founder role reads all.

**Acceptance criteria:**
- [ ] Migration runs cleanly
- [ ] UNIQUE constraint on `email`
- [ ] No public read access (RLS blocks all non-service reads)
- [ ] Founder can read all rows via Supabase dashboard (service role policy)

### Task 4 — Thank-you page + waitlist confirmation

File: `apps/web/src/app/apply/thank-you/page.tsx` (new)

Simple confirmation page:
- "Thank you, [first name]! Your application is in."
- "We'll review every application personally. Founding families will hear from us within 2 weeks."
- "In the meantime, join our community: [Discord/email list link — leave as TODO if not confirmed]"
- "Founding Family Beta opens to [N] families. Currently accepting applications."

No application status lookup from the client — this is a static confirmation.

**Acceptance criteria:**
- [ ] Page shows personalized first name (passed as query param from form submission)
- [ ] No application data returned to the user
- [ ] "Back to home" link

### Task 5 — Demo shell page

File: `apps/web/src/app/demo/page.tsx` (new)

A placeholder page for the Hero Slice demo. For now:
- Title: "Watch L3ARN in Action" (or "See the Hero Slice")
- Body: "The interactive demo is coming soon. Apply now to be a Founding Family."
- CTA: "Apply for Founding Family Beta" → `/apply`
- `<!-- TODO: embed Hero Slice demo video when produced -->`

Do NOT embed any live product UI in the demo page — demo is a separate scripted asset. Do not put the 3D world engine on a marketing page.

**Acceptance criteria:**
- [ ] Page exists and is linkable from the landing page
- [ ] No live product components embedded
- [ ] CTA links to `/apply`

---

## What Agent 12 Must NOT Do

- Do not build paid billing infrastructure (out of scope)
- Do not build email sending (document it as a TODO with suggested provider — SendGrid or Resend)
- Do not collect more PII than the form questions above
- Do not launch paid ads or announce publicly — that's a founder decision
- Do not embed the live 3D Academy in the landing page
- Do not store raw child data in the beta application

---

## Files Agent 12 May Touch

```
apps/web/src/app/page.tsx                          — new or replace
apps/web/src/app/layout.tsx                        — metadata only (title, description, OG)
apps/web/src/app/apply/page.tsx                    — new
apps/web/src/app/apply/actions.ts                  — new (Server Action)
apps/web/src/app/apply/thank-you/page.tsx          — new
apps/web/src/app/demo/page.tsx                     — new
infra/supabase/migrations/007_beta_applications.sql — new
docs/OPEN_QUESTIONS.md                             — add new OQs
docs/ADR/ADR-000-index.md                          — if decisions made
```
