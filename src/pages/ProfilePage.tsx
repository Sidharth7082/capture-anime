
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { User, X, Settings, Star } from "lucide-react"
import { Session } from "@supabase/supabase-js"
import NavBar from "@/components/NavBar"
import ProfileForm from "@/components/profile/ProfileForm"
import ProfileAvatar from "@/components/profile/ProfileAvatar"
import { Card, CardContent } from "@/components/ui/card"
import { malLoginUrl, fetchMalMe, fetchMalLogout, fetchMalAnimeList, fetchMalFavorites } from "@/lib/mal-client"
import type { MalUser } from "@/lib/mal-client"
import type { JikanAnime } from "@/types/jikan";

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must not be longer than 50 characters." }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const ProfilePage = () => {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
    },
  })

  useEffect(() => {
    let cancelled = false;
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        setAvatarUrl(session.user.user_metadata.avatar_url);
        form.setValue("fullName", session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '');
        setLoading(false);
      }
    };

    fetchSession().catch((error) => {
      console.error("Failed to load profile session", error);
      if (!cancelled) {
        setLoading(false);
        navigate("/auth");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        if (!session) {
          navigate("/auth");
        } else {
          setSession(session);
          if (document.activeElement?.id !== 'fullName') {
            form.setValue("fullName", session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '');
          }
          setAvatarUrl(session.user.user_metadata.avatar_url);
        }
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: data.fullName, avatar_url: avatarUrl },
    })

    if (error) {
      toast.error("Error updating profile", { description: error.message })
    } else {
      toast.success("Profile updated successfully!")
    }
    setIsSaving(false)
  }

  const handlePasswordReset = async () => {
    if (!session?.user.email) {
      toast.error("No email found for password reset.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast.error("Failed to send password reset email", { description: error.message });
    } else {
      toast.success("Password reset email sent!");
    }
  };

  const handleSearch = (anime: JikanAnime | null) => {
    if (anime) {
      navigate("/");
    }
  };

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

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#181520] text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#181520]">
      <NavBar onSearch={handleSearch} />
      <div className="text-white flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                  <User className="w-8 h-8"/>
                  <h1 className="text-3xl font-bold">Edit Profile</h1>
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

              <ProfileForm 
                session={session} 
                form={form}
                onSubmit={onSubmit}
                isSaving={isSaving}
                handlePasswordReset={handlePasswordReset}
              />
            </div>

            <ProfileAvatar 
              avatarUrl={avatarUrl}
              onAvatarSelect={setAvatarUrl}
              fallbackName={form.getValues("fullName")}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
