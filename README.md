# CaptureOrDie — Anime Frontend

React + Vite + TypeScript + Tailwind frontend for the CaptureOrDie anime
platform: catalog browsing, streaming (HLS), user accounts, and full
MyAnimeList synchronization.

The frontend has **no backend of its own** — it talks to the Express API in
[`capture-anime-backend`](https://github.com/Sidharth7082/capture-anime-backend)
(`VITE_API_URL`), which owns the catalog, streaming proxy, JWT auth, user
data, and the MyAnimeList OAuth flow.

## Stack

- **React 18 + TypeScript + Vite**, TanStack Query (caching, optimistic
  updates), TailwindCSS, shadcn/ui components, HLS.js player, React Router
  (code-split pages), ErrorBoundary on every route.

## Setup

```bash
npm install
echo "VITE_API_URL=http://192.168.0.193:3000" > .env   # your backend URL
npm run dev          # http://localhost:5173 (proxies /api when VITE_API_URL is unset)
npm run lint && npm run build && npx vite preview
```

Only one env var is required: **`VITE_API_URL`** (the backend base URL). It is
never hardcoded; when unset, the app falls back to a relative `/api`.

## Features

| Area | What it does |
|---|---|
| Catalog | Top/trending/popular/recent rows, search (debounced), browse by letter, genre/studio filters, full detail page + modal |
| Streaming | Episodes via `GET /api/watch/:animeId/:episode` (Anivexa HLS proxy). Player: auto-next, resume from saved position, 10s progress saves, Skip Intro/Outro, keyboard shortcuts (`Space`/`←→`/`F`/`M`) |
| Accounts | Backend JWT only (no Supabase). Login/register on `/auth`; favorites sync server-side (optimistic, localStorage guest fallback) |
| Watch history | One row per episode; Continue Watching + Recently Watched rows; resume points saved every 10s, removed on completion |
| MyAnimeList | PKCE OAuth via `GET /api/mal/connect` (fetched with the JWT, never a plain link). MAL Watching/Completed/Plan-to-Watch homepage rows, status/score/episode controls in the detail modal, auto-progress when you finish an episode, sync-from-MAL button, connect/disconnect on `/profile` |
| Media | GIFs (OtakuGifs), Danbooru and Waifu galleries with search/pagination |

## Env vars

```env
VITE_API_URL=http://192.168.0.193:3000
```

## Deployment (Netlify)

1. Build command: `npm run build` — output: `dist`.
2. Set **`VITE_API_URL`** to your backend URL (e.g. `http://192.168.0.193:3000`).
3. The backend's MAL OAuth callback must be registered in the MAL app console
   as a **single URL**: `http://192.168.0.193:3000/api/mal/callback`, and the
   backend's `FRONTEND_URL` must point at this site (e.g.
   `https://capture-anime.netlify.app`) so the OAuth flow redirects back here.

## Legacy `server/` folder

The `server/` directory is the **old standalone MAL proxy** (routes
`/api/auth/mal`, `/api/auth/callback/mal`) — kept only for reference. The
current flow uses the backend's `/api/mal/*` endpoints; the proxy's
`MAL_REDIRECT_URI` is validated to be a single URL if you ever run it.

## Notes

- Signing in requires the backend at `VITE_API_URL`; user data (favorites,
  history, continue watching, MAL list) is tied to the backend JWT session.
- Guests get the same UI with localStorage-only favorites and local watch
  history.
