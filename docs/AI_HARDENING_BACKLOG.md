# AI Hardening & Pre-Beta Backlog

Captured from the Agent 17/18 E2E (2026-06-28). Demo-ready items are done; the
items below are required or recommended **before a real-family beta**.

## AI hardening (deferred — implement before beta)
- [ ] **Anthropic request timeout via `AbortSignal` (30s).** `MissionCompiler.compile()`
      (`packages/mission-compiler/src/compiler.ts`) calls `messages.create` with no
      per-attempt timeout. Pass an `AbortSignal.timeout(30_000)` so a hung provider
      call fails fast into the retry/fallback path instead of blocking the request.
- [ ] **Retry backoff: 500ms → 1000ms → 2000ms.** The retry engine
      (`packages/mission-compiler/src/retry/retry-engine.ts`, ADR-054) currently retries
      with no delay. Add exponential backoff between the 3 attempts.
- [ ] **Phase 2 safety containment enforcement (not just logging).** Today S3/S4 events
      are logged via `SupabaseSafetyContainment`; enforce blocking/escalation behavior,
      not just observability.
- [ ] **Surface safety flags in the parent report UI.** The report
      (`apps/web/src/app/(parent)/reports/[childId]/page.tsx`) shows mastery/calibration
      but does not surface any safety flags/escalations to the parent.

## Optional / decisions
- [ ] **`AI_FALLBACK_MODEL`** — decided NOT wired (dead config removed from
      `.env.example`, 2026-06-28). If a provider-level fallback model is wanted, wire it
      in `compiler.ts` (try primary model, then fallback model) — distinct from retry logic.
- [ ] **Consider `claude-haiku-4-5` for Mission 001** generation (faster/cheaper than
      `claude-sonnet-4-6`; full mission gen currently ~36–87s). Per `docs/AI_PRODUCTION_SETUP.md`.

## Production deploy gap (required before beta)
- [ ] **Merge + deploy the Hero Slice.** Production Railway runs `origin/main` (`6d4382f`),
      which predates the Hero Slice. The full Hero Slice (calibration route, updated
      mission-runtime/student-session/index, migrations 010/011) plus the committed fixes
      must be merged to `main` and redeployed (Railway) for production to serve real-AI
      Mission 001. Vercel deploys the web app from the same branch.
- [ ] **Set `RAILWAY_AI_WORKERS_URL` in Vercel** (all targets) to the real Railway URL so
      Mission Control's Safety Status link is not a placeholder. (Local `.env.local` is set
      to `http://localhost:3001`.)
- [ ] Confirm migrations 010/011 are in the deploy migration set (already applied to Cloud
      Supabase; ensure the repo migration files ship).

## Parent report polish (DONE 2026-06-28)
- [x] XP showed 0 — report queried `xp_events.amount`; fixed to `xp_amount`.
- [x] Mastery skills showed raw UUIDs — now joined to `mastery_skills.parent_friendly_name`.
- [x] Companion showed raw key `comp-001-spark` — now displays "Spark".
- [x] AI renamed companion to "ZAP" — `companionName` now threaded into the Mission Compiler prompt.
