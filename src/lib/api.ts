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
// Defensive normalization — the backend's item shape is treated as
// unspecified: we accept the common field name variants (id/mal_id, image/
// poster/cover, description/synopsis, studio(s), genres as strings or
// {name} objects, …) and always produce the app's internal JikanAnime shape
// so every existing component keeps working unchanged.
// ---------------------------------------------------------------------------
function pickImage(raw: Record<string, unknown>): JikanImages {
  const jpgImage =
    raw.images && typeof raw.images === "object"
      ? (raw.images as Record<string, unknown>).jpg
      : undefined;
  const jpgImageUrl =
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
      small_image_url: String(
        (jpgImage && (jpgImage as Record<string, unknown>).small_image_url) || jpgImageUrl
      ),
      large_image_url: String(
        (jpgImage && (jpgImage as Record<string, unknown>).large_image_url) || jpgImageUrl
      ),
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

export function normalizeAnime(raw: unknown): JikanAnime {
  const item = (raw ?? {}) as Record<string, unknown>;
  const id = Number(item.id ?? item.mal_id ?? item.animeId ?? 0);
  const title = String(item.title ?? item.name ?? item.title_english ?? "Untitled");
  const aired = item.aired && typeof item.aired === "object"
    ? (item.aired as Record<string, unknown>)
    : { from: item.startDate ?? item.start_date, to: item.endDate ?? item.end_date, string: item.aired_string };
  return {
    mal_id: id,
    url: String(item.url ?? item.mal_url ?? ""),
    images: pickImage(item),
    title,
    title_english: item.title_english ? String(item.title_english) : undefined,
    title_japanese: item.title_japanese ? String(item.title_japanese) : undefined,
    type: item.type ? String(item.type) : undefined,
    source: item.source ? String(item.source) : undefined,
    episodes: toNum(item.episodes ?? item.episode_count),
    status: item.status ? String(item.status) : undefined,
    airing: Boolean(item.airing ?? item.isAiring ?? false),
    aired: aired.from || aired.to || aired.string
      ? { from: aired.from ? String(aired.from) : null, to: aired.to ? String(aired.to) : null, string: aired.string ? String(aired.string) : undefined }
      : undefined,
    duration: item.duration ? String(item.duration) : undefined,
    rating: item.rating ? String(item.rating) : undefined,
    score: toNum(item.score ?? item.rating_score ?? item.ratingValue),
    scored_by: toNum(item.scored_by ?? item.score_count),
    rank: toNum(item.rank),
    popularity: toNum(item.popularity),
    members: toNum(item.members),
    favorites: toNum(item.favorites),
    synopsis: item.synopsis ?? item.description ?? item.overview ? String(item.synopsis ?? item.description ?? item.overview) : undefined,
    background: item.background ? String(item.background) : undefined,
    season: item.season ? String(item.season) : undefined,
    year: toNum(item.year ?? item.releaseYear ?? item.startYear),
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
        const url = String(src.url ?? src.embed ?? src.file ?? src.videoUrl ?? src.source ?? "");
        if (!url) return null;
        return {
          url,
          type: (src.type as "embed" | "direct" | undefined) ?? (String(src.url ?? "").includes("embed") ? "embed" : "embed"),
          quality: src.quality ? String(src.quality) : undefined,
          provider: src.provider ? String(src.provider) : src.server ? String(src.server) : "Backend",
        };
      })
      .filter((s): s is EpisodeSource => s !== null);
    return {
      id,
      number: Number(ep.number ?? ep.episode_number ?? ep.ep ?? index + 1),
      title: ep.title ? String(ep.title) : null,
      aired: ep.aired ? String(ep.aired) : null,
      score: toNum(ep.score),
      sources,
    };
  });
}

// ---------------------------------------------------------------------------
// Endpoints (public API)
// ---------------------------------------------------------------------------

/** Main list: GET /api/anime (supports page/limit/letter/sort). */
export function fetchTopAnime(page = 1, sort: string | undefined = "score_desc") {
  return apiFetch<unknown>("/api/anime", { page, sort }).then(normalizeAnimePage);
}

/** Browse by first letter (letter = "all" lists everything). */
export function fetchAnimeByLetter(letter: string, page = 1) {
  return apiFetch<unknown>("/api/anime", letter === "all" ? { page } : { page, letter }).then(normalizeAnimePage);
}

/** GET /api/anime/:id */
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

/** GET /api/episodes/:animeId */
export function fetchEpisodes(animeId: number | string) {
  return apiFetch<unknown>(`/api/episodes/${animeId}`).then(normalizeEpisodes);
}

export { API_BASE };
