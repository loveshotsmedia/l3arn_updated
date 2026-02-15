# L3ARN Platform — Threat Model

## Assets

| Asset | Sensitivity | Storage |
|-------|-------------|---------|
| User credentials | Critical | Supabase Auth (bcrypt) |
| Student PII (names, ages) | High | Postgres with RLS |
| Learning interaction data | Medium | Postgres with RLS |
| API keys / secrets | Critical | Environment variables only |
| Audit logs | High | Postgres (append-only intent) |

## Threat Actors

1. **Malicious tenant user** — tries to access other tenants' data
2. **Unauthenticated attacker** — probes API for unprotected endpoints
3. **Insider (admin)** — misuses elevated privileges
4. **Webhook spoofing** — sends fake webhook events

## Threats & Mitigations

| # | Threat | Mitigation |
|---|--------|------------|
| T1 | Cross-tenant data access | RLS policies + API RBAC (double enforcement) |
| T2 | JWT forgery | JWKS signature verification + expiry check |
| T3 | Unprotected endpoints | All /api/v1/* require Bearer token |
| T4 | Webhook spoofing | Signature validation in Edge Functions |
| T5 | Secret exposure | `.env.example` only; `.gitignore` excludes `.env` |
| T6 | SQL injection | Parameterized queries via Supabase client (no raw SQL in app) |
| T7 | Privilege escalation | RBAC role hierarchy enforced in middleware |
| T8 | Audit log tampering | Write-only via service_role; no user DELETE policy |

## Assumptions

- Supabase Auth handles password hashing (bcrypt)
- Supabase manages TLS for DB connections in production
- Edge Functions run in sandboxed Deno environment
- All secrets are injected via environment variables, never hardcoded
