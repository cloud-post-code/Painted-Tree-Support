# Project Re-Paint

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

**Fastest path (one service):** connect the GitHub repo with **Root directory** left empty. Railway builds the root [`Dockerfile`](Dockerfile) (see [`railway.json`](railway.json)): nginx on `$PORT`, Next.js + FastAPI behind it. Add Postgres and set `DATABASE_URL`, `SECRET_KEY`, `ADMIN_BOOTSTRAP_TOKEN`, `BACKEND_CORS_ORIGINS`, and `NEXT_PUBLIC_SITE_URL` as in [docs/RAILWAY.md](docs/RAILWAY.md).

**Split path (api + web):** two services — `api` with root `backend/` and config `/backend/railway.json`, `web` with root `frontend/` and config `/frontend/railway.json` (paths from repo root). Uses **Railpack** plus `backend/railpack.json` / `frontend/railpack.json` for runtime pins. Set `NEXT_PUBLIC_API_URL` to the API’s public URL and `BACKEND_CORS_ORIGINS` to the web origin.

Details, env tables, migrations, and bootstrap: [docs/RAILWAY.md](docs/RAILWAY.md).

## Bootstrap admin

```bash
curl -X POST http://localhost:8000/api/v1/admin/seed-first-user \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Token: YOUR_ADMIN_BOOTSTRAP_TOKEN" \
  -d '{"email":"admin@example.com","password":"change-me-now"}'
```

Then sign in at `/admin/login`.
