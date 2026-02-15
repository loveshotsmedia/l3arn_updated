# Secrets Handling Policy

## Rules

1. **NEVER commit secrets to version control**
   - All secrets go in `.env` (gitignored)
   - Only `.env.example` is committed (with placeholder values)

2. **Secret categories**

| Secret | Used By | Source |
|--------|---------|--------|
| `SUPABASE_URL` | API + Frontend | Supabase dashboard |
| `SUPABASE_ANON_KEY` | API + Frontend | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Supabase dashboard |
| `SUPABASE_JWT_SECRET` | API only | Supabase dashboard |
| `DATABASE_URL` | API + Scripts | Supabase / Docker |

3. **In production**
   - Use Railway environment variables (encrypted at rest)
   - Use Supabase vault for any tenant-specific secrets
   - Never log secret values — log only key names

4. **In local development**
   - Copy `.env.example` → `.env`
   - For Docker: secrets are passed as environment variables in `docker-compose.yml`
   - Local Supabase uses default dev-only secrets (acceptable for local only)

5. **Rotation**
   - Supabase JWT secret: rotate in Supabase dashboard → update all services
   - Service role key: rotate in dashboard → update API env
   - Database password: rotate via Supabase → update `DATABASE_URL`

6. **CI/CD**
   - Secrets stored as GitHub Actions secrets
   - Never echo secrets in CI logs
   - Use `${{ secrets.NAME }}` syntax in workflows
