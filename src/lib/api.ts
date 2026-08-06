import type {
  JikanAnime,
  JikanImages,
  JikanPage,
  JikanPagination,
} from "@/types/jikan";

// ---------------------------------------------------------------------------
// Centralized API client for the CaptureOrDie Express backend.
//
// The backend URL comes from VITE_API_URL (see .env / .env.example) — never
// hardcode a host here. A relative "/api" fallback is used only when the
// variable is missing (e.g. when the frontend is served by the backend
// itself), so the code itself contains no hardcoded URLs.
// ---------------------------------------------------------------------------
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, init?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = init?.status;
    this.code = init?.code;
    this.details = init?.details;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

async function apiFetch<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(
      body?.error?.message || `Request failed (${res.status})`,
      { status: res.status, code: body?.error?.code, details: body?.error?.details }
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Normalization — maps the backend's exact response schema (AniList-style
// field names: titleRomaji, coverImageLarge, averageScore 0-100, format,
// seasonYear, startDate/endDate, favourites, videoUrl …) into the app's
// internal JikanAnime shape so every component renders correctly.
// ---------------------------------------------------------------------------
function pickImage(raw: Record<string, unknown>): JikanImages {
  // Primary: the backend's coverImageLarge / coverImageMedium fields.
  // Fallbacks retained for robustness against future field renames.
  const large = raw.coverImageLarge || raw.coverImageMedium;
  const small = raw.coverImageMedium || large;
  const jpgImage =
    raw.images && typeof raw.images === "object"
      ? (raw.images as Record<string, unknown>).jpg
      : undefined;
  const jpgImageUrl =
    large ||
    (jpgImage && (jpgImage as Record<string, unknown>).image_url) ||
    (raw.images as Record<string, unknown> | undefined)?.image_url ||
    raw.image ||
    raw.image_url ||
    raw.poster ||
    raw.cover ||
    raw.thumbnail ||
    "/placeholder.svg";
  const webp =
    raw.images && typeof raw.images === "object"
      ? (raw.images as Record<string, unknown>).webp
      : undefined;
  return {
    jpg: {
      image_url: String(jpgImageUrl),
      small_image_url: String(small || jpgImageUrl),
      large_image_url: String(large || jpgImageUrl),
    },
    webp: webp
      ? {
          image_url: String((webp as Record<string, unknown>).image_url || jpgImageUrl),
          small_image_url: String((webp as Record<string, unknown>).small_image_url || jpgImageUrl),
          large_image_url: String((webp as Record<string, unknown>).large_image_url || jpgImageUrl),
        }
      : undefined,
  };
}

function pickGenres(raw: Record<string, unknown>): JikanAnime["genres"] {
  const genres = raw.genres ?? raw.genre ?? [];
  if (!Array.isArray(genres)) return [];
  return genres.map((g, i) =>
    typeof g === "string"
      ? { mal_id: i + 1, type: "genre", name: g, url: "" }
      : { mal_id: Number((g as Record<string, unknown>).mal_id ?? (g as Record<string, unknown>).id ?? i + 1), type: "genre", name: String((g as Record<string, unknown>).name ?? ""), url: String((g as Record<string, unknown>).url ?? "") }
  ).filter((g) => g.name);
}

function pickStudios(raw: Record<string, unknown>): JikanAnime["studios"] {
  const studios = raw.studios ?? raw.studio ?? raw.studio_name;
  if (!studios) return [];
  const list = Array.isArray(studios) ? studios : [studios];
  return list.map((s, i) =>
    typeof s === "string"
      ? { mal_id: i + 1, type: "studio", name: s, url: "" }
      : { mal_id: Number((s as Record<string, unknown>).mal_id ?? (s as Record<string, unknown>).id ?? i + 1), type: "studio", name: String((s as Record<string, unknown>).name ?? ""), url: String((s as Record<string, unknown>).url ?? "") }
  ).filter((s) => s.name);
}

const toNum = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v != null ? n : undefined;
};

