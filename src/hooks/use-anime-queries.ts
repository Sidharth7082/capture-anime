import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchTopAnime,
  fetchAnimeByLetter,
  fetchSeasonalAnime,
  fetchTopManga,
  fetchAnimeDetails,
  fetchMangaDetails,
} from "@/lib/api";
import type {
  JikanAnime,
  JikanManga,
  JikanPage,
} from "@/types/jikan";

// Stable, hierarchical cache keys so related queries can be invalidated
// together (e.g. refetch all top-anime pages at once).
export const animeKeys = {
  top: (page: number) => ["top-anime", page] as const,
  seasonal: () => ["seasonal-anime"] as const,
  topManga: (page: number) => ["top-manga", page] as const,
  browse: (letter: string) => ["browse", letter] as const,
  animeDetail: (id: number | string) => ["anime-detail", id] as const,
  mangaDetail: (id: number | string) => ["manga-detail", id] as const,
};

/** List of top anime for the home page. */
export function useTopAnime(page = 1) {
  return useQuery<JikanPage<JikanAnime>>({
    queryKey: animeKeys.top(page),
    queryFn: () => fetchTopAnime(page),
    staleTime: 5 * 60 * 1000, // Jikan data changes rarely; cache 5 min
  });
}

/** Anime currently airing this season (home page tab). */
export function useSeasonalAnime(enabled = true) {
  return useQuery<JikanPage<JikanAnime>>({
    queryKey: animeKeys.seasonal(),
    queryFn: () => fetchSeasonalAnime(),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

/** Top manga with pagination (home page tab). */
export function useTopManga(page = 1) {
  return useQuery<JikanPage<JikanManga>>({
    queryKey: animeKeys.topManga(page),
    queryFn: () => fetchTopManga(page),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Infinite pagination for the letter browser. The "next page" cursor is
 * derived from Jikan's pagination payload, so scroll-based loading and the
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

/** Full anime record by MAL id (used by detail modal / detail page). */
export function useAnimeDetails(id?: number | string | null) {
  return useQuery<JikanAnime>({
    queryKey: animeKeys.animeDetail(id ?? "none"),
    queryFn: () => fetchAnimeDetails(id as number | string),
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
  });
}

/** Full manga record by MAL id (used by the manga detail modal). */
export function useMangaDetails(id?: number | string | null) {
  return useQuery<JikanManga>({
    queryKey: animeKeys.mangaDetail(id ?? "none"),
    queryFn: () => fetchMangaDetails(id as number | string),
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
  });
}
