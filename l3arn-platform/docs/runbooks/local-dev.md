# Local Development Runbook

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Python 3.12+
- Docker + Docker Compose v2

## Quick Start (Docker)

```bash
# 1. Clone and setup
cd l3arn-platform
cp .env.example .env

# 2. Start everything
docker compose up -d

# 3. Verify
curl http://localhost:8000/health
open http://localhost:5173
```

## Quick Start (Without Docker)

```bash
# Terminal 1 — API
cd apps/api
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd apps/web
pnpm install
pnpm dev
```

## Common Tasks

### Reset database
```bash
python scripts/db_reset.py
```

### Run seed data
```bash
python scripts/seed.py
```

### Run all linters
```bash
python scripts/lint.py
```

### Run tests
```bash
# Python
cd apps/api && pytest

# TypeScript
pnpm test:ts

# Contract parity
pytest tests/contracts/
```

## Ports

| Service | Port |
|---------|------|
| Frontend | 5173 |
| API | 8000 |
| Supabase Auth | 54321 |
| Postgres | 54322 |
| Supabase Studio | 54323 |

## Troubleshooting

- **API won't start in Docker**: Check `docker compose logs api`
- **Auth not working**: Ensure `SUPABASE_JWT_SECRET` matches between services
- **RLS blocking queries**: Check that user JWT has correct `tenant_id` in `app_metadata`
