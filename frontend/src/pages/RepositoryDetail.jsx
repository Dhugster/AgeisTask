import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repositoriesAPI, tasksAPI } from '../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  FiActivity, FiAlertCircle, FiRefreshCw, FiCheckCircle, 
  FiClock, FiCode, FiGitBranch, FiCalendar, FiList
} from 'react-icons/fi';
import { format } from 'date-fns';

export default function RepositoryDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: repository, isLoading } = useQuery({
    queryKey: ['repository', id],
    queryFn: () => repositoriesAPI.getById(id)
  });

  const { data: tasks } = useQuery({
    queryKey: ['repository-tasks', id],
    queryFn: () => repositoriesAPI.getTasks(id),
    enabled: !!id
  });

  const analyzeMutation = useMutation({
    mutationFn: () => repositoriesAPI.analyze(id),
    onSuccess: () => {
      toast.success('Analysis complete! Tasks have been generated.');
      // Invalidate both repository and tasks queries
      queryClient.invalidateQueries(['repository', id]);
      queryClient.invalidateQueries(['repository-tasks', id]);
      queryClient.invalidateQueries(['tasks']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to analyze repository');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card text-center">
          <p className="text-gray-600 dark:text-gray-400">Repository not found</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (score) => {
    if (score >= 75) return 'text-red-600 dark:text-red-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    if (score >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getPriorityBadge = (score) => {
    if (score >= 75) return { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (score >= 50) return { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    if (score >= 25) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: 'Low', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {repository.full_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {repository.description || 'No description available'}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {repository.language && (
                <span className="flex items-center gap-1">
                  <FiCode className="w-4 h-4" />
                  {repository.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiGitBranch className="w-4 h-4" />
                {repository.default_branch || 'main'}
              </span>
              {repository.last_analyzed_at && (
                <span className="flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  Last analyzed: {format(new Date(repository.last_analyzed_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
          <Link
            to="/tasks"
            className="btn btn-secondary"
          >
            <FiList className="w-4 h-4 mr-2" />
            View All Tasks
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Health Score</p>
              <p className="text-3xl font-bold text-primary-600">
                {Math.round(repository.health_score || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">out of 100</p>
            </div>
            <FiActivity className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Open Tasks</p>
              <p className="text-3xl font-bold text-yellow-600">
                {tasks?.filter(t => t.status === 'open').length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {tasks?.length || 0} total
              </p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {tasks?.filter(t => t.status === 'completed').length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">tasks done</p>
            </div>
            <FiCheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="btn btn-primary w-full h-full flex flex-col items-center justify-center"
          >
            <FiRefreshCw className={`w-6 h-6 mb-2 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {analyzeMutation.isPending ? 'Generating...' : 'Generate Tasks'}
            </span>
            <span className="text-xs opacity-75 mt-1">
              Analyze code & find tasks
            </span>
          </button>
        </div>
      </div>

      {/* Health Metrics */}
      {repository.health_metrics && Object.keys(repository.health_metrics).length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Health Metrics</h2>
          <div className="grid md:grid-cols-5 gap-4">
            {Object.entries(repository.health_metrics).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {typeof value === 'number' ? Math.round(value) : value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Repository Tasks</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {tasks?.length || 0} tasks found
            </span>
            {tasks && tasks.length > 0 && (
              <button
                onClick={() => analyzeMutation.mutate()}
                className="btn btn-sm btn-secondary"
                disabled={analyzeMutation.isPending}
              >
                <FiRefreshCw className={`w-3 h-3 mr-1 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {tasks && tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.slice(0, 20).map((task) => {
              const priority = getPriorityBadge(task.priority_score);
              return (
                <div 
                  key={task.id} 
                  className="border-l-4 pl-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-r transition-colors"
                  style={{ borderLeftColor: task.priority_score >= 75 ? '#dc2626' : task.priority_score >= 50 ? '#f97316' : task.priority_score >= 25 ? '#eab308' : '#9ca3af' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {task.category}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {task.file_path && (
                          <span className="font-mono">
                            {task.file_path}:{task.line_number || 0}
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span className="flex items-center gap-1 text-green-600">
                            <FiCheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {task.status === 'snoozed' && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <FiClock className="w-3 h-3" />
                            Snoozed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`text-lg font-bold ${getPriorityColor(task.priority_score)}`}>
                        {Math.round(task.priority_score)}
                      </span>
                      <p className="text-xs text-gray-500">priority</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {tasks.length > 20 && (
              <div className="text-center pt-4">
                <Link to="/tasks" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View all {tasks.length} tasks →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiAlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No tasks found for this repository yet.
            </p>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn btn-primary"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
              {analyzeMutation.isPending ? 'Analyzing Repository...' : 'Generate Tasks Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}