# Auth Flow Documentation

## Overview

L3ARN uses Supabase Auth with JWT verification in FastAPI. The auth flow is:

```
                    ┌─────────────┐
                    │ Supabase    │
┌──────────┐       │ Auth        │       ┌──────────┐
│ Frontend │──────▶│ - signup    │──────▶│ Postgres │
│ React    │       │ - signin   │       │ auth.*   │
└──────────┘       │ - session  │       └──────────┘
     │             └─────────────┘
     │                    │
     │          JWT (access_token)
     │                    │
     ▼                    ▼
┌──────────┐    Authorization: Bearer <token>
│ API      │◀───────────────────────────────
│ FastAPI  │
│          │──▶ JWKS fetch + verify
│          │──▶ Extract sub (user_id)
│          │──▶ Extract app_metadata.tenant_id
│          │──▶ Check RBAC role
└──────────┘
```

## JWT Claims

Supabase JWTs contain:

| Claim | Description |
|-------|-------------|
| `sub` | User ID (UUID) |
| `email` | User email |
| `role` | Supabase role (e.g., `authenticated`) |
| `aud` | Audience (`authenticated`) |
| `exp` | Expiry timestamp |
| `app_metadata.tenant_id` | Current tenant context |
| `app_metadata.role` | L3ARN role (owner/admin/member) |

## RBAC Hierarchy

```
owner (30)  →  Full tenant control
admin (20)  →  Manage members, view webhooks
member (10) →  Basic access
```

## Security Controls

1. **JWKS caching**: Keys cached for 1 hour, refreshed on rotation
2. **Signature verification**: RS256 or HS256 depending on Supabase config
3. **Expiry check**: Tokens rejected after `exp`
4. **Audience check**: Must be `authenticated`
5. **Double enforcement**: API RBAC + DB RLS both validate access
