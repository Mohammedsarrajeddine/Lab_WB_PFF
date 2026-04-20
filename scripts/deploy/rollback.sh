#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Roll back to a previous image tag
# Usage: ./scripts/deploy/rollback.sh <image_tag>
#
# Example:
#   ./scripts/deploy/rollback.sh sha-abc123def456
#
# ⚠️  LIMITATIONS:
#   - This rolls back the application containers only (backend + frontend).
#   - Database migrations are NOT automatically reversed.
#     If the new release included a migration, you must manually run:
#       docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
#     BEFORE rolling back, or restore from a pre-deploy backup.
# =============================================================================
set -euo pipefail

IMAGE_TAG="${1:?Usage: rollback.sh <image_tag>}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Derive image names from .env.production BACKEND_IMAGE pattern
# Expected format: ghcr.io/<owner>/<repo>/backend:<tag>
CURRENT_BACKEND="$(grep -E '^BACKEND_IMAGE=' .env.production 2>/dev/null | cut -d= -f2 || true)"
if [ -z "${CURRENT_BACKEND}" ]; then
  echo "ERROR: BACKEND_IMAGE not found in .env.production" >&2
  exit 1
fi

REPO_PREFIX="${CURRENT_BACKEND%:*}"
FRONTEND_REPO_PREFIX="${REPO_PREFIX/backend/frontend}"

NEW_BACKEND="${REPO_PREFIX}:${IMAGE_TAG}"
NEW_FRONTEND="${FRONTEND_REPO_PREFIX}:${IMAGE_TAG}"

echo "==> Rolling back to tag: ${IMAGE_TAG}"
echo "    Backend:  ${NEW_BACKEND}"
echo "    Frontend: ${NEW_FRONTEND}"

# Take a backup first
echo "==> Taking pre-rollback backup..."
./scripts/deploy/backup-db.sh ./backups

# Update .env.production with new image tags
sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${NEW_BACKEND}|" .env.production
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=${NEW_FRONTEND}|" .env.production

export BACKEND_IMAGE="${NEW_BACKEND}"
export FRONTEND_IMAGE="${NEW_FRONTEND}"

echo "==> Pulling images..."
docker compose -f "${COMPOSE_FILE}" pull backend frontend

echo "==> Restarting services..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps backend frontend

echo "==> Pruning old images..."
docker image prune -f

echo "==> Rollback complete. Verify with:"
echo "    docker compose -f ${COMPOSE_FILE} ps"
echo "    curl -s https://\${DOMAIN}/api/v1/health | python3 -m json.tool"
