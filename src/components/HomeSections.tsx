import AnimeRowSection from "@/components/AnimeRowSection";
import AnimeCard from "@/components/AnimeCard";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { fetchTrendingAnime, fetchPopularAnime, fetchRecentAnime } from "@/lib/api";
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
 * Homepage discovery rows backed by the production backend
 * (/api/anime/trending, /api/anime/popular, /api/anime/recent). Each row is
 * its own React Query query (cached), with skeletons while loading and a
 * silent skip when the backend has no data for that row yet.
 */
const HomeSections: React.FC<HomeSectionsProps> = ({ onCardClick }) => {
  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-8 pt-12 space-y-10">
      <ContinueWatchingRow onCardClick={onCardClick} />
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
