# Railway deployment

Railway can run this repo in two ways:

1. **All-in-one (least setup)** — deploy the **repository root** as a single service. Railway uses the root [`Dockerfile`](../Dockerfile) and root [`railway.json`](../railway.json) (Docker builder). No **Root directory**, no Railpack language detection, no split services. You still add **Postgres** and set variables (below).
2. **Split stack (recommended at scale)** — two services: **`api`** with root `backend/`, **`web`** with root `frontend/`, each using Railpack or the existing per-folder `railway.json`. Set **Config as code** paths from the repo root: `/backend/railway.json` and `/frontend/railway.json` so Railway does not accidentally use the root `railway.json`.

---

## Option 1 — Single service (all-in-one)

### Create project

1. **New project** → **Deploy from GitHub** → select this repo (leave **Root directory** empty).
2. Add the **Postgres** plugin and reference `DATABASE_URL` on the same service (or paste the async URL).

The all-in-one **entrypoint** runs `alembic upgrade head` in `/app/backend` before starting the API, so the database schema is applied on every deploy. Railway will build with **Dockerfile** and start nginx on **`$PORT`**, which proxies:

- `/api/v1/*`, `/static/*`, `/docs`, `/openapi.json`, `/redoc` → FastAPI on `127.0.0.1:8000`
- everything else → Next.js standalone on `127.0.0.1:3000`

### Variables (minimum)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Use `postgresql+asyncpg://...` (convert from `postgres://` if needed). |
| `SECRET_KEY` | Long random string. |
| `ADMIN_BOOTSTRAP_TOKEN` | First admin bootstrap only. |
| `BACKEND_CORS_ORIGINS` | Your public `https://…` origin (e.g. Railway public domain). |
| `NEXT_PUBLIC_SITE_URL` | Same public `https://…` (set for **build** and **runtime** if you change domains). |

### Build-time (Docker / Next)

The image sets `NEXT_PUBLIC_API_URL=same` so the browser talks to the API on the **same host** (nginx routes `/api/v1` to FastAPI). No separate API public URL is required.

Optional: override Dockerfile build args in Railway if you need a specific site URL baked into the client bundle:

- `NEXT_PUBLIC_SITE_URL` (defaults to a placeholder in the Dockerfile; set to your real `https://…` for production metadata).

### After first deploy

**Migrations** run automatically in the entrypoint. If you need to run them manually (troubleshooting, stuck revision, or before the API is up), from your machine with the CLI linked to this all-in-one service:

```bash
railway run sh -c 'cd /app/backend && alembic upgrade head'
```

The running image keeps Alembic and `alembic.ini` under `/app/backend`.

**Bootstrap admin** — same as split deploy, using your public `https://` base URL.

**Vendor pages:** sign in at `/admin/login`, then **Admin → Vendors → Edit** on any vendor to change copy, images, links, and status without redeploying.

---

## Option 2 — Split `api` + `web`

### Per-service settings

| Service | Root directory | Config as code (repo-root path) |
|---------|----------------|----------------------------------|
| `api` | `backend/` | `/backend/railway.json` |
| `web` | `frontend/` | `/frontend/railway.json` |

