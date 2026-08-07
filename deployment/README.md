# Deployment config (home server)

Operational config for the self-hosted Capture Anime stack on the home server
(`192.168.0.193`). This is a reference snapshot of what runs on the server —
paths below assume the projects live under `$HOME/pro/`.

## Layout

```
deployment/
  nginx/                 nginx site configs (symlinked into /etc/nginx/sites-enabled)
    capture-anime.conf   includes the three server blocks below
    sites-available/
      anime-api.conf     api.anime.local        -> http://127.0.0.1:3000 (backend)
      anivexa.conf       anivexa.local          -> http://127.0.0.1:4000 (anivexa API)
      anime-web.conf     anime.local + LAN IP   -> /var/www/capture-anime (frontend build)
    install-nginx.sh     installs the configs into /etc/nginx
    proxy_params         standard proxy headers
  scripts/               ops scripts (run from the server's pro/scripts/)
    lib.sh               shared helpers (ports, health URLs, DB URL parsing)
    healthcheck.sh       health report for all services (+ --strict / --json)
    restart.sh           restart backend via pm2
    update.sh            git pull + build + restart
    deploy.sh            deploy the frontend build to /var/www/capture-anime
    backup.sh            DB + env backups
    hardening.sh         server hardening (run as root)
```

## Architecture

```
jikan-rest (8081)
   \ -> anivexa-API (4000)
          \ -> capture-anime-backend (3000)
                 \ -> capture-anime-frontend (nginx :80 / Netlify)
```

- The backend listens on `*:3000` (ufw allows 22/80/443/3000).
- The frontend build is deployed to `/var/www/capture-anime` and served by
  nginx at `http://192.168.0.193/`; nginx proxies `/api` -> the backend.
- Secrets (`.env` files, DB passwords) are **not** committed — see the
  `.env.example` files in each project.
