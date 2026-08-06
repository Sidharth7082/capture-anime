// Minimal, pragmatic types for the Jikan (MyAnimeList) v4 API responses this
// app consumes. Only the fields actually used are declared; everything else
// in the API response is ignored.

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

export interface JikanAuthor {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAnime {
  mal_id: number;
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

export interface JikanManga {
  mal_id: number;
  url: string;
  images: JikanImages;
  title: string;
  title_english?: string | null;
  type?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  status?: string | null;
  publishing?: boolean;
  published?: {
    from?: string | null;
    to?: string | null;
    string?: string | null;
  };
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  authors?: JikanAuthor[];
  serializations?: JikanGenre[];
  genres?: JikanGenre[];
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
// Anime detail page types
// ---------------------------------------------------------------------------

export interface JikanCharacter {
  mal_id: number;
  url: string;
  images?: JikanImages;
  name: string;
  name_kanji?: string | null;
  nicknames?: string[];
  favorites?: number;
  about?: string | null;
}

export interface JikanVoiceActor {
  person: {
    mal_id: number;
    url: string;
    images?: JikanImages;
    name: string;
  };
  language: string;
}

export interface JikanCharacterRole {
  character: JikanCharacter;
  role: string;
  voice_actors: JikanVoiceActor[];
}

export interface JikanRecommendation {
  entry: JikanAnime;
  votes: number;
}

export interface JikanRelationEntry {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanRelation {
  relation: string;
  entry: JikanRelationEntry[];
}

export interface JikanAnimeStatistics {
  watching: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_watch: number;
  total: number;
  scores: Array<{ score: number; votes: number; percentage: number }>;
}

export interface JikanTheme {
  openings: string[];
  endings: string[];
}

export interface JikanReview {
  user: {
    url: string;
    username: string;
    images?: JikanImages;
  };
  mal_id: number;
  score: number;
  date: string;
  review: string;
  reactions?: {
    overall?: number;
    nice?: number;
    love_it?: number;
    funny?: number;
    confusing?: number;
    informative?: number;
    well_written?: number;
    creative?: number;
  };
}

export interface JikanEpisode {
  mal_id: number;
  title?: string | null;
  aired?: string | null;
  score?: number | null;
  forum_url?: string | null;
  filler?: boolean;
  recap?: boolean;
}
