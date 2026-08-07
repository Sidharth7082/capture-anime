// Internal model used by the frontend. The centralized API client
// (src/lib/api.ts) normalizes backend responses into these shapes, so all
// components consume a stable structure regardless of the backend's field
// naming.

export interface JikanImageSet {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface JikanImages {
  jpg: JikanImageSet;
  webp?: JikanImageSet;
}

export interface JikanGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanStudio {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAnime {
  mal_id: number;
  /** Local catalog id for MyAnimeList cross-referencing (anime.id_mal). */
  malId?: number | null;
  url: string;
  images: JikanImages;
  trailer?: {
    youtube_id?: string | null;
    url?: string | null;
    embed_url?: string | null;
    images?: JikanImages;
  };
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean;
  aired?: {
    from?: string | null;
    to?: string | null;
    string?: string | null;
  };
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  background?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast?: {
    day?: string | null;
    time?: string | null;
    timezone?: string | null;
    string?: string | null;
  };
  producers?: JikanStudio[];
  licensors?: JikanStudio[];
  studios?: JikanStudio[];
  genres?: JikanGenre[];
  explicit_genres?: JikanGenre[];
  themes?: JikanGenre[];
  demographics?: JikanGenre[];
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  has_previous_page?: boolean;
  current_page?: number;
  items?: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanPage<T> {
  data: T[];
  pagination: JikanPagination;
}

// ---------------------------------------------------------------------------
// Anime detail extras (returned by GET /api/anime/:id)
// ---------------------------------------------------------------------------

export interface VoiceActor {
  id: number;
  nameFirst: string;
  nameLast: string | null;
  language: string;
}

export interface CharacterEntry {
  id: number;
  nameFirst: string;
  nameLast: string | null;
  nameNative: string | null;
  imageLarge: string | null;
  imageMedium: string | null;
  role: string;
  sortOrder: number;
  voiceActors: VoiceActor[];
}

export interface RatingInfo {
  count: number;
  average: number;
}
