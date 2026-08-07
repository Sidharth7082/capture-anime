import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AnimeRowSection from "@/components/AnimeRowSection";
import AnimeCard from "@/components/AnimeCard";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { useBackendAuth } from "@/hooks/use-backend-auth";
import {
  useContinueWatchingList,
  useWatchHistoryList,
} from "@/hooks/use-continue-watching";
import { useMalMe, useMalList, useMalSync } from "@/hooks/use-mal";
import { listFavorites } from "@/lib/user-api";
import { fetchTrendingAnime, fetchPopularAnime, fetchRecentAnime } from "@/lib/api";
import type { JikanAnime } from "@/types/jikan";

interface HomeSectionsProps {
  onCardClick: (anime: JikanAnime) => void;
}

function toPartialAnime(id: number, title: string, poster?: string | null): JikanAnime {
  return {
    mal_id: id,
    title,
    url: "",
    images: {
      jpg: {
        image_url: poster || "/placeholder.svg",
        small_image_url: "",
        large_image_url: poster || "/placeholder.svg",
      },
    },
  };
}

/** Shared card for user rows (poster, title, optional progress bar). */
const UserRowCard: React.FC<{
  anime: JikanAnime;
  subtitle?: string;
  progressPct?: number;
  onCardClick: (anime: JikanAnime) => void;
}> = ({ anime, subtitle, progressPct, onCardClick }) => (
  <div className="w-40 shrink-0">
    <AnimeCard anime={anime} onClick={() => onCardClick(anime)} className="shadow-md rounded-2xl bg-white" />
    {subtitle && <p className="text-xs text-zinc-500 mt-1 px-1 truncate">{subtitle}</p>}
    {typeof progressPct === "number" && (
      <div className="mt-1 px-1">
        <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-500"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
        </div>
      </div>
    )}
  </div>
);

/**
 * "Continue Watching" — backend resume points when signed in (with a
 * progress bar + next-episode label), falling back to the local watch
 * history for guests.
 */
