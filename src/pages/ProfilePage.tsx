import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, X, Settings, Star, Heart, History, Clock } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Card, CardContent } from "@/components/ui/card";
import { useBackendAuth } from "@/hooks/use-backend-auth";
import { useContinueWatchingList } from "@/hooks/use-continue-watching";
import { useWatchHistoryList } from "@/hooks/use-continue-watching";
import { useFavorites } from "@/hooks/use-favorites";
import { malLoginUrl, fetchMalMe, fetchMalLogout, fetchMalAnimeList, fetchMalFavorites } from "@/lib/mal-client"
import type { MalUser } from "@/lib/mal-client"
import type { JikanAnime } from "@/types/jikan";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useBackendAuth();
  const favorites = useFavorites();
  const continueWatching = useContinueWatchingList(5);
  const watchHistory = useWatchHistoryList(5);

  // --- MyAnimeList connection state (server-side OAuth) ---
  const [malUser, setMalUser] = useState<MalUser | null>(null);
  const [malStats, setMalStats] = useState<{ watching: number; completed: number; total: number } | null>(null);
  const [malFavCount, setMalFavCount] = useState<number | null>(null);
  const [malDisconnecting, setMalDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user } = await fetchMalMe();
        if (cancelled) return;
        setMalUser(user);
        if (user) {
          const [list, favs] = await Promise.all([fetchMalAnimeList(), fetchMalFavorites()]);
          if (cancelled) return;
          const statuses = list.data.map((e) => e.list_status.status);
          setMalStats({
            watching: statuses.filter((s) => s === "watching").length,
            completed: statuses.filter((s) => s === "completed").length,
            total: statuses.length,
          });
          setMalFavCount(favs.favorites?.anime?.length ?? 0);
        }
      } catch {
        // Backend offline — the section simply stays in its disconnected state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMalDisconnect = async () => {
    setMalDisconnecting(true);
    try {
      await fetchMalLogout();
      setMalUser(null);
      setMalStats(null);
      setMalFavCount(null);
    } catch {
      toast.error("Failed to disconnect MAL. Is the backend running?");
    } finally {
      setMalDisconnecting(false);
    }
  };

  const handleSearch = (anime: JikanAnime | null) => {
    if (anime) {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#181520]">
        <NavBar onSearch={handleSearch} />
        <div className="flex items-center justify-center p-16 text-white">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#181520]">
        <NavBar onSearch={handleSearch} />
        <div className="flex items-center justify-center p-16">
          <Card className="w-full max-w-md bg-[#211F2D] border-none text-center p-10">
            <User className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to view your profile</h1>
            <p className="text-gray-400 text-sm mb-6">
              Favorites, watch history and continue watching are tied to your CaptureOrDie account.
            </p>
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link to="/auth">Sign in / Register</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181520]">
      <NavBar onSearch={handleSearch} />
      <div className="text-white flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                  <User className="w-8 h-8"/>
                  <h1 className="text-3xl font-bold">Your Profile</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-white hover:bg-gray-700/50">
                  <Settings className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-gray-700/50">
                  <X className="w-8 h-8" />
                </Button>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* CaptureOrDie account card */}
              <Card className="bg-[#211F2D] border-none">
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-400" />
                        CaptureOrDie Account
                      </h2>
                      <p className="text-gray-400 text-sm">
                        Signed in as <span className="text-purple-400 font-semibold">@{user.username}</span>
                        <span className="text-gray-500"> · {user.email}</span>
                        {user.createdAt && (
                          <span className="text-gray-500"> · Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-4 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Heart className="w-4 h-4 text-pink-400" /> {favorites.ids.length} favorites
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <Clock className="w-4 h-4 text-amber-400" /> {continueWatching.data?.length ?? 0} in progress
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <History className="w-4 h-4 text-sky-400" /> {watchHistory.data?.length ?? 0} recently watched
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MyAnimeList connection card */}
              <Card className="bg-[#211F2D] border-none">
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                        <Star className="w-5 h-5 text-blue-400" />
                        MyAnimeList
                      </h2>
                      {malUser ? (
                        <p className="text-gray-400 text-sm">
                          Linked as <span className="text-blue-400 font-semibold">{malUser.name}</span>
                          {malStats && (
                            <span className="text-gray-500"> · {malStats.watching} watching · {malStats.completed} completed · {malFavCount ?? 0} favorites</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          Connect your MyAnimeList account to sync your watchlist, ratings and favorites.
                        </p>
                      )}
                    </div>
                    {malUser ? (
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white shrink-0"
                        onClick={handleMalDisconnect}
                        disabled={malDisconnecting}
                      >
                        {malDisconnecting ? "Disconnecting…" : "Disconnect"}
                      </Button>
                    ) : (
                      <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                        <a href={malLoginUrl}>Connect MyAnimeList</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="bg-[#211F2D] border-none">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-3">Continue Watching</h3>
                  {(continueWatching.data ?? []).length === 0 ? (
                    <p className="text-gray-500 text-sm">Nothing in progress yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {continueWatching.data!.slice(0, 5).map((c) => (
                        <li key={c.animeId} className="text-gray-300 truncate">
                          {c.anime.title} — <span className="text-purple-400">Ep {c.episodeNumber}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-[#211F2D] border-none">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-3">Favorites</h3>
                  {favorites.ids.length === 0 ? (
                    <p className="text-gray-500 text-sm">Tap the ♥ on any anime to save it here.</p>
                  ) : (
                    <p className="text-gray-300 text-sm">{favorites.ids.length} anime saved. See them on the homepage.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
