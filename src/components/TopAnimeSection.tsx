import { Link } from "react-router-dom";
import AnimeCard from "@/components/AnimeCard";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JikanAnime } from "@/types/jikan";

interface TopAnimeSectionProps {
  loading: boolean;
  animeList: JikanAnime[];
  onCardClick: (anime: JikanAnime) => void;
}

const TopAnimeSection = ({ loading, animeList, onCardClick }: TopAnimeSectionProps) => {
  return (
    <div id="top-anime" className="max-w-7xl mx-auto w-full px-3 sm:px-8 pb-2">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-12 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Star className="text-purple-600 w-7 h-7" />
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight drop-shadow">Top Anime</h2>
            <p className="text-zinc-500">Highest rated on MyAnimeList</p>
          </div>
        </div>
        <Link to="/browse/all" className="text-purple-700 font-medium underline underline-offset-2 transition hover:text-purple-500 self-end md:self-center">View All →</Link>
      </div>
      {loading ? (
        <section className="mt-4 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden bg-white shadow-md animate-pulse">
              <div className="aspect-[2/3] w-full bg-gradient-to-b from-zinc-200 to-zinc-300" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-zinc-200" />
                <div className="h-3 w-1/2 rounded bg-zinc-100" />
                <div className="h-5 w-10 rounded bg-zinc-200" />
              </div>
            </div>
          ))}
        </section>
      ) : animeList.length <= 1 ? (
        <div className="text-center py-16">
          <p className="text-xl text-zinc-600">No anime available yet.</p>
          <p className="text-zinc-500 mt-1">Check back once the backend has content.</p>
        </div>
      ) : (
        <section className={cn(
          "mt-2 grid gap-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        )}>
          {animeList.slice(1, 13).map((anime: JikanAnime) => (
            <AnimeCard
              key={anime.mal_id}
              anime={anime}
              onClick={() => onCardClick(anime)}
              className="shadow-md rounded-2xl hover:scale-105 transition group bg-white"
              badgeClass="bg-gradient-to-r from-yellow-400 to-orange-400 text-white drop-shadow"
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default TopAnimeSection;
