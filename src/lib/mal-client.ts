// Thin client for the CaptureOrDie backend (/api). All MAL token handling is
// done server-side; the browser only ever receives the linked user's profile.

export interface MalUser {
  id: number;
  name: string;
  picture: string | null;
}

export interface MalAnimeListEntry {
  node: {
    id: number;
    title: string;
    main_picture?: { medium?: string; large?: string } | null;
  };
  list_status: {
    status: string;
    score: number;
    num_episodes_watched: number;
    is_rewatching?: boolean;
    updated_at?: string;
  };
}

async function malFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/** Current linked MAL user, or null. */
export async function fetchMalMe(): Promise<{ user: MalUser | null }> {
  return malFetch("/api/auth/me");
}

/** Unlink the MAL account (server clears the session cookie). */
export async function fetchMalLogout(): Promise<void> {
  await malFetch("/api/auth/logout", { method: "POST" });
}

/** Start MAL OAuth — just navigate to this endpoint. */
export const malLoginUrl = "/api/auth/mal";

/** The user's MAL anime list (proxy keeps the access token server-side). */
export async function fetchMalAnimeList(status?: string): Promise<{ data: MalAnimeListEntry[] }> {
  const query = status ? `?status=${status}` : "";
  return malFetch(`/api/mal/animelist${query}`);
}

/** The user's MAL favorites. */
export async function fetchMalFavorites(): Promise<{ favorites: { anime: Array<{ id: number; title: string; picture?: string }> } }> {
  return malFetch("/api/mal/favorites");
}
