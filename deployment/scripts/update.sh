#!/usr/bin/env bash
# update.sh — pull latest code, install deps (only when changed), run migrations
#             (only when changed), restart, verify.
#
# Usage:
#   ./update.sh                # update backend only (default)
#   ./update.sh --frontend     # also pull + install frontend deps (no restart)
#   ./update.sh --anivexa      # also pull + install + restart anivexa if present
#   ./update.sh --all          # backend + frontend + anivexa
#   ./update.sh --no-migrate   # skip DB migrations
#   ./update.sh --force        # run npm install + migrate even if nothing changed
#   ./update.sh --dry-run      # report what WOULD change, but change nothing
#
# Change detection (roadmap item #5):
#   - npm install  only if package.json or package-lock.json changed since last pull
#   - npm run migrate only if db/migrations/ or db/migrate.js changed
#   - pm2 restart  only if there is new code to apply (or --force)
#
# Exits non-zero on failure. No secrets are printed.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DO_FRONTEND=false
DO_ANIVEXA=false
DO_MIGRATE=true
DO_FORCE=false
DO_DRYRUN=false
for arg in "$@"; do
  case "$arg" in
    --frontend) DO_FRONTEND=true ;;
    --anivexa)  DO_ANIVEXA=true ;;
    --all)      DO_FRONTEND=true; DO_ANIVEXA=true ;;
    --no-migrate) DO_MIGRATE=false ;;
    --force)    DO_FORCE=true ;;
    --dry-run)  DO_DRYRUN=true ;;
    *) warn "Unknown option: $arg (ignored)" ;;
  esac
done

log "== capture-anime update started =="

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# update_repo: fetch + ff-only pull; records the pre-pull HEAD for change detection.
# Sets $GIT_OLD_SHA / $GIT_NEW_SHA globals for the given repo.
update_repo() {
  local dir="$1" name="$2"
  [[ -d "$dir/.git" ]] || die "Not a git repo: $dir"
  log "--- $name: pulling origin/main ---"
  GIT_OLD_SHA=$(git -C "$dir" rev-parse HEAD)
  if $DO_DRYRUN; then
    log "  (dry-run) would run: git fetch origin && git pull --ff-only origin main"
    GIT_NEW_SHA="$GIT_OLD_SHA"
    return
  fi
  ( cd "$dir" && git fetch origin && git pull --ff-only origin main ) || die "$name: pull failed"
  GIT_NEW_SHA=$(git -C "$dir" rev-parse HEAD)
}

# file_changed_since <dir> <old_sha> <new_sha> <pathspec...>
# Returns 0 (true) if any given path differs between the two commits.
file_changed_since() {
  local dir="$1" old_sha="$2" new_sha="$3"; shift 3
  [[ "$old_sha" != "$new_sha" ]] || return 1
  # git diff --quiet returns 1 when there ARE differences; invert for "changed"
  if git -C "$dir" diff --quiet "$old_sha" "$new_sha" -- "$@"; then
    return 1
  fi
  return 0
}

# needs_deps <dir> <old_sha> <new_sha>: true if package.json/package-lock changed
needs_deps() {
  file_changed_since "$1" "$2" "$3" package.json package-lock.json
}

# needs_migrate <dir> <old_sha> <new_sha>: true if db/migrations or migrate.js changed
needs_migrate() {
  file_changed_since "$1" "$2" "$3" db/migrations db/migrate.js
}

# install_deps_if_needed <dir> <old_sha> <new_sha> <name>
install_deps_if_needed() {
  local dir="$1" old_sha="$2" new_sha="$3" name="$4"
  if $DO_FORCE || needs_deps "$dir" "$old_sha" "$new_sha"; then
    log "--- $name: installing dependencies (deps changed) ---"
    if $DO_DRYRUN; then
      log "  (dry-run) would run: npm ci --omit=dev --no-audit --no-fund"
    else
      # npm ci (not npm install): reproducible install from the lockfile that
      # never mutates package-lock.json (a dirty lockfile breaks the next
      # `git pull --ff-only`), and --omit=dev skips test tooling on the prod box.
      ( cd "$dir" && npm ci --omit=dev --no-audit --no-fund )
    fi
  else
    ok "$name: dependencies unchanged — skipping npm install"
  fi
}

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
update_repo "$BACKEND_DIR" "capture-anime-backend"
install_deps_if_needed "$BACKEND_DIR" "$GIT_OLD_SHA" "$GIT_NEW_SHA" "capture-anime-backend"

