import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useAnimeDetails,
  animeKeys,
} from "@/hooks/use-anime-queries";
import {
  fetchAnimeCharacters,
  fetchAnimeRecommendations,
  fetchAnimeRelations,
  fetchAnimeStatistics,
  fetchAnimeThemes,
  fetchAnimePictures,
  fetchAnimeReviews,
  fetchAnimeEpisodes,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AnimeCard from "@/components/AnimeCard";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ArrowLeft, Star, Play, Tv, CalendarDays, Clock, Trophy, Users, ThumbsUp, Mic, PlayCircle, Music, Image as ImageIcon, MessageSquare } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import type {
  JikanAnime,
  JikanCharacterRole,
  JikanRecommendation,
  JikanRelation,
  JikanAnimeStatistics,
  JikanTheme,
  JikanReview,
} from "@/types/jikan";

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

const formatCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

const AnimeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const animeId = id ?? "";

  const { data: anime, isLoading, isError } = useAnimeDetails(animeId || null);

  const posterUrl = anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url;
  usePageMeta(
    anime?.title || "Anime",
    anime?.synopsis?.slice(0, 160) || undefined,
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
      description: anime.synopsis?.slice(0, 500) || undefined,
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

  const { data: charactersData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "characters"],
    queryFn: () => fetchAnimeCharacters(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: recommendationsData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "recommendations"],
    queryFn: () => fetchAnimeRecommendations(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: relationsData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "relations"],
    queryFn: () => fetchAnimeRelations(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: statisticsData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "statistics"],
    queryFn: () => fetchAnimeStatistics(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: themesData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "themes"],
    queryFn: () => fetchAnimeThemes(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: picturesData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "pictures"],
    queryFn: () => fetchAnimePictures(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: reviewsData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "reviews"],
    queryFn: () => fetchAnimeReviews(animeId),
    enabled: !!animeId && !!anime,
  });
  const { data: episodesData } = useQuery({
    queryKey: [...animeKeys.animeDetail(animeId), "episodes"],
    queryFn: () => fetchAnimeEpisodes(animeId),
    enabled: !!animeId && !!anime,
  });

  const characters: JikanCharacterRole[] = charactersData?.data ?? [];
  const recommendations: JikanRecommendation[] = recommendationsData?.data ?? [];
  const relations: JikanRelation[] = relationsData?.data ?? [];
  const statistics: JikanAnimeStatistics | undefined = statisticsData?.data;
  const themes: JikanTheme | undefined = themesData?.data;
  const pictures = (picturesData?.data ?? []).map((p) => p.images);
  const reviews: JikanReview[] = reviewsData?.data ?? [];
  const episodes = episodesData?.data ?? [];

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
  const statsRows = statistics
    ? [
        { label: "Watching", value: statistics.watching, color: "bg-green-500" },
        { label: "Completed", value: statistics.completed, color: "bg-blue-500" },
        { label: "On Hold", value: statistics.on_hold, color: "bg-yellow-500" },
        { label: "Dropped", value: statistics.dropped, color: "bg-red-500" },
        { label: "Plan to Watch", value: statistics.plan_to_watch, color: "bg-purple-500" },
      ]
    : [];
  const total = statistics?.total ?? 0;
  const topScores = statistics?.scores.slice().sort((a, b) => b.votes - a.votes).slice(0, 5) ?? [];

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
                  src={
                    anime.images?.webp?.large_image_url ||
                    anime.images?.jpg?.large_image_url ||
                    "/placeholder.svg"
                  }
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
                    {anime.status || "Unknown"}
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
            {anime.synopsis && (
              <section className="mt-10">
                <SectionTitle icon={<MessageSquare className="w-5 h-5 text-purple-600" />}>Synopsis</SectionTitle>
                <p className="text-zinc-700 leading-relaxed max-w-4xl">{anime.synopsis}</p>
                {anime.background && (
                  <p className="text-zinc-500 leading-relaxed max-w-4xl mt-4 text-sm">{anime.background}</p>
                )}
              </section>
            )}

            {/* Statistics */}
            {statistics && (
              <section className="mt-10">
                <SectionTitle icon={<ThumbsUp className="w-5 h-5 text-purple-600" />}>Statistics</SectionTitle>
                <div className="rounded-2xl bg-white/70 border border-zinc-200/80 p-5 shadow-sm max-w-3xl">
                  <div className="flex flex-col gap-2">
                    {statsRows.map((row) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="w-28 text-sm text-zinc-600">{row.label}</span>
                        <div className="flex-1 h-3 rounded-full bg-zinc-200 overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full`}
                            style={{ width: total ? `${Math.max(2, (row.value / total) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-semibold text-zinc-700">{formatCount(row.value)}</span>
                      </div>
                    ))}
                  </div>
                  {topScores.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-wrap gap-2">
                      {topScores.map((s) => (
                        <span key={s.score} className="bg-zinc-100 rounded-full px-3 py-1 text-xs text-zinc-700">
                          ★ {s.score} · {formatCount(s.votes)} votes
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Characters */}
            {characters.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<Mic className="w-5 h-5 text-purple-600" />}>Characters & Voice Actors</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters.slice(0, 12).map((entry) => (
                    <div key={entry.character.mal_id} className="flex gap-3 rounded-2xl bg-white/70 border border-zinc-200/80 p-3 shadow-sm">
                      <img
                        src={entry.character.images?.jpg?.image_url || "/placeholder.svg"}
                        alt={entry.character.name}
                        className="w-16 h-24 object-cover rounded-lg shrink-0"
                        loading="lazy"
                        onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{entry.character.name}</p>
                        <p className="text-xs text-zinc-500 mb-2">{entry.role}</p>
                        {entry.voice_actors?.slice(0, 2).map((va) => (
                          <p key={`${va.person.mal_id}-${va.language}`} className="text-xs text-zinc-600 flex items-start gap-1">
                            <span className="text-zinc-400 shrink-0">🎙</span>
                            <span className="truncate">
                              {va.person.name} <span className="text-zinc-400">({va.language})</span>
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Screenshots */}
            {pictures.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<ImageIcon className="w-5 h-5 text-purple-600" />}>Screenshots</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pictures.slice(0, 12).map((img, i) => (
                    <a
                      key={i}
                      href={img.jpg?.large_image_url || img.jpg?.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl overflow-hidden border border-zinc-200 bg-white"
                    >
                      <img
                        src={img.jpg?.image_url || img.jpg?.large_image_url}
                        alt={`${anime.title} screenshot ${i + 1}`}
                        className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Themes */}
            {themes && (themes.openings.length > 0 || themes.endings.length > 0) && (
              <section className="mt-10 grid md:grid-cols-2 gap-8">
                {themes.openings.length > 0 && (
                  <div>
                    <SectionTitle icon={<Music className="w-5 h-5 text-purple-600" />}>Opening Themes</SectionTitle>
                    <ol className="space-y-1.5 list-decimal list-inside text-zinc-700 text-sm">
                      {themes.openings.map((op, i) => (
                        <li key={i}>{op}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {themes.endings.length > 0 && (
                  <div>
                    <SectionTitle icon={<Music className="w-5 h-5 text-purple-600" />}>Ending Themes</SectionTitle>
                    <ol className="space-y-1.5 list-decimal list-inside text-zinc-700 text-sm">
                      {themes.endings.map((ed, i) => (
                        <li key={i}>{ed}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </section>
            )}

            {/* Episode list */}
            {episodes.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<PlayCircle className="w-5 h-5 text-purple-600" />}>Episodes</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm">
                  {episodes.slice(0, 48).map((ep) => (
                    <div key={ep.mal_id} className="flex items-start gap-2 text-sm">
                      <span className="font-bold text-purple-700 shrink-0">{ep.mal_id}.</span>
                      <div className="min-w-0">
                        <p className="text-zinc-800 truncate">{ep.title || `Episode ${ep.mal_id}`}</p>
                        {ep.aired && <p className="text-xs text-zinc-500">{new Date(ep.aired).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Related */}
            {relations.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<Tv className="w-5 h-5 text-purple-600" />}>Related Anime</SectionTitle>
                <div className="flex flex-wrap gap-3">
                  {relations.map((rel, i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 bg-white/70 p-3 shadow-sm max-w-xs">
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">{rel.relation}</p>
                      <div className="flex flex-col gap-1">
                        {rel.entry.slice(0, 3).map((e) => (
                          <Link
                            key={`${e.type}-${e.mal_id}`}
                            to={e.type === "manga" ? `/browse/all` : `/anime/${e.mal_id}`}
                            className="text-sm text-zinc-700 hover:text-purple-700 truncate"
                          >
                            {e.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<ThumbsUp className="w-5 h-5 text-purple-600" />}>Recommendations</SectionTitle>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {recommendations.slice(0, 12).map((rec) => (
                    <div key={rec.entry.mal_id} className="w-36 shrink-0">
                      <AnimeCard
                        anime={rec.entry}
                        onClick={() => navigate(`/anime/${rec.entry.mal_id}`)}
                        className="shadow-md rounded-2xl bg-white"
                      />
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {rec.votes} votes
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="mt-10">
                <SectionTitle icon={<MessageSquare className="w-5 h-5 text-purple-600" />}>Reviews</SectionTitle>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.mal_id} className="rounded-2xl bg-white/70 border border-zinc-200/80 p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={review.user.images?.jpg?.image_url || "/placeholder.svg"}
                          alt={review.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                          loading="lazy"
                        />
                        <div>
                          <p className="font-semibold text-sm text-zinc-900">{review.user.username}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" /> {review.score} · {new Date(review.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 leading-relaxed line-clamp-5">{review.review}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default AnimeDetailPage;
