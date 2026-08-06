
import React, { useState } from 'react';
import { useTopManga } from "@/hooks/use-anime-queries";
import type { JikanManga } from "@/types/jikan";
import MangaCard from "@/components/MangaCard";
import MangaDetailModal from "@/components/MangaDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { BookMarked } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const TopMangaSection = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedManga, setSelectedManga] = useState<JikanManga | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Pages are cached by React Query; switching pages shows skeletons only
  // the first time each page is requested.
  const { data, isLoading } = useTopManga(currentPage);
  const mangaList: JikanManga[] = data?.data ?? [];
  const paginationInfo = data?.pagination ?? null;

  const handleCardClick = (manga: JikanManga) => {
    setSelectedManga(manga);
    setModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && paginationInfo && page <= paginationInfo.last_visible_page) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (!paginationInfo) return null;

    const { current_page, last_visible_page } = paginationInfo;
    const pages = [];
    const pageLimit = 5;
    const middle = Math.ceil(pageLimit / 2);
    let start = current_page - middle + 1;
    let end = start + pageLimit - 1;

    if (start < 1) {
      start = 1;
      end = Math.min(pageLimit, last_visible_page);
    }

    if (end > last_visible_page) {
      end = last_visible_page;
      start = Math.max(1, end - pageLimit + 1);
    }

    if (start > 1) {
      pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink href="#" isActive={i === current_page} onClick={(e) => { e.preventDefault(); handlePageChange(i); }}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    if (end < last_visible_page) {
      pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
    }

    return pages;
  }

  return (
    <div id="top-manga" className="max-w-7xl mx-auto w-full px-3 sm:px-8">
      <div className="flex items-start md:items-center justify-between mt-12 mb-6 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
                <BookMarked className="text-purple-600 w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">Top Manga</h2>
                <p className="text-zinc-500">The highest-rated manga on MyAnimeList</p>
            </div>
        </div>
      </div>
      {isLoading ? (
        <section className="mt-4 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(25)].map((_, idx) => (
            <Skeleton key={idx} className="rounded-lg w-full h-[350px] bg-zinc-200" />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-2 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {mangaList.map((manga: JikanManga) => (
              <MangaCard
                key={manga.mal_id}
                manga={manga}
                onClick={() => handleCardClick(manga)}
              />
            ))}
          </section>
          {paginationInfo && paginationInfo.last_visible_page > 1 && (
            <div className="mt-8 flex justify-center pb-8">
              <Pagination>
                <PaginationContent>
                  {paginationInfo.has_previous_page && (
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                    </PaginationItem>
                  )}
                  {renderPagination()}
                  {paginationInfo.has_next_page && (
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
      <MangaDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        manga={selectedManga}
      />
    </div>
  );
};

export default TopMangaSection;
