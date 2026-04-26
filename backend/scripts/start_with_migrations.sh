#!/bin/sh
set -e

MAX_RETRIES="${DB_MIGRATION_MAX_RETRIES:-30}"
SLEEP_SECONDS="${DB_MIGRATION_RETRY_DELAY_SECONDS:-2}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8000}"

echo "startup: applying database migrations (max retries: ${MAX_RETRIES})"

attempt=1
while [ "$attempt" -le "$MAX_RETRIES" ]; do
  if python3 -m alembic upgrade head; then
    echo "startup: migrations applied successfully"
    exec uvicorn app.main:app --host "$APP_HOST" --port "$APP_PORT"
  fi

  if [ "$attempt" -eq "$MAX_RETRIES" ]; then
    echo "startup: migration failed after ${MAX_RETRIES} attempts" >&2
    exit 1
  fi

  echo "startup: migration attempt ${attempt}/${MAX_RETRIES} failed; retrying in ${SLEEP_SECONDS}s"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done
