const { Task, Repository } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Export tasks
 */
const exportTasks = async (req, res) => {
  const { format = 'json', repository_id } = req.query;
  
  const where = { user_id: req.user.id };
  if (repository_id) where.repository_id = repository_id;
  
  const tasks = await Task.findAll({
    where,
    include: [{
      model: Repository,
      as: 'repository',
      attributes: ['name', 'full_name']
    }],
    order: [['priority_score', 'DESC']]
  });
  
  switch (format.toLowerCase()) {
    case 'csv':
      return exportCSV(res, tasks);
    case 'markdown':
    case 'md':
      return exportMarkdown(res, tasks);
    case 'json':
    default:
      return exportJSON(res, tasks);
  }
};

/**
 * Export repository data
 */
const exportRepository = async (req, res) => {
  const { format = 'json' } = req.query;
  
  const repository = await Repository.findOne({
    where: {
      id: req.params.id,
      user_id: req.user.id
    },
    include: [{
      model: Task,
      as: 'tasks',
      order: [['priority_score', 'DESC']]
    }]
  });
  
  if (!repository) {
    throw new ApiError(404, 'Repository not found');
  }
  
  switch (format.toLowerCase()) {
    case 'markdown':
    case 'md':
      return exportRepositoryMarkdown(res, repository);
    case 'json':
    default:
      return exportJSON(res, repository);
  }
};

/**
 * Export as JSON
 */
function exportJSON(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="export-${Date.now()}.json"`);
  res.json(data);
}

/**
 * Export tasks as CSV
 */
function exportCSV(res, tasks) {
  const headers = [
    'Title',
    'Description',
    'Category',
    'Priority Score',
    'Status',
    'Repository',
    'File Path',
    'Line Number',
    'Created At'
  ];
  
  const rows = tasks.map(task => [
    escapeCSV(task.title),
    escapeCSV(task.description),
    task.category,
    task.priority_score,
    task.status,
    task.repository?.full_name || '',
    escapeCSV(task.file_path),
    task.line_number || '',
    task.created_at
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${Date.now()}.csv"`);
  res.send(csv);
}

/**
 * Export tasks as Markdown
 */
function exportMarkdown(res, tasks) {
  const markdown = [
    '# RepoResume Tasks Export',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total Tasks: ${tasks.length}`,
    '',
    '## Tasks by Priority',
    ''
  ];
  
  // Group by priority in a single pass
  const priorityGroups = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  for (const task of tasks) {
    if (task.priority_score >= 20) {
      priorityGroups.critical.push(task);
    } else if (task.priority_score >= 10) {
      priorityGroups.high.push(task);
    } else if (task.priority_score >= 5) {
      priorityGroups.medium.push(task);
    } else {
      priorityGroups.low.push(task);
    }
  }
  
  const { critical, high, medium, low } = priorityGroups;
  
  const addTaskSection = (title, taskList) => {
    if (taskList.length === 0) return;
    
    markdown.push(`### ${title} (${taskList.length})`);
    markdown.push('');
    
    for (const task of taskList) {
      markdown.push(`- **[${task.category}]** ${task.title}`);
      markdown.push(`  - **Priority**: ${task.priority_score}`);
      markdown.push(`  - **Status**: ${task.status}`);
      markdown.push(`  - **Repository**: ${task.repository?.full_name || 'N/A'}`);
      markdown.push(`  - **Location**: ${task.file_path}:${task.line_number || ''}`);
      if (task.description) {
        markdown.push(`  - **Description**: ${task.description}`);
      }
      markdown.push('');
    }
  };
  
  addTaskSection('🔴 Critical Priority', critical);
  addTaskSection('🟡 High Priority', high);
  addTaskSection('🟢 Medium Priority', medium);
  addTaskSection('⚪ Low Priority', low);
  
  const content = markdown.join('\n');
  
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${Date.now()}.md"`);
  res.send(content);
}

/**
 * Export repository as Markdown
 */
function exportRepositoryMarkdown(res, repository) {
  const markdown = [
    `# ${repository.full_name}`,
    '',
    repository.description ? repository.description : '',
    '',
    '## Repository Information',
    '',
    `- **Language**: ${repository.language || 'N/A'}`,
    `- **Stars**: ${repository.stars}`,
    `- **Forks**: ${repository.forks}`,
    `- **Open Issues**: ${repository.open_issues}`,
    `- **Health Score**: ${repository.health_score}/100 (Grade: ${repository.health_metrics?.grade || 'N/A'})`,
    `- **Last Analyzed**: ${repository.last_analyzed_at || 'Never'}`,
    '',
    '## Health Metrics',
    ''
  ];
  
  if (repository.health_metrics) {
    const metrics = repository.health_metrics;
    markdown.push(`- Code Coverage: ${metrics.code_coverage || 0}%`);
    markdown.push(`- Technical Debt: ${metrics.technical_debt_ratio || 0}/100`);
    markdown.push(`- Dependency Freshness: ${metrics.dependency_freshness || 0}%`);
    markdown.push(`- Documentation: ${metrics.documentation_completeness || 0}%`);
    markdown.push(`- Test Reliability: ${metrics.test_reliability || 0}%`);
  }
  
  markdown.push('');
  markdown.push(`## Tasks (${repository.tasks?.length || 0})`);
  markdown.push('');
  
  if (repository.tasks && repository.tasks.length > 0) {
    for (const task of repository.tasks) {
      markdown.push(`### ${task.title}`);
      markdown.push('');
      markdown.push(`- **Category**: ${task.category}`);
      markdown.push(`- **Priority Score**: ${task.priority_score}`);
      markdown.push(`- **Status**: ${task.status}`);
      markdown.push(`- **Location**: ${task.file_path}:${task.line_number || ''}`);
      if (task.description) {
        markdown.push(`- **Description**: ${task.description}`);
      }
      if (task.suggested_next_steps) {
        markdown.push(`- **Suggested Next Steps**: ${task.suggested_next_steps}`);
      }
      markdown.push('');
    }
  }
  
  const content = markdown.join('\n');
  
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${repository.name}-${Date.now()}.md"`);
  res.send(content);
}

/**
 * Escape CSV values
 */
function escapeCSV(value) {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

module.exports = {
  exportTasks,
  exportRepository
};
