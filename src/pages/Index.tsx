import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAnimeDetails } from "@/lib/api";
import { useTopAnime, animeKeys } from "@/hooks/use-anime-queries";
import type { JikanAnime } from "@/types/jikan";
import AnimeDetailModal from "@/components/AnimeDetailModal";
import { toast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import HeroBanner from "@/components/HeroBanner";
import TopAnimeSection from "@/components/TopAnimeSection";
import SeasonalAnimeSection from "@/components/SeasonalAnimeSection";
import TopMangaSection from "@/components/TopMangaSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageMeta } from "@/hooks/use-page-meta";

// Below-the-fold sections are code-split so the landing tab loads first.
const HomeSections = lazy(() => import("@/components/HomeSections"));
const ImageGallerySection = lazy(() => import("@/components/ImageGallerySection"));

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="h-64" aria-hidden />}>{children}</Suspense>
);

const Index = () => {
  const queryClient = useQueryClient();
  const { data: topAnimeData, isLoading } = useTopAnime();
  const animeList: JikanAnime[] = topAnimeData?.data ?? [];

  usePageMeta(
    "Top Anime, GIFs & Images",
    "CaptureOrDie — browse top anime, manga, GIFs and high-quality images. Anime discovery with ratings, genres, and streaming."
  );

  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [featuredAnime, setFeaturedAnime] = useState<JikanAnime | null>(null);
  const [activeTab, setActiveTab] = useState("top-anime");

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

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["top-anime", "seasonal", "top-manga"].includes(hash)) {
        setActiveTab(hash);
      }
    };
    applyHash();
    // React to in-page hash navigation (e.g. clicking "Top Anime" in the
    // navbar while already on the home page).
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center border-b bg-white/30 backdrop-blur-sm sticky top-16 z-10">
              <div className="max-w-7xl w-full px-3 sm:px-8">
                <TabsList className="bg-transparent p-0 h-14">
                  <TabsTrigger value="top-anime" className="text-base font-semibold text-zinc-600 data-[state=active]:text-purple-700 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-purple-700 rounded-none h-full px-5">Top Anime</TabsTrigger>
                  <TabsTrigger value="seasonal" className="text-base font-semibold text-zinc-600 data-[state=active]:text-purple-700 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-purple-700 rounded-none h-full px-5">Seasonal</TabsTrigger>
                  <TabsTrigger value="top-manga" className="text-base font-semibold text-zinc-600 data-[state=active]:text-purple-700 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-purple-700 rounded-none h-full px-5">Manga</TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <TabsContent value="top-anime" className="mt-0">
              <TopAnimeSection
                loading={isLoading}
                animeList={animeList}
                onCardClick={handleCardClick}
              />
            </TabsContent>
            <TabsContent value="seasonal" className="mt-0">
              <SeasonalAnimeSection onCardClick={handleCardClick} />
            </TabsContent>
            <TabsContent value="top-manga" className="mt-0">
              <TopMangaSection />
            </TabsContent>
          </Tabs>

          {/* Extra discovery rows (Trending, Airing Today, Movies, …) */}
          <LazySection><HomeSections onCardClick={handleCardClick} /></LazySection>

          <LazySection><ImageGallerySection /></LazySection>
        </main>

        <AnimeDetailModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          anime={selectedAnime}
        />
        {/* You can add other sections like Seasonal/Random here */}
        <Footer />
      </div>
      {/* Mobile Sidebar Trigger */}
      <SidebarTrigger className="fixed top-4 left-4 z-[100] md:hidden bg-white/80 rounded-full p-2 shadow-lg ring-1 ring-zinc-900 hover:bg-purple-200/90 hover:text-purple-800 transition" />
    </SidebarProvider>
  );
};

export default Index;
