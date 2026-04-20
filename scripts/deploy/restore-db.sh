#!/usr/bin/env bash
# =============================================================================
# restore-db.sh — Restore a database backup to the running db container
# Usage: ./scripts/deploy/restore-db.sh <backup_file.sql.gz>
#
# ⚠️  WARNING: This will DROP and recreate all databases/roles in the dump.
#     Always take a fresh backup before restoring.
# =============================================================================
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-db.sh <backup_file.sql.gz>}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_SERVICE="db"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "==> Restoring from: ${BACKUP_FILE}"
echo "    WARNING: This will overwrite the current database!"
read -rp "    Continue? [y/N] " CONFIRM
if [[ "${CONFIRM}" != [yY] ]]; then
  echo "    Aborted."
  exit 0
fi

# Stop backend to prevent writes during restore
echo "==> Stopping backend..."
docker compose -f "${COMPOSE_FILE}" stop backend

echo "==> Restoring database..."
gunzip -c "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  psql -U "${POSTGRES_USER:-pff}" -d "${POSTGRES_DB:-pff_lab}" --single-transaction

echo "==> Restarting backend..."
docker compose -f "${COMPOSE_FILE}" start backend

echo "==> Restore complete."
