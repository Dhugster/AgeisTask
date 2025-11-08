const { Repository, Task, Analysis, UserSettings, sequelize } = require('../models');
const GitHubClient = require('../services/github/client');
const RepositoryAnalyzer = require('../services/github/analyzer');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all repositories for authenticated user (or empty if not authenticated)
 */
const getRepositories = async (req, res) => {
  // If not authenticated, return empty array (can analyze public repos by URL)
  if (!req.user) {
    return res.json([]);
  }
  
  const repositories = await Repository.findAll({
    where: { user_id: req.user.id },
    order: [['last_synced_at', 'DESC']],
    include: [{
      model: Task,
      as: 'tasks',
      where: { status: { [Op.ne]: 'completed' } },
      required: false
    }]
  });
  
  res.json(repositories);
};

/**
 * Get repository by ID (public repos accessible without auth)
 */
const getRepository = async (req, res) => {
  const whereClause = { id: req.params.id };
  
  // If authenticated, filter by user_id. If not, only allow public repos
  if (req.user) {
    whereClause.user_id = req.user.id;
  } else {
    // Allow access to public repos only
    whereClause.is_private = false;
  }
  
  const repository = await Repository.findOne({
    where: whereClause,
    include: [{
      model: Task,
      as: 'tasks'
    }]
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  // If not authenticated and repo is private, require auth
  if (!req.user && repository.is_private) {
    throw new ApiError(401, 'Authentication required to access private repositories');
  }
  
  res.json(repository);
};

/**
 * Sync repositories from GitHub (requires authentication)
 */
const syncRepositories = async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required to sync repositories');
  }
  
  try {
    const githubClient = new GitHubClient(req.user.github_access_token);
    
    // Fetch repositories from GitHub
    const githubRepos = await githubClient.getUserRepositories();
    
    logger.info(`Fetched ${githubRepos.length} repositories from GitHub for user ${req.user.username}`);
    
    const syncedRepos = [];
    
    for (const repo of githubRepos) {
      // Skip archived repositories unless user wants them
      if (repo.archived) continue;
      
      // Find or create repository
      const [repository, created] = await Repository.findOrCreate({
        where: {
          user_id: req.user.id,
          github_id: repo.id.toString()
        },
        defaults: {
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          clone_url: repo.clone_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          open_issues: repo.open_issues_count,
          default_branch: repo.default_branch || 'main',
          is_private: repo.private,
          is_fork: repo.fork,
          is_archived: repo.archived,
          last_synced_at: new Date()
        }
      });
      
      // Update existing repository
      if (!created) {
        await repository.update({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          open_issues: repo.open_issues_count,
          is_archived: repo.archived,
          last_synced_at: new Date()
        });
      }
      
      syncedRepos.push(repository);
    }
    
    res.json({
      message: `Successfully synced ${syncedRepos.length} repositories`,
      repositories: syncedRepos
    });
  } catch (error) {
    logger.error('Repository sync error:', error);
    throw new ApiError(500, 'Failed to sync repositories', error.message);
  }
};

/**
 * Analyze repository (public repos can be analyzed without auth)
 */
const analyzeRepository = async (req, res) => {
  const whereClause = { id: req.params.id };
  
  // If authenticated, filter by user_id. If not, only allow public repos
  if (req.user) {
    whereClause.user_id = req.user.id;
  } else {
    whereClause.is_private = false;
  }
  
  const repository = await Repository.findOne({
    where: whereClause
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  // If not authenticated and repo is private, require auth
  if (!req.user && repository.is_private) {
    throw new ApiError(401, 'Authentication required to analyze private repositories');
  }
  
  // Create analysis record
  const analysis = await Analysis.create({
    repository_id: repository.id,
    status: 'running',
    started_at: new Date()
  });
  
  // Respond immediately
  res.json({
    message: 'Analysis started',
    analysis_id: analysis.id
  });
  
  // Run analysis in background
  (async () => {
    try {
      // For public repos without auth, use no token (rate limits apply)
      const accessToken = req.user?.github_access_token || null;
      
      let userSettings = null;
      if (req.user) {
        userSettings = await UserSettings.findOne({
          where: { user_id: req.user.id }
        });
      }
      
      const analyzer = new RepositoryAnalyzer(accessToken);
      const results = await analyzer.analyzeRepository(repository, userSettings);
      
      if (!results.success) {
        throw new Error(results.error || 'Repository analysis failed');
      }
      
      const taskUserId = repository.user_id || req.user?.id || null;
      
      await sequelize.transaction(async (transaction) => {
        await repository.update({
          health_score: results.healthMetrics?.overall_health || 0,
          health_metrics: results.healthMetrics || {},
          last_analyzed_at: new Date(),
          last_commit_at: results.lastCommit?.commit?.author?.date || null
        }, { transaction });
        
        await Task.destroy({
          where: { repository_id: repository.id },
          transaction
        });
        
        if (Array.isArray(results.tasks) && results.tasks.length > 0) {
          const createPromises = results.tasks.map((taskData) =>
            Task.create({
              ...taskData,
              repository_id: repository.id,
              user_id: taskUserId
            }, { transaction })
          );
          await Promise.all(createPromises);
        }
        
        await analysis.update({
          status: 'completed',
          completed_at: new Date(),
          duration_ms: results.stats.duration,
          tasks_found: results.stats.tasksFound,
          files_analyzed: results.stats.filesAnalyzed,
          lines_analyzed: results.stats.linesAnalyzed,
          analysis_results: results,
          health_metrics: results.healthMetrics
        }, { transaction });
      });
      
      logger.info(`Analysis completed for repository ${repository.full_name}`);
    } catch (error) {
      logger.error(`Analysis failed for repository ${repository.full_name}:`, error);
      await analysis.update({
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message
      });
    }
  })();
};

/**
 * Get repository tasks (public repos accessible without auth)
 */
const getRepositoryTasks = async (req, res) => {
  // First check if repository exists and is accessible
  const repository = await Repository.findOne({
    where: { id: req.params.id }
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  // If not authenticated and repo is private, require auth
  if (!req.user && repository.is_private) {
    throw new ApiError(401, 'Authentication required to access private repository tasks');
  }
  
  // Build where clause - if authenticated, filter by user_id, otherwise get all tasks for repo
  const whereClause = { repository_id: req.params.id };
  if (req.user) {
    whereClause.user_id = req.user.id;
  }
  
  const tasks = await Task.findAll({
    where: whereClause,
    order: [['priority_score', 'DESC']]
  });
  
  res.json(tasks);
};

/**
 * Update repository (requires authentication)
 */
const updateRepository = async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required to update repositories');
  }
  
  const repository = await Repository.findOne({
    where: { 
      id: req.params.id,
      user_id: req.user.id 
    }
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  const { sync_interval_minutes, is_active } = req.body;
  
  await repository.update({
    sync_interval_minutes,
    is_active
  });
  
  res.json(repository);
};

/**
 * Delete repository (requires authentication)
 */
const deleteRepository = async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required to delete repositories');
  }
  
  const repository = await Repository.findOne({
    where: { 
      id: req.params.id,
      user_id: req.user.id 
    }
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  // Delete associated tasks
  await Task.destroy({
    where: { repository_id: repository.id }
  });
  
  // Delete repository
  await repository.destroy();
  
  res.json({ message: 'Repository deleted successfully' });
};

module.exports = {
  getRepositories,
  getRepository,
  syncRepositories,
  analyzeRepository,
  getRepositoryTasks,
  updateRepository,
  deleteRepository
};
