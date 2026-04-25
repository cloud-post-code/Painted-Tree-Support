# Railway deployment

Create a **new Railway project** with:

1. **Postgres** plugin — copy `DATABASE_URL` (async driver).
2. **Service `api`**
   - Root directory: `backend/`
   - Build: `pip install -e .`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Variables:
     - `DATABASE_URL` — use `postgresql+asyncpg://...` (adjust scheme if Railway gives `postgres://`).
     - `SECRET_KEY`, `ADMIN_BOOTSTRAP_TOKEN`, `BACKEND_CORS_ORIGINS` (comma-separated web origins).
     - Optional: `STRIPE_*`, `S3_*`, `HCAPTCHA_SECRET`, `CRON_SECRET`.
3. **Service `web`**
   - Root directory: `frontend/`
   - Build: `pnpm install && pnpm build`
   - Start: `pnpm start`
   - Variables:
     - `NEXT_PUBLIC_API_URL` — public URL of the `api` service (e.g. `https://api-production-xxxx.up.railway.app`).
     - `API_INTERNAL_URL` — same as above unless you use private networking.
     - `NEXT_PUBLIC_SITE_URL` — public URL of the `web` service (for sitemap/OG).

**Async DB URL:** If Railway provides `postgres://user:pass@host:port/db`, convert to:

`postgresql+asyncpg://user:pass@host:port/db`

**Healthchecks:** Configure HTTP health checks on `api` → `/api/v1/health` and `web` → `/`.

**Migrations:** Run once after deploy:

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
