import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/user-api";
import { authKeys, useBackendAuth } from "@/hooks/use-backend-auth";

// ---------------------------------------------------------------------------
// Guest store — module-level, localStorage-backed, shared by every card so a
// heart toggle updates all cards immediately. When the user signs into the
// backend, the guest list is merged into the server list and this store is
// bypassed (see below).
// ---------------------------------------------------------------------------
const KEY = "favorite-anime-ids";

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

let guestIds: number[] = read();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(guestIds));
  } catch {
    // Storage unavailable (private mode, quota) — favorites just won't persist.
  }
}

function useGuestFavorites() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleGuest = (id: number) => {
    guestIds = guestIds.includes(id)
      ? guestIds.filter((x) => x !== id)
      : [...guestIds, id];
    persist();
    notify();
  };

  return {
    ids: guestIds,
    toggle: toggleGuest,
    isFavorite: (id: number) => guestIds.includes(id),
  };
}

// ---------------------------------------------------------------------------
// Backend favorites — React Query, optimistic toggle. Only active when the
// user is signed in; otherwise the guest store handles everything.
// ---------------------------------------------------------------------------
function useBackendFavorites(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: authKeys.favorites,
    queryFn: () => listFavorites({ limit: 100 }),
    enabled,
    staleTime: 60_000,
    select: (page) =>
      page.data
        .filter((f) => f.type === "anime" && f.animeId != null)
        .map((f) => f.animeId as number),
  });

  const toggle = useMutation({
    mutationFn: (id: number): Promise<{ removed: boolean; id: number }> =>
      queryClient.getQueryData<number[]>(authKeys.favorites)?.includes(id)
        ? removeFavorite(id).then(() => ({ removed: true, id }))
        : addFavorite(id).then((f) => ({ removed: false, id: f.animeId ?? id })),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: authKeys.favorites });
      const previous = queryClient.getQueryData<number[]>(authKeys.favorites);
      const current = previous ?? query.data ?? [];
      queryClient.setQueryData(
        authKeys.favorites,
        current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(authKeys.favorites, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.favorites });
    },
  });

  return {
    ids: query.data ?? [],
    toggle: (id: number) => toggle.mutate(id),
    isFavorite: (id: number) => query.data?.includes(id) ?? false,
  };
}

/**
 * Shared favorites API used by every card: `{ ids, toggle, isFavorite }`.
 * Signed-in users get server-synced favorites (optimistic); guests get the
 * localStorage store. The toggle never blocks on the network — the UI
 * updates instantly either way.
 */
export function useFavorites() {
  const { isAuthenticated } = useBackendAuth();
  const guest = useGuestFavorites();
  const backend = useBackendFavorites(isAuthenticated);

  // Keep the hooks' rules-of-hooks happy regardless of auth state; the
  // backend query is disabled (no token) while signed out.
  return isAuthenticated ? backend : guest;
}
