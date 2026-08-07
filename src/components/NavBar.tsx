import React, { useState, useEffect, useCallback } from 'react';
import { useBackendAuth } from "@/hooks/use-backend-auth";
import type { JikanAnime } from "@/types/jikan";
import type { MalUser } from "@/lib/mal-client";
import { malLoginUrl, fetchMalMe, fetchMalLogout } from "@/lib/mal-client";
import { Link } from "react-router-dom";
import { Home, User, Bell, LogOut, Menu } from "lucide-react";
import AnimeSearchBar from "@/components/AnimeSearchBar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NavBar = ({
  onSearch
}: {
  onSearch: (v: JikanAnime | null) => void;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [malUser, setMalUser] = useState<MalUser | null>(null);
  const [malLoading, setMalLoading] = useState(false);

  // Backend account (JWT) — syncs favorites / history / continue watching.
  const { user: backendUser, logout: backendLogout } = useBackendAuth();
  const handleBackendLogout = () => backendLogout.mutate();

  // Load the linked MAL profile (if any). Also refetch when returning from
  // the MAL OAuth redirect (the callback lands on /profile#mal=connected).
  const refreshMalUser = useCallback(async () => {
    try {
      const { user } = await fetchMalMe();
      setMalUser(user);
    } catch {
      setMalUser(null);
    }
  }, []);

  useEffect(() => {
    refreshMalUser();
    const onHash = () => {
      if (window.location.hash.includes('mal=')) {
        refreshMalUser();
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [refreshMalUser]);

  const handleMalLogout = async () => {
    setMalLoading(true);
    try {
      await fetchMalLogout();
      setMalUser(null);
    } catch {
      // keep the stale user; the server may be offline
    } finally {
      setMalLoading(false);
    }
  };

  const handleSearchSelect = (v: JikanAnime | null) => {
    onSearch(v);
    setIsMobileMenuOpen(false);
  };

  return <nav className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur border-b border-zinc-200 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4 py-2 px-5">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-3xl font-extrabold tracking-tight" style={{
          color: "#7D36FF"
        }}>
            captureordie
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="font-medium text-zinc-900 rounded-full bg-zinc-100 px-4 py-1.5 shadow transition hover:bg-purple-100 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Home
            </Link>
            <a href="/#top-anime" className="hover:underline text-zinc-700 font-medium transition">Top Anime</a>
            
            <Link to="/gifs" className="hover:underline text-zinc-700 font-medium transition">GIFs</Link>
            <Link to="/danbooru" className="hover:underline text-zinc-700 font-medium transition">Danbooru</Link>
            <a href="/#image" className="hover:underline text-zinc-700 font-medium transition">Image</a>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block">
            <AnimeSearchBar onSelect={onSearch} className="max-w-none w-auto mb-0" wrapperClass="!bg-zinc-100 !border-zinc-300 !rounded-full w-60" placeholder="Search anime..." />
          </div>
          {/* Notifications bell (placeholder UI; real notifications arrive with the user system) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full text-zinc-700 hover:bg-zinc-100" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e50914]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 bg-white border-zinc-200 rounded-xl p-2 mt-2 shadow-xl" align="end" forceMount>
              <DropdownMenuLabel className="font-semibold text-sm text-zinc-800">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100" />
              <div className="p-3 text-sm text-zinc-500">
                No notifications yet. Check back after subscribing to updates.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* MyAnimeList connection */}
          {malUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  {malUser.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border-zinc-200 rounded-xl p-2 mt-2 shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-semibold text-sm text-zinc-800">MyAnimeList</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100" />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-3 h-5 w-5 text-zinc-500" />
                    <span>View Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMalLogout} disabled={malLoading} className="rounded-lg cursor-pointer">
                  <LogOut className="mr-3 h-5 w-5 text-zinc-500" />
                  <span>{malLoading ? "Disconnecting…" : "Disconnect MAL"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-full border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold">
              <a href={malLoginUrl}>Connect MyAnimeList</a>
            </Button>
          )}
          {/* Backend account (favorites / history / continue watching sync) */}
          {backendUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold">
                  <User className="h-4 w-4 mr-2" />
                  {backendUser.username}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 bg-white border-zinc-200 rounded-xl p-2 mt-2 shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-semibold text-sm text-zinc-800">Anime account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100" />
                <DropdownMenuItem onClick={handleBackendLogout} disabled={backendLogout.isPending} className="rounded-lg cursor-pointer">
                  <LogOut className="mr-3 h-5 w-5 text-zinc-500" />
                  <span>{backendLogout.isPending ? "Signing out…" : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!backendUser && <div className="hidden md:block"><Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link to="/auth">Login</Link>
            </Button></div>}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-white/95 backdrop-blur-sm">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-extrabold tracking-tight" style={{ color: "#7D36FF" }}>
                         captureordie
                       </Link>
                    </div>
                    <div className="p-4">
                      <AnimeSearchBar onSelect={handleSearchSelect} placeholder="Search anime..." />
                    </div>
                    <nav className="flex flex-col p-4 space-y-1">
                      <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-lg font-medium p-3 rounded-lg hover:bg-zinc-100 transition-colors">
                        <Home className="w-6 h-6 text-purple-600" />
                        <span>Home</span>
                      </Link>
                      <a href="/#top-anime" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium p-3 rounded-lg hover:bg-zinc-100 transition-colors">Top Anime</a>
                      <Link to="/gifs" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium p-3 rounded-lg hover:bg-zinc-100 transition-colors">GIFs</Link>
                      <Link to="/danbooru" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium p-3 rounded-lg hover:bg-zinc-100 transition-colors">Danbooru</Link>
                      <a href="/#image" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium p-3 rounded-lg hover:bg-zinc-100 transition-colors">Image</a>
                    </nav>
                    <div className="mt-auto p-4 border-t">
                      {backendUser && (
                        <Button variant="outline" className="w-full mb-2 border-purple-300 text-purple-700" onClick={() => { handleBackendLogout(); setIsMobileMenuOpen(false); }}>
                          Sign out ({backendUser.username})
                        </Button>
                      )}
                      {!backendUser && (
                        <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsMobileMenuOpen(false)}>
                          <Link to="/auth">Login</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
        </div>
      </div>
    </nav>;
};
export default NavBar;