For an [isolated monorepo](https://docs.railway.com/deployments/monorepo), the config file path is from the **repository root**, not from the service root.

The split **`api`** service start command in [`backend/railway.json`](../backend/railway.json) runs `alembic upgrade head` before `uvicorn`, so schema updates apply on each deploy from the `backend/` service root.

### `api` variables

- `DATABASE_URL` — `postgresql+asyncpg://...`
- `SECRET_KEY`, `ADMIN_BOOTSTRAP_TOKEN`, `BACKEND_CORS_ORIGINS` (comma-separated web origins)
- Optional: `STRIPE_*`, `S3_*`, `HCAPTCHA_SECRET`, `CRON_SECRET`

### `web` variables

- `NEXT_PUBLIC_API_URL` — public URL of the `api` service
- `API_INTERNAL_URL` — same unless you use private networking
- `NEXT_PUBLIC_SITE_URL` — public URL of the `web` service

### Async DB URL

If Railway provides `postgres://user:pass@host:port/db`, convert to:

`postgresql+asyncpg://user:pass@host:port/db`

### Healthchecks

- Split: `api` → `/api/v1/health`, `web` → `/`
- All-in-one: `/` (root `railway.json`)

### Migrations (split)

Migrations run automatically at API startup. To run or retry manually (e.g. debugging):

```bash
railway run --service api alembic upgrade head
```

### Bootstrap admin (split)

```bash
curl -X POST "$API_URL/api/v1/admin/seed-first-user" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Token: $ADMIN_BOOTSTRAP_TOKEN" \
  -d '{"email":"you@domain.com","password":"..."}'
```

Then sign in at `https://your-web-url/admin/login`.

**Vendor directory content** is editable in production without redeploying: after login go to **Admin → Vendors**, use **Edit** on any vendor, then **Save changes**. Updates are stored in Postgres and show on public `/vendors` pages immediately.

### Weekly featured vendor cron

`POST /api/v1/internal/cron/rotate-featured` with header `X-Cron-Secret: $CRON_SECRET`.

---

## Repo layout reference

| Path | Role |
|------|------|
| `/railway.json` | All-in-one: Docker build + deploy healthcheck |
| `/Dockerfile` | All-in-one image |
| `/deploy/railway/` | nginx template + entrypoint for all-in-one |
| `backend/railway.json` | Split API: Railpack + start command |
| `frontend/railway.json` | Split web: Railpack + start command |
| `backend/railpack.json` / `frontend/railpack.json` | Runtime pins when using Railpack |

---

## Optional overrides

- **Build command** (service settings): only if the default is wrong; Railway runs it after tool install.
- **Railpack:** [environment variables](https://railpack.com/config/environment-variables)
- **`RAILPACK_CONFIG_FILE`:** path relative to the service root if you relocate `railpack.json`.

---

## Troubleshooting: HTTP 502 on `/api/v1/*`

A **502 Bad Gateway** means nginx (all-in-one) or your host proxy could not get a valid response from **FastAPI**. The browser may then show failed fetches for paths like `/api/v1/announcements/active`, `/api/v1/vendors`, or supporter routes.

### All-in-one (single Docker service)

1. Open **deploy logs** and confirm you see `railway: starting uvicorn…` with **no** immediate exit. If migrations fail, the [entrypoint](../deploy/railway/entrypoint.sh) exits before nginx is useful for API traffic.
2. Confirm **`DATABASE_URL`** uses `postgresql+asyncpg://…` (convert from `postgres://` if Railway gave the latter). Wrong or unreachable DB often breaks migrations or runtime.
3. From your machine (replace with your public URL):

   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR_HOST/api/v1/health
   ```

   Expect **200**. If you get **502**, the API process is not healthy behind nginx.

### Split stack (`api` + `web`)

1. **`api` service:** `curl "$API_PUBLIC_URL/api/v1/health"` should return **200**. Fix `DATABASE_URL`, migrations, and API logs first.
2. **`web` service — `API_INTERNAL_URL`:** Server-side [BFF](../frontend/app/api/bff/[[...path]]/route.ts) must reach the API from the Next.js process. Set `API_INTERNAL_URL` to the API base URL (public or private networking URL per Railway). If it is wrong or unset when `NEXT_PUBLIC_API_URL` is `same`, the BFF may return JSON **502** with a hint about `API_INTERNAL_URL`.
3. **`BACKEND_CORS_ORIGINS` on `api`:** Must include your **web** origin (e.g. `https://your-web.up.railway.app`) so browser calls that go **directly** to the API (when `NEXT_PUBLIC_API_URL` is not `same`) are allowed.

### JSON parse errors in the console after 502

If the proxy returns an **HTML** error page, any code that calls `response.json()` on that body can throw `Unexpected token '<'`. The app’s shared helper [`readResponseBodyJson`](../frontend/lib/api.ts) avoids throwing on non-JSON bodies; remaining **502** fixes are operational (API up, env correct), not a substitute for a running backend.

---

## Browser console: extension noise and preload warnings

### `mce-autosize-textarea` / `webcomponents-ce.js` / `overlay_bundle.js`

Errors like **“A custom element with name 'mce-autosize-textarea' has already been defined”** with a stack in **`overlay_bundle.js`** do **not** come from this repo. They usually indicate a **browser extension** (or injected overlay) registering web components twice. **Mitigation:** try an Incognito window with extensions disabled, another browser profile, or rule out extensions on that site.

### “The resource was preloaded using link preload but not used…”

Chrome often reports this for **Next.js font preloads** (e.g. `next/font/google`). It is a **performance hint**, not a broken feature. You can ignore it unless you add your own `<link rel="preload">` with a wrong `as` attribute.
