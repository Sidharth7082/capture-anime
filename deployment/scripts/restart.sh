#!/usr/bin/env bash
# restart.sh — restart the backend (and optionally anivexa) via pm2 and verify.
#
# Usage:
#   ./restart.sh         # restart backend only (default)
#   ./restart.sh --all   # restart backend + anivexa
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DO_ANIVEXA=false
[[ "${1:-}" == "--all" ]] && DO_ANIVEXA=true

log "== restarting services =="

if pm2_has_app "$BACKEND_APP"; then
  pm2 restart "$BACKEND_APP" --update-env >/dev/null
  pm2 save >/dev/null
  ok "restarted $BACKEND_APP"
  wait_for_health "$BACKEND_HEALTH" "backend" 30 1 || exit 1
else
  warn "$BACKEND_APP is not running under pm2 — start it with:"
  echo "  cd $BACKEND_DIR && pm2 start src/server.js --name $BACKEND_APP --cwd $BACKEND_DIR && pm2 save"
  # Report failure — callers (cron/CI/deploy) must not see success when
  # nothing was actually restarted.
  exit 1
fi

if $DO_ANIVEXA && pm2_has_app "$ANIVEXA_APP"; then
  pm2 restart "$ANIVEXA_APP" --update-env >/dev/null
  pm2 save >/dev/null
  ok "restarted $ANIVEXA_APP"
  wait_for_health "$ANIVEXA_HEALTH" "anivexa" 20 1 || true
fi

log "== restart finished =="