const ContinueWatchingRow: React.FC<{ onCardClick: (anime: JikanAnime) => void }> = ({ onCardClick }) => {
  const { isAuthenticated } = useBackendAuth();
  const backend = useContinueWatchingList(20);
  const local = useWatchHistory();

  if (isAuthenticated) {
    const items = backend.data ?? [];
    if (backend.isLoading || items.length === 0) return null;
    return (
      <section className="w-full">
        <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
          Continue Watching
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {items.map((c) => {
            const pct =
              c.durationSeconds && c.durationSeconds > 0
                ? (c.playbackPositionSeconds / c.durationSeconds) * 100
                : undefined;
            return (
              <UserRowCard
                key={c.animeId}
                anime={toPartialAnime(c.animeId, c.anime.title, c.anime.coverImageMedium)}
                subtitle={`Episode ${c.episodeNumber}`}
                progressPct={pct}
                onCardClick={onCardClick}
              />
            );
          })}
        </div>
      </section>
    );
  }

  if (local.length === 0) return null;
  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
        Continue Watching
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {local.map((h) => (
          <UserRowCard
            key={h.mal_id}
            anime={toPartialAnime(h.mal_id, h.title, h.poster)}
            subtitle={`Episode ${h.episode}`}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </section>
  );
};

/** "Recently Watched" — backend history, newest first (signed-in only). */
const RecentlyWatchedRow: React.FC<{ onCardClick: (anime: JikanAnime) => void }> = ({ onCardClick }) => {
  const { isAuthenticated } = useBackendAuth();
  const history = useWatchHistoryList(20);
  if (!isAuthenticated || history.isLoading || (history.data ?? []).length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
        Recently Watched
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {history.data!.map((h) => (
          <UserRowCard
            key={`${h.episodeId}`}
            anime={toPartialAnime(h.anime.id, h.anime.title, h.anime.coverImageMedium)}
            subtitle={h.anime.episode ? `Episode ${h.anime.episode}` : undefined}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </section>
  );
};

/** "Your Favorites" — backend favorites, newest first (signed-in only). */
const FavoritesRow: React.FC<{ onCardClick: (anime: JikanAnime) => void }> = ({ onCardClick }) => {
  const { isAuthenticated } = useBackendAuth();
  const query = useQuery({
    queryKey: ["home", "favorites-row"],
    queryFn: () => listFavorites({ limit: 20 }),
    enabled: isAuthenticated,
    staleTime: 60_000,
    select: (page) => page.data.filter((f) => f.type === "anime" && f.animeId != null),
  });
  const items = query.data ?? [];
  if (!isAuthenticated || query.isLoading || items.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
        Your Favorites
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {items.map((f) => (
          <UserRowCard
            key={f.id}
            anime={toPartialAnime(f.animeId!, f.anime?.title ?? "Favorite", f.anime?.coverImageMedium)}
            subtitle={f.anime?.format ?? undefined}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </section>
  );
};

/** Signed-out prompt so users know the personalized rows exist. */
const SignInPrompt: React.FC = () => {
  const { isAuthenticated } = useBackendAuth();
  if (isAuthenticated) return null;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-700">
        <span className="font-bold">Sign in</span> to sync your Continue Watching, history and
        favorites across devices.
      </p>
      <Link
        to="/auth"
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-purple-700"
      >
        Sign in / Register
      </Link>
    </div>
  );
};

/**
 * One MyAnimeList row (Watching / Completed / Plan to Watch). Shown only
 * when a MAL account is linked and the row has entries.
 */
const MalRowSection: React.FC<{
  title: string;
  status: "watching" | "completed" | "plan_to_watch";
  onCardClick: (anime: JikanAnime) => void;
}> = ({ title, status, onCardClick }) => {
  const { data: malUser } = useMalMe();
  const { data: entries, isLoading } = useMalList(status, 20);

  if (!malUser || isLoading || (entries ?? []).length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
        MAL · {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {entries!.map((entry) => (
          <UserRowCard
            key={entry.malAnimeId}
            anime={toPartialAnime(
              entry.anime?.id ?? entry.malAnimeId,
              entry.anime?.title ?? `MAL #${entry.malAnimeId}`,
              entry.anime?.coverImageMedium,
            )}
            subtitle={`${entry.status.replace(/_/g, " ")}${entry.score > 0 ? ` · ★${entry.score}` : ""}`}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </section>
  );
};

/** Small "Sync now" affordance for the MyAnimeList rows. */
const MalSyncButton: React.FC = () => {
  const { data: malUser } = useMalMe();
  const sync = useMalSync();
  if (!malUser) return null;
  return (
    <button
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 px-1"
    >
      {sync.isPending ? "Syncing…" : "↻ Sync from MyAnimeList"}
    </button>
  );
};

/**
 * Homepage discovery rows backed by the production backend
 * (/api/anime/trending, /api/anime/popular, /api/anime/recent). Each row is
 * its own React Query query (cached), with skeletons while loading and a
 * silent skip when the backend has no data for that row yet.
 */
const HomeSections: React.FC<HomeSectionsProps> = ({ onCardClick }) => {
  const { isAuthenticated } = useBackendAuth();

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-8 pt-12 space-y-10">
      <SignInPrompt />
      <ContinueWatchingRow onCardClick={onCardClick} />
      {isAuthenticated && <RecentlyWatchedRow onCardClick={onCardClick} />}
      {isAuthenticated && <FavoritesRow onCardClick={onCardClick} />}
      {isAuthenticated && <MalSyncButton />}
      {isAuthenticated && (
        <>
          <MalRowSection title="Watching" status="watching" onCardClick={onCardClick} />
          <MalRowSection title="Completed" status="completed" onCardClick={onCardClick} />
          <MalRowSection title="Plan to Watch" status="plan_to_watch" onCardClick={onCardClick} />
        </>
      )}
      <AnimeRowSection
        title="Trending Now"
        subtitle="Most popular right now"
        queryKey={["home", "trending"]}
        queryFn={() => fetchTrendingAnime(1)}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Popular"
        subtitle="Loved by the community"
        queryKey={["home", "popular"]}
        queryFn={() => fetchPopularAnime(1)}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Recently Updated"
        subtitle="Fresh episodes and additions"
        queryKey={["home", "recent"]}
        queryFn={() => fetchRecentAnime(1)}
        onCardClick={onCardClick}
      />
    </div>
  );
};

export default HomeSections;
