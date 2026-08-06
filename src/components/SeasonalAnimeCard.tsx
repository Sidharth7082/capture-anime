
import React from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, Star, Calendar, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { JikanAnime } from "@/types/jikan";

interface Props {
  anime: JikanAnime;
  onClick: () => void;
  className?: string;
}

const SeasonalAnimeCard: React.FC<Props> = ({ anime, onClick, className }) => (
  <Card
    className={cn("bg-white/90 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col cursor-pointer group backdrop-blur-sm border border-white/50", className)}
    tabIndex={0}
    aria-label={anime.title}
    onClick={onClick}
    onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
  >
    <div className="relative overflow-hidden rounded-t-2xl">
      <div className="aspect-[2/3] w-full">
        {anime.images?.webp?.image_url || anime.images?.jpg?.image_url ? (
          <img
            src={anime.images.webp?.image_url || anime.images.jpg.image_url}
            alt={anime.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            draggable={false}
            aria-hidden
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-200 text-zinc-400">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>
      {anime.airing && (
          <Badge variant="default" className="absolute top-2 left-2 bg-green-500 text-white border-0 shadow-lg">
            AIRING
          </Badge>
      )}
      {!!anime.score && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-black/70 text-white backdrop-blur-sm border-0 flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 text-yellow-400" />
            <span>{anime.score}</span>
          </Badge>
      )}
    </div>
    <div className="p-3 flex flex-col flex-1">
      <h3
        className="font-bold text-sm text-zinc-800 truncate"
        title={anime.title}
      >
        {anime.title}
      </h3>
      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5">
          {anime.year && <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {anime.year}</span>}
          {anime.episodes && <span className="flex items-center gap-1"><Tv className="w-3 h-3"/> {anime.episodes} ep</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2 flex-1 items-end">
        {anime.genres?.slice(0, 2).map((g) => (
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-700 border-purple-200 text-xs px-2 py-0.5 font-medium"
            key={g.name}
          >
            {g.name}
          </Badge>
        ))}
        {anime.genres && anime.genres.length > 2 && (
             <Badge
             variant="outline"
             className="bg-gray-100 text-gray-600 border-gray-200 text-xs px-2 py-0.5 font-medium"
           >
             + {anime.genres.length - 2}
           </Badge>
        )}
      </div>
    </div>
  </Card>
);

export default SeasonalAnimeCard;
