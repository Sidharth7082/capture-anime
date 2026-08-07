import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listContinueWatching,
  listWatchHistory,
  recordHistory,
  removeContinueWatching,
  saveContinueWatching,
  type ContinueWatchingItem,
  type SaveProgressInput,
} from "@/lib/user-api";
import { authKeys, useBackendAuth } from "@/hooks/use-backend-auth";

/** All resume points, newest first (for the homepage row). */
export function useContinueWatchingList(limit = 20) {
  const { isAuthenticated } = useBackendAuth();
  return useQuery({
    queryKey: [...authKeys.continueWatching, limit],
    queryFn: () => listContinueWatching({ limit }),
    enabled: isAuthenticated,
    staleTime: 30_000,
    select: (page) => page.data,
  });
}

/** The resume point for one anime, if any (used to seek on play). */
export function useResumePoint(animeId: number | null | undefined) {
  const { isAuthenticated } = useBackendAuth();
  return useQuery({
    queryKey: [...authKeys.continueWatching, "all"],
    queryFn: () => listContinueWatching({ limit: 100 }),
    enabled: isAuthenticated && animeId != null,
    staleTime: 30_000,
    select: (page) => {
      if (animeId == null) return undefined;
      return page.data.find((c) => c.animeId === animeId);
    },
  });
}

/**
 * Save playback progress. The player calls this at most once every 10s (it
 * coalesces in the hook), and the backend upserts one row per anime.
 */
export function useSaveProgress() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: ({ animeId, input }: { animeId: number; input: SaveProgressInput }) =>
      saveContinueWatching(animeId, input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: authKeys.continueWatching });
      if ("removed" in result && result.removed) {
        queryClient.invalidateQueries({ queryKey: authKeys.history });
      }
    },
  });

  return save;
}

/** Remove a resume point (anime completed / user clears it). */
export function useRemoveProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (animeId: number) => removeContinueWatching(animeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.continueWatching });
    },
  });
}

/** Record that an episode was watched — backend keeps exactly one row per
 *  episode, so repeated calls just bump watched_at. */
export function useRecordHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ animeId, episode }: { animeId: number; episode: number }) =>
      recordHistory(animeId, episode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.history });
    },
  });
}

/** Recently watched episodes (for the homepage row). */
export function useWatchHistoryList(limit = 20) {
  const { isAuthenticated } = useBackendAuth();
  return useQuery({
    queryKey: [...authKeys.history, limit],
    queryFn: () => listWatchHistory({ limit }),
    enabled: isAuthenticated,
    staleTime: 30_000,
    select: (page) => page.data,
  });
}

export type { ContinueWatchingItem };
