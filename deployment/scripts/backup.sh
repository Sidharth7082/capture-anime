#!/usr/bin/env bash
# backup.sh — snapshot the PostgreSQL database and sensitive local config.
#
# Usage:
#   ./backup.sh                # full backup (DB dump + env files)
#   ./backup.sh --db-only      # database dump only
#   ./backup.sh --env-only     # .env backups only
#   ./backup.sh --prune        # remove backups older than KEEP_BACKUP_DAYS
#
# Backups are written to $BACKUP_DIR (default ~/pro/backups), which is outside
# every git repository. No secrets are echoed to the terminal.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DO_DB=true
DO_ENV=true
DO_PRUNE=false
for arg in "$@"; do
  case "$arg" in
    --db-only)  DO_ENV=false ;;
    --env-only) DO_DB=false ;;
    --prune)    DO_PRUNE=true; DO_DB=false; DO_ENV=false ;;
    *) warn "Unknown option: $arg (ignored)" ;;
  esac
done

mkdir -p "$BACKUP_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"

if $DO_DB; then
  if load_db_url; then
    log "--- database backup: $DB_NAME @ $DB_HOST:$DB_PORT ---"
    DB_FILE="$BACKUP_DIR/db-$DB_NAME-$STAMP.sql.gz"
    export PGPASSWORD="$DB_PASS"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$DB_FILE"; then
      unset PGPASSWORD
      # Validate the archive before declaring success — a corrupted/partial
      # .gz must not be left behind as a "backup".
      if ! gzip -t "$DB_FILE" 2>/dev/null || [[ ! -s "$DB_FILE" ]]; then
        rm -f "$DB_FILE"
        die "backup failed: gzip produced an invalid/empty archive ($DB_FILE removed)"
      fi
      SIZE="$(du -h "$DB_FILE" | cut -f1)"
      ok "database dump written: $DB_FILE ($SIZE)"
    else
      unset PGPASSWORD
      rm -f "$DB_FILE"
      die "pg_dump/gzip failed (partial archive removed)"
    fi
  else
    warn "database backup skipped (DATABASE_URL unavailable)"
  fi
fi

if $DO_ENV; then
  log "--- env config backups ---"
  local_ok=false
  for env_path in \
    "$BACKEND_DIR/.env" \
    "$BACKEND_DIR/importer/.env" \
    "$FRONTEND_DIR/.env" \
    "$ANIVEXA_DIR/.env"; do
    if [[ -f "$env_path" ]]; then
      rel="${env_path#/home/}"
      safe_name="$(echo "$rel" | tr '/' '_')"
      cp -p "$env_path" "$BACKUP_DIR/${safe_name}.backup"
      ok "backed up $env_path -> $BACKUP_DIR/${safe_name}.backup"
      local_ok=true
    fi
  done
  $local_ok || warn "no .env files found to back up"
fi

if $DO_PRUNE; then
  log "--- pruning backups older than ${KEEP_BACKUP_DAYS} days ---"
  find "$BACKUP_DIR" -maxdepth 1 -type f -mtime "+${KEEP_BACKUP_DAYS}" -print -delete
fi

log "== backup finished =="
ok "Backups stored in $BACKUP_DIR"
