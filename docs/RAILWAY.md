# Railway deployment

Railway builds with **[Railpack](https://railpack.com/)** by default. This repo pins runtimes via `railpack.json` plus `backend/.python-version` and `frontend/package.json` (`engines` / `packageManager`).

## One-time project setup (checklist)

Do these in order so **install, build, start, and healthchecks** all line up with the repo.

### 1. Postgres

- Add the **Postgres** plugin.
- Copy `DATABASE_URL` into the **`api`** service variables (see below). Convert the scheme for async SQLAlchemy if needed.

### 2. Service `api` (FastAPI)

| Setting | Value |
|--------|--------|
| **Root directory** | `backend/` |
| **Config as code** | Path from **repository root**: `/backend/railway.json` |

For an [isolated monorepo](https://docs.railway.com/deployments/monorepo), Railway’s config file **does not** follow “Root directory”; if you skip this, deploy/start/healthcheck from `railway.json` may not apply.

**Variables (minimum):**

- `DATABASE_URL` — use `postgresql+asyncpg://...` (not raw `postgres://` unless you convert).
- `SECRET_KEY` — long random string.
- `ADMIN_BOOTSTRAP_TOKEN` — used only for the first admin bootstrap endpoint.
- `BACKEND_CORS_ORIGINS` — comma-separated origins of the **web** app (e.g. `https://your-web.up.railway.app`).

Optional: `STRIPE_*`, `S3_*` / R2, `HCAPTCHA_SECRET`, `CRON_SECRET`, etc.

**What Railpack does:** installs Python **3.12** (from `railpack.json` / `.python-version`), installs the package from `pyproject.toml`, runs the detected build step, then starts with **`deploy.startCommand`** from `railway.json`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. A root **`main.py`** shim also allows `uvicorn main:app` if Railway ever uses Railpack’s FastAPI default.

**Healthcheck:** `/api/v1/health` (already in `railway.json`).

**Watch paths:** `railway.json` includes `watchPatterns` so only `backend/**` changes trigger an `api` rebuild (patterns are from repo root `/`).

### 3. Service `web` (Next.js)

| Setting | Value |
|--------|--------|
| **Root directory** | `frontend/` |
| **Config as code** | `/frontend/railway.json` |

**Variables (minimum):**

- `NEXT_PUBLIC_API_URL` — public URL of `api` (e.g. `https://api-production-xxxx.up.railway.app`).
- `API_INTERNAL_URL` — same as above unless you use private networking between services.
- `NEXT_PUBLIC_SITE_URL` — public URL of **this** web service (sitemap / OG).

**What Railpack does:** enables **pnpm** via `packageManager`, installs deps, runs **`pnpm run build`** (standard `next build`), starts with **`pnpm start`** → `next start` on `$PORT`.

**Healthcheck:** `/` (in `railway.json`).

**Watch paths:** `/frontend/**` in `railway.json`.

### 4. Link services

- Attach the Postgres plugin to **`api`** (or set `DATABASE_URL` from the plugin reference).
- Ensure **`web`** can reach **`api`** using the URLs you put in the env vars above.

## Async DB URL

If Railway provides `postgres://user:pass@host:port/db`, convert to:

`postgresql+asyncpg://user:pass@host:port/db`

## After first successful deploy

**Migrations:**

```bash
railway run --service api alembic upgrade head
```

**Bootstrap admin:**

```bash
curl -X POST "$API_URL/api/v1/admin/seed-first-user" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Token: $ADMIN_BOOTSTRAP_TOKEN" \
  -d '{"email":"you@domain.com","password":"..."}'
```

Then sign in at `https://your-web-url/admin/login`.

**Weekly featured vendor cron:** add a Railway cron hitting:

`POST /api/v1/internal/cron/rotate-featured` with header `X-Cron-Secret: $CRON_SECRET`.

## Optional overrides

- **Build command** (service settings): only if Railpack’s default is wrong; Railway runs it after tool install.
- **Railpack env vars:** see [Railpack environment variables](https://railpack.com/config/environment-variables) (e.g. `RAILPACK_INSTALL_COMMAND`, `RAILPACK_PYTHON_VERSION`).
- **`RAILPACK_CONFIG_FILE`:** path relative to the service root if you relocate `railpack.json`.

## Files in this repo

| Path | Role |
|------|------|
| `backend/railway.json` | `RAILPACK` builder, watch patterns, start command, healthcheck |
| `frontend/railway.json` | Same for the web app |
| `backend/railpack.json` | Pin Python **3.12** for Mise/Railpack |
| `frontend/railpack.json` | Pin Node **22** |
| `backend/.python-version` | Mise-compatible Python pin (backup) |
