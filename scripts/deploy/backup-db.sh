#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — Dump PostgreSQL database from the running db container
# Usage: ./scripts/deploy/backup-db.sh [backup_dir]
# =============================================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_SERVICE="db"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pff_lab_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "==> Creating database backup: ${BACKUP_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  pg_dumpall -U "${POSTGRES_USER:-pff}" --clean \
  | gzip > "${BACKUP_FILE}"

echo "==> Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# ── Rotate: keep only last 7 backups ─────────────────────────────────────────
KEEP=7
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name 'pff_lab_*.sql.gz' -type f | wc -l)
if [ "${BACKUP_COUNT}" -gt "${KEEP}" ]; then
  echo "==> Rotating backups (keeping last ${KEEP})..."
  find "${BACKUP_DIR}" -name 'pff_lab_*.sql.gz' -type f \
    | sort | head -n -"${KEEP}" | xargs rm -f
fi

echo "==> Backup complete."
