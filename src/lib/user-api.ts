// ---------------------------------------------------------------------------
// Backend user API client — JWT auth + per-user data (favorites, watch
// history, continue watching) for the CaptureOrDie Express backend.
//
// Tokens are persisted in localStorage; the access token rides in the
// Authorization header, and a single-flight refresh keeps sessions alive
// when it expires. Nothing here hardcodes a host — it reuses API_BASE from
// the centralized api client (VITE_API_URL).
// ---------------------------------------------------------------------------
import { API_BASE, ApiError } from "@/lib/api";

const ACCESS_KEY = "anivex_access_token";
const REFRESH_KEY = "anivex_refresh_token";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh: string): void {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // storage unavailable — session stays in memory only
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Types (mirror the backend response schemas)
// ---------------------------------------------------------------------------
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt?: string;
  stats?: {
    favorites?: number;
    history?: number;
    ratings?: number;
  };
}

export interface BackendAuthResponse {
  user: BackendUser;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export interface FavoriteItem {
  id: number;
  type: "anime" | "character" | "staff";
  animeId?: number | null;
  anime?: {
    id: number;
    title: string;
    coverImageLarge?: string | null;
    coverImageMedium?: string | null;
    format?: string | null;
    episodes?: number | null;
  } | null;
}

export interface HistoryItem {
  id: number;
  episodeId: number;
  episodeTitle?: string | null;
  episodeThumbnail?: string | null;
  number?: number | null;
  animeId: number;
  animeTitle?: string | null;
  animeCoverImage?: string | null;
  progressSeconds?: number | null;
  durationSeconds?: number | null;
  completed?: boolean;
  watchedAt: string;
}

export interface ContinueWatchingItem {
  id: number;
  animeId: number;
  episodeNumber: number;
  playbackPositionSeconds: number;
  durationSeconds?: number | null;
  updatedAt: string;
  anime: {
    id: number;
    title: string;
    coverImageLarge?: string | null;
    coverImageMedium?: string | null;
    format?: string | null;
    episodes?: number | null;
  };
}

interface PageResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; hasNextPage?: boolean };
}

// ---------------------------------------------------------------------------
// Request helper with Bearer auth + single-flight refresh-on-401
// ---------------------------------------------------------------------------
type QueryParams = Record<string, string | number | boolean | undefined | null>;

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const body: BackendAuthResponse = await res.json();
        setTokens(body.tokens.accessToken, body.tokens.refreshToken);
        return body.tokens.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function authFetch<T>(
  path: string,
  init: RequestInit = {},
  params?: QueryParams,
  retried = false,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(url.toString(), { ...init, headers });
  if (res.status === 401 && !retried) {
    const fresh = await refreshAccessToken();
    if (fresh) return authFetch<T>(path, init, params, true);
  }
  if (!res.ok) {
    let body: { error?: { message?: string } } | null = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(body?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
    });
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function backendLogin(identifier: string, password: string): Promise<BackendUser> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    let body: { error?: { message?: string } } | null = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(body?.error?.message || `Login failed (${res.status})`, {
      status: res.status,
    });
  }
  const data: BackendAuthResponse = await res.json();
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return data.user;
}

export async function backendRegister(
  username: string,
  email: string,
  password: string,
): Promise<BackendUser> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    let body: { error?: { message?: string } } | null = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(body?.error?.message || `Registration failed (${res.status})`, {
      status: res.status,
    });
  }
  const data: BackendAuthResponse = await res.json();
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return data.user;
}

export async function backendLogout(): Promise<void> {
  try {
    // Send the refresh token in the body: the backend resolves it from
    // body ?? cookie, and in the cross-origin deployment the httpOnly cookie
    // never reaches it. Without this the server-side token stays valid for
    // up to 30 days after logout.
    await authFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
  } catch {
    // best-effort — tokens are cleared regardless
  } finally {
    clearTokens();
  }
}

export function fetchMe(): Promise<BackendUser> {
  return authFetch<BackendUser>("/api/user/profile");
}

// ---------------------------------------------------------------------------
// Favorites (anime)
// ---------------------------------------------------------------------------
export function listFavorites(params: { page?: number; limit?: number } = {}): Promise<PageResponse<FavoriteItem>> {
  return authFetch<PageResponse<FavoriteItem>>(`/api/user/favorites`, {}, params);
}

/** Optimistic-friendly: returns the created favorite row. */
export async function addFavorite(animeId: number): Promise<FavoriteItem> {
  const res = await authFetch<{ favorite: FavoriteItem }>("/api/user/favorites", {
    method: "POST",
    body: JSON.stringify({ animeId }),
  });
  return res.favorite;
}

/** DELETE /api/user/favorites/:animeId (backend deletes by row id or anime id). */
export async function removeFavorite(animeId: number): Promise<void> {
  await authFetch(`/api/user/favorites/${animeId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Watch history
// ---------------------------------------------------------------------------
export function listWatchHistory(params: { page?: number; limit?: number } = {}): Promise<PageResponse<HistoryItem>> {
  return authFetch<PageResponse<HistoryItem>>(`/api/user/history`, {}, params);
}

/** Record that an episode was watched — backend keeps one row per episode. */
export async function recordHistory(animeId: number, episode: number): Promise<void> {
  await authFetch("/api/user/history", {
    method: "POST",
    body: JSON.stringify({ animeId, episode }),
  });
}

// ---------------------------------------------------------------------------
// Continue watching
// ---------------------------------------------------------------------------
export function listContinueWatching(params: { page?: number; limit?: number } = {}): Promise<PageResponse<ContinueWatchingItem>> {
  return authFetch<PageResponse<ContinueWatchingItem>>(`/api/user/continue-watching`, {}, params);
}

export interface SaveProgressInput {
  episodeNumber: number;
  playbackPositionSeconds: number;
  durationSeconds?: number;
}

export async function saveContinueWatching(
  animeId: number,
  input: SaveProgressInput,
): Promise<ContinueWatchingItem | { completed: true; removed: true; animeId: number }> {
  return authFetch(`/api/user/continue-watching/${animeId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function removeContinueWatching(animeId: number): Promise<void> {
  await authFetch(`/api/user/continue-watching/${animeId}`, { method: "DELETE" });
}
