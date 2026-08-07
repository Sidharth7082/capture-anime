#!/usr/bin/env bash
# Shared configuration + helpers for the capture-anime ops scripts.
# Sourced by update.sh / deploy.sh / backup.sh / restart.sh / healthcheck.sh
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths & services
# ---------------------------------------------------------------------------
PRO_ROOT="${PRO_ROOT:-$HOME/pro}"
BACKEND_DIR="${BACKEND_DIR:-$PRO_ROOT/capture-anime-backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$PRO_ROOT/capture-anime-frontend}"
ANIVEXA_DIR="${ANIVEXA_DIR:-$PRO_ROOT/anivexa-API}"
BACKUP_DIR="${BACKUP_DIR:-$PRO_ROOT/backups}"

BACKEND_APP="capture-anime-backend"
ANIVEXA_APP="anivexa-api"

BACKEND_PORT="${BACKEND_PORT:-3000}"
ANIVEXA_PORT="${ANIVEXA_PORT:-4000}"
BACKEND_HEALTH="http://127.0.0.1:${BACKEND_PORT}/health"
ANIVEXA_HEALTH="http://127.0.0.1:${ANIVEXA_PORT}/health"

# Retain this many days of backups before pruning.
KEEP_BACKUP_DAYS="${KEEP_BACKUP_DAYS:-14}"

# ---------------------------------------------------------------------------
# Colored output (auto-disabled when not a TTY)
# ---------------------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'; C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
  C_RESET=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""
fi

log()  { echo -e "${C_BLUE}[$(date '+%F %T')]${C_RESET} $*"; }
ok()   { echo -e "${C_GREEN}✔${C_RESET} $*"; }
warn() { echo -e "${C_YELLOW}⚠${C_RESET} $*" >&2; }
err()  { echo -e "${C_RED}✘${C_RESET} $*" >&2; }
die()  { err "$*"; exit 1; }

# ---------------------------------------------------------------------------
# DB connection parsed from the backend .env (never printed)
# ---------------------------------------------------------------------------
load_db_url() {
  DATABASE_URL=""
  if [[ -f "$BACKEND_DIR/.env" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
  fi
  if [[ -z "$DATABASE_URL" ]]; then
    warn "DATABASE_URL not found in $BACKEND_DIR/.env"
    return 1
  fi
  if [[ "$DATABASE_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
    DB_USER="${BASH_REMATCH[2]}"
    DB_PASS="${BASH_REMATCH[3]}"
    DB_HOST="${BASH_REMATCH[4]}"
    DB_PORT="${BASH_REMATCH[5]:-5432}"
    DB_NAME="${BASH_REMATCH[6]}"
    return 0
  fi
  warn "DATABASE_URL has an unexpected format (expected postgres://user:pass@host:port/db)"
  return 1
}

# ---------------------------------------------------------------------------
# Health helpers
# ---------------------------------------------------------------------------
http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time "${1:-5}" "$2"; }

wait_for_health() {
  local url="$1" name="$2" tries="${3:-20}" delay="${4:-1}"
  for _ in $(seq 1 "$tries"); do
    if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
      ok "$name is healthy ($url)"
      return 0
    fi
    sleep "$delay"
  done
  err "$name did not become healthy at $url after ${tries}s"
  return 1
}

# Backend is "healthy" when /health returns a JSON body containing "ok".
backend_healthy() {
  local body
  body="$(curl -sf --max-time 5 "$BACKEND_HEALTH" 2>/dev/null || true)"
  [[ "$body" == *'"ok"'* ]]
}

# True if a pm2 app with the given name exists.
pm2_has_app() { pm2 describe "$1" >/dev/null 2>&1; }
