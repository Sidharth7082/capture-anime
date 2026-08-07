#!/usr/bin/env bash
# install-nginx.sh — deploy nginx reverse-proxy configs (requires root).
#
# This script must run as root (sudo ./install-nginx.sh). It copies the
# templates from ~/pro/nginx into /etc/nginx and enables the site.
#
# After running, point your router/DNS/hosts so that:
#   api.anime.local    -> backend on :3000
#   anivexa.local      -> anivexa on :4000
#   anime.local        -> frontend (Netlify or local build)
# Then test with:  curl -H 'Host: api.anime.local' http://127.0.0.1/health

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_ETC="/etc/nginx"

[[ $EUID -eq 0 ]] || { echo "ERROR: run as root (sudo $0)"; exit 1; }
command -v /usr/sbin/nginx >/dev/null 2>&1 || { echo "ERROR: nginx not installed"; exit 1; }

# Copy proxy_params (back up existing first)
if [[ -f "$NGINX_ETC/proxy_params" && ! -f "$NGINX_ETC/proxy_params.orig" ]]; then
  cp "$NGINX_ETC/proxy_params" "$NGINX_ETC/proxy_params.orig"
fi
cp "$SRC_DIR/proxy_params" "$NGINX_ETC/proxy_params"

# Install server blocks into sites-available (files already exist in ~/pro/nginx)
for conf in anime-api anime-web anivexa; do
  cp "$SRC_DIR/sites-available/$conf.conf" "$NGINX_ETC/sites-available/$conf.conf"
done

# We include per-service blocks via the combined conf, so copy it first:
cp "$SRC_DIR/capture-anime.conf" "$NGINX_ETC/sites-available/capture-anime.conf"

# Enable the combined site (symlink), disable stock default if still present
ln -sf "$NGINX_ETC/sites-available/capture-anime.conf" "$NGINX_ETC/sites-enabled/capture-anime.conf"
if [[ -e "$NGINX_ETC/sites-enabled/default" ]]; then
  rm -f "$NGINX_ETC/sites-enabled/default"
fi

# Validate and reload
/usr/sbin/nginx -t
systemctl reload nginx || systemctl restart nginx

echo "nginx reverse proxy installed and reloaded."
echo "Test each host with:"
echo "  curl -H 'Host: api.anime.local' http://127.0.0.1/health"
echo "  curl -H 'Host: anivexa.local'   http://127.0.0.1/health"