/** Map backend media status enums to display-friendly labels. */
const STATUS_LABELS: Record<string, string> = {
  RELEASING: "Airing",
  FINISHED: "Finished",
  NOT_YET_RELEASED: "Not Yet Released",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};

export function normalizeAnime(raw: unknown): JikanAnime {
  const item = (raw ?? {}) as Record<string, unknown>;
  const id = Number(item.id ?? item.mal_id ?? item.animeId ?? 0);
  const title = String(
    item.titleRomaji ?? item.titleEnglish ?? item.titleNative ?? item.title ?? item.name ?? "Untitled"
  );
  const status = item.status ? String(item.status) : undefined;
  const startDate = item.startDate ?? item.start_date;
  const endDate = item.endDate ?? item.end_date;
  const durationMinutes = toNum(item.durationMinutes);
  const averageScore = toNum(item.averageScore);
  // startDate/endDate come back with a time component; show YYYY-MM-DD.
  const fmtDate = (v: unknown) => (v ? String(v).slice(0, 10) : null);
  const aired =
    startDate || endDate
      ? {
          from: fmtDate(startDate),
          to: fmtDate(endDate),
          string: `${fmtDate(startDate) ?? "?"} to ${fmtDate(endDate) ?? "?"}`,
        }
      : undefined;
  return {
    mal_id: id,
    url: String(item.url ?? item.mal_url ?? ""),
    images: pickImage(item),
    title,
    title_english: item.titleEnglish ? String(item.titleEnglish) : undefined,
    title_japanese: item.titleNative ? String(item.titleNative) : undefined,
    // The backend calls it "format" (TV / MOVIE / OVA / …).
    type: item.format ? String(item.format) : item.type ? String(item.type) : undefined,
    source: item.source ? String(item.source) : undefined,
    episodes: toNum(item.episodes ?? item.episodeCount ?? item.episode_count),
    status,
    airing: status === "RELEASING" || Boolean(item.airing ?? item.isAiring ?? false),
    aired,
    // durationMinutes is a number; display as "N min".
    duration: durationMinutes ? `${durationMinutes} min` : item.duration ? String(item.duration) : undefined,
    rating: item.rating ? String(item.rating) : undefined,
    // averageScore is 0–100 on the backend; the UI expects 0–10.
    score: averageScore != null ? Math.round((averageScore / 10) * 100) / 100 : toNum(item.score),
    scored_by: toNum(item.scored_by ?? item.score_count ?? item.meanScore),
    rank: toNum(item.rank),
    popularity: toNum(item.popularity),
    members: toNum(item.members),
    // Backend uses British spelling: "favourites".
    favorites: toNum(item.favourites ?? item.favorites),
    synopsis: String(item.description ?? item.synopsis ?? item.overview ?? "") || undefined,
    background: item.background ? String(item.background) : undefined,
    season: item.season ? String(item.season) : undefined,
    year: toNum(item.seasonYear ?? item.year ?? item.releaseYear),
    studios: pickStudios(item),
    genres: pickGenres(item),
    themes: item.themes ? pickGenres({ genres: item.themes }) : undefined,
    demographics: item.demographics ? pickGenres({ genres: item.demographics }) : undefined,
    trailer: item.trailer && typeof item.trailer === "object"
      ? {
          youtube_id: (item.trailer as Record<string, unknown>).youtube_id ? String((item.trailer as Record<string, unknown>).youtube_id) : undefined,
          url: (item.trailer as Record<string, unknown>).url ? String((item.trailer as Record<string, unknown>).url) : undefined,
          embed_url: (item.trailer as Record<string, unknown>).embed_url ? String((item.trailer as Record<string, unknown>).embed_url) : undefined,
        }
      : undefined,
  };
}

/** Display label for a backend status enum (or the raw value). */
export function statusLabel(status?: string | null): string {
  return status ? STATUS_LABELS[status] ?? status : "Unknown";
}

