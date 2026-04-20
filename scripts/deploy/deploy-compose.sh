#!/usr/bin/env bash
# =============================================================================
# deploy-compose.sh — Pull new images and deploy with pre-deploy backup
# Called by GitHub Actions CD pipeline or manually on the server.
# =============================================================================
set -euo pipefail

BACKEND_IMAGE="${BACKEND_IMAGE:?BACKEND_IMAGE must be set}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:?FRONTEND_IMAGE must be set}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# ── 1. Authenticate with GHCR ───────────────────────────────────────────────
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "==> Logging in to GHCR..."
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME:?GHCR_USERNAME must be set when GHCR_TOKEN is provided}" --password-stdin
fi

export BACKEND_IMAGE
export FRONTEND_IMAGE

# ── 2. Update image tags in .env.production ──────────────────────────────────
if [ -f .env.production ]; then
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${BACKEND_IMAGE}|" .env.production
  sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=${FRONTEND_IMAGE}|" .env.production
fi

# ── 3. Pre-deploy database backup (skip if db is not running) ────────────────
if docker compose -f "${COMPOSE_FILE}" ps db --status running -q 2>/dev/null | grep -q .; then
  echo "==> Taking pre-deploy database backup..."
  ./scripts/deploy/backup-db.sh ./backups || echo "WARNING: Backup failed, continuing deploy..."
else
  echo "==> No running db container — skipping backup (first deploy?)."
fi

# ── 4. Pull and deploy ──────────────────────────────────────────────────────
echo "==> Pulling new images..."
docker compose -f "${COMPOSE_FILE}" pull backend frontend

echo "==> Deploying..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# ── 5. Wait for health ──────────────────────────────────────────────────────
echo "==> Waiting for backend health (up to 90s)..."
SECONDS=0
until docker compose -f "${COMPOSE_FILE}" exec -T backend \
  python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')" 2>/dev/null; do
  if [ "${SECONDS}" -ge 90 ]; then
    echo "ERROR: Backend did not become healthy within 90s" >&2
    echo "==> Dumping backend logs:"
    docker compose -f "${COMPOSE_FILE}" logs --tail=50 backend
    exit 1
  fi
  sleep 5
done
echo "==> Backend healthy after ${SECONDS}s."

# ── 6. Cleanup ───────────────────────────────────────────────────────────────
echo "==> Pruning old images..."
docker image prune -f

echo "==> Deploy complete. Images:"
echo "    Backend:  ${BACKEND_IMAGE}"
echo "    Frontend: ${FRONTEND_IMAGE}"
