import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Play, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAnimeDetails, useEpisodes } from "@/hooks/use-anime-queries";
import type { EpisodeSource } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { recordWatch } from "@/hooks/use-watch-history";
import type { JikanAnime } from "@/types/jikan";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anime: JikanAnime | null;
}

// Cap the number of rendered episode buttons; long-running series would
// otherwise render an unusable number of buttons.
const MAX_EPISODE_BUTTONS = 100;

const AnimeDetailModal: React.FC<Props> = ({ open, onOpenChange, anime }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'details' | 'player'>('details');
  const [episode, setEpisode] = useState(1);
  const [videoSources, setVideoSources] = useState<EpisodeSource[]>([]);
  const [currentSource, setCurrentSource] = useState<EpisodeSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [episodeJump, setEpisodeJump] = useState('');
  const episodeLoadSeqRef = useRef(0);

  const animeId = open ? anime?.mal_id : null;
  // Full record + episode list come from the backend via the React Query cache.
  const { data: fullAnime, isLoading: detailLoading } = useAnimeDetails(animeId);
  const { data: episodeList = [], isLoading: episodesLoading, refetch: refetchEpisodes } = useEpisodes(animeId);

  const d = fullAnime ?? anime;

  // Reset state when modal opens/closes or anime changes
  useEffect(() => {
    if (!open || !anime) {
      setCurrentView('details');
      setEpisode(1);
      setVideoSources([]);
      setCurrentSource(null);
      setPlayerStatus('');
      setEpisodeJump('');
      episodeLoadSeqRef.current++; // invalidate any in-flight episode loads
      return;
    }
  }, [open, anime]);

  const episodeCount = Math.max(episodeList.length, d?.episodes ?? 0, 1);

  const handleEpisodeJump = () => {
    const target = Number(episodeJump);
    if (!target || target < 1 || target > episodeCount) {
      toast({
        title: "Invalid Episode",
        description: `Enter a number between 1 and ${episodeCount}.`,
        variant: "destructive"
      });
      return;
    }
    loadAndPlayEpisode(target);
    setEpisodeJump('');
  };

  const loadAndPlayEpisode = async (episodeNumber: number) => {
    if (!d) {
      setPlayerStatus('Error: No anime details available');
      return;
    }

    const ep = episodeList.find((e) => e.number === episodeNumber);

    // Sources are usually already in the episode payload; if the list is
    // empty, try once more before giving up.
    let sources = ep?.sources ?? [];
    if (sources.length === 0) {
      setPlayerStatus('Loading sources...');
      setLoading(true);
      const seq = ++episodeLoadSeqRef.current;
      try {
        const refreshed = await refetchEpisodes();
        if (seq !== episodeLoadSeqRef.current) return;
        const fresh = refreshed.data?.find((e) => e.number === episodeNumber);
        sources = fresh?.sources ?? [];
      } catch (error) {
        if (seq === episodeLoadSeqRef.current) {
          console.error('Error loading episodes:', error);
        }
      } finally {
        if (seq === episodeLoadSeqRef.current) setLoading(false);
      }
    }

    setEpisode(episodeNumber);
    setCurrentView('player');
    setVideoSources(sources);
    setCurrentSource(null);

    if (sources.length === 0) {
      setPlayerStatus('No video sources found for this episode. The episode might not be available.');
      toast({
        title: "Streaming Error",
        description: "No video sources found for this episode. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    // Prioritize embed sources over direct sources
    const prioritizedSource =
      sources.find((s) => s.type === 'embed') ||
      sources.find((s) => s.type === 'direct') ||
      sources[0];
    if (prioritizedSource) {
      playSource(prioritizedSource);
    }
  };

  const playSource = (source: EpisodeSource) => {
    setCurrentSource(source);
    setPlayerStatus(`Playing from ${source.provider || 'Backend'}${source.quality ? ` (${source.quality})` : ''}`);
    // Remember where the user left off (drives the Continue Watching row).
    if (d?.mal_id) {
      recordWatch({
        mal_id: d.mal_id,
        title: d.title || 'Unknown',
        poster: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
        episode,
      });
    }
  };

  const renderPlayer = () => {
    if (!currentSource) return null;

    if (currentSource.type === 'direct') {
      return (
        <video
          src={currentSource.url}
          controls
          autoPlay
          className="w-full h-full"
          onError={() => {
            setPlayerStatus('Error playing video. Try another source.');
            toast({
              title: "Playback Error",
              description: "Failed to play the video. The source may be invalid or offline.",
              variant: "destructive"
            });
          }}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <iframe
        src={currentSource.url}
        title={`${d?.title} Episode ${episode}`}
        className="w-full h-full border-none"
        allowFullScreen
        allow="autoplay; fullscreen"
      />
    );
  };

  if (!anime) return null;

  const poster = d?.images?.webp?.large_image_url || d?.images?.jpg?.large_image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full overflow-y-auto animate-fade-in font-sans bg-gradient-to-br from-[#19191eeb] via-[#101112ea] to-[#18181ebf] shadow-[0_12px_40px_0_rgba(18,16,39,0.94)] border border-[#232324] sm:rounded-2xl p-0 backdrop-blur-lg md:min-h-[600px] max-h-[95vh]">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-br from-[#1d1c20fc] to-[#17181aeb] rounded-t-2xl p-6 pb-4">
          <div className="flex items-center mb-1 gap-3">
            {currentView === 'player' ? (
              <Button onClick={() => setCurrentView('details')} variant="ghost" size="icon" aria-label="Back to Details">
                <ArrowLeft size={22} />
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon" aria-label="Back to List">
                <ArrowLeft size={22} />
              </Button>
            )}
            <DialogTitle className="text-2xl md:text-3xl font-black mb-1 text-white tracking-tight" style={{letterSpacing: "-1.2px"}}>
              {currentView === 'player'
                ? `Episode ${episode} - ${d?.title}`
                : d?.title || anime.title || "Content"
              }
            </DialogTitle>
            <span className="flex-1"/>
            <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon" aria-label="Close">
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {(detailLoading || (episodesLoading && !episodeList.length)) && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-white">Loading...</span>
            </div>
          )}

          {/* Details View */}
          {currentView === 'details' && d && !detailLoading && (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                <img
                  src={poster || "/placeholder.svg"}
                  alt={d.title}
                  className="rounded-xl object-cover shadow-xl w-64 h-96 mx-auto lg:mx-0 border-2 border-[#222223] bg-zinc-900"
                  loading="lazy"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                />
              </div>

              {/* Content Details */}
              <div className="flex-1 min-w-0 text-white space-y-6">
                <DialogDescription asChild>
                  <p className="text-neutral-200 leading-relaxed font-medium text-base">
                    {d.synopsis || "No synopsis available."}
                  </p>
                </DialogDescription>

                {/* Metadata */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {d.genres?.map((genre) => (
                      <span key={genre.mal_id} className="bg-[#232323] text-[#f3f3f3] px-3 py-1 text-sm rounded">
                        {genre.name}
                      </span>
                    ))}
                    {d.studios?.slice(0, 2).map((studio) => (
                      <span key={studio.mal_id} className="bg-[#232323] text-purple-300 px-3 py-1 text-sm rounded">
                        {studio.name}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-400">Episodes:</span>
                      <span className="ml-2 text-white font-semibold">{episodeCount || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Status:</span>
                      <span className="ml-2 text-white font-semibold">{d.status || 'Unknown'}</span>
                    </div>
                    {d.score && (
                      <div>
                        <span className="text-zinc-400">Score:</span>
                        <span className="ml-2 text-yellow-400 font-semibold">★ {d.score}</span>
                      </div>
                    )}
                  </div>

                  {d.mal_id && (
                    <Button
                      variant="outline"
                      className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/anime/${d.mal_id}`);
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Full Page
                    </Button>
                  )}
                </div>

                {/* Playback Options */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Watch Options</h3>
                  {episodeList.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      No episodes available for this anime yet. Check back later.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={episodeCount}
                          value={episodeJump}
                          onChange={(e) => setEpisodeJump(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEpisodeJump(); }}
                          placeholder="Ep #"
                          aria-label="Jump to episode number"
                          className="w-24 rounded-lg border border-zinc-600 bg-zinc-900 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <Button
                          onClick={handleEpisodeJump}
                          variant="outline"
                          className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600 font-semibold"
                        >
                          Go to Episode
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                        {episodeList.slice(0, MAX_EPISODE_BUTTONS).map((ep) => (
                          <Button
                            key={ep.id}
                            onClick={() => loadAndPlayEpisode(ep.number)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            Episode {ep.number}
                          </Button>
                        ))}
                      </div>
                      {episodeList.length > MAX_EPISODE_BUTTONS && (
                        <p className="text-sm text-zinc-400">
                          Showing first {MAX_EPISODE_BUTTONS} episodes — use the input above to jump to any episode up to {episodeList.length}.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Player View */}
          {currentView === 'player' && (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-[#202023] shadow-lg bg-black">
                {renderPlayer()}
                {playerStatus && (
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded text-sm">
                    {playerStatus}
                  </div>
                )}
              </div>

              {/* Source Selection */}
              {videoSources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Available Sources:</h4>
                  <div className="flex flex-wrap gap-3">
                    {videoSources.map((source, index) => (
                      <Button
                        key={index}
                        onClick={() => playSource(source)}
                        variant={currentSource === source ? "default" : "outline"}
                        className={cn(
                          "font-semibold",
                          currentSource === source
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600"
                        )}
                      >
                        Source {index + 1} ({(source.type || 'embed').toUpperCase()})
                        <span className="ml-1 text-xs opacity-75">
                          - {source.provider || 'Backend'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnimeDetailModal;
