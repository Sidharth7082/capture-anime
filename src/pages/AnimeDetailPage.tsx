import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAnimeDetails, useEpisodes, useAnimeDetailExtras } from "@/hooks/use-anime-queries";
import { statusLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  Star,
  Play,
  Tv,
  CalendarDays,
  Clock,
  Trophy,
  Users,
  PlayCircle,
} from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import AniListSynopsis from "@/components/AniListSynopsis";
import { htmlToPlainText } from "@/lib/anilist-html";
import type { JikanAnime } from "@/types/jikan";

const PosterSkeleton = () => (
  <div className="w-48 md:w-56 shrink-0">
    <Skeleton className="aspect-[2/3] w-full rounded-xl" />
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2 mb-4">
    {icon}
    {children}
  </h2>
);

const AnimeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const animeId = id ?? "";

  const { data: anime, isLoading, isError } = useAnimeDetails(animeId || null);
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes(animeId || null);
  const { data: detailExtras } = useAnimeDetailExtras(animeId || null);
  const characters = detailExtras?.characters ?? [];

  const posterUrl = anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url;
  const synopsisText = anime ? htmlToPlainText(anime.synopsis ?? "") : "";
  usePageMeta(
    anime?.title || "Anime",
    synopsisText.slice(0, 160) || undefined,
    posterUrl,
    `/anime/${animeId}`
  );

  // Structured data (JSON-LD) for search engines.
  useEffect(() => {
    if (!anime) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "anime-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TVSeries",
      name: anime.title,
      description: synopsisText.slice(0, 500) || undefined,
      image: posterUrl,
      url: `${window.location.origin}/anime/${anime.mal_id}`,
      ...(anime.score ? { aggregateRating: { "@type": "AggregateRating", ratingValue: anime.score, bestRating: 10 } } : {}),
      ...(anime.aired?.from ? { datePublished: anime.aired.from } : {}),
      ...(anime.genres?.length ? { genre: anime.genres.map((g) => g.name) } : {}),
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById("anime-jsonld")?.remove();
    };
  }, [anime, posterUrl]);

  const handleSearch = (anime: JikanAnime | null) => {
    if (anime) navigate(`/anime/${anime.mal_id}`);
  };

  if (isError && !anime) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
        <NavBar onSearch={handleSearch} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-xl text-zinc-700 font-semibold">Couldn't load this anime.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go back
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const trailerEmbed = anime?.trailer?.embed_url;

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
      <NavBar onSearch={handleSearch} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-8 pb-12">
        <div className="flex items-center gap-3 mt-6 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight truncate">
            {isLoading ? "Loading…" : anime?.title || "Anime"}
          </h1>
        </div>

        {isLoading && !anime ? (
          <div className="flex flex-col md:flex-row gap-8">
            <PosterSkeleton />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-2/3 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-10 w-40 rounded" />
            </div>
          </div>
        ) : anime ? (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-48 md:w-56 shrink-0 mx-auto md:mx-0">
                <img
                  src={posterUrl || "/placeholder.svg"}
                  alt={anime.title}
                  className="rounded-xl object-cover shadow-xl w-full border border-zinc-200 bg-white"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-5">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">{anime.title}</h2>
                  {anime.title_english && anime.title_english !== anime.title && (
                    <p className="text-lg text-zinc-500 font-medium">{anime.title_english}</p>
                  )}
                  {anime.title_japanese && (
                    <p className="text-base text-zinc-400">{anime.title_japanese}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!!anime.score && (
                    <Badge className="bg-yellow-500 text-black border-0 gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" /> {anime.score.toFixed(2)}
                    </Badge>
                  )}
                  {!!anime.rank && (
                    <Badge variant="secondary" className="gap-1">
                      <Trophy className="w-3.5 h-3.5" /> Rank #{anime.rank}
                    </Badge>
                  )}
                  {!!anime.popularity && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="w-3.5 h-3.5" /> #{anime.popularity} popularity
                    </Badge>
                  )}
                  <Badge variant="secondary" className={anime.airing ? "bg-green-100 text-green-700" : ""}>
                    {statusLabel(anime.status)}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
                  {anime.type && <span className="flex items-center gap-1.5"><Tv className="w-4 h-4 text-zinc-400" /> {anime.type}</span>}
                  {!!anime.episodes && <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4 text-zinc-400" /> {anime.episodes} eps</span>}
                  {!!anime.duration && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-zinc-400" /> {anime.duration}</span>}
                  {!!anime.year && <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-zinc-400" /> {anime.year}</span>}
                  {!!anime.aired?.string && <span className="text-zinc-500">{anime.aired.string}</span>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {anime.genres?.map((g) => (
                    <span key={g.mal_id} className="bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {g.name}
                    </span>
                  ))}
                </div>

                {(anime.studios?.length ?? 0) > 0 && (
                  <p className="text-sm text-zinc-600">
                    <span className="font-semibold">Studios:</span> {anime.studios!.map((s) => s.name).join(", ")}
                    {detailExtras?.rating?.count ? (
                      <span className="text-zinc-400"> · {detailExtras.rating.count.toLocaleString()} ratings</span>
                    ) : null}
                  </p>
                )}

                {trailerEmbed ? (
                  <div className="relative aspect-video w-full max-w-xl rounded-xl overflow-hidden border border-zinc-200 bg-black shadow">
                    <iframe
                      src={trailerEmbed}
                      title={`${anime.title} trailer`}
                      className="w-full h-full border-none"
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold" disabled>
                    <Play className="w-4 h-4 mr-2" /> No trailer available
                  </Button>
                )}
              </div>
            </div>

            {/* Synopsis */}
            {synopsisText && (
              <section className="mt-10">
                <SectionTitle icon={<Play className="w-5 h-5 text-purple-600" />}>Synopsis</SectionTitle>
                <AniListSynopsis
                  html={anime.synopsis}
                  className="text-zinc-700 leading-relaxed max-w-4xl"
                  emptyText="No synopsis available."
                />
              </section>
            )}

            {/* Characters & Voice Actors (from the backend detail payload) */}
            {characters.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<Tv className="w-5 h-5 text-purple-600" />}>Characters & Voice Actors</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters.map((entry) => (
                    <div key={entry.id} className="flex gap-3 rounded-2xl bg-white/70 border border-zinc-200/80 p-3 shadow-sm">
                      <img
                        src={entry.imageLarge || entry.imageMedium || "/placeholder.svg"}
                        alt={`${entry.nameFirst} ${entry.nameLast ?? ""}`.trim()}
                        className="w-16 h-24 object-cover rounded-lg shrink-0"
                        loading="lazy"
                        onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{entry.nameFirst} {entry.nameLast ?? ""}</p>
                        <p className="text-xs text-zinc-500 mb-2 capitalize">{entry.role?.toLowerCase()}</p>
                        {entry.voiceActors?.slice(0, 2).map((va) => (
                          <p key={`${va.id}-${va.language}`} className="text-xs text-zinc-600 flex items-start gap-1">
                            <span className="text-zinc-400 shrink-0">🎙</span>
                            <span className="truncate">
                              {va.nameFirst} {va.nameLast ?? ""} <span className="text-zinc-400">({va.language})</span>
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Episodes */}
            <section className="mt-10">
              <SectionTitle icon={<PlayCircle className="w-5 h-5 text-purple-600" />}>Episodes</SectionTitle>
              {episodesLoading && episodes.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : episodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm">
                  {episodes.slice(0, 48).map((ep) => (
                    <div key={ep.id} className="flex items-start gap-2 text-sm">
                      <span className="font-bold text-purple-700 shrink-0">{ep.number}.</span>
                      <div className="min-w-0">
                        <p className="text-zinc-800 truncate">{ep.title || `Episode ${ep.number}`}</p>
                        {ep.aired && <p className="text-xs text-zinc-500">{new Date(ep.aired).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">No episodes available for this anime yet.</p>
              )}
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default AnimeDetailPage;
