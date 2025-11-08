import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: authAPI.getCurrentUser,
    retry: 1,
    retryDelay: 2000,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Don't retry forever - timeout after 5 seconds
    gcTime: 5000,
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
