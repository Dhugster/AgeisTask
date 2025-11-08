const { UserSettings, Repository, Task } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get user settings
 */
const getSettings = async (req, res) => {
  let settings = await UserSettings.findOne({
    where: { user_id: req.user.id }
  });
  
  if (!settings) {
    settings = await UserSettings.create({ user_id: req.user.id });
  }
  
  res.json(settings);
};

/**
 * Update user settings
 */
const updateSettings = async (req, res) => {
  let settings = await UserSettings.findOne({
    where: { user_id: req.user.id }
  });
  
  if (!settings) {
    settings = await UserSettings.create({ user_id: req.user.id });
  }
  
  const allowedUpdates = [
    'theme',
    'default_view',
    'priority_weights',
    'custom_keywords',
    'notification_preferences',
    'export_preferences',
    'integrations',
    'default_sync_interval'
  ];
  
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  
  await settings.update(updates);
  res.json(settings);
};

/**
 * Get user statistics
 */
const getStatistics = async (req, res) => {
  const [repositories, tasks] = await Promise.all([
    Repository.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'health_score', 'last_analyzed_at']
    }),
    Task.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'status', 'priority_score', 'category']
    })
  ]);
  
  // Single pass through tasks array to calculate all statistics
  const taskStats = {
    open: 0,
    in_progress: 0,
    completed: 0,
    snoozed: 0,
    high: 0,
    medium: 0,
    low: 0,
    by_category: {}
  };
  
  const categories = ['TODO', 'FIXME', 'BUG', 'SECURITY', 'INCOMPLETE_CODE'];
  categories.forEach(cat => taskStats.by_category[cat] = 0);
  
  // Single loop to calculate all task statistics
  for (const task of tasks) {
    // Count by status
    if (task.status in taskStats) {
      taskStats[task.status]++;
    }
    
    // Count by priority
    if (task.priority_score >= 20) {
      taskStats.high++;
    } else if (task.priority_score >= 10) {
      taskStats.medium++;
    } else {
      taskStats.low++;
    }
    
    // Count by category
    if (task.category && task.category in taskStats.by_category) {
      taskStats.by_category[task.category]++;
    }
  }
  
  const stats = {
    repositories: {
      total: repositories.length,
      average_health: repositories.length > 0
        ? repositories.reduce((sum, r) => sum + (r.health_score || 0), 0) / repositories.length
        : 0,
      analyzed: repositories.filter(r => r.last_analyzed_at).length
    },
    tasks: {
      total: tasks.length,
      ...taskStats
    },
    priority: {
      high: taskStats.high,
      medium: taskStats.medium,
      low: taskStats.low
    }
  };
  
  res.json(stats);
};

module.exports = {
  getSettings,
  updateSettings,
  getStatistics
};
