import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ExternalLink, SkipForward, SkipBack, Star } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAnimeDetails, useEpisodes } from "@/hooks/use-anime-queries";
import { statusLabel, fetchWatchStreams, fetchWatchPrefetch, type WatchStream, type WatchResponse } from "@/lib/api";
import { useBackendAuth } from "@/hooks/use-backend-auth";
import {
  useResumePoint,
  useSaveProgress,
  useRecordHistory,
  useRemoveProgress,
} from "@/hooks/use-continue-watching";
import {
  useMalMe,
  useMalList,
  useMalUpdateEntry,
  useMalAddEntry,
  useMalRemoveEntry,
  useMalProgress,
} from "@/hooks/use-mal";
import { malLoginUrl } from "@/lib/mal-client";
import AniListSynopsis from "@/components/AniListSynopsis";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { recordWatch } from "@/hooks/use-watch-history";
import Hls from "hls.js";
import type { JikanAnime } from "@/types/jikan";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anime: JikanAnime | null;
}

// Cap the number of rendered episode buttons; long-running series would
// otherwise render an unusable number of buttons.
const MAX_EPISODE_BUTTONS = 100;

/** Pick the best stream to autoplay: prefer the Anivexa proxy (hls-redirect),
 *  then direct HLS, then mp4/direct, then embedded players. */
function pickBestStream(streams: WatchStream[]): WatchStream | undefined {
  const rank = (s: WatchStream) => {
    switch (s.type) {
      case "hls-redirect": return 0;
      case "hls": return 1;
      case "mp4":
      case "direct": return 2;
      case "embed": return 3;
      default: return 4;
    }
  };
  return [...streams].sort((a, b) => rank(a) - rank(b))[0];
}

