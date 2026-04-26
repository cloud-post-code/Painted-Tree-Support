# Vendor Recovery Room

Crisis-to-comeback platform for displaced vendors. Monorepo:

- **`frontend/`** — Next.js 15 (App Router), Tailwind, public site + admin UI
- **`backend/`** — FastAPI, SQLAlchemy 2, Alembic, Postgres

## Prerequisites

- Node 20+ and [pnpm](https://pnpm.io) 9+
- Python 3.12+
- Docker (optional, for local Postgres)

## Quick start

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Set DATABASE_URL in backend/.env (e.g. postgresql+asyncpg://postgres:postgres@localhost:5432/vrr)

make dev
```

- Web: http://localhost:3000  
- API: http://localhost:8000  
- API health: http://localhost:8000/api/v1/health  

## Commands

| Command       | Description                          |
|---------------|--------------------------------------|
| `make dev`    | Run API + web (requires two terminals or use `make dev-api` / `make dev-web`) |
| `make lint`   | Lint backend (ruff) + frontend (eslint) |
| `make test`   | pytest + vitest                      |

## Railway

Deploy two services from this repo (Railway uses **Railpack**; both `railway.json` files set `"builder": "RAILPACK"` and repo-root **watch patterns**):

1. **api** — Root directory `backend/`. In service settings, set **config as code** to `/backend/railway.json` (paths are from the repo root). Start command and healthcheck live in that file.
2. **web** — Root directory `frontend/`. Config as code: `/frontend/railway.json`.

Runtime pins: `backend/railpack.json` (Python 3.12), `frontend/railpack.json` (Node 22).

Set `DATABASE_URL` on the API service, `NEXT_PUBLIC_API_URL` on the web service, and `BACKEND_CORS_ORIGINS` to your web origin.

See [docs/RAILWAY.md](docs/RAILWAY.md) for the full checklist.

## Bootstrap admin

```bash
curl -X POST http://localhost:8000/api/v1/admin/seed-first-user \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Token: YOUR_ADMIN_BOOTSTRAP_TOKEN" \
  -d '{"email":"admin@example.com","password":"change-me-now"}'
```

Then sign in at `/admin/login`.
