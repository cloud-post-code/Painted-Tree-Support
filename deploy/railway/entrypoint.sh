#!/bin/sh
set -e
PORT="${PORT:-8080}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8000}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template >/tmp/nginx.conf

cd /app/backend
echo "railway: running migrations before API (see logs if this fails)…" >&2
if ! sh scripts/migrate_retry.sh; then
  echo "railway: DATABASE_URL / Postgres unreachable or migrations invalid — fix env and redeploy." >&2
  exit 1
fi
echo "railway: starting uvicorn…" >&2
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UVICORN_PID=$!
sleep 1
if ! kill -0 "$UVICORN_PID" 2>/dev/null; then
  echo "railway: uvicorn exited immediately after start" >&2
  exit 1
fi

echo "railway: waiting for API liveness (/api/v1/health)…" >&2
i=0
while [ "$i" -lt 90 ]; do
  if curl -sf "http://127.0.0.1:8000/api/v1/health" >/dev/null 2>&1; then
    echo "railway: API is responding" >&2
    break
  fi
  if ! kill -0 "$UVICORN_PID" 2>/dev/null; then
    echo "railway: uvicorn died while waiting for health" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$i" -eq 90 ]; then
  echo "railway: timed out waiting for http://127.0.0.1:8000/api/v1/health (90s)" >&2
  exit 1
fi

WEB_HOME=/app/web
if [ ! -f "$WEB_HOME/server.js" ]; then
  FOUND=$(find "$WEB_HOME" -name server.js -type f ! -path "*/node_modules/*" 2>/dev/null | head -1)
  if [ -z "$FOUND" ]; then
    echo "railway: Next standalone server.js not found under /app/web" >&2
    ls -laR /app/web >&2 || true
    exit 1
  fi
  WEB_HOME=$(dirname "$FOUND")
fi
cd "$WEB_HOME"
PORT=3000 HOSTNAME=127.0.0.1 node server.js &

exec nginx -c /tmp/nginx.conf -g "daemon off;"
