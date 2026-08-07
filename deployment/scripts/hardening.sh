#!/usr/bin/env bash
# hardening.sh — install + configure fail2ban and UFW (requires root).
#
# Roadmap items #3 (Fail2Ban) and #4 (UFW firewall). This script is READY but
# BLOCKED on this server because sudo needs a password. Run it as root when
# sudo access is available:
#     sudo ./hardening.sh
#
# What it does:
#   - Installs fail2ban, enables an SSH jail (ssh guard), default bantime 1h
#   - Installs ufw, enables it with: allow 22/80/443, deny the rest
#   - Optionally opens 3000/4000 ONLY if you want LAN-direct access (see below)
#   - Prints the new port policy
#
# NOTE: With nginx reverse-proxy in place, backend (:3000) and anivexa (:4000)
# should NOT be exposed. The script keeps them DENIED to the outside by default
# and only reaches them through nginx on 127.0.0.1.

set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "ERROR: run as root (sudo $0)"; exit 1; }

# Detect the REAL sshd port when SSH_PORT is not set — defaulting to 22 and
# then `ufw enable` can lock the operator out if sshd listens elsewhere.
if [[ -z "${SSH_PORT:-}" ]] && command -v sshd >/dev/null 2>&1; then
  SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port[[:space:]]/{print $2}')"
fi
SSH_PORT="${SSH_PORT:-22}"
[[ "$SSH_PORT" =~ ^[0-9]+$ ]] || { echo "ERROR: could not determine the SSH port (set SSH_PORT explicitly)"; exit 1; }
ALLOW_LAN_DIRECT="${ALLOW_LAN_DIRECT:-false}"   # set to true to expose :3000/:4000/:8081 on LAN

echo "== Installing fail2ban and ufw =="
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban ufw

echo "== fail2ban: SSH jail (default bantime 1h) =="
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ${SSH_PORT}
logpath = %(sshd_log)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo "== ufw: default deny, allow ${SSH_PORT}/80/443 =="
ufw default deny incoming
ufw default allow outgoing
ufw allow ${SSH_PORT}/tcp comment 'SSH'
ufw allow 80/tcp  comment 'HTTP (nginx)'
ufw allow 443/tcp comment 'HTTPS (nginx)'

if [[ "$ALLOW_LAN_DIRECT" == "true" ]]; then
  # The deployed stack talks over LAN IPs directly (frontend → :3000,
  # backend → :4000 anivexa, importer → :8081 jikan-rest) — all three must
  # be opened or LAN clients are dropped the moment the firewall enables.
  echo "== ALLOW_LAN_DIRECT=true: opening :3000/:4000/:8081 to LAN =="
  ufw allow 3000/tcp comment 'capture-anime backend (direct)'
  ufw allow 4000/tcp comment 'anivexa (direct)'
  ufw allow 8081/tcp comment 'jikan-rest (direct)'
else
  echo "== LAN direct access NOT opened; :3000/:4000/:8081 only reachable via nginx on 127.0.0.1 =="
  echo "   NOTE: the shipped .env files point at http://192.168.0.193:3000/:4000/:8081 —"
  echo "   either migrate those clients behind nginx or run with ALLOW_LAN_DIRECT=true,"
  echo "   otherwise every LAN client (and the importer→jikan call) will be dropped."
fi

echo
echo "== Firewall plan =="
echo "  default: deny incoming / allow outgoing"
echo "  allow: ${SSH_PORT}/tcp (SSH), 80/tcp, 443/tcp"
if [[ "$ALLOW_LAN_DIRECT" == "true" ]]; then
  echo "  allow: 3000/tcp, 4000/tcp, 8081/tcp (LAN direct)"
fi
if [[ "${ASSUME_YES:-}" != "1" ]]; then
  read -r -p "Apply this firewall now? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted — no firewall changes applied."; exit 1; }
fi

echo "y" | ufw enable
ufw status verbose

echo
echo "Hardening applied: fail2ban active, firewall active, only SSH/HTTP/HTTPS exposed."
