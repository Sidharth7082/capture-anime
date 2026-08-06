import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Video, Subtitles, Play, ExternalLink } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { fetchUnifiedDetail, consolidateVideoSources, type DetailedContent, type VideoSource } from "@/lib/unified-api";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { recordWatch } from "@/hooks/use-watch-history";
import type { JikanAnime } from "@/types/jikan";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anime: JikanAnime | null;
}

const AnimeDetailModal: React.FC<Props> = ({ open, onOpenChange, anime }) => {
  const navigate = useNavigate();
  const [detailedContent, setDetailedContent] = useState<DetailedContent | null>(null);
  const [currentView, setCurrentView] = useState<'details' | 'player'>('details');
  const [episode, setEpisode] = useState(1);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [currentSource, setCurrentSource] = useState<VideoSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [episodeJump, setEpisodeJump] = useState('');
  const episodeLoadSeqRef = useRef(0);

  // Cap the number of rendered episode buttons; long-running series
  // (e.g. One Piece with 1000+ episodes) would otherwise render an
  // unusable number of buttons.
  const MAX_EPISODE_BUTTONS = 100;

  const loadContentDetails = useCallback(async () => {
    if (!anime) return;
    
    setLoading(true);
    try {
      const sourceType = 'Jikan';
      const itemId = anime.mal_id?.toString();
      const itemTitle = anime.title;

      if (!itemId || !itemTitle) {
        throw new Error('No valid MAL ID or Title found for content');
      }

      console.log(`Loading content details for MAL ID: ${itemId}, Title: ${itemTitle}`);
      const details = await fetchUnifiedDetail(sourceType, itemId, itemTitle);

      setDetailedContent({
        ...details,
        // Fallback to original anime data if detail fetch doesn't have everything
        title: details.title || anime.title,
        poster: details.poster || anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
        synopsis: anime.synopsis || details.synopsis,
        episodes_count: details.episodes_count || anime.episodes || 1,
        score: details.score || anime.score,
        genres: details.genres || anime.genres?.map((g) => g.name) || [],
        content_type: 'anime'
      });
    } catch (error) {
      console.error('Error loading content details:', error);
      toast({
        title: "Error Loading Content",
        description: error instanceof Error ? error.message : "Failed to load anime details",
        variant: "destructive"
      });
      // Fallback to original anime data
      setDetailedContent({
        source_type: 'Jikan',
        content_type: 'anime',
        mal_id: anime.mal_id?.toString(),
        title: anime.title,
        poster: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
        synopsis: anime.synopsis,
        episodes_count: anime.episodes || 1,
        score: anime.score,
        genres: anime.genres?.map((g) => g.name) || []
      });
    }
    setLoading(false);
  }, [anime]);

  // Reset state when modal opens/closes or anime changes
  useEffect(() => {
    if (!open || !anime) {
      setDetailedContent(null);
      setCurrentView('details');
      setEpisode(1);
      setVideoSources([]);
      setCurrentSource(null);
      setPlayerStatus('');
      setEpisodeJump('');
      episodeLoadSeqRef.current++; // invalidate any in-flight episode loads
      return;
    }

    loadContentDetails();
  }, [open, anime, loadContentDetails]);

  const generatePlaybackOptions = () => {
    if (!detailedContent) return [];
    
    const episodeCount = detailedContent.episodes_count || 1;
    
    return Array.from({ length: episodeCount }, (_, i) => ({
      number: i + 1,
      label: `Episode ${i + 1}`
    }));
  };

  const handleEpisodeJump = () => {
    const target = Number(episodeJump);
    const episodeCount = detailedContent?.episodes_count || 1;
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
    if (!detailedContent) {
      setPlayerStatus('Error: No anime details available');
      return;
    }
    
    if (!detailedContent.animeflv_id) {
      setPlayerStatus('Error: This anime is not available for streaming (No AnimeFLV ID found)');
      toast({
        title: "Streaming Not Available",
        description: "This anime could not be found on the streaming provider.",
        variant: "destructive"
      });
      return;
    }
    
    setEpisode(episodeNumber);
    setCurrentView('player');
    setLoading(true);
    setPlayerStatus('Loading sources...');
    setVideoSources([]);
    setCurrentSource(null);

    // Guard against out-of-order responses: if the user requests another
    // episode (or closes the modal) while this one is loading, drop the
    // stale result instead of overwriting the newer request.
    const seq = ++episodeLoadSeqRef.current;
    
    try {
      console.log(`Loading episode ${episodeNumber} for anime:`, detailedContent.title);
      const sources = await consolidateVideoSources(
        detailedContent.animeflv_id,
        episodeNumber
      );
      if (seq !== episodeLoadSeqRef.current) return;
      
      setVideoSources(sources);
      
      if (sources.length > 0) {
        console.log('Available video sources:', sources);
        // Prioritize embed sources over direct sources
        const prioritizedSource = 
          sources.find(s => s.type === 'embed') ||
          sources.find(s => s.type === 'direct') ||
          sources[0];
          
        if (prioritizedSource) {
          console.log('Selected source:', prioritizedSource);
          playSource(prioritizedSource);
        } else {
          setPlayerStatus('Error: No valid video source found');
          toast({
            title: "Streaming Error",
            description: "No valid video sources were found for this episode.",
            variant: "destructive"
          });
        }
      } else {
        setPlayerStatus('No video sources found for this episode. The episode might not be available.');
        toast({
          title: "Streaming Error",
          description: "No video sources found for this episode. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      if (seq !== episodeLoadSeqRef.current) return;
      console.error('Error loading episode:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setPlayerStatus(`Error loading episode: ${errorMessage}`);
      toast({
        title: "Streaming Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    if (seq === episodeLoadSeqRef.current) {
      setLoading(false);
    }
  };

  const playSource = (source: VideoSource) => {
    console.log('Playing source:', source);
    setCurrentSource(source);
    setPlayerStatus(`Playing from ${source.provider} (${source.quality || 'Default'})`);
    // Remember where the user left off (drives the Continue Watching row).
    if (detailedContent?.mal_id) {
      recordWatch({
        mal_id: Number(detailedContent.mal_id),
        title: detailedContent.title || 'Unknown',
        poster: detailedContent.poster,
        episode,
      });
    }
  };

  const renderPlayer = () => {
    if (!currentSource) return null;
    
    if (currentSource.type === 'embed') {
      return (
        <iframe
          src={currentSource.url}
          title={`${detailedContent?.title} Episode ${episode}`}
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      );
    } else {
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
  };

  if (!anime) return null;

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
                ? `Episode ${episode} - ${detailedContent?.title}`
                : detailedContent?.title || anime.title || "Content"
              }
            </DialogTitle>
            <span className="flex-1"/>
            <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon" aria-label="Close">
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-white">Loading...</span>
            </div>
          )}

          {/* Details View */}
          {currentView === 'details' && detailedContent && !loading && (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                <img
                  src={detailedContent.poster || "/placeholder.svg"}
                  alt={detailedContent.title}
                  className="rounded-xl object-cover shadow-xl w-64 h-96 mx-auto lg:mx-0 border-2 border-[#222223] bg-zinc-900"
                  loading="lazy"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                />
              </div>

              {/* Content Details */}
              <div className="flex-1 min-w-0 text-white space-y-6">
                <DialogDescription asChild>
                  <p className="text-neutral-200 leading-relaxed font-medium text-base">
                    {detailedContent.synopsis || "No synopsis available."}
                  </p>
                </DialogDescription>

                {/* Metadata */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {detailedContent.genres?.map((genre) => (
                      <span key={genre} className="bg-[#232323] text-[#f3f3f3] px-3 py-1 text-sm rounded">
                        {genre}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-400">Episodes:</span>
                      <span className="ml-2 text-white font-semibold">
                        {detailedContent.episodes_count || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Status:</span>
                      <span className="ml-2 text-white font-semibold">
                        {detailedContent.status || 'Unknown'}
                      </span>
                    </div>
                    {detailedContent.score && (
                      <div>
                        <span className="text-zinc-400">Score:</span>
                        <span className="ml-2 text-yellow-400 font-semibold">
                          ★ {detailedContent.score}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* IDs Display */}
                  <div className="mt-4">
                    <h4 className="text-white font-semibold mb-2">Content IDs:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <span className="text-zinc-400">MAL ID:</span>
                        <span className="ml-2 text-white">{detailedContent.mal_id || 'Not found'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">AnimeFLV ID:</span>
                        <span className="ml-2 text-white">{detailedContent.animeflv_id || 'Not found'}</span>
                      </div>
                    </div>
                  </div>

                  {detailedContent.mal_id && (
                    <Button
                      variant="outline"
                      className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/anime/${detailedContent.mal_id}`);
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
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={detailedContent.episodes_count || 1}
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
                    {generatePlaybackOptions().slice(0, MAX_EPISODE_BUTTONS).map((option) => (
                      <Button
                        key={option.number}
                        onClick={() => loadAndPlayEpisode(option.number)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  {(detailedContent.episodes_count || 1) > MAX_EPISODE_BUTTONS && (
                    <p className="text-sm text-zinc-400">
                      Showing first {MAX_EPISODE_BUTTONS} episodes — use the input above to jump to any episode up to {detailedContent.episodes_count}.
                    </p>
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
                        Source {index + 1} ({source.type.toUpperCase()})
                        <span className="ml-1 text-xs opacity-75">
                          - {source.provider}
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
