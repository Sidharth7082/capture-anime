// ---------------------------------------------------------------------------
// MyAnimeList client for the CaptureOrDie Express backend (/api/mal).
//
// All MAL OAuth + token handling happens server-side: the browser only
// receives the linked profile and the synced list. These calls require the
// backend JWT (Bearer), which comes from the shared user-api token store.
// ---------------------------------------------------------------------------
import { API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/user-api";

export interface MalUser {
  id: number;
  name: string;
  picture: string | null;
  tokenExpiresAt?: string;
}

export type MalListStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

export interface MalListEntry {
  id: number;
  malAnimeId: number;
  animeId: number | null;
  status: MalListStatus;
  score: number;
  episodesWatched: number;
  rewatchCount: number;
  isRewatching: boolean;
  updatedAt: string;
  anime?: {
    id: number;
    malId: number | null;
    title: string | null;
    coverImageLarge?: string | null;
    coverImageMedium?: string | null;
    format?: string | null;
    episodes?: number | null;
  } | null;
}

interface PageResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
}

/**
 * Start MAL OAuth. This must NOT be a plain link: /api/mal/connect is
 * JWT-protected, so we fetch it with the Bearer token, read the authorize
 * URL from the JSON response, and only then navigate the browser there.
 */
export async function startMalConnect(): Promise<string> {
  const headers = new Headers({ Accept: "application/json" });
  const token = getAccessToken();
  if (!token) {
    throw new Error("Sign in to your CaptureOrDie account first, then connect MyAnimeList.");
  }
  headers.set("Authorization", `Bearer ${token}`);
  // credentials: include so the signed mal_state cookie set by /connect is
  // stored and later sent on the MAL callback navigation (binds the OAuth
  // state to this browser — prevents account-linking CSRF).
  const res = await fetch(`${API_BASE}/api/mal/connect`, { method: "GET", headers, credentials: "include" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(message || `MAL connect failed (${res.status})`);
  }
  const authorizeUrl = (body as { authorizeUrl?: string } | null)?.authorizeUrl;
  if (!authorizeUrl) throw new Error("MAL connect returned no authorize URL.");
  return authorizeUrl;
}

async function malFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message;
    const err = new Error(message || `MAL request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    if (res.status === 401) {
      err.message = message || "Not signed in — sign in to use MyAnimeList sync.";
    }
    throw err;
  }
  return body as T;
}

/** Linked MAL profile, or null when not connected / not signed in. */
export async function fetchMalMe(): Promise<{ user: MalUser | null }> {
  try {
    const res = await malFetch<{ connected: boolean; user: MalUser | null }>("/api/mal/me");
    return { user: res.connected ? res.user : null };
  } catch (err) {
    // Only a missing/dead session (401/403) means "not connected"; other
    // failures (backend down, 5xx) must surface as errors instead of being
    // silently rendered as disconnected.
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) return { user: null };
    throw err;
  }
}

/** Unlink the MAL account (drops synced entries server-side). */
export async function fetchMalLogout(): Promise<void> {
  await malFetch("/api/mal/disconnect", { method: "POST" });
}

/** Pull the full MAL list into the local database; returns counts. */
export function fetchMalSync(): Promise<{ synced: number; matched: number; removed: number }> {
  return malFetch("/api/mal/sync", { method: "POST" });
}

/** The user's synced MAL list, optionally filtered by status. */
export function fetchMalAnimeList(status?: MalListStatus, params: { page?: number; limit?: number } = {}): Promise<PageResponse<MalListEntry>> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return malFetch(`/api/mal/list${qs ? `?${qs}` : ""}`);
}

export interface MalEntryPatch {
  status?: MalListStatus;
  score?: number;
  episodesWatched?: number;
  isRewatching?: boolean;
  rewatchCount?: number;
}

/** Update an entry (status / score / episodes / rewatch) — synced to MAL. */
export function updateMalEntry(malAnimeId: number, patch: MalEntryPatch): Promise<{ malAnimeId: number; entry: MalListEntry }> {
  return malFetch(`/api/mal/list/${malAnimeId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Add an anime to the user's MAL list. */
export function addMalEntry(body: { malAnimeId: number; status: MalListStatus; score?: number; episodesWatched?: number }): Promise<{ malAnimeId: number; entry: MalListEntry }> {
  return malFetch("/api/mal/list", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Remove an anime from the user's MAL list. */
export function removeMalEntry(malAnimeId: number): Promise<{ success: boolean }> {
  return malFetch(`/api/mal/list/${malAnimeId}`, { method: "DELETE" });
}

/** Auto-update MAL episode progress from the player (local animeId). */
export function updateMalProgress(animeId: number, episodeNumber: number): Promise<{ updated: boolean; reason?: string }> {
  return malFetch("/api/mal/progress", {
    method: "POST",
    body: JSON.stringify({ animeId, episodeNumber }),
  });
}