const AnimeDetailModal: React.FC<Props> = ({ open, onOpenChange, anime }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'details' | 'player'>('details');
  const [episode, setEpisode] = useState(1);
  const [activeAudio, setActiveAudio] = useState<'sub' | 'dub'>('sub');
  const [watch, setWatch] = useState<WatchResponse | null>(null);
  const [currentSource, setCurrentSource] = useState<WatchStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [episodeJump, setEpisodeJump] = useState('');
  const episodeLoadSeqRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  // Timestamp of the latest play request, used for the player-start timing log.
  const playStartRef = useRef(0);
  // Playback progress is pushed to the backend at most once every 10s.
  const lastSavedAtRef = useRef(0);
  const lastSavedPosRef = useRef(-1);
  // Episodes whose "watched" history row was already recorded this session.
  const historyRecordedRef = useRef<Set<string>>(new Set());
  // Episodes whose saved resume position was already applied this session.
  const resumeAppliedRef = useRef<Set<string>>(new Set());
  // Current playhead/duration (mirrored for the skip-intro/outro buttons).
  const [playerTime, setPlayerTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const animeId = open ? anime?.mal_id : null;
  // Full record + episode list come from the backend via the React Query cache.
  const { data: fullAnime, isLoading: detailLoading } = useAnimeDetails(animeId);
  const { data: episodeList = [], isLoading: episodesLoading } = useEpisodes(animeId);

  // --- backend session + user data ---------------------------------------
  const { isAuthenticated } = useBackendAuth();
  const resumeQuery = useResumePoint(animeId);
  const saveProgress = useSaveProgress();
  const recordHistoryMut = useRecordHistory();
  const removeProgress = useRemoveProgress();

  // --- MyAnimeList sync ---------------------------------------------------
  const { data: malUser } = useMalMe();
  const { data: malEntries = [] } = useMalList(undefined, 100);
  const malUpdate = useMalUpdateEntry();
  const malAdd = useMalAddEntry();
  const malRemove = useMalRemoveEntry();
  const malProgress = useMalProgress();
  const malEntry = malEntries.find((e) => e.animeId === d?.mal_id);

  const d = fullAnime ?? anime;

  // Reset state when modal opens/closes or anime changes
  useEffect(() => {
    if (!open || !anime) {
      setCurrentView('details');
      setEpisode(1);
      setWatch(null);
      setCurrentSource(null);
      setPlayerStatus('');
      setEpisodeJump('');
      setPlayerTime(0);
      setPlayerDuration(0);
      episodeLoadSeqRef.current++; // invalidate any in-flight episode loads
      return;
    }
    // Prefetch stream URLs when the modal opens so the first play is instant.
    if (anime.mal_id) {
      fetchWatchPrefetch(anime.mal_id, 3)
        .then((r) => console.info(`[watch] prefetch queued ${r.prefetched} episodes for ${anime.mal_id}`))
        .catch(() => { /* backend may not have streaming configured — non-fatal */ });
    }
  }, [open, anime]);

  // Destroy the hls.js instance when the source changes or the modal closes.
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Resume from the saved position once per episode, per session.
  useEffect(() => {
    const video = videoRef.current;
    const resume = resumeQuery.data;
    if (!video || !currentSource || !isAuthenticated || !d?.mal_id || !resume) return;
    if (resume.episodeNumber !== episode) return;
    const key = `${d.mal_id}:${episode}`;
    if (resumeAppliedRef.current.has(key)) return;
    if (resume.playbackPositionSeconds < 5) return; // effectively at the start
    const apply = () => {
      if (resumeAppliedRef.current.has(key)) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      // Don't seek into the final seconds — that would skip the ending.
      if (duration > 0 && resume.playbackPositionSeconds < duration - 10) {
        video.currentTime = resume.playbackPositionSeconds;
        setPlayerTime(resume.playbackPositionSeconds);
      }
      resumeAppliedRef.current.add(key);
    };
    video.addEventListener("loadedmetadata", apply, { once: true });
    return () => video.removeEventListener("loadedmetadata", apply);
  }, [currentSource, resumeQuery.data, isAuthenticated, d?.mal_id, episode]);

  // Push playback progress to the backend at most once every 10 seconds.
  useEffect(() => {
    if (!currentSource || currentView !== "player" || !isAuthenticated || !d?.mal_id) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;
      const pos = Math.floor(video.currentTime);
      if (pos <= 0 || pos === lastSavedPosRef.current) return;
      if (Date.now() - lastSavedAtRef.current < 10_000) return;
      lastSavedAtRef.current = Date.now();
      lastSavedPosRef.current = pos;
      saveProgress.mutate({
        animeId: d.mal_id as number,
        input: {
          episodeNumber: episode,
          playbackPositionSeconds: pos,
          durationSeconds: Number.isFinite(video.duration) ? Math.floor(video.duration) : undefined,
        },
      });
    }, 2_000);
    return () => window.clearInterval(id);
  }, [currentSource, currentView, isAuthenticated, d?.mal_id, episode, saveProgress]);

  // Keyboard shortcuts while the player is open:
  // Space = play/pause, ←/→ = seek ±10s, F = fullscreen, M = mute.
  useEffect(() => {
    if (currentView !== "player") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const video = videoRef.current;
      if (!video) return;
      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          if (video.paused) void video.play(); else video.pause();
          break;
        case "arrowleft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          setPlayerTime(video.currentTime);
          break;
        case "arrowright":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || Number.MAX_SAFE_INTEGER, video.currentTime + 10);
          setPlayerTime(video.currentTime);
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) void document.exitFullscreen();
          else void playerContainerRef.current?.requestFullscreen();
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentView]);

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

  const loadAndPlayEpisode = useCallback(async (episodeNumber: number, audio: 'sub' | 'dub' = activeAudio) => {
    if (!d?.mal_id) {
      setPlayerStatus('Error: No anime details available');
      return;
    }

    const seq = ++episodeLoadSeqRef.current;
    playStartRef.current = performance.now();
    setLoading(true);
    setPlayerStatus('Loading streams...');
    setCurrentSource(null);

    try {
      // Streams come from OUR backend (/api/watch), which proxies Anivexa.
      const result = await fetchWatchStreams(d.mal_id, episodeNumber, { audio });
      if (seq !== episodeLoadSeqRef.current) return;

      setEpisode(episodeNumber);
      setActiveAudio(result.audio || audio);
      setWatch(result);
      setCurrentView('player');

      if (result.streams.length === 0) {
        setPlayerStatus('No video streams found for this episode. Try another provider or episode.');
        toast({
          title: "Streaming Error",
          description: "No streams were returned for this episode. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const best = pickBestStream(result.streams);
      if (best) {
        playSource(best);
      }
      console.info(
        `[watch] stream resolve ${(performance.now() - playStartRef.current).toFixed(0)}ms ` +
        `(provider=${result.provider}, streams=${result.streams.length})`
      );
    } catch (error) {
      if (seq !== episodeLoadSeqRef.current) return;
      const message = error instanceof Error ? error.message : "Unknown error";
      setPlayerStatus(`Error loading episode: ${message}`);
      toast({
        title: "Streaming Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (seq === episodeLoadSeqRef.current) setLoading(false);
    }
  }, [d, activeAudio]);

  const playSource = (source: WatchStream) => {
    // Switching sources tears down any active hls.js session first.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setCurrentSource(source);
    setPlayerStatus(
      `Playing from ${watch?.provider ?? 'provider'}${source.server ? ` · ${source.server}` : ''}`
    );
    // Remember where the user left off (drives the Continue Watching row).
    if (d?.mal_id) {
      recordWatch({
        mal_id: d.mal_id,
        title: d.title || 'Unknown',
        poster: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url,
        episode,
      });
      // Backend: record this episode in watch history once per episode.
      const key = `${d.mal_id}:${episode}`;
      if (isAuthenticated && !historyRecordedRef.current.has(key)) {
        historyRecordedRef.current.add(key);
        recordHistoryMut.mutate({ animeId: d.mal_id, episode });
      }
    }
  };

  // Attach hls.js once a video element + HLS source are both present.
  useEffect(() => {
    const video = videoRef.current;
    const source = currentSource;
    if (!video || !source) return;
    const isHls = source.type === 'hls' || source.type === 'hls-redirect';
    if (!isHls) return;

    const logPlayerStart = () => {
      if (playStartRef.current) {
        console.info(`[watch] player start ${(performance.now() - playStartRef.current).toFixed(0)}ms (hls)`);
        playStartRef.current = 0;
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(source.url);
      hls.attachMedia(video);
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, logPlayerStart);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setPlayerStatus('Playback error — trying another source may help.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = source.url;
      video.addEventListener('playing', logPlayerStart, { once: true });
    } else {
      setPlayerStatus('This browser cannot play HLS streams.');
    }
  }, [currentSource]);

  const renderPlayer = () => {
    const source = currentSource;
    if (!source) return null;

    const isHls = source.type === 'hls' || source.type === 'hls-redirect';
    const handleEnded = () => {
      if (!d?.mal_id) return;
      // Finished an episode — sync MAL episode progress automatically.
      if (malUser && malEntry) {
        malProgress.mutate({ animeId: d.mal_id, episodeNumber: episode });
      }
      const next = episodeList.find((e) => e.number === episode + 1);
      if (next) {
        setPlayerStatus(`Auto-playing episode ${next.number}…`);
        loadAndPlayEpisode(next.number);
      } else {
        // Series finished — drop the resume point so Continue Watching
        // doesn't offer a completed show.
        if (isAuthenticated) removeProgress.mutate(d.mal_id);
        setPlayerStatus('You reached the end of this series. 🎉');
      }
    };

    if (isHls || source.type === 'mp4' || source.type === 'direct') {
      return (
        <video
          key={source.url}
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-full"
          src={isHls ? undefined : source.url}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setPlayerTime(v.currentTime);
            if (Number.isFinite(v.duration)) setPlayerDuration(v.duration);
          }}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) {
              setPlayerDuration(e.currentTarget.duration);
            }
          }}
          onEnded={handleEnded}
          onError={() => {
            setPlayerStatus('Error playing video. Try another source.');
            toast({
              title: "Playback Error",
              description: "Failed to play the video. The source may be invalid or offline.",
              variant: "destructive",
            });
          }}
        >
          {(source.subtitles ?? []).map((track, i) => (
            <track
              key={i}
              kind="subtitles"
              src={track.url}
              srcLang={track.srclang || 'en'}
              label={track.label || `Subtitle ${i + 1}`}
              default={track.default || i === 0}
            />
          ))}
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <iframe
        src={source.url}
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
                  <AniListSynopsis
                    html={d.synopsis}
                    className="text-neutral-200 leading-relaxed font-medium text-base"
                    emptyText="No synopsis available."
                  />
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
                      <span className="ml-2 text-white font-semibold">{statusLabel(d.status)}</span>
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

                {/* MyAnimeList sync panel */}
                {malUser ? (
                  <div className="rounded-xl border border-blue-900/40 bg-[#1a2436] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold flex items-center gap-2">
                        <Star className="h-4 w-4 text-blue-400" /> MyAnimeList
                      </h4>
                      <span className="text-xs text-blue-300">{malUser.name}</span>
                    </div>
                    {malEntry ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-sm text-zinc-300">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">Status</span>
                            <select
                              value={malEntry.status}
                              onChange={(e) => malUpdate.mutate({ malAnimeId: malEntry.malAnimeId, patch: { status: e.target.value as typeof malEntry.status } })}
                              className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {["watching", "completed", "on_hold", "dropped", "plan_to_watch"].map((s) => (
                                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">Score</span>
                            <select
                              value={malEntry.score}
                              onChange={(e) => malUpdate.mutate({ malAnimeId: malEntry.malAnimeId, patch: { score: Number(e.target.value) } })}
                              className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={i}>{i === 0 ? "—" : `★ ${i}`}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">Episodes</span>
                            <input
                              type="number"
                              min={0}
                              value={malEntry.episodesWatched}
                              onChange={(e) => malUpdate.mutate({ malAnimeId: malEntry.malAnimeId, patch: { episodesWatched: Math.max(0, Number(e.target.value) || 0) } })}
                              className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-zinc-400">
                            Progress syncs to MyAnimeList automatically when you finish an episode.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-600 text-zinc-300 hover:text-white"
                            onClick={() => malRemove.mutate(malEntry.malAnimeId)}
                            disabled={malRemove.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : d?.malId ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-400">Not on your MAL list yet.</p>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                          onClick={() => malAdd.mutate({ malAnimeId: d.malId!, status: "plan_to_watch" })}
                          disabled={malAdd.isPending}
                        >
                          Add to MyAnimeList
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        This title has no MyAnimeList id in the catalog, so it can't be added.
                      </p>
                    )}
                  </div>
                ) : isAuthenticated ? (
                  <div className="rounded-xl border border-blue-900/40 bg-[#1a2436] p-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-300">Connect MyAnimeList to sync your list here.</p>
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      <a href={malLoginUrl}>Connect</a>
                    </Button>
                  </div>
                ) : null}

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
              {/* Audio + provider bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                  {(['sub', 'dub'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => { if (a !== activeAudio) loadAndPlayEpisode(episode, a); }}
                      className={cn(
                        "px-3 py-1 rounded-md text-sm font-semibold uppercase transition",
                        activeAudio === a ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {watch && (
                  <span className="text-sm text-zinc-400">
                    Provider: <span className="text-purple-300 font-semibold">{watch.provider}</span>
                    {watch.servers.length > 0 && <span> · servers: {watch.servers.join(", ")}</span>}
                  </span>
                )}
              </div>

              {/* Video Player */}
              <div
                ref={playerContainerRef}
                className="group relative aspect-video w-full rounded-xl overflow-hidden border-2 border-[#202023] shadow-lg bg-black"
              >
                {loading && !currentSource ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    <span className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
                    Loading streams...
                  </div>
                ) : (
                  renderPlayer()
                )}
                {playerStatus && (
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded text-sm max-w-[80%] truncate">
                    {playerStatus}
                  </div>
                )}

                {/* Skip Intro / Skip Outro — heuristic 85s markers (the
                    streaming API doesn't expose exact timestamps yet). */}
                {currentSource &&
                  (currentSource.type === 'hls' || currentSource.type === 'hls-redirect' ||
                   currentSource.type === 'mp4' || currentSource.type === 'direct') && (
                  <>
                    {playerTime > 0 && playerTime < 95 && (
                      <button
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.currentTime = Math.min(85, Math.max(0, v.duration || 0));
                        }}
                        className="absolute top-4 right-4 flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:bg-white/25"
                      >
                        <SkipForward className="h-4 w-4" /> Skip Intro
                      </button>
                    )}
                    {playerDuration > 0 && playerTime > playerDuration - 95 && playerTime < playerDuration - 5 && (
                      <button
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.currentTime = Math.max(0, playerDuration - 85);
                        }}
                        className="absolute top-4 right-4 flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:bg-white/25"
                      >
                        <SkipBack className="h-4 w-4" /> Skip Outro
                      </button>
                    )}
                  </>
                )}

                {/* Shortcut hints (visible on hover) */}
                <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 text-[11px] text-white/60 bg-black/50 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition">
                  <span><kbd className="px-1 bg-white/15 rounded">Space</kbd> Play</span>
                  <span><kbd className="px-1 bg-white/15 rounded">←→</kbd> Seek</span>
                  <span><kbd className="px-1 bg-white/15 rounded">F</kbd> Fullscreen</span>
                  <span><kbd className="px-1 bg-white/15 rounded">M</kbd> Mute</span>
                </div>
              </div>

              {/* Source Selection */}
              {watch && watch.streams.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Available Sources:</h4>
                  <div className="flex flex-wrap gap-3">
                    {watch.streams.map((stream, index) => (
                      <Button
                        key={index}
                        onClick={() => playSource(stream)}
                        variant={currentSource === stream ? "default" : "outline"}
                        className={cn(
                          "font-semibold",
                          currentSource === stream
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600"
                        )}
                      >
                        {(stream.server || stream.type || "source").toUpperCase()}
                        <span className="ml-1 text-xs opacity-75">({stream.type})</span>
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
