import React, { useEffect, useState, useCallback, useMemo, Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAnimeDetails } from "@/lib/api";
import { useTopAnime, animeKeys } from "@/hooks/use-anime-queries";
import type { JikanAnime } from "@/types/jikan";
import AnimeDetailModal from "@/components/AnimeDetailModal";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import HeroBanner from "@/components/HeroBanner";
import TopAnimeSection from "@/components/TopAnimeSection";
import { usePageMeta } from "@/hooks/use-page-meta";

// Below-the-fold sections are code-split so the landing content loads first.
const HomeSections = lazy(() => import("@/components/HomeSections"));
const ImageGallerySection = lazy(() => import("@/components/ImageGallerySection"));

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="h-64" aria-hidden />}>{children}</Suspense>
);

const Index = () => {
  const queryClient = useQueryClient();
  const { data: topAnimeData, isLoading } = useTopAnime();
  const animeList: JikanAnime[] = useMemo(() => topAnimeData?.data ?? [], [topAnimeData]);

  usePageMeta(
    "Top Anime, GIFs & Images",
    "CaptureOrDie — browse top anime, manga, GIFs and high-quality images. Anime discovery with ratings, genres, and streaming."
  );

  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [featuredAnime, setFeaturedAnime] = useState<JikanAnime | null>(null);

  const pickRandomFeaturedAnime = useCallback((list: JikanAnime[]) => {
    if (list && list.length > 0) {
      const randomIndex = Math.floor(Math.random() * list.length);
      setFeaturedAnime(list[randomIndex]);
    }
  }, []);

  // Pick a featured anime once the top list has loaded.
  useEffect(() => {
    if (animeList.length > 0 && !featuredAnime) {
      pickRandomFeaturedAnime(animeList);
    }
  }, [animeList, featuredAnime, pickRandomFeaturedAnime]);

  const handleCardClick = async (anime: JikanAnime) => {
    try {
      // Fetch through the query cache so re-opening the same anime is instant.
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

  const handleSearchResult = async (res: JikanAnime | null) => {
    if (!res) {
      // Reset to top anime when clearing search: refresh the cached list.
      queryClient.invalidateQueries({ queryKey: animeKeys.top(1) });
      return;
    }
    await handleCardClick(res);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
        <NavBar onSearch={handleSearchResult} />

        <HeroBanner
          featuredAnime={featuredAnime}
          animeList={animeList}
          onViewDetailsClick={handleCardClick}
          onGetAnotherClick={pickRandomFeaturedAnime}
        />

        {/* Main Content */}
        <main className="flex-1 w-full pb-10">
          <TopAnimeSection
            loading={isLoading}
            animeList={animeList}
            onCardClick={handleCardClick}
          />

          {/* Extra discovery rows (Trending, Popular, Recently Updated) */}
          <LazySection><HomeSections onCardClick={handleCardClick} /></LazySection>

          <LazySection><ImageGallerySection /></LazySection>
        </main>

        <AnimeDetailModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          anime={selectedAnime}
        />
        <Footer />
      </div>
      {/* Mobile Sidebar Trigger */}
      <SidebarTrigger className="fixed top-4 left-4 z-[100] md:hidden bg-white/80 rounded-full p-2 shadow-lg ring-1 ring-zinc-900 hover:bg-purple-200/90 hover:text-purple-800 transition" />
    </SidebarProvider>
  );
};

export default Index;
