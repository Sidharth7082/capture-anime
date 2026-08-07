import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  fetchMalAnimeList,
  fetchMalMe,
  fetchMalSync,
  startMalConnect,
  updateMalEntry,
  addMalEntry,
  removeMalEntry,
  updateMalProgress,
  type MalListEntry,
  type MalListStatus,
  type MalUser,
} from "@/lib/mal-client";
import { useBackendAuth } from "@/hooks/use-backend-auth";

export const malKeys = {
  me: ["mal", "me"] as const,
  list: (status?: MalListStatus) => ["mal", "list", status ?? "all"] as const,
};

/**
 * Connect MyAnimeList: fetch the authorize URL with the JWT (never a plain
 * link — the endpoint is protected), then send the browser to MAL. Uses the
 * returned URL so the PKCE state the backend persisted is the one used.
 */
export function useMalConnect() {
  return useMutation({
    mutationFn: async () => {
      const authorizeUrl = await startMalConnect();
      window.location.assign(authorizeUrl);
      return authorizeUrl;
    },
  });
}

/** Linked MAL profile (connection state + username). */
export function useMalMe() {
  const { isAuthenticated } = useBackendAuth();
  return useQuery({
    queryKey: malKeys.me,
    queryFn: async () => {
      const { user } = await fetchMalMe();
      return user as MalUser | null;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

/** The full synced list, or filtered by status. */
export function useMalList(status?: MalListStatus, limit = 100) {
  const { isAuthenticated } = useBackendAuth();
  const connected = useMalMe().data != null;
  return useQuery({
    queryKey: malKeys.list(status),
    queryFn: () => fetchMalAnimeList(status, { limit }),
    enabled: isAuthenticated && connected,
    staleTime: 60_000,
    select: (page) => page.data,
  });
}

/** Pull the full list from MAL into the local DB. */
export function useMalSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchMalSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mal"] });
    },
  });
}

/** Update an entry (status/score/episodes/rewatch) with optimistic UI. */
export function useMalUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ malAnimeId, patch }: { malAnimeId: number; patch: Parameters<typeof updateMalEntry>[1] }) =>
      updateMalEntry(malAnimeId, patch),
    onMutate: async ({ malAnimeId, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["mal", "list"] });
      const previous: { key: QueryKey; data: MalListEntry[] }[] = [];
      for (const status of ["watching", "completed", "on_hold", "dropped", "plan_to_watch", "all"] as const) {
        const key = malKeys.list(status === "all" ? undefined : status);
        const data = queryClient.getQueryData<MalListEntry[]>(key);
        if (!data) continue;
        previous.push({ key, data });
        queryClient.setQueryData(key, data.map((e) =>
          e.malAnimeId === malAnimeId ? { ...e, ...patch } : e,
        ));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(({ key, data }) => queryClient.setQueryData<MalListEntry[]>(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mal", "list"] });
    },
  });
}

/** Add an anime to the MAL list (optimistic). */
export function useMalAddEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof addMalEntry>[0]) => addMalEntry(body),
    onSuccess: (result) => {
      queryClient.setQueryData<MalListEntry[]>(malKeys.list(result.entry.status), (old = []) => [result.entry, ...old]);
      queryClient.invalidateQueries({ queryKey: ["mal", "list"] });
    },
  });
}

/** Remove an anime from the MAL list (optimistic). */
export function useMalRemoveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (malAnimeId: number) => removeMalEntry(malAnimeId),
    onMutate: async (malAnimeId) => {
      await queryClient.cancelQueries({ queryKey: ["mal", "list"] });
      for (const key of [malKeys.list(), malKeys.list("watching"), malKeys.list("completed"), malKeys.list("plan_to_watch"), malKeys.list("on_hold"), malKeys.list("dropped")]) {
        const data = queryClient.getQueryData<MalListEntry[]>(key);
        if (data) queryClient.setQueryData(key, data.filter((e) => e.malAnimeId !== malAnimeId));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mal", "list"] });
    },
  });
}

/** Player auto-progress: bump MAL episodes watched for a local anime. */
export function useMalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ animeId, episodeNumber }: { animeId: number; episodeNumber: number }) =>
      updateMalProgress(animeId, episodeNumber),
    onSuccess: (result) => {
      if (result.updated) {
        queryClient.invalidateQueries({ queryKey: ["mal", "list"] });
      }
    },
  });
}
