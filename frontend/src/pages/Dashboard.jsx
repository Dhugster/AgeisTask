import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repositoriesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiRefreshCw, FiGitBranch, FiAlertCircle, FiGithub } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user, loginWithGithub } = useAuth();

  const { data: repositories, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getAll
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

  const taskCount = repository.tasks?.length || 0;

  return (
    <Link to={`/repository/${repository.id}`} className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {repository.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{repository.language}</p>
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

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <FiAlertCircle className="w-4 h-4 mr-1" />
            {taskCount} tasks
          </span>
        </div>
        {repository.last_analyzed_at ? (
          <span className="text-gray-500 text-xs">
            Analyzed {new Date(repository.last_analyzed_at).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-yellow-600 text-xs">Not analyzed</span>
        )}
      </div>
    </Link>
  );
}
