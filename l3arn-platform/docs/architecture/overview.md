# L3ARN Platform — Architecture Overview

## High-Level Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  apps/web    │────▶│   Supabase       │     │  apps/api      │
│  React/Vite  │     │   Auth + DB      │◀────│  FastAPI       │
│  TypeScript  │────▶│   RLS + Storage  │     │  Python 3.12   │
└──────────────┘     └──────────────────┘     └────────────────┘
       │                      │                       │
       │              ┌───────┴────────┐              │
       └─────────────▶│  Edge Funcs    │◀─────────────┘
                      │  (thin proxy)  │
                      └────────────────┘
```

## Design Principles

1. **Contract-first**: `packages/shared-contracts` defines all DTOs and tool contracts. Python models mirror these. CI validates parity.

2. **Strict boundaries**: Agents decide (intent routing). Tools do (execution + audit). DB enforces (RLS). Edge Functions are thin (just intake/proxy).

3. **Auditability**: Every tool execution writes to `audit_logs` with `trace_id` and `request_id`. The trace-id middleware injects these automatically.

4. **Multi-tenancy**: All tenant-scoped tables have `tenant_id`. RLS policies enforce isolation. JWT `app_metadata` carries tenant context.

## Data Flow

1. **User authenticates** → Supabase Auth issues JWT with `user_id` + `tenant_id` in claims
2. **Frontend calls API** → Bearer token attached automatically by `lib/api.ts`
3. **API validates JWT** → `jwt_verifier.py` fetches JWKS, verifies sig/exp/aud
4. **RBAC check** → `rbac.py` enforces role hierarchy (owner > admin > member)
5. **Tool execution** → Router agent dispatches to tool via capabilities registry
6. **Audit log** → Every tool call writes to `audit_logs` with trace context
7. **DB enforcement** → RLS policies double-enforce tenant isolation at the DB layer

## Capabilities Registry

Tools self-register in `app/agents/registry.py` on import. Each tool has:
- A Python handler (`app/tools/<name>.py`)
- A JSON contract (`app/tools/contracts/<name>.json`)
- Registration in the global registry

To add a new capability:
1. Create `app/tools/my_tool.py` extending `BaseTool`
2. Create `app/tools/contracts/my_tool.json` defining input/output
3. The tool self-registers via `register_tool()` at module import
4. No folder reorganization needed — just add files
