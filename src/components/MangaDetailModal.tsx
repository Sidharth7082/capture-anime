
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, BookOpen, Star } from "lucide-react";
import { useMangaDetails } from "@/hooks/use-anime-queries";
import type { JikanManga } from "@/types/jikan";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  manga: JikanManga | null;
}

/**
 * Detail modal for a manga entry. Uses the React Query cache so re-opening
 * the same manga is instant; falls back to the card data when the full
 * record fails to load.
 */
const MangaDetailModal: React.FC<Props> = ({ open, onOpenChange, manga }) => {
  const { data: details, isLoading } = useMangaDetails(open ? manga?.mal_id : null);

  if (!manga) return null;

  const d = details || manga;
  const authors = d.authors?.map((a) => a.name).join(", ") || "Unknown";
  const genres = d.genres?.map((g) => g.name) || [];
  const poster =
    d.images?.webp?.large_image_url ||
    d.images?.jpg?.large_image_url ||
    d.images?.webp?.image_url ||
    d.images?.jpg?.image_url ||
    "/placeholder.svg";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#19191eeb] via-[#101112ea] to-[#18181ebf] border border-[#232324] sm:rounded-2xl p-0 text-white">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight">
              {d.title || manga.title || "Manga"}
            </DialogTitle>
            <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon" aria-label="Close" className="text-white">
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-white">Loading...</span>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
                <img
                  src={poster}
                  alt={d.title || manga.title}
                  className="rounded-xl object-cover shadow-xl w-48 md:w-56 mx-auto md:mx-0 border-2 border-[#222223] bg-zinc-900"
                  loading="lazy"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-5">
                <DialogDescription asChild>
                  <p className="text-neutral-200 leading-relaxed font-medium text-base">
                    {d.synopsis || "No synopsis available."}
                  </p>
                </DialogDescription>

                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <span key={genre} className="bg-[#232323] text-[#f3f3f3] px-3 py-1 text-sm rounded">
                      {genre}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Author:</span>
                    <span className="ml-2 text-white font-semibold">{authors}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Status:</span>
                    <span className="ml-2 text-white font-semibold">{d.status || "Unknown"}</span>
                  </div>
                  {!!d.score && (
                    <div>
                      <span className="text-zinc-400">Score:</span>
                      <span className="ml-2 text-yellow-400 font-semibold">★ {d.score}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-400 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Type:</span>
                    <span className="ml-2 text-white font-semibold">{d.type || "Unknown"}</span>
                  </div>
                  {!!d.chapters && (
                    <div>
                      <span className="text-zinc-400">Chapters:</span>
                      <span className="ml-2 text-white font-semibold">{d.chapters}</span>
                    </div>
                  )}
                  {!!d.volumes && (
                    <div>
                      <span className="text-zinc-400">Volumes:</span>
                      <span className="ml-2 text-white font-semibold">{d.volumes}</span>
                    </div>
                  )}
                </div>

                {d.url && (
                  <Button
                    asChild
                    variant="outline"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600"
                  >
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <Star className="mr-2 h-4 w-4" />
                      View on MyAnimeList
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MangaDetailModal;
