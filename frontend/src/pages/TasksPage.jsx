import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, repositoriesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format, addDays } from 'date-fns';
import { 
  FiCheck, FiClock, FiTrash2, FiFilter, FiChevronDown, 
  FiAlertCircle, FiCode, FiFileText, FiShield, FiRefreshCw,
  FiCalendar, FiGitBranch, FiEdit3, FiX
} from 'react-icons/fi';

// Priority level configuration
const PRIORITY_LEVELS = {
  critical: { label: 'Critical', color: 'red', icon: FiAlertCircle, min: 75 },
  high: { label: 'High', color: 'orange', icon: FiClock, min: 50 },
  medium: { label: 'Medium', color: 'yellow', icon: FiCode, min: 25 },
  low: { label: 'Low', color: 'gray', icon: FiFileText, min: 0 }
};

// Category icons
const CATEGORY_ICONS = {
  TODO: FiEdit3,
  FIXME: FiAlertCircle,
  BUG: FiAlertCircle,
  SECURITY: FiShield,
  OPTIMIZE: FiRefreshCw,
  DOCUMENTATION: FiFileText,
  REFACTOR: FiCode,
  OTHER: FiCode
};

// Get priority level based on score
const getPriorityLevel = (score) => {
  if (score >= PRIORITY_LEVELS.critical.min) return 'critical';
  if (score >= PRIORITY_LEVELS.high.min) return 'high';
  if (score >= PRIORITY_LEVELS.medium.min) return 'medium';
  return 'low';
};

// Task Card Component
function TaskCard({ task, onComplete, onSnooze, onDelete }) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const priorityLevel = getPriorityLevel(task.priority_score);
  const priority = PRIORITY_LEVELS[priorityLevel];
  const CategoryIcon = CATEGORY_ICONS[task.category] || FiCode;

  const handleSnooze = (days) => {
    const snoozeUntil = addDays(new Date(), days);
    onSnooze(task.id, snoozeUntil);
    setShowSnoozeMenu(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg bg-${priority.color}-100 dark:bg-${priority.color}-900/20`}>
            <CategoryIcon className={`w-4 h-4 text-${priority.color}-600 dark:text-${priority.color}-400`} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {task.title}
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <FiGitBranch className="w-3 h-3" />
                {task.repository?.name || 'Unknown'}
              </span>
              {task.file_path && (
                <span className="font-mono">{task.file_path}:{task.line_number}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Priority Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium bg-${priority.color}-100 text-${priority.color}-700 dark:bg-${priority.color}-900/30 dark:text-${priority.color}-400`}>
          {priority.label} ({Math.round(task.priority_score)})
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Code Snippet */}
      {task.code_snippet && (
        <pre className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs overflow-x-auto mb-3">
          <code className="text-gray-700 dark:text-gray-300">{task.code_snippet}</code>
        </pre>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          {task.category}
        </span>
        {task.created_at && (
          <span className="flex items-center gap-1">
            <FiCalendar className="w-3 h-3" />
            {format(new Date(task.created_at), 'MMM d, yyyy')}
          </span>
        )}
        {task.status === 'snoozed' && task.snoozed_until && (
          <span className="flex items-center gap-1 text-orange-500">
            <FiClock className="w-3 h-3" />
            Snoozed until {format(new Date(task.snoozed_until), 'MMM d')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {task.status !== 'completed' && (
          <button
            onClick={() => onComplete(task.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
          >
            <FiCheck className="w-3 h-3" />
            Complete
          </button>
        )}
        
        <div className="relative">
          <button
            onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
          >
            <FiClock className="w-3 h-3" />
            Snooze
            <FiChevronDown className="w-3 h-3" />
          </button>
          
          {showSnoozeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button
                onClick={() => handleSnooze(1)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                1 day
              </button>
              <button
                onClick={() => handleSnooze(3)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                3 days
              </button>
              <button
                onClick={() => handleSnooze(7)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                1 week
              </button>
              <button
                onClick={() => handleSnooze(30)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                1 month
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-sm transition-colors"
        >
          <FiTrash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// Main Tasks Page Component
export default function TasksPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'open',
    category: '',
    repository_id: '',
    priority: ''
  });
  const [sortBy, setSortBy] = useState('priority_score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch repositories for filter dropdown
  const { data: repositories } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getAll
  });

  // Fetch tasks with filters
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', filters, sortBy, sortOrder],
    queryFn: () => tasksAPI.getAll({
      ...filters,
      sort: sortBy,
      order: sortOrder
    })
  });

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: (id) => tasksAPI.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task marked as complete!');
    },
    onError: () => {
      toast.error('Failed to complete task');
    }
  });

  // Snooze task mutation
  const snoozeMutation = useMutation({
    mutationFn: ({ id, until }) => tasksAPI.snooze(id, until),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task snoozed');
    },
    onError: () => {
      toast.error('Failed to snooze task');
    }
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => tasksAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    }
  });

  // Calculate statistics
  const stats = {
    total: tasks?.length || 0,
    open: tasks?.filter(t => t.status === 'open').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    snoozed: tasks?.filter(t => t.status === 'snoozed').length || 0,
    critical: tasks?.filter(t => t.status === 'open' && t.priority_score >= 75).length || 0
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            Failed to load tasks. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Task Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track and manage code improvements across all your repositories
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Open</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.snoozed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Snoozed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="snoozed">Snoozed</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            <option value="">All Categories</option>
            <option value="TODO">TODO</option>
            <option value="FIXME">FIXME</option>
            <option value="BUG">BUG</option>
            <option value="SECURITY">SECURITY</option>
            <option value="OPTIMIZE">OPTIMIZE</option>
            <option value="DOCUMENTATION">DOCUMENTATION</option>
            <option value="REFACTOR">REFACTOR</option>
          </select>

          {/* Repository Filter */}
          <select
            value={filters.repository_id}
            onChange={(e) => setFilters({ ...filters, repository_id: e.target.value })}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            <option value="">All Repositories</option>
            {repositories?.map(repo => (
              <option key={repo.id} value={repo.id}>{repo.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical (75+)</option>
            <option value="high">High (50-74)</option>
            <option value="medium">Medium (25-49)</option>
            <option value="low">Low (0-24)</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
            >
              <option value="priority_score">Priority</option>
              <option value="created_at">Created Date</option>
              <option value="updated_at">Updated Date</option>
              <option value="title">Title</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : tasks?.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <FiFileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No tasks found. Sync your repositories to discover tasks!
            </p>
          </div>
        ) : (
          tasks?.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={completeMutation.mutate}
              onSnooze={snoozeMutation.mutate}
              onDelete={deleteMutation.mutate}
            />
          ))
        )}
      </div>
    </div>
  );
}