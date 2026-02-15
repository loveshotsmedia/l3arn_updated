# RLS Policy Checklist

## Rules

1. **Every tenant-scoped table MUST have RLS enabled**
2. **Every SELECT policy MUST filter by tenant_id via membership subquery**
3. **INSERT policies MUST verify the user has permission in the target tenant**
4. **UPDATE policies MUST restrict to user's own records or require admin+ role**
5. **DELETE policies MUST require owner role**
6. **Service-role operations bypass RLS — use only in trusted server code**

## Verification Checklist

| Table | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Verified |
|-------|:-----------:|:------:|:------:|:------:|:------:|:--------:|
| `tenants` | ✅ | ✅ member | — | ✅ owner | — | ☐ |
| `profiles` | ✅ | ✅ tenant | ✅ own | ✅ own | — | ☐ |
| `tenant_memberships` | ✅ | ✅ tenant | ✅ admin+ | — | ✅ owner | ☐ |
| `audit_logs` | ✅ | ✅ tenant | ✅ service | — | — | ☐ |
| `webhook_events` | ✅ | ✅ admin+ | ✅ service | — | — | ☐ |

## Testing Protocol

For each table:
1. **As Member**: Verify can only SELECT own tenant's data
2. **Cross-tenant**: Verify cannot SELECT, INSERT, UPDATE, or DELETE across tenants
3. **Unauthenticated**: Verify all operations fail (no anon access)
4. **Service role**: Verify INSERT works for audit_logs and webhook_events
