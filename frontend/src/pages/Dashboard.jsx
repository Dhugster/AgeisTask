import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { repositoriesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiRefreshCw, FiGitBranch, FiAlertCircle, FiGithub, FiActivity } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user, loginWithGithub } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle login success/error query parameters and sessionStorage
  useEffect(() => {
    // Check query parameters first
    const loginStatus = searchParams.get('login');
    
    // Also check sessionStorage (for Tauri OAuth flow)
    const storedLogin = sessionStorage.getItem('oauth_login');
    const storedTimestamp = sessionStorage.getItem('oauth_timestamp');
    
    // Only use stored login if it's recent (within last 10 seconds)
    const isRecentLogin = storedTimestamp && 
      (Date.now() - parseInt(storedTimestamp)) < 10000;
    
    if (loginStatus === 'success' || (storedLogin === 'success' && isRecentLogin)) {
      toast.success('Successfully logged in with GitHub!');
      // Clear stored values
      sessionStorage.removeItem('oauth_login');
      sessionStorage.removeItem('oauth_timestamp');
      // Remove query parameter from URL
      setSearchParams({});
      // Invalidate user query to refresh auth state
      queryClient.invalidateQueries(['user']);
    } else if (loginStatus === 'error' || (storedLogin === 'error' && isRecentLogin)) {
      toast.error('Failed to log in with GitHub. Please try again.');
      // Clear stored values
      sessionStorage.removeItem('oauth_login');
      sessionStorage.removeItem('oauth_timestamp');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, queryClient]);

  const { data: repositories, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getAll,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false,
  });

  const syncMutation = useMutation({
    mutationFn: repositoriesAPI.sync,
    onSuccess: () => {
      queryClient.invalidateQueries(['repositories']);
      toast.success('Repositories synced successfully!');
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login with GitHub to sync repositories');
      } else {
        toast.error(error.message || 'Failed to sync repositories');
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user ? 'Monitor your repositories and track tasks' : 'Analyze public GitHub repositories'}
          </p>
        </div>
        {user ? (
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiRefreshCw className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>Sync Repositories</span>
          </button>
        ) : (
          <button
            onClick={loginWithGithub}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiGithub className="w-5 h-5" />
            <span>Login with GitHub</span>
          </button>
        )}
      </div>

      {!repositories || repositories.length === 0 ? (
        <div className="card text-center py-12">
          <FiGitBranch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {user ? 'No Repositories Yet' : 'Welcome to RepoResume'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {user 
              ? 'Click "Sync Repositories" to import your GitHub repositories'
              : 'Login with GitHub to sync your repositories, or analyze public repos by URL'}
          </p>
          {!user && (
            <button
              onClick={loginWithGithub}
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <FiGithub className="w-5 h-5" />
              <span>Login with GitHub</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepositoryCard({ repository }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const handleAnalyze = async (e) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    setIsAnalyzing(true);
    try {
      await repositoriesAPI.analyze(repository.id);
      toast.success(`Analysis complete for ${repository.name}!`);
      // Refresh repositories and tasks
      queryClient.invalidateQueries(['repositories']);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['repository', repository.id]);
    } catch (error) {
      toast.error(`Failed to analyze ${repository.name}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const taskCount = repository.tasks?.length || 0;

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <Link to={`/repository/${repository.id}`} className="block">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {repository.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{repository.language || 'Unknown'}</p>
          </div>
          {repository.health_score > 0 && (
            <div className={`text-2xl font-bold ${getHealthColor(repository.health_score)}`}>
              {getHealthGrade(repository.health_score)}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {repository.description || 'No description'}
        </p>
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <FiAlertCircle className="w-4 h-4 mr-1" />
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </span>
          {repository.last_analyzed_at && (
            <span className="text-gray-500 text-xs">
              {new Date(repository.last_analyzed_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-1"
          title="Generate tasks from repository code"
        >
          <FiActivity className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Generate Tasks'}
        </button>
      </div>
    </div>
  );
}
