#!/usr/bin/env bash
# healthcheck.sh — report the health of every capture-anime service + DB.
#
# Usage:
#   ./healthcheck.sh              # full report (exits non-zero if backend down)
#   ./healthcheck.sh --strict     # fail if anivexa or DB are also down
#   ./healthcheck.sh --json       # machine-readable JSON summary
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

STRICT=false
JSON=false
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=true ;;
    --json)   JSON=true ;;
    *) warn "Unknown option: $arg (ignored)" ;;
  esac
done

backend_body="$(curl -sf --max-time 5 "$BACKEND_HEALTH" 2>/dev/null || true)"
backend_up=false;  [[ "$backend_body" == *'"ok"'* ]] && backend_up=true

anivexa_code="$(http_code 5 "$ANIVEXA_HEALTH")"
anivexa_up=false; [[ "$anivexa_code" == "200" ]] && anivexa_up=true

pm2_status="$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if p['name'] == '$BACKEND_APP':
            print(p['pm2_env']['status'])
            break
    else:
        print('absent')
except Exception:
    print('unknown')
" 2>/dev/null || echo "unknown")"

db_up=false
if load_db_url; then
  if PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" >/dev/null 2>&1; then
    db_up=true
  fi
fi

# pm2 restart count / uptime for the backend
pm2_extra="$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if p['name'] == '$BACKEND_APP':
            print(f\"uptime={int(p['pm2_env'].get('pm_uptime',0))} restarts={p['pm2_env'].get('restart_time',0)}\")
            break
    else:
        print('uptime=- restarts=-')
except Exception:
    print('uptime=- restarts=-')
" 2>/dev/null || echo "uptime=- restarts=-")"

if $JSON; then
  # Compute the exit code first — a monitor consuming --json must also be
  # able to rely on the exit status (previously this always exited 0, so a
  # down backend reported "healthy": false yet returned success).
  exit_code=0
  $backend_up || exit_code=1
  if $STRICT; then
    $anivexa_up || exit_code=1
    $db_up      || exit_code=1
  fi
  export HC_BACKEND="$backend_up" HC_ANIVEXA="$anivexa_up" HC_DB="$db_up" HC_PM2="$pm2_status"
  python3 <<'PY'
import json, os
backend_up, anivexa_up, db_up = (os.environ["HC_BACKEND"] == "true"), (os.environ["HC_ANIVEXA"] == "true"), (os.environ["HC_DB"] == "true")
print(json.dumps({
    "backend": { "up": backend_up, "pm2_status": os.environ.get("HC_PM2", "unknown") },
    "anivexa": { "up": anivexa_up },
    "database": { "up": db_up },
    "healthy": backend_up,
}, indent=2))
PY
  exit "$exit_code"
fi

echo "=== capture-anime health report ==="
echo "  Backend  ($BACKEND_APP, port $BACKEND_PORT) : $(backend_healthy && echo "${C_GREEN}UP${C_RESET}" || echo "${C_RED}DOWN${C_RESET}")  [$pm2_extra]"
echo "  Anivexa  (port $ANIVEXA_PORT)               : $( $anivexa_up && echo "${C_GREEN}UP${C_RESET}" || echo "${C_YELLOW}DOWN${C_RESET}")"
echo "  Database (${DB_NAME:-anime})                 : $( $db_up && echo "${C_GREEN}UP${C_RESET}" || echo "${C_YELLOW}DOWN${C_RESET}")"

$backend_up || { echo; err "backend is down — run ./update.sh or ./restart.sh"; exit 1; }
if $STRICT; then
  $anivexa_up || { echo; err "anivexa is down"; exit 1; }
  $db_up      || { echo; err "database is down"; exit 1; }
fi
echo
ok "All checked services are healthy."
