const { Octokit } = require('@octokit/rest');
const logger = require('../../utils/logger');

/**
 * GitHub API client wrapper
 */
class GitHubClient {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: 'RepoResume v1.0.0',
      timeZone: 'UTC',
      baseUrl: 'https://api.github.com'
    });
  }

  /**
   * Get authenticated user's repositories
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of repositories
   */
  async getUserRepositories(options = {}) {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        ...options
      });
      return data;
    } catch (error) {
      logger.error('Error fetching user repositories:', error);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Get repository details
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository details
   */
  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data;
    } catch (error) {
      logger.error(`Error fetching repository ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
  }

  /**
   * Get repository contents
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Branch/commit reference
   * @returns {Promise<Object>} File contents
   */
  async getContents(owner, repo, path = '', ref = null) {
    try {
      const params = { owner, repo, path };
      if (ref) params.ref = ref;
      
      const { data } = await this.octokit.repos.getContent(params);
      return data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      logger.error(`Error fetching contents for ${owner}/${repo}/${path}:`, error);
      throw new Error(`Failed to fetch contents: ${error.message}`);
    }
  }

  /**
   * Get branch information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name
   * @returns {Promise<Object>} Branch details
   */
  async getBranch(owner, repo, branch) {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching branch ${branch} for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch branch information: ${error.message}`);
    }
  }

  /**
   * Get file content as text
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Branch/commit reference
   * @returns {Promise<string>} File content
   */
  async getFileContent(owner, repo, path, ref = null) {
    try {
      const data = await this.getContents(owner, repo, path, ref);
      if (!data || data.type !== 'file') {
        return null;
      }
      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      logger.error(`Error fetching file content for ${path}:`, error);
      return null;
    }
  }

  /**
   * List repository commits
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of commits
   */
  async getCommits(owner, repo, options = {}) {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        per_page: 100,
        ...options
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching commits for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch commits: ${error.message}`);
    }
  }

  /**
   * Get commit details
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details
   */
  async getCommit(owner, repo, sha) {
    try {
      const { data } = await this.octokit.repos.getCommit({ owner, repo, ref: sha });
      return data;
    } catch (error) {
      logger.error(`Error fetching commit ${sha}:`, error);
      return null;
    }
  }

  /**
   * Get repository issues
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of issues
   */
  async getIssues(owner, repo, options = {}) {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
        ...options
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching issues for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get repository pull requests
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of pull requests
   */
  async getPullRequests(owner, repo, options = {}) {
    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 100,
        ...options
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching PRs for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get repository branches
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(owner, repo) {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching branches for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get repository tree (file structure)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Tree SHA
   * @param {boolean} recursive - Recursive fetch
   * @returns {Promise<Object>} Repository tree
   */
  async getTree(owner, repo, sha, recursive = true) {
    try {
      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: recursive ? 'true' : 'false'
      });
      return data;
    } catch (error) {
      logger.error(`Error fetching tree for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }

  /**
   * Search code in repository
   * @param {string} query - Search query
   * @param {string} repo - Repository full name (owner/repo)
   * @returns {Promise<Array>} Search results
   */
  async searchCode(query, repo) {
    try {
      const { data } = await this.octokit.search.code({
        q: `${query} repo:${repo}`,
        per_page: 100
      });
      return data.items;
    } catch (error) {
      logger.error(`Error searching code in ${repo}:`, error);
      return [];
    }
  }

  /**
   * Get rate limit status
   * @returns {Promise<Object>} Rate limit info
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      return data;
    } catch (error) {
      logger.error('Error fetching rate limit:', error);
      return null;
    }
  }
}

module.exports = GitHubClient;
