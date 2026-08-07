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

/** Start MAL OAuth — just navigate here (JWT not needed; it's a redirect). */
export const malLoginUrl = `${API_BASE}/api/mal/connect`;

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
    if (res.status === 401) {
      throw new Error(message || "Not signed in — sign in to use MyAnimeList sync.");
    }
    throw new Error(message || `MAL request failed (${res.status})`);
  }
  return body as T;
}

/** Linked MAL profile, or null when not connected / not signed in. */
export async function fetchMalMe(): Promise<{ user: MalUser | null }> {
  try {
    const res = await malFetch<{ connected: boolean; user: MalUser | null }>("/api/mal/me");
    return { user: res.connected ? res.user : null };
  } catch {
    return { user: null };
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