if $DO_MIGRATE; then
  if $DO_FORCE || needs_migrate "$BACKEND_DIR" "$GIT_OLD_SHA" "$GIT_NEW_SHA"; then
    log "--- backend: running database migrations (migration files changed) ---"
    if $DO_DRYRUN; then
      log "  (dry-run) would run: npm run migrate"
    else
      ( cd "$BACKEND_DIR" && npm run migrate )
    fi
  else
    ok "backend: no migration changes — skipping npm run migrate"
  fi
else
  warn "backend: migrations disabled (--no-migrate)"
fi

# Restart only when there is new code to apply, or --force (--dry-run never restarts)
if $DO_DRYRUN; then
  log "  (dry-run) would restart pm2 app: $BACKEND_APP"
elif $DO_FORCE || [[ "$GIT_OLD_SHA" != "$GIT_NEW_SHA" ]]; then
  log "--- backend: restarting via pm2 ---"
  if pm2_has_app "$BACKEND_APP"; then
    pm2 restart "$BACKEND_APP" --update-env >/dev/null
  else
    ( cd "$BACKEND_DIR" && pm2 start src/server.js --name "$BACKEND_APP" --cwd "$BACKEND_DIR" >/dev/null )
  fi
  pm2 save >/dev/null
  ok "backend restarted (pm2: $BACKEND_APP)"
else
  ok "backend: code unchanged — no restart needed"
fi

wait_for_health "$BACKEND_HEALTH" "backend" 30 1 || exit 1

# ---------------------------------------------------------------------------
# Frontend (Netlify-hosted: pull + deps only; deploy happens on Netlify)
# ---------------------------------------------------------------------------
if $DO_FRONTEND; then
  update_repo "$FRONTEND_DIR" "capture-anime-frontend"
  install_deps_if_needed "$FRONTEND_DIR" "$GIT_OLD_SHA" "$GIT_NEW_SHA" "capture-anime-frontend"
  ok "frontend pulled (site deploys via Netlify from GitHub)"
fi

# ---------------------------------------------------------------------------
# Anivexa (optional)
# ---------------------------------------------------------------------------
if $DO_ANIVEXA; then
  if [[ -d "$ANIVEXA_DIR/.git" ]]; then
    update_repo "$ANIVEXA_DIR" "anivexa-API"
    install_deps_if_needed "$ANIVEXA_DIR" "$GIT_OLD_SHA" "$GIT_NEW_SHA" "anivexa-API"
    if $DO_DRYRUN; then
      log "  (dry-run) would restart pm2 app: $ANIVEXA_APP"
    elif $DO_FORCE || [[ "$GIT_OLD_SHA" != "$GIT_NEW_SHA" ]]; then
      if pm2_has_app "$ANIVEXA_APP"; then
        pm2 restart "$ANIVEXA_APP" --update-env >/dev/null
        ok "anivexa restarted (pm2: $ANIVEXA_APP)"
      else
        warn "anivexa not managed by pm2 here — skipping restart (it runs on port $ANIVEXA_PORT)"
      fi
      wait_for_health "$ANIVEXA_HEALTH" "anivexa" 20 1 || true
    else
      ok "anivexa: code unchanged — no restart needed"
    fi
  else
    warn "no anivexa git repo at $ANIVEXA_DIR — skipped"
  fi
fi

log "== capture-anime update finished =="
ok "Backend healthy at $BACKEND_HEALTH"
