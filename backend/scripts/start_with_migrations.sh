#!/bin/sh
set -e

APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8000}"

BACKEND_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$BACKEND_ROOT" || exit 1

sh scripts/migrate_retry.sh
echo "startup: starting uvicorn on ${APP_HOST}:${APP_PORT}"
exec python3 -m uvicorn app.main:app --host "$APP_HOST" --port "$APP_PORT"
