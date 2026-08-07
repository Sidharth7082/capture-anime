import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, X, Settings, Star, Heart, History, Clock } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Card, CardContent } from "@/components/ui/card";
import { useBackendAuth } from "@/hooks/use-backend-auth";
import { useContinueWatchingList, useWatchHistoryList } from "@/hooks/use-continue-watching";
import { useFavorites } from "@/hooks/use-favorites";
import { useMalMe, useMalList, useMalSync, useMalConnect } from "@/hooks/use-mal";
import { fetchMalLogout } from "@/lib/mal-client"
import type { JikanAnime } from "@/types/jikan";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useBackendAuth();
  const favorites = useFavorites();
  const continueWatching = useContinueWatchingList(5);
  const watchHistory = useWatchHistoryList(5);

  // --- MyAnimeList sync state (React Query) ---
  const { data: malUser } = useMalMe();
  const { data: malWatching = [] } = useMalList("watching", 100);
  const { data: malCompleted = [] } = useMalList("completed", 100);
  const malSync = useMalSync();
  const malConnect = useMalConnect();
  const [malDisconnecting, setMalDisconnecting] = useState(false);

  // OAuth callback lands on /profile#mal=<status> — surface the outcome.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("mal=connected")) {
      toast.success("MyAnimeList connected!", { description: "Your list is syncing." });
      window.history.replaceState(null, "", window.location.pathname);
    } else if (hash.includes("mal=denied")) {
      toast.error("MyAnimeList connection cancelled.");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (hash.includes("mal=expired") || hash.includes("mal=error")) {
      toast.error("MyAnimeList connection failed.", { description: "Please try connecting again." });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleMalDisconnect = async () => {
    setMalDisconnecting(true);
    try {
      await fetchMalLogout();
      toast.success("MyAnimeList disconnected.");
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
                          <span className="text-gray-500">
                            {" "}· {malWatching.length} watching · {malCompleted.length} completed
                          </span>
                          {malSync.data && (
                            <span className="text-gray-500"> · last sync: {malSync.data.synced} entries</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          Connect your MyAnimeList account to sync your watchlist, ratings and favorites.
                        </p>
                      )}
                    </div>
                    {malUser ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                          onClick={() => malSync.mutate()}
                          disabled={malSync.isPending}
                        >
                          {malSync.isPending ? "Syncing…" : "Sync now"}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                          onClick={handleMalDisconnect}
                          disabled={malDisconnecting}
                        >
                          {malDisconnecting ? "Disconnecting…" : "Disconnect"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                        onClick={() => malConnect.mutate(undefined, {
                          onError: (err) => toast.error("MAL Connect Failed", { description: (err as Error).message }),
                        })}
                        disabled={malConnect.isPending}
                      >
                        {malConnect.isPending ? "Connecting…" : "Connect MyAnimeList"}
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