/** Normalize a backend list payload into the internal JikanPage shape. */
export function normalizeAnimePage(raw: unknown): JikanPage<JikanAnime> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const meta = (body.meta ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(body.data) ? (body.data as unknown[]) : [];
  const page = Number(meta.page ?? 1);
  const totalPages = Number(meta.totalPages ?? meta.last_visible_page ?? page);
  const pagination: JikanPagination = {
    last_visible_page: totalPages,
    has_next_page: Boolean(meta.hasNextPage ?? meta.has_next_page ?? false),
    has_previous_page: page > 1,
    current_page: page,
    items: meta.total != null ? { count: rawItems.length, total: Number(meta.total), per_page: Number(meta.limit ?? rawItems.length) } : undefined,
  };
  return { data: rawItems.map(normalizeAnime), pagination };
}

// ---------------------------------------------------------------------------
// Episodes
// ---------------------------------------------------------------------------
export interface EpisodeSource {
  url: string;
  type?: "embed" | "direct";
  quality?: string;
  provider?: string;
}

export interface BackendEpisode {
  id: string;
  number: number;
  title?: string | null;
  aired?: string | null;
  score?: number | null;
  sources: EpisodeSource[];
}

function normalizeEpisodes(raw: unknown): BackendEpisode[] {
  const body = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(body.data) ? (body.data as unknown[]) : Array.isArray(body) ? (body as unknown[]) : [];
  return rawItems.map((e, index) => {
    const ep = (e ?? {}) as Record<string, unknown>;
    const id = String(ep.id ?? ep.episodeId ?? ep.mal_id ?? index + 1);
    const rawSources = Array.isArray(ep.sources)
      ? (ep.sources as unknown[])
      : ep.url || ep.embed || ep.videoUrl || ep.source
        ? [ep]
        : [];
    const sources: EpisodeSource[] = rawSources
      .map((s): EpisodeSource | null => {
        const src = (s ?? {}) as Record<string, unknown>;
        // The backend returns a single direct `videoUrl` per episode.
        const url = String(src.videoUrl ?? src.url ?? src.embed ?? src.file ?? src.source ?? "");
        if (!url) return null;
        const fromVideoUrl = Boolean(src.videoUrl);
        return {
          url,
          // Direct media URLs must play in the <video> element, not an iframe.
          type:
            (src.type as "embed" | "direct" | undefined) ??
            (fromVideoUrl ? "direct" : "embed"),
          quality: src.quality ? String(src.quality) : undefined,
          provider: src.provider ? String(src.provider) : src.server ? String(src.server) : "Backend",
        };
      })
      .filter((s): s is EpisodeSource => s !== null);
    return {
      id,
      number: Number(ep.number ?? ep.episode_number ?? ep.ep ?? index + 1),
      title: ep.title ? String(ep.title) : null,
      aired: ep.airDate ? String(ep.airDate) : ep.aired ? String(ep.aired) : null,
      score: toNum(ep.score),
      sources,
    };
  });
}

// ---------------------------------------------------------------------------
// Endpoints (public API)
// ---------------------------------------------------------------------------

/** Main list: GET /api/anime (supports page/limit/status/format/sort). */
export function fetchTopAnime(page = 1, sort: string | undefined = "score_desc") {
  return apiFetch<unknown>("/api/anime", { page, sort }).then(normalizeAnimePage);
}

/**
 * Browse by first letter. The backend has no `letter` filter (unknown query
 * params are stripped), so we fetch the catalog sorted by title and filter
 * client-side by the romaji title prefix. "all" lists everything.
 */
export function fetchAnimeByLetter(letter: string, page = 1) {
  return apiFetch<unknown>("/api/anime", {
    page,
    limit: 100,
    sort: "title_asc",
  }).then((body) => {
    const pageData = normalizeAnimePage(body);
    if (letter === "all") return pageData;
    const needle = letter.toLowerCase();
    return {
      ...pageData,
      data: pageData.data.filter((a) => a.title.toLowerCase().startsWith(needle)),
    };
  });
}

/** GET /api/anime/:id (detail). Returns the normalized anime. */
export async function fetchAnimeDetails(id: number | string) {
  const body = await apiFetch<unknown>(`/api/anime/${id}`);
  const data = (body as Record<string, unknown>).data ?? body;
  return normalizeAnime(data);
}

