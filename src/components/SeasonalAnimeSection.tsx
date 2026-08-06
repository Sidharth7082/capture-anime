import React, { useState } from 'react';
import { useSeasonalAnime } from "@/hooks/use-anime-queries";
import type { JikanAnime } from "@/types/jikan";
import SeasonalAnimeCard from "@/components/SeasonalAnimeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SeasonalAnimeSectionProps {
  onCardClick: (anime: JikanAnime) => void;
}

const SeasonalAnimeSection = ({ onCardClick }: SeasonalAnimeSectionProps) => {
  const [currentSeason, setCurrentSeason] = useState(true);
  // Data is fetched via React Query (30 min staleTime) and kept in cache so
  // switching tabs back and forth never refetches unnecessarily.
  const { data, isLoading } = useSeasonalAnime(currentSeason);
  const seasonalAnime: JikanAnime[] = data?.data ?? [];

  return (
    <div id="seasonal-anime" className="max-w-7xl mx-auto w-full px-3 sm:px-8">
      <div className="flex items-start md:items-center justify-between mt-12 mb-6 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
                <CalendarDays className="text-purple-600 w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">Seasonal Anime</h2>
                <p className="text-zinc-500">Discover anime by season and year</p>
            </div>
        </div>
        <div className="flex items-center space-x-2 self-end md:self-center">
          <Checkbox id="current-season" checked={currentSeason} onCheckedChange={(checked) => setCurrentSeason(!!checked)} />
          <Label htmlFor="current-season" className="font-medium text-zinc-800">
            Current Season
          </Label>
        </div>
      </div>
      {isLoading ? (
        <section className="mt-4 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, idx) => (
            <Skeleton
              key={idx}
              className="aspect-[2/3] rounded-2xl w-full h-[350px] bg-gradient-to-b from-zinc-100 to-zinc-200 animate-pulse"
            />
          ))}
        </section>
      ) : (
        <>
          {currentSeason ? (
            <>
              <p className="text-zinc-600 mb-4">Currently airing anime this season</p>
              <section className="mt-2 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {seasonalAnime.slice(0, 15).map((anime: JikanAnime) => (
                  <SeasonalAnimeCard
                    key={anime.mal_id}
                    anime={anime}
                    onClick={() => onCardClick(anime)}
                  />
                ))}
              </section>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-zinc-600">Seasonal anime is hidden.</p>
              <p className="text-zinc-500 mt-1">Tick the “Current Season” box above to browse what's airing right now.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SeasonalAnimeSection;
