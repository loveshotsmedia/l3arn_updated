# Supabase Project Configuration

## Production Setup

1. Create project at [supabase.com](https://supabase.com)
2. Copy the Project URL and anon/service keys to `.env`
3. Run migrations via Supabase CLI:
   ```bash
   supabase db push --linked
   ```
4. Apply RLS policies:
   ```bash
   supabase db push supabase/policies/rls_policies.sql
   ```

## Required Settings

- **Auth → Email**: Enable email/password sign-in
- **Auth → JWT**: Note the JWT secret for API verification
- **Database → Extensions**: Ensure `uuid-ossp` is enabled

## Environment Variables Required

| Variable | Where |
|----------|-------|
| `SUPABASE_URL` | API + Frontend |
| `SUPABASE_ANON_KEY` | API + Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | API only |
| `SUPABASE_JWT_SECRET` | API only |
