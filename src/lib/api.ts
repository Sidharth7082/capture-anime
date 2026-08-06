import type {
  JikanAnime,
  JikanManga,
  JikanPage,
} from "@/types/jikan";

const BASE_URL = "https://api.jikan.moe/v4";

// ---------------------------------------------------------------------------
// Rate limiting: Jikan allows roughly 3 requests/second and returns HTTP 429
// with a Retry-After header when exceeded. The homepage now loads many rows
// in parallel, so all Jikan calls are funnelled through a small FIFO queue
// that spaces requests ~350ms apart. This keeps bursts well under the limit
// without dropping data.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MS = 350;

let lastRequestAt = 0;
const pending: Array<() => void> = [];
let draining = false;

function drain() {
  if (draining) return;
  draining = true;
  const tick = () => {
    const next = pending.shift();
    if (!next) {
      draining = false;
      return;
    }
    const now = Date.now();
    const wait = Math.max(0, lastRequestAt + RATE_LIMIT_MS - now);
    lastRequestAt = now + wait;
    setTimeout(() => {
      next();
      tick();
    }, wait);
  };
  tick();
}

function jikanFetch(path: string): Promise<Response> {
  return new Promise((resolve) => {
    pending.push(() => {
      resolve(fetch(`${BASE_URL}${path}`));
    });
    drain();
  });
}

async function jikanJson<T>(path: string): Promise<T> {
  const res = await jikanFetch(path);
  if (!res.ok) throw new Error(`Jikan API error ${res.status} for ${path}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export type TopAnimeFilter = "airing" | "upcoming" | "bypopularity" | "favorite";
export type AnimeType = "tv" | "movie" | "ova" | "special" | "ona";

export async function fetchTopAnime(page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/top/anime?page=${page}`);
}

export async function fetchTopAnimeFiltered(filter: TopAnimeFilter, page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/top/anime?filter=${filter}&page=${page}`);
}

export async function fetchAnimeByType(type: AnimeType, page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/top/anime?type=${type}&page=${page}`);
}

export async function fetchSchedule(page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/schedules?page=${page}`);
}

export async function fetchUpcomingAnime(page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/seasons/upcoming?page=${page}`);
}

export async function fetchRandomAnime(): Promise<JikanAnime> {
  const data = await jikanJson<{ data: JikanAnime }>(`/random/anime`);
  return data.data;
}

export async function searchAnime(query: string): Promise<JikanAnime[]> {
  if (!query.trim()) return [];
  const data = await jikanJson<{ data: JikanAnime[] }>(
    `/anime?q=${encodeURIComponent(query)}&order_by=popularity&sfw=true`
  );
  return data.data;
}

export async function fetchAnimeDetails(id: number | string): Promise<JikanAnime> {
  const data = await jikanJson<{ data: JikanAnime }>(`/anime/${id}/full`);
  return data.data;
}

export async function fetchAnimeByLetter(letter: string, page = 1): Promise<JikanPage<JikanAnime>> {
  if (letter === "all") return fetchTopAnime(page);
  return jikanJson(`/anime?letter=${letter}&page=${page}&order_by=title&sort=asc`);
}

export async function fetchSeasonalAnime(page = 1): Promise<JikanPage<JikanAnime>> {
  return jikanJson(`/seasons/now?page=${page}`);
}

export async function fetchTopManga(page = 1): Promise<JikanPage<JikanManga>> {
  return jikanJson(`/top/manga?page=${page}`);
}

export async function fetchMangaDetails(id: number | string): Promise<JikanManga> {
  const data = await jikanJson<{ data: JikanManga }>(`/manga/${id}/full`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Anime detail page endpoints
// ---------------------------------------------------------------------------

export async function fetchAnimeCharacters(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanCharacterRole[] }>(`/anime/${id}/characters`);
}

export async function fetchAnimeRecommendations(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanRecommendation[] }>(`/anime/${id}/recommendations`);
}

export async function fetchAnimeRelations(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanRelation[] }>(`/anime/${id}/relations`);
}

export async function fetchAnimeStatistics(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanAnimeStatistics }>(`/anime/${id}/statistics`);
}

export async function fetchAnimeThemes(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanTheme }>(`/anime/${id}/themes`);
}

export async function fetchAnimePictures(id: number | string) {
  return jikanJson<{ data: Array<{ images: import("@/types/jikan").JikanImages }> }>(`/anime/${id}/pictures`);
}

export async function fetchAnimeReviews(id: number | string) {
  return jikanJson<{ data: import("@/types/jikan").JikanReview[] }>(`/anime/${id}/reviews`);
}

export async function fetchAnimeEpisodes(id: number | string, page = 1) {
  return jikanJson<import("@/types/jikan").JikanPage<import("@/types/jikan").JikanEpisode>>(`/anime/${id}/episodes?page=${page}`);
}