/** GET /api/anime/trending */
export function fetchTrendingAnime(page = 1) {
  return apiFetch<unknown>("/api/anime/trending", { page }).then(normalizeAnimePage);
}

/** GET /api/anime/popular */
export function fetchPopularAnime(page = 1) {
  return apiFetch<unknown>("/api/anime/popular", { page }).then(normalizeAnimePage);
}

/** GET /api/anime/recent */
export function fetchRecentAnime(page = 1) {
  return apiFetch<unknown>("/api/anime/recent", { page }).then(normalizeAnimePage);
}

/** GET /api/anime/search?q= */
export async function searchAnime(query: string) {
  if (!query.trim()) return [] as JikanAnime[];
  const body = await apiFetch<unknown>("/api/anime/search", { q: query.trim() });
  return normalizeAnimePage(body).data;
}

/** GET /api/anime/genre/:id */
export function fetchAnimeByGenre(genreId: number | string, page = 1) {
  return apiFetch<unknown>(`/api/anime/genre/${genreId}`, { page }).then(normalizeAnimePage);
}

/** GET /api/anime/studio/:id */
export function fetchAnimeByStudio(studioId: number | string, page = 1) {
  return apiFetch<unknown>(`/api/anime/studio/${studioId}`, { page }).then(normalizeAnimePage);
}

/** GET /api/episodes/:animeId (limit 100 = backend max, so long series
 *  aren't silently truncated at the 20-item default). */
export function fetchEpisodes(animeId: number | string) {
  return apiFetch<unknown>(`/api/episodes/${animeId}`, { limit: 100 }).then(normalizeEpisodes);
}

export { API_BASE };

// ---------------------------------------------------------------------------
// Detail extras (GET /api/anime/:id also returns characters, rating,
// episodeCount — surfaced so the UI can show them).
// ---------------------------------------------------------------------------
export interface AnimeDetailExtras {
  anime: JikanAnime;
  characters: import("@/types/jikan").CharacterEntry[];
  rating: import("@/types/jikan").RatingInfo | null;
  episodeCount: number | null;
}

export async function fetchAnimeDetailExtras(id: number | string): Promise<AnimeDetailExtras> {
  const body = await apiFetch<unknown>(`/api/anime/${id}`);
  const data = ((body as Record<string, unknown>).data ?? body) as Record<string, unknown>;
  return {
    anime: normalizeAnime(data),
    characters: Array.isArray(data.characters) ? (data.characters as import("@/types/jikan").CharacterEntry[]) : [],
    rating: data.rating && typeof data.rating === "object"
      ? (data.rating as import("@/types/jikan").RatingInfo)
      : null,
    episodeCount: toNum(data.episodeCount ?? data.episodes) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Watch streams (Anivexa via the backend — never called directly).
// ---------------------------------------------------------------------------
export interface WatchStream {
  url: string;
  type?: "hls" | "hls-redirect" | "mp4" | "embed" | "direct";
  server?: string | null;
  embedUrl?: string | null;
  referer?: string | null;
  subtitles?: SubtitleTrack[];
  priority?: number | null;
  isActive?: boolean | null;
}

export interface SubtitleTrack {
  url: string;
  label?: string;
  srclang?: string | null;
  default?: boolean;
  source?: string | null;
}

export interface WatchResponse {
  provider: string;
  episode: number;
  audio: "sub" | "dub";
  streams: WatchStream[];
  subtitles: SubtitleTrack[];
  servers: string[];
}

/** GET /api/watch/:animeId/:episode — streams for one episode. */
export async function fetchWatchStreams(
  animeId: number | string,
  episode: number,
  opts: { provider?: string; audio?: "sub" | "dub" } = {},
): Promise<WatchResponse> {
  return apiFetch<WatchResponse>(`/api/watch/${animeId}/${episode}`, {
    provider: opts.provider,
    audio: opts.audio,
  });
}
