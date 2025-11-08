import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: authAPI.getCurrentUser,
    retry: false, // Don't retry - 401 is OK (not logged in)
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // Don't poll
    // Treat 401 as "not logged in" not an error
    throwOnError: false,
  });

  const logout = async () => {
    try {
      await authAPI.logout();
      queryClient.setQueryData(['user'], null);
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const loginWithGithub = () => {
    // In Tauri desktop, open OAuth in external browser and poll for session
    const isDesktop = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    if (isDesktop && window.__TAURI__?.shell) {
      try {
        // Open OAuth in external browser
        authAPI.loginWithGithub();
      } catch (e) {
        // Fallback: try direct navigation
        window.location.href = `${window.location.origin}/api/auth/github`;
      }

      // Poll for authentication success
      const start = Date.now();
      const maxDurationMs = 60 * 1000; // 60 seconds
      const pollIntervalMs = 1500;

      const intervalId = setInterval(async () => {
        try {
          const currentUser = await authAPI.getCurrentUser();
          if (currentUser) {
            clearInterval(intervalId);
            queryClient.setQueryData(['user'], currentUser);
            toast.success('Successfully logged in with GitHub!');
          }
        } catch (_) {
          // Ignore until timeout
        }

        if (Date.now() - start > maxDurationMs) {
          clearInterval(intervalId);
          toast.error('Login timed out. Please try again.');
        }
      }, pollIntervalMs);
      return;
    }

    // Web: navigate directly
    authAPI.loginWithGithub();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout,
    loginWithGithub,
  };
}
