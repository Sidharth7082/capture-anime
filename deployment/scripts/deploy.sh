#!/usr/bin/env bash
# deploy.sh — one-command deploy: (optional backup) -> update -> healthcheck.
#
# Usage:
#   ./deploy.sh                # update backend + healthcheck
#   ./deploy.sh --backup       # take a backup before updating
#   ./deploy.sh --all          # update backend + frontend + anivexa
#   ./deploy.sh --all --backup # full deploy with pre-backup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

UPDATE_ARGS=()
DO_BACKUP=false
for arg in "$@"; do
  case "$arg" in
    --backup) DO_BACKUP=true ;;
    --all)    UPDATE_ARGS+=(--all) ;;
    --frontend) UPDATE_ARGS+=(--frontend) ;;
    --anivexa)  UPDATE_ARGS+=(--anivexa) ;;
    *) warn "Unknown option: $arg (ignored)" ;;
  esac
done

log "== capture-anime deploy started =="

if $DO_BACKUP; then
  log "--- pre-deploy backup ---"
  "$SCRIPT_DIR/backup.sh" --db-only
fi

if ! "$SCRIPT_DIR/update.sh" "${UPDATE_ARGS[@]}"; then
  err "update failed — deployment aborted"
  exit 1
fi

if ! "$SCRIPT_DIR/healthcheck.sh"; then
  err "healthcheck failed after deploy"
  exit 1
fi

log "== capture-anime deploy finished =="
ok "Deployment successful — all services healthy."
