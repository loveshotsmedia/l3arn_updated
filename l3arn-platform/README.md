# L3ARN Platform

> Parent-led, student-driven learning platform.

## Architecture

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | React + Vite + TypeScript | `apps/web` |
| Backend API | FastAPI (Python 3.12) | `apps/api` |
| Database / Auth | Supabase (Postgres + Auth + RLS) | `supabase/` |
| Edge Functions | Deno / TypeScript | `supabase/functions/` |
| Shared Contracts | TypeScript (zod) | `packages/shared-contracts` |
| Shared Clients | TypeScript | `packages/shared-clients` |

## Quick Start

### Prerequisites

- **Node.js** ≥ 20 + **pnpm** ≥ 9
- **Python** 3.12+
- **Docker** + Docker Compose v2

### 1 — Clone & install

```bash
git clone <repo-url> l3arn-platform && cd l3arn-platform
cp .env.example .env          # fill in real Supabase keys
pnpm install                  # TS dependencies
pip install -r apps/api/requirements.txt  # Python dependencies
```

### 2 — Start with Docker (recommended)

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Supabase Auth | http://localhost:54321 |
| Postgres | localhost:54322 |

### 3 — Start without Docker

```bash
# Terminal 1 — API
cd apps/api && uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd apps/web && pnpm dev
```

## Project Structure

```
l3arn-platform/
├── apps/
│   ├── api/          # FastAPI backend
│   └── web/          # React + Vite frontend
├── supabase/
│   ├── migrations/   # SQL migrations
│   ├── seed/         # Dev seed data
│   ├── policies/     # RLS policies
│   ├── functions/    # Edge Functions
│   └── config/       # Local Supabase config
├── packages/
│   ├── shared-contracts/  # DTOs + zod schemas
│   └── shared-clients/    # API + Supabase helpers
├── docs/             # Architecture, ADRs, runbooks
├── infra/            # Docker, Railway, Supabase config
├── scripts/          # Python bootstrap/seed/lint scripts
├── tests/            # API + contract tests
├── security/         # Threat model, RLS checklist
└── .github/workflows/  # CI pipelines
```

## Core Principles

1. **Contract-first** — shared DTOs + tool contracts are the source of truth
2. **Strict boundaries** — agents decide; tools do; orchestrator routes; DB enforces
3. **Auditability** — every tool call produces an audit log entry with `trace_id`
4. **Multi-tenancy** — all tenant-owned tables have `tenant_id` + strict RLS

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [System Map](docs/architecture/system_map.md)
- [ADR-0001: Foundation Decisions](docs/decisions/ADR-0001.md)
- [Local Dev Runbook](docs/runbooks/local-dev.md)
- [Auth Flow](docs/security/auth-flow.md)

## License

Private — All rights reserved.
