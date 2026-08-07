import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    // limit is part of the key: HomeSections asks for 20 while ProfilePage
    // asks for 100 — sharing one entry per status would silently serve the
    // wrong-sized list to whichever component mounted second.
    queryKey: [...malKeys.list(status), limit],
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
      // List queries are keyed with their limit (["mal","list",status,limit]),
      // so match every list variant by prefix instead of a limit-less key.
      const previous = queryClient.getQueriesData<MalListEntry[]>({ queryKey: ["mal", "list"] });
      queryClient.setQueriesData<MalListEntry[]>({ queryKey: ["mal", "list"] }, (old) =>
        Array.isArray(old)
          ? old.map((e) => (e.malAnimeId === malAnimeId ? { ...e, ...patch } : e))
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData<MalListEntry[]>(key, data));
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
      queryClient.setQueriesData<MalListEntry[]>({ queryKey: ["mal", "list"] }, (old) =>
        Array.isArray(old) ? [result.entry, ...old] : old,
      );
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
      queryClient.setQueriesData<MalListEntry[]>({ queryKey: ["mal", "list"] }, (old) =>
        Array.isArray(old) ? old.filter((e) => e.malAnimeId !== malAnimeId) : old,
      );
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
