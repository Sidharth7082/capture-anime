import React from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, Heart, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/use-favorites";
import type { JikanAnime } from "@/types/jikan";

interface Props {
  anime: JikanAnime;
  onClick: () => void;
  className?: string;
  badgeClass?: string;
}

const AnimeCard: React.FC<Props> = React.memo(({ anime, onClick, className, badgeClass }) => {
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(anime.mal_id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle(anime.mal_id);
  };

  return (
    <Card
      className={cn(
        "relative group p-0 cursor-pointer transition-all duration-200",
        "hover:scale-[1.05] hover:z-20 hover:shadow-2xl focus:z-20 focus:ring-2 ring-[#e50914]",
        "bg-gradient-to-b from-[#232526dd] to-[#19191ea8] shadow-xl overflow-hidden flex flex-col",
        className
      )}
      tabIndex={0}
      aria-label={anime.title}
      onClick={onClick}
      onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{
        minHeight: 0,
        boxShadow: "0 8px 32px 0 rgba(10,10,13,0.60)",
      }}
    >
      <div className="overflow-hidden rounded-b-xl flex-shrink-0">
        {anime.images?.webp?.image_url || anime.images?.jpg?.image_url ? (
          <img
            src={anime.images.webp?.image_url || anime.images.jpg.image_url}
            alt={anime.title}
            className="aspect-[2/3] w-full object-cover group-hover:scale-105 transition-transform duration-200 group-hover:brightness-90"
            loading="lazy"
            draggable={false}
            aria-hidden
          />
        ) : (
          <div className="aspect-[2/3] w-full flex items-center justify-center bg-zinc-900 text-zinc-700">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        {/* Glass gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-200 pointer-events-none" />

        {/* Quick-view hint on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span className="bg-black/65 text-white text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 border border-white/20">
            <Eye className="w-4 h-4" />
            Quick View
          </span>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          aria-label={favorite ? `Remove ${anime.title} from favorites` : `Add ${anime.title} to favorites`}
          aria-pressed={favorite}
          className={cn(
            "absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-sm transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 ring-white/70",
            favorite
              ? "bg-red-500/90 text-white shadow-lg scale-110"
              : "bg-black/40 text-white/85 hover:bg-black/60 hover:scale-110"
          )}
        >
          <Heart className={cn("w-4 h-4", favorite && "fill-current")} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-3 pb-3 pt-2 z-10 min-h-0 justify-between">
        <h3
          className="font-extrabold text-base mb-1 text-white truncate"
          title={anime.title}
          style={{
            textShadow: "0 2px 10px rgba(0,0,0,0.4)",
          }}
        >
          {anime.title}
        </h3>
        <div className="flex flex-wrap gap-1 text-xs mb-1 text-neutral-300">
          {anime.genres?.slice(0, 2).map((g) => (
            <span
              className="bg-[#232323bb] rounded px-2 py-0.5"
              key={g.mal_id}
            >
              {g.name}
            </span>
          ))}
        </div>
        <div className="mt-auto text-sm flex items-center gap-2">
          {!!anime.score && (
            <span className={cn("bg-[#e50914] text-white rounded px-2 py-0.5 font-bold animate-fade-in shadow shadow-[#e50914]/40 tracking-wide drop-shadow", badgeClass)}>
              ★ {anime.score}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});

AnimeCard.displayName = "AnimeCard";

export default AnimeCard;
