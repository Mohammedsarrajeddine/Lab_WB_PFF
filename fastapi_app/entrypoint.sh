#!/bin/bash
set -euo pipefail

# ── 1. Run Alembic migrations (always — idempotent) ─────────────────────────
echo "==> Running Alembic migrations..."
alembic upgrade head

# ── 2. Seed catalog data (idempotent — checks counts internally) ─────────────
echo "==> Seeding catalog data..."
python scripts/seed_catalog.py

# ── 3. Seed demo data only when SEED_DEMO_DATA=true ─────────────────────────
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "==> Seeding demo data (operators, patients, conversations)..."
  python scripts/seed_real_world_data.py
else
  echo "==> Skipping demo data seed (set SEED_DEMO_DATA=true to enable)"
fi

# ── 4. Start uvicorn ────────────────────────────────────────────────────────
WORKERS="${UVICORN_WORKERS:-1}"
RELOAD="${UVICORN_RELOAD:-false}"

if [ "${RELOAD}" = "true" ]; then
  echo "==> Starting uvicorn in reload mode..."
  exec uvicorn app.application:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir /app/app \
    --reload-dir /app/alembic \
    --reload-dir /app/scripts \
    --log-level info \
    --access-log
fi

echo "==> Starting uvicorn (workers=${WORKERS})..."
exec uvicorn app.application:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${WORKERS}" \
  --log-level info \
  --access-log
