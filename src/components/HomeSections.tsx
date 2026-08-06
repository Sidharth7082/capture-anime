import { AnimeRowSection, RandomAnimeRow } from "@/components/AnimeRowSection";
import AnimeCard from "@/components/AnimeCard";
import { useWatchHistory } from "@/hooks/use-watch-history";
import {
  fetchTopAnimeFiltered,
  fetchAnimeByType,
  fetchSchedule,
  fetchUpcomingAnime,
  fetchSeasonalAnime,
} from "@/lib/api";
import type { JikanAnime } from "@/types/jikan";

interface HomeSectionsProps {
  onCardClick: (anime: JikanAnime) => void;
}

/**
 * "Continue Watching": shows locally recorded playback history. The history
 * entry only stores a few fields, so a minimal JikanAnime is reconstructed
 * for the card; clicking it opens the detail modal, which refetches the full
 * record by id.
 */
const ContinueWatchingRow: React.FC<{ onCardClick: (anime: JikanAnime) => void }> = ({ onCardClick }) => {
  const history = useWatchHistory();
  if (history.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mb-3 px-1">
        Continue Watching
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {history.map((h) => {
          const partial: JikanAnime = {
            mal_id: h.mal_id,
            title: h.title,
            url: "",
            images: {
              jpg: { image_url: h.poster || "/placeholder.svg", small_image_url: "", large_image_url: "" },
            },
          };
          return (
            <div key={h.mal_id} className="w-40 shrink-0">
              <AnimeCard
                anime={partial}
                onClick={() => onCardClick(partial)}
                className="shadow-md rounded-2xl bg-white"
              />
              <p className="text-xs text-zinc-500 mt-1 px-1">Episode {h.episode}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * The extra discovery rows on the homepage. Each row is its own React Query
 * query (cached 10 min), and the shared Jikan rate limiter in lib/api keeps
 * the parallel burst well under the API's request budget.
 */
const HomeSections: React.FC<HomeSectionsProps> = ({ onCardClick }) => {
  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-8 pt-12 space-y-10">
      <ContinueWatchingRow onCardClick={onCardClick} />
      <AnimeRowSection
        title="Trending Now"
        subtitle="Most popular this week"
        queryKey={["home", "trending"]}
        queryFn={() => fetchTopAnimeFiltered("bypopularity")}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Airing Today"
        subtitle="New episodes airing today"
        queryKey={["home", "airing-today"]}
        queryFn={() => fetchSchedule()}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Upcoming"
        subtitle="Coming soon"
        queryKey={["home", "upcoming"]}
        queryFn={() => fetchUpcomingAnime()}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Movies"
        subtitle="Top anime films"
        queryKey={["home", "movies"]}
        queryFn={() => fetchAnimeByType("movie")}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="OVAs"
        subtitle="Original video animations"
        queryKey={["home", "ovas"]}
        queryFn={() => fetchAnimeByType("ova")}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Popular This Season"
        subtitle="Most popular shows this season"
        queryKey={["home", "popular-season"]}
        queryFn={() => fetchSeasonalAnime()}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Most Favorited"
        subtitle="Fans' all-time favorites"
        queryKey={["home", "favorited"]}
        queryFn={() => fetchTopAnimeFiltered("favorite")}
        onCardClick={onCardClick}
      />
      <AnimeRowSection
        title="Recently Updated"
        subtitle="Currently airing — refreshed as new episodes drop"
        queryKey={["home", "recently-updated"]}
        queryFn={() => fetchTopAnimeFiltered("airing")}
        onCardClick={onCardClick}
      />
      <RandomAnimeRow onCardClick={onCardClick} />
    </div>
  );
};

export default HomeSections;
