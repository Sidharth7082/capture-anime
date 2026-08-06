import { Star, Play, Info, Tv, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { htmlToPlainText } from "@/lib/anilist-html";
import type { JikanAnime } from "@/types/jikan";

interface HeroBannerProps {
  featuredAnime: JikanAnime | null;
  animeList: JikanAnime[];
  onViewDetailsClick: (anime: JikanAnime) => void;
  onGetAnotherClick: (list: JikanAnime[]) => void;
}

const HeroBanner = ({ featuredAnime, animeList, onViewDetailsClick, onGetAnotherClick }: HeroBannerProps) => {
  const poster =
    featuredAnime?.images?.jpg?.large_image_url ||
    featuredAnime?.images?.webp?.large_image_url;

  const genres = featuredAnime?.genres?.slice(0, 4) ?? [];
  const studios = featuredAnime?.studios?.slice(0, 2) ?? [];
  const status = featuredAnime?.status || "Unknown";
  const airing = featuredAnime?.airing ?? false;

  return (
    <section
      className="relative flex flex-col justify-center min-h-[420px] md:min-h-[460px] w-full overflow-hidden"
      style={{
        background: poster ? `url(${poster}) center/cover no-repeat` : "#f8eaff",
      }}
    >
      {/* Stronger, layered overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      <div className="relative z-10 px-4 py-16 sm:py-20 max-w-5xl mx-auto flex flex-col gap-4 w-full">
        <div className="text-[#b79dff] font-semibold text-sm uppercase tracking-widest flex items-center gap-2 mb-1 animate-fade-in">
          <Star className="w-4 h-4 text-[#b79dff]" fill="currentColor" />
          Featured Random Pick
        </div>

        {/* Re-animate content when the featured anime changes */}
        <div key={featuredAnime?.mal_id ?? "empty"} className="flex flex-col gap-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg max-w-3xl leading-tight">
            {featuredAnime?.title || "Tish Tash"}
          </h1>

          {/* Meta row: rating · status · episodes · year */}
          <div className="flex flex-wrap items-center gap-3 text-white/90 font-medium">
            {!!featuredAnime?.score && (
              <span className="flex items-center gap-1 bg-yellow-500/90 text-black font-bold px-2.5 py-1 rounded-md shadow">
                <Star className="w-4 h-4 fill-current" />
                {featuredAnime.score.toFixed(2)}
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                airing ? "bg-green-500/90 text-white" : "bg-white/20 text-white backdrop-blur"
              }`}
            >
              {airing ? "● Airing" : status}
            </span>
            {!!featuredAnime?.episodes && (
              <span className="flex items-center gap-1.5">
                <Tv className="w-4 h-4" />
                {featuredAnime.episodes} episodes
              </span>
            )}
            {!!featuredAnime?.year && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {featuredAnime.year}
              </span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <span key={g.mal_id} className="bg-purple-600/80 text-white text-xs font-semibold px-3 py-1 rounded-full shadow backdrop-blur">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis (plain text so HTML tags never leak into the hero) */}
          <p className="text-base md:text-lg text-white/85 font-medium drop-shadow-sm max-w-2xl line-clamp-4">
            {featuredAnime?.synopsis
              ? (() => {
                  const text = htmlToPlainText(featuredAnime.synopsis);
                  return text.length > 300 ? text.slice(0, 300) + "..." : text;
                })()
              : "Growing up can be tough, especially when you're a family of bears and your younger brother is a bit of a wild animal. Luckily Tish has a ridiculously huge imagination and a larger than life, imaginary friend Tash. No matter what trouble..."}
          </p>

          {/* Studios */}
          {studios.length > 0 && (
            <p className="text-sm text-white/70 font-medium">
              Studio: <span className="text-white/90">{studios.map((s) => s.name).join(", ")}</span>
            </p>
          )}

          {/* Action buttons with icons */}
          <div className="flex flex-wrap gap-4 mt-4">
            <Button
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 hover:scale-105 hover:shadow-xl transition-all px-7 py-2.5 text-lg rounded-xl font-bold shadow-md"
              onClick={() => featuredAnime && onViewDetailsClick(featuredAnime)}
              disabled={!featuredAnime}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              View Details
            </Button>
            <Button
              className="bg-white/90 text-purple-700 border border-purple-400 hover:bg-purple-50 hover:scale-105 transition-all px-7 py-2.5 text-lg rounded-xl font-bold shadow"
              onClick={() => onGetAnotherClick(animeList)}
              variant="outline"
            >
              <Info className="w-5 h-5 mr-2" />
              Get Another
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
