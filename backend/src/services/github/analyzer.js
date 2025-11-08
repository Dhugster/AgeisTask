const GitHubClient = require('./client');
const CodeAnalyzer = require('../analysis/codeAnalyzer');
const TaskGenerator = require('../analysis/taskGenerator');
const HealthCalculator = require('../analysis/healthCalculator');
const logger = require('../../utils/logger');

/**
 * Repository analyzer orchestrator
 */
class RepositoryAnalyzer {
  constructor(accessToken) {
    this.githubClient = new GitHubClient(accessToken);
    this.codeAnalyzer = new CodeAnalyzer();
    this.taskGenerator = new TaskGenerator();
    this.healthCalculator = new HealthCalculator();
  }

  /**
   * Analyze a repository
   * @param {Object} repository - Repository model instance
   * @param {Object} userSettings - User settings
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeRepository(repository, userSettings = null) {
    const startTime = Date.now();
    logger.info(`Starting analysis for repository: ${repository.full_name}`);

    try {
      // Extract owner and repo name
      const [owner, repo] = repository.full_name.split('/');

      // Fetch repository data
      const repoData = await this.githubClient.getRepository(owner, repo);
      const defaultBranch = repoData.default_branch || 'main';

      // Get repository tree
      const tree = await this.githubClient.getTree(
        owner,
        repo,
        defaultBranch,
        true
      );

      // Filter files to analyze (only source code files)
      const filesToAnalyze = this.filterAnalyzableFiles(tree.tree);
      logger.info(`Found ${filesToAnalyze.length} files to analyze`);

      // Analyze files in batches to avoid rate limiting
      const batchSize = 10;
      const analysisResults = [];
      let filesAnalyzed = 0;
      let linesAnalyzed = 0;

      for (let i = 0; i < filesToAnalyze.length; i += batchSize) {
        const batch = filesToAnalyze.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(file => this.analyzeFile(owner, repo, file, defaultBranch))
        );

        // Process batch results efficiently
        for (const result of batchResults) {
          if (!result) continue;
          analysisResults.push(result);
          filesAnalyzed++;
          linesAnalyzed += result.lineCount || 0;
        }

        // Small delay to respect rate limits
        if (i + batchSize < filesToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Generate tasks from analysis results
      const tasks = this.taskGenerator.generateTasks(
        analysisResults,
        repository,
        userSettings
      );

      // Get additional repository metrics
      const [commits, issues, pullRequests] = await Promise.all([
        this.githubClient.getCommits(owner, repo, { per_page: 10 }),
        this.githubClient.getIssues(owner, repo),
        this.githubClient.getPullRequests(owner, repo)
      ]);

      // Calculate health metrics
      const healthMetrics = this.healthCalculator.calculateHealth({
        analysisResults,
        tasks,
        commits,
        issues,
        pullRequests,
        repository: repoData
      });

      const duration = Date.now() - startTime;
      logger.info(`Analysis completed for ${repository.full_name} in ${duration}ms`);

      return {
        success: true,
        tasks,
        healthMetrics,
        stats: {
          filesAnalyzed,
          linesAnalyzed,
          tasksFound: tasks.length,
          duration
        },
        lastCommit: commits[0] || null
      };
    } catch (error) {
      logger.error(`Error analyzing repository ${repository.full_name}:`, error);
      return {
        success: false,
        error: error.message,
        tasks: [],
        healthMetrics: null,
        stats: {
          filesAnalyzed: 0,
          linesAnalyzed: 0,
          tasksFound: 0,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Analyze a single file
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} file - File object from tree
   * @param {string} ref - Branch reference
   * @returns {Promise<Object>} File analysis result
   */
  async analyzeFile(owner, repo, file, ref) {
    try {
      const content = await this.githubClient.getFileContent(
        owner,
        repo,
        file.path,
        ref
      );

      if (!content) {
        return null;
      }

      // Analyze file content
      const analysis = this.codeAnalyzer.analyzeCode(content, file.path);

      return {
        path: file.path,
        size: file.size,
        lineCount: content.split('\n').length,
        ...analysis
      };
    } catch (error) {
      logger.error(`Error analyzing file ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Filter files that should be analyzed
   * @param {Array} tree - Repository tree
   * @returns {Array} Filtered files
   */
  filterAnalyzableFiles(tree) {
    const analyzableExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.rb', '.go', '.rs', '.php',
      '.vue', '.svelte'
    ];

    const excludePaths = [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.git/',
      'vendor/',
      '__pycache__/',
      '.next/',
      '.nuxt/',
      'out/',
      'target/'
    ];

    return tree.filter(item => {
      if (item.type !== 'blob') return false;
      
      // Check if path should be excluded
      if (excludePaths.some(exclude => item.path.includes(exclude))) {
        return false;
      }

      // Check if file has analyzable extension
      const hasValidExtension = analyzableExtensions.some(ext => 
        item.path.endsWith(ext)
      );

      // Check file size (skip very large files > 1MB)
      const isSizeOk = item.size < 1024 * 1024;

      return hasValidExtension && isSizeOk;
    });
  }
}

module.exports = RepositoryAnalyzer;
