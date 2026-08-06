import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchTopAnime,
  fetchAnimeByLetter,
  fetchAnimeDetails,
  fetchEpisodes,
  type BackendEpisode,
} from "@/lib/api";
import type { JikanAnime, JikanPage } from "@/types/jikan";

// Stable, hierarchical cache keys so related queries can be invalidated
// together (e.g. refetch all top-anime pages at once).
export const animeKeys = {
  top: (page: number) => ["top-anime", page] as const,
  browse: (letter: string) => ["browse", letter] as const,
  animeDetail: (id: number | string) => ["anime-detail", id] as const,
  episodes: (id: number | string) => ["episodes", id] as const,
};

/** Main anime list for the home page. */
export function useTopAnime(page = 1) {
  return useQuery<JikanPage<JikanAnime>>({
    queryKey: animeKeys.top(page),
    queryFn: () => fetchTopAnime(page),
    staleTime: 5 * 60 * 1000,
  });
}

/** Trending anime row. */
/** Popular anime row. */
/** Recently updated anime row. */
/**
 * Infinite pagination for the letter browser. The "next page" cursor is
 * derived from the backend's meta payload, so scroll-based loading and the
 * Load More button share one source of truth and can never double-fetch.
 */
export function useAnimeByLetter(letter: string) {
  return useInfiniteQuery<JikanPage<JikanAnime>>({
    queryKey: animeKeys.browse(letter),
    queryFn: ({ pageParam }) => fetchAnimeByLetter(letter, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.has_next_page
        ? (lastPage.pagination.current_page ?? 0) + 1
        : undefined,
    enabled: letter.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Full anime record by id (used by detail modal / detail page). */
export function useAnimeDetails(id?: number | string | null) {
  return useQuery<JikanAnime>({
    queryKey: animeKeys.animeDetail(id ?? "none"),
    queryFn: () => fetchAnimeDetails(id as number | string),
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
  });
}

/** Episode list + video sources for an anime. */
export function useEpisodes(id?: number | string | null) {
  return useQuery<BackendEpisode[]>({
    queryKey: animeKeys.episodes(id ?? "none"),
    queryFn: () => fetchEpisodes(id as number | string),
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
  });
}
