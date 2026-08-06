import React from "react";
import { useQuery } from "@tanstack/react-query";
import AnimeCard from "@/components/AnimeCard";
import type { JikanAnime, JikanPage } from "@/types/jikan";

interface AnimeRowSectionProps {
  title: string;
  subtitle?: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<JikanPage<JikanAnime>>;
  onCardClick: (anime: JikanAnime) => void;
}

const SKELETON_COUNT = 10;

/**
 * A horizontal snap-scroll row of anime cards backed by React Query.
 * Shows card-shaped skeletons while the row loads; renders nothing
 * (with a quiet hint) if the request fails or returns no data.
 */
const AnimeRowSection: React.FC<AnimeRowSectionProps> = ({
  title,
  subtitle,
  queryKey,
  queryFn,
  onCardClick,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey as unknown[],
    queryFn,
    staleTime: 10 * 60 * 1000,
  });

  const animeList = data?.data ?? [];

  // Empty or failed rows just disappear so the page never looks broken.
  if (!isLoading && (isError || animeList.length === 0)) return null;

  return (
    <section className="w-full">
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:thin]">
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
              <div key={idx} className="w-40 shrink-0 snap-start rounded-2xl overflow-hidden bg-white shadow-md animate-pulse">
                <div className="aspect-[2/3] w-full bg-gradient-to-b from-zinc-200 to-zinc-300" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-4/5 rounded bg-zinc-200" />
                  <div className="h-3 w-2/5 rounded bg-zinc-100" />
                </div>
              </div>
            ))
          : animeList.map((anime) => (
              <div key={anime.mal_id} className="w-40 shrink-0 snap-start">
                <AnimeCard
                  anime={anime}
                  onClick={() => onCardClick(anime)}
                  className="shadow-md rounded-2xl bg-white"
                />
              </div>
            ))}
      </div>
    </section>
  );
};

export default AnimeRowSection;
