#!/bin/sh
set -e
PORT="${PORT:-8080}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8000}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template >/tmp/nginx.conf

cd /app/backend
APP_HOST=127.0.0.1 APP_PORT=8000 sh scripts/start_with_migrations.sh &

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
