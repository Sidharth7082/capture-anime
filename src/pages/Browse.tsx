import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAnimeDetails } from "@/lib/api";
import { useAnimeByLetter, animeKeys } from "@/hooks/use-anime-queries";
import type { JikanAnime } from "@/types/jikan";
import AnimeCard from "@/components/AnimeCard";
import AnimeDetailModal from "@/components/AnimeDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { usePageMeta } from "@/hooks/use-page-meta";

const Browse = () => {
  const { letter } = useParams<{ letter: string }>();
  const queryClient = useQueryClient();
  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { ref, inView } = useInView({ threshold: 0 });

  usePageMeta(
    letter === 'all' ? 'Top Anime Series A-Z' : `Anime starting with "${letter?.toUpperCase()}"`,
    `Browse anime alphabetically — ${letter === 'all' ? 'the top anime series' : `all anime starting with "${letter?.toUpperCase()}"`}.`,
    undefined,
    `/browse/${letter ?? ''}`
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAnimeByLetter(letter ?? "");

  const animeList: JikanAnime[] = data?.pages.flatMap((p) => p.data) ?? [];
  const hasNext = hasNextPage ?? false;

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    if (inView && hasNext && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNext, isFetchingNextPage, fetchNextPage]);

  const handleCardClick = async (anime: JikanAnime) => {
    try {
      // Serve from the React Query cache when available; fetch otherwise.
      const fullAnime = await queryClient.fetchQuery({
        queryKey: animeKeys.animeDetail(anime.mal_id),
        queryFn: () => fetchAnimeDetails(anime.mal_id),
        staleTime: 10 * 60 * 1000,
      });
      setSelectedAnime(fullAnime);
      setModalOpen(true);
    } catch {
      setSelectedAnime(anime);
      setModalOpen(true);
    }
  };

  const handleSearch = (anime: JikanAnime | null) => {
    if (anime) {
      handleCardClick(anime);
    }
  };

  const pageTitle = letter === 'all' ? 'Top Anime Series' : `Anime starting with "${letter?.toUpperCase()}"`;

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
      <NavBar onSearch={handleSearch} />
      <div className="flex-1">
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-8 pb-10">
          <div className="flex items-center justify-between mt-12 mb-6">
              <div className="flex items-center gap-4">
                  <Link to="/" className="p-2 rounded-full hover:bg-zinc-200 transition-colors">
                      <ArrowLeft className="w-6 h-6 text-zinc-700" />
                  </Link>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight drop-shadow">
                      {pageTitle}
                  </h1>
              </div>
          </div>

          {isLoading && animeList.length === 0 ? (
            <section className="grid gap-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {[...Array(18)].map((_, idx) => (
                <Skeleton key={idx} className="aspect-[2/3] rounded-2xl w-full h-64 bg-gradient-to-b from-zinc-100 to-zinc-200" />
              ))}
            </section>
          ) : animeList.length > 0 ? (
            <section className="grid gap-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {animeList.map((anime: JikanAnime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => handleCardClick(anime)}
                  className="shadow-md rounded-2xl hover:scale-105 transition group bg-white"
                />
              ))}
            </section>
          ) : !isLoading ? (
            <div className="text-center py-20">
              <p className="text-xl text-zinc-600">No anime found for letter "{letter?.toUpperCase()}".</p>
            </div>
          ) : null}

          {hasNext && (
              <div ref={ref} className="mt-10 text-center">
                  <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                      {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
              </div>
          )}
        </main>
      </div>
      <Footer />
      <AnimeDetailModal open={modalOpen} onOpenChange={setModalOpen} anime={selectedAnime} />
    </div>
  );
};

export default Browse;
