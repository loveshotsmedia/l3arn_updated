# AI Production Setup

## Required Railway Environment Variables

Both variables must be set for real AI mission generation. If either is absent,
all missions fall back to static content (`content_source = "fallback"`).

| Variable | Required | Example Value | Notes |
|----------|----------|---------------|-------|
| `ANTHROPIC_API_KEY` | Yes | `sk-ant-api03-...` | Never commit. Set in Railway Variables. |
| `ANTHROPIC_MODEL` | Yes (prod) | `claude-haiku-4-5-20251001` | Throws at call time in production if absent. |
| `SUPABASE_URL` | Yes | `https://ljjhwzdziovrlvlvhuxs.supabase.co` | Required for DB writes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJ...` | Service role key (not anon). Never commit. |
| `ALLOWED_ORIGINS` | Yes (prod) | `https://l3arn.vercel.app` | Comma-separated Vercel origin(s) for CORS. |

### Recommended Model IDs (2026)

| Use case | Model ID | Notes |
|----------|----------|-------|
| Mission generation (default) | `claude-haiku-4-5-20251001` | Fast, cost-effective |
| Complex / rich generation | `claude-sonnet-4-6` | Slower, higher quality |

Set `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` in Railway for the best
speed/cost balance in production.

## Verifying AI Is Active

### 1. Health check

```
GET https://<railway-service-url>/health
```

Response when AI is ready:
```json
{
  "status": "ok",
  "service": "ai-workers",
  "anthropicKeyPresent": true,
  "anthropicModelPresent": true,
  "missionAiReady": true
}
```

If `missionAiReady` is `false`, check Railway variables.

### 2. Railway startup logs

On deploy, look for these structured log lines:

**Both vars set (good):**
```
{"level":"info","system":"startup",...}   ← no fatal/warn lines at startup
```

**ANTHROPIC_API_KEY missing (bad):**
```json
{"level":"fatal","system":"startup","msg":"ANTHROPIC_API_KEY is not set — all mission compile calls will use static fallback content",...}
```

**ANTHROPIC_MODEL missing in production (bad):**
```json
{"level":"fatal","system":"startup","msg":"ANTHROPIC_MODEL is not set in production — mission compile calls will throw at call time (500)",...}
```

### 3. Mission runtime logs

After a student starts a mission, look for one of:

**AI path succeeded:**
```json
{"level":"info","system":"mission-compiler","msg":"AI generation succeeded","attemptsUsed":1,"contentSource":"ai"}
```

**Fallback triggered:**
```json
{"level":"warn","system":"mission-compiler","msg":"AI generation failed — using static fallback content","fallbackId":"...","attemptCount":3,"errorSummary":"[1] AI generation error: ..."}
```

### 4. Database check

```sql
SELECT content_source, count(*) 
FROM mission_attempts 
GROUP BY content_source;
```

- `content_source = 'ai'` → real AI generation working
- `content_source = 'fallback'` → check the startup logs and Railway variables

## Fallback Trigger Conditions

The mission compiler uses a 3-attempt retry policy (ADR-054). Fallback fires when
all three fail. Known triggers:

| Trigger | Root cause | Fix |
|---------|-----------|-----|
| `ANTHROPIC_API_KEY` missing | Anthropic SDK throws `AuthenticationError` | Set var in Railway |
| `ANTHROPIC_API_KEY` invalid | Anthropic SDK throws `AuthenticationError` | Rotate key in Railway |
| Network timeout / DNS failure | Railway cannot reach `api.anthropic.com` | Check Railway network egress |
| Claude returns no `tool_use` block | Model did not follow structured output | Usually transient; retries handle it |
| Zod schema validation fails | AI output shape mismatch | Usually transient; retries handle it |

**Note:** `ANTHROPIC_MODEL` missing in production causes a hard 500 (not fallback)
because `resolveModelVersion()` throws before any Anthropic call is made. Fix by
setting `ANTHROPIC_MODEL` in Railway.

## Retry and Timeout Configuration

- Retries: 3 attempts hard cap (ADR-054, `AI_MAX_RETRY_ATTEMPTS = 3`)
- Backoff: none currently (open question in `retry-engine.ts` — see ADR-054)
- `max_tokens` per Claude call: 4096
- No per-attempt timeout is set beyond Railway's default request timeout

## Model Source

Mission generation uses the Anthropic SDK tool_use pattern.
See `packages/mission-compiler/src/compiler.ts` for full call details.
The model is resolved from `ANTHROPIC_MODEL` env var at call time.
