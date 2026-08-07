import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  backendLogin,
  backendLogout,
  backendRegister,
  clearTokens,
  fetchMe,
  getAccessToken,
  type BackendUser,
} from "@/lib/user-api";

export const authKeys = {
  user: ["backend-user"] as const,
  favorites: ["backend-favorites"] as const,
  continueWatching: ["backend-continue-watching"] as const,
  history: ["backend-history"] as const,
};

/**
 * Backend session. `isAuthenticated` is true when an access token exists AND
 * the /api/user/profile fetch succeeded (or is still loading with a token
 * present — avoids a login flicker on refresh).
 */
export function useBackendAuth() {
  const queryClient = useQueryClient();
  const hasToken = getAccessToken() != null;

  const userQuery = useQuery({
    queryKey: authKeys.user,
    queryFn: fetchMe,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // If the profile fetch failed with a dead session (401/403 after the
  // single-flight refresh), drop the stale tokens so the UI can show the
  // signed-out state. Transient failures (5xx, network down) must NOT log
  // the user out — a single blip during page load shouldn't wipe the session.
  useEffect(() => {
    if (userQuery.isError) {
      const status = (userQuery.error as { status?: number } | null)?.status;
      if (status === 401 || status === 403) {
        clearTokens();
      }
    }
  }, [userQuery.isError]);

  const login = useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      backendLogin(identifier, password),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: authKeys.favorites });
      queryClient.invalidateQueries({ queryKey: authKeys.continueWatching });
      queryClient.invalidateQueries({ queryKey: authKeys.history });
    },
  });

  const register = useMutation({
    mutationFn: ({ username, email, password }: { username: string; email: string; password: string }) =>
      backendRegister(username, email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: authKeys.favorites });
      queryClient.invalidateQueries({ queryKey: authKeys.continueWatching });
      queryClient.invalidateQueries({ queryKey: authKeys.history });
    },
  });

  const logout = useMutation({
    mutationFn: () => backendLogout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: authKeys.user });
      queryClient.removeQueries({ queryKey: authKeys.favorites });
      queryClient.removeQueries({ queryKey: authKeys.continueWatching });
      queryClient.removeQueries({ queryKey: authKeys.history });
    },
  });

  return {
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    isError: userQuery.isError,
    isAuthenticated: hasToken && (userQuery.data != null || userQuery.isLoading),
    login,
    register,
    logout,
  };
}
