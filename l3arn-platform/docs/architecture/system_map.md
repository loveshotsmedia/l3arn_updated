# L3ARN Platform — System Map

> Auto-generated from the capabilities registry. This document maps all system components, their relationships, and current capabilities.

## Component Map

```
l3arn-platform
├── FRONTEND (apps/web)
│   ├── Auth: Supabase Auth (sign-in, sign-up, session)
│   ├── Routes: /login, /app, /onboarding
│   ├── Clients: lib/api.ts (→ FastAPI), lib/supabase.ts (→ Supabase)
│   └── State: Session-based via Supabase client
│
├── API (apps/api)
│   ├── Endpoints
│   │   ├── GET /health
│   │   └── GET /api/v1/ping
│   ├── Auth
│   │   ├── JWT Verification (JWKS + cache)
│   │   └── RBAC (owner > admin > member)
│   ├── Agents
│   │   ├── RouterAgent → routes intent to tool
│   │   └── Registry → central tool index
│   ├── Tools
│   │   └── example_tool → sample tool (contract: example_tool.json)
│   └── Middleware
│       ├── TraceIdMiddleware → X-Trace-Id + X-Request-Id
│       └── Structured JSON Logging
│
├── DATABASE (Supabase / Postgres)
│   ├── Tables
│   │   ├── tenants (org-level isolation unit)
│   │   ├── profiles (1:1 with auth.users)
│   │   ├── tenant_memberships (user ↔ tenant, with role)
│   │   ├── audit_logs (every tool call logged)
│   │   └── webhook_events (inbound webhook inbox)
│   └── RLS Policies
│       └── Strict tenant isolation on all tables
│
├── EDGE FUNCTIONS (supabase/functions)
│   ├── webhook-intake → validates signature, writes webhook_events
│   └── tool-proxy → auth + allowlist → proxies to FastAPI
│
└── SHARED PACKAGES
    ├── @l3arn/shared-contracts → DTOs, zod schemas, tool contract types
    └── @l3arn/shared-clients → API client, Supabase helpers
```

## Registered Capabilities

| Tool Name | Contract File | Description |
|-----------|---------------|-------------|
| `example_tool` | `example_tool.json` | Sample tool that logs an action and returns a result |

## Adding a New Capability

1. Create `apps/api/app/tools/<name>.py` (extend `BaseTool`)
2. Create `apps/api/app/tools/contracts/<name>.json`
3. Tool self-registers via `register_tool()` at import
4. Update this system map
5. Add TS DTO in `packages/shared-contracts` if needed
