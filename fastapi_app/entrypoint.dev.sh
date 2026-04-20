#!/bin/bash
set -euo pipefail

echo "==> Running Alembic migrations..."
alembic upgrade head

echo "==> Seeding catalog data..."
python scripts/seed_catalog.py

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "==> Seeding demo data (operators, patients, conversations)..."
  python scripts/seed_real_world_data.py
else
  echo "==> Skipping demo data seed (set SEED_DEMO_DATA=true to enable)"
fi

echo "==> Starting uvicorn in reload mode..."
exec uvicorn app.application:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --reload-delay 1.0 \
  --reload-dir /app/app \
  --reload-dir /app/alembic \
  --reload-dir /app/scripts \
  --log-level info \
  --access-log
