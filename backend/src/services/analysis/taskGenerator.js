const logger = require('../../utils/logger');

/**
 * Task generator from code analysis results
 */
class TaskGenerator {
  /**
   * Generate tasks from analysis results
   * @param {Array} analysisResults - File analysis results
   * @param {Object} repository - Repository model instance
   * @param {Object} userSettings - User settings with priority weights
   * @returns {Array} Generated tasks
   */
  generateTasks(analysisResults, repository, userSettings = null) {
    const priorityWeights = userSettings?.priority_weights || this.getDefaultWeights();

    // Extract all tasks using flatMap to reduce nesting
    const tasks = analysisResults.flatMap(fileAnalysis => {
      const fileTasks = [];

      // Extract tasks from comments (reduced nesting with flatMap)
      if (fileAnalysis.comments) {
        const commentTasks = fileAnalysis.comments
          .filter(comment => comment.tasks && comment.tasks.length > 0)
          .flatMap(comment => comment.tasks.map(task => 
            this.createTaskFromComment(task, fileAnalysis, repository, priorityWeights)
          ));
        fileTasks.push(...commentTasks);
      }

      // Add tasks from incomplete code
      if (fileAnalysis.incompleteCode?.length > 0) {
        const incompleteTasks = fileAnalysis.incompleteCode.map(incomplete =>
          this.createTaskFromIncompleteCode(incomplete, fileAnalysis, repository, priorityWeights)
        );
        fileTasks.push(...incompleteTasks);
      }

      // Add tasks from security issues
      if (fileAnalysis.securityIssues?.length > 0) {
        const securityTasks = fileAnalysis.securityIssues.map(securityIssue =>
          this.createTaskFromSecurityIssue(securityIssue, fileAnalysis, repository, priorityWeights)
        );
        fileTasks.push(...securityTasks);
      }

      return fileTasks;
    });

    // Deduplicate tasks
    const uniqueTasks = this.deduplicateTasks(tasks);

    // Sort by priority
    uniqueTasks.sort((a, b) => b.priority_score - a.priority_score);

    logger.info(`Generated ${uniqueTasks.length} tasks for repository ${repository.full_name}`);
    return uniqueTasks;
  }

  /**
   * Create task from comment marker
   * @param {Object} task - Task from comment
   * @param {Object} fileAnalysis - File analysis results
   * @param {Object} repository - Repository instance
   * @param {Object} weights - Priority weights
   * @returns {Object} Task data
   */
  createTaskFromComment(task, fileAnalysis, repository, weights) {
    const priorityFactors = this.calculatePriorityFactors(
      task.category,
      fileAnalysis,
      repository,
      weights
    );

    const priorityScore = this.calculatePriorityScore(priorityFactors, weights);

    return {
      title: this.generateTitle(task),
      description: task.description,
      category: task.category,
      priority_score: priorityScore,
      priority_factors: priorityFactors,
      file_path: fileAnalysis.path,
      line_number: task.lineNumber,
      code_snippet: this.extractCodeSnippet(fileAnalysis, task.lineNumber),
      suggested_next_steps: this.generateSuggestedSteps(task.category, task.description),
      status: 'open',
      tags: [task.category.toLowerCase(), fileAnalysis.language]
    };
  }

  /**
   * Create task from incomplete code
   * @param {Object} incomplete - Incomplete code info
   * @param {Object} fileAnalysis - File analysis results
   * @param {Object} repository - Repository instance
   * @param {Object} weights - Priority weights
   * @returns {Object} Task data
   */
  createTaskFromIncompleteCode(incomplete, fileAnalysis, repository, weights) {
    const priorityFactors = this.calculatePriorityFactors(
      'INCOMPLETE_CODE',
      fileAnalysis,
      repository,
      weights,
      2 // Bonus for incomplete code
    );

    const priorityScore = this.calculatePriorityScore(priorityFactors, weights);

    // Generate better title for incomplete code
    const incompleteTitle = this.generateIncompleteCodeTitle(incomplete);

    return {
      title: incompleteTitle,
      description: incomplete.description || 'Code implementation is incomplete',
      category: 'INCOMPLETE_CODE',
      priority_score: priorityScore,
      priority_factors: priorityFactors,
      file_path: fileAnalysis.path,
      line_number: incomplete.lineNumber || 0,
      code_snippet: this.extractCodeSnippet(fileAnalysis, incomplete.lineNumber),
      suggested_next_steps: 'Complete the implementation of this function or class',
      status: 'open',
      tags: ['incomplete', fileAnalysis.language, incomplete.type]
    };
  }

  /**
   * Create task from security issue
   * @param {Object} securityIssue - Security issue info
   * @param {Object} fileAnalysis - File analysis results
   * @param {Object} repository - Repository instance
   * @param {Object} weights - Priority weights
   * @returns {Object} Task data
   */
  createTaskFromSecurityIssue(securityIssue, fileAnalysis, repository, weights) {
    const priorityFactors = this.calculatePriorityFactors(
      'SECURITY',
      fileAnalysis,
      repository,
      weights,
      5 // High bonus for security issues
    );

    const priorityScore = this.calculatePriorityScore(priorityFactors, weights);

    // Generate better title for security issues
    const securityTitle = this.generateSecurityTitle(securityIssue);

    return {
      title: securityTitle,
      description: securityIssue.description,
      category: 'SECURITY',
      priority_score: priorityScore,
      priority_factors: priorityFactors,
      file_path: fileAnalysis.path,
      line_number: securityIssue.lineNumber || 0,
      code_snippet: this.extractCodeSnippet(fileAnalysis, securityIssue.lineNumber),
      suggested_next_steps: 'Review and fix this security vulnerability immediately',
      status: 'open',
      tags: ['security', 'critical', fileAnalysis.language]
    };
  }

  /**
   * Calculate priority factors for a task
   * @param {string} category - Task category
   * @param {Object} fileAnalysis - File analysis results
   * @param {Object} repository - Repository instance
   * @param {Object} weights - Priority weights
   * @param {number} bonus - Additional priority bonus
   * @returns {Object} Priority factors
   */
  calculatePriorityFactors(category, fileAnalysis, repository, weights, bonus = 0) {
    const criticalCategories = ['SECURITY', 'BUG', 'FIXME'];
    const criticalComments = criticalCategories.includes(category) ? 1 : 0;

    // Calculate days since last commit
    const daysSinceCommit = repository.last_commit_at
      ? Math.floor((Date.now() - new Date(repository.last_commit_at)) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      critical_comments: criticalComments + (bonus > 3 ? 1 : 0),
      days_since_commit: Math.min(daysSinceCommit / 30, 10), // Normalize to 0-10
      open_issues: Math.min(repository.open_issues / 10, 10), // Normalize to 0-10
      code_complexity: Math.min(fileAnalysis.complexity / 20, 10), // Normalize to 0-10
      security_vulnerability: category === 'SECURITY' ? 1 : 0,
      custom_priority: bonus
    };
  }

  /**
   * Calculate priority score from factors
   * @param {Object} factors - Priority factors
   * @param {Object} weights - Priority weights
   * @returns {number} Priority score
   */
  calculatePriorityScore(factors, weights) {
    const score = 
      (factors.critical_comments * weights.critical_comments) +
      (factors.days_since_commit * weights.days_since_commit) +
      (factors.open_issues * weights.open_issues) +
      (factors.code_complexity * weights.code_complexity) +
      (factors.security_vulnerability * weights.security_vulnerability) +
      (factors.custom_priority * (weights.custom_priority || 1));

    return Math.round(score * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Generate task title
   * @param {Object} task - Task from comment
   * @returns {string} Task title
   */
  generateTitle(task) {
    // Clean and process the description
    const cleanDescription = this.cleanDescription(task.description);
    
    // Generate context-aware title based on category and content
    const enhancedTitle = this.generateEnhancedTitle(task.category, cleanDescription);
    
    // If we generated a good enhanced title, use it; otherwise fall back to cleaned description
    if (enhancedTitle) {
      return enhancedTitle;
    }
    
    // Fallback: Use cleaned description with category prefix
    const truncated = cleanDescription.substring(0, 80);
    return `${task.category}: ${truncated}${cleanDescription.length > 80 ? '...' : ''}`;
  }

  /**
   * Clean description text
   * @param {string} description - Raw description
   * @returns {string} Cleaned description
   */
  cleanDescription(description) {
    if (!description) return 'Task needs attention';
    
    // Remove common noise patterns
    let cleaned = description
      .replace(/^\s*[-*#]+\s*/, '') // Remove leading markers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(TODO|FIXME|BUG|HACK|XXX|NOTE):\s*/i, '') // Remove redundant prefixes
      .replace(/^\s*:\s*/, '') // Remove leading colons
      .replace(/\s*[.!?]+\s*$/, '') // Remove trailing punctuation
      .trim();
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned || 'Task needs attention';
  }

  /**
   * Generate enhanced, context-aware title
   * @param {string} category - Task category
   * @param {string} description - Cleaned description
   * @returns {string|null} Enhanced title or null
   */
  generateEnhancedTitle(category, description) {
    const lowerDesc = description.toLowerCase();
    
    // Pattern matching for common task types
    const patterns = {
      // Implementation tasks
      implement: /(?:implement|add|create|build|develop)\s+(.+)/i,
      feature: /(?:feature|functionality):\s*(.+)/i,
      
      // Fix/Bug tasks
      fix: /(?:fix|repair|resolve|solve|correct)\s+(.+)/i,
      bug: /(?:bug|issue|problem|error):\s*(.+)/i,
      broken: /(?:broken|not working|doesn't work|fails?)\s*(.+)/i,
      
      // Update/Refactor tasks
      update: /(?:update|upgrade|migrate)\s+(.+)/i,
      refactor: /(?:refactor|restructure|reorganize|clean up?)\s+(.+)/i,
      optimize: /(?:optimize|improve|enhance|speed up)\s+(.+)/i,
      
      // Security tasks
      security: /(?:security|vulnerability|exploit|injection|xss|csrf)\s*(.+)/i,
      validate: /(?:validate|sanitize|escape)\s+(.+)/i,
      
      // Documentation tasks
      document: /(?:document|docs?|write docs?)\s+(?:for\s+)?(.+)/i,
      comment: /(?:add comments?|comment)\s+(?:to\s+)?(.+)/i,
      
      // Testing tasks
      test: /(?:test|write tests?|add tests?)\s+(?:for\s+)?(.+)/i,
      coverage: /(?:coverage|cover)\s+(.+)/i,
      
      // Configuration tasks
      config: /(?:configure|config|setup)\s+(.+)/i,
      env: /(?:environment|env|settings?)\s+(.+)/i,
      
      // API/Integration tasks
      api: /(?:api|endpoint|route)\s+(.+)/i,
      integrate: /(?:integrate|connect|link)\s+(.+)/i,
      
      // UI/UX tasks
      ui: /(?:ui|user interface|frontend)\s+(.+)/i,
      ux: /(?:ux|user experience|usability)\s+(.+)/i,
      style: /(?:style|css|styling|design)\s+(.+)/i,
      
      // Database tasks
      database: /(?:database|db|query|migration)\s+(.+)/i,
      schema: /(?:schema|model|table)\s+(.+)/i,
      
      // Performance tasks
      performance: /(?:performance|slow|latency|speed)\s+(.+)/i,
      memory: /(?:memory|leak|ram|heap)\s+(.+)/i,
      
      // Dependency tasks
      dependency: /(?:dependency|dependencies|package|library)\s+(.+)/i,
      upgrade: /(?:upgrade|update)\s+(.+)/i
    };

    // Check for action verbs and generate appropriate titles
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = description.match(pattern);
      if (match) {
        const detail = match[1] ? match[1].trim() : description;
        return this.formatTitle(category, type, detail);
      }
    }

    // Check for question patterns
    if (lowerDesc.includes('?') || lowerDesc.startsWith('why') || lowerDesc.startsWith('how') || lowerDesc.startsWith('what')) {
      return this.formatQuestionTitle(category, description);
    }

    // Check for specific keywords
    if (lowerDesc.includes('deprecated')) {
      return `Replace deprecated ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('unused') || lowerDesc.includes('dead code')) {
      return `Remove unused ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('duplicate')) {
      return `Consolidate duplicate ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('missing')) {
      return `Add missing ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('incomplete')) {
      return `Complete ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('temporary') || lowerDesc.includes('temp')) {
      return `Replace temporary ${this.extractSubject(description)}`;
    }
    if (lowerDesc.includes('hack') || lowerDesc.includes('workaround')) {
      return `Improve workaround for ${this.extractSubject(description)}`;
    }

    return null;
  }

  /**
   * Format title based on type and detail
   * @param {string} category - Task category
   * @param {string} type - Detected type
   * @param {string} detail - Task detail
   * @returns {string} Formatted title
   */
  formatTitle(category, type, detail) {
    const titleTemplates = {
      implement: `Implement ${detail}`,
      feature: `Add feature: ${detail}`,
      fix: `Fix ${detail}`,
      bug: `Fix bug: ${detail}`,
      broken: `Repair broken ${detail}`,
      update: `Update ${detail}`,
      refactor: `Refactor ${detail}`,
      optimize: `Optimize ${detail}`,
      security: `Fix security issue: ${detail}`,
      validate: `Add validation for ${detail}`,
      document: `Document ${detail}`,
      comment: `Add comments to ${detail}`,
      test: `Add tests for ${detail}`,
      coverage: `Improve test coverage for ${detail}`,
      config: `Configure ${detail}`,
      env: `Setup environment for ${detail}`,
      api: `Implement API ${detail}`,
      integrate: `Integrate ${detail}`,
      ui: `Update UI: ${detail}`,
      ux: `Improve UX: ${detail}`,
      style: `Fix styling: ${detail}`,
      database: `Update database ${detail}`,
      schema: `Modify schema: ${detail}`,
      performance: `Improve performance: ${detail}`,
      memory: `Fix memory issue: ${detail}`,
      dependency: `Update dependency: ${detail}`,
      upgrade: `Upgrade ${detail}`
    };

    const template = titleTemplates[type];
    if (template) {
      // Ensure the detail doesn't make the title too long
      const maxDetailLength = 60;
      const truncatedDetail = detail.length > maxDetailLength 
        ? detail.substring(0, maxDetailLength) + '...'
        : detail;
      
      return template.replace(detail, truncatedDetail);
    }

    return `${category}: ${detail}`;
  }

  /**
   * Format question-based titles
   * @param {string} category - Task category
   * @param {string} description - Task description
   * @returns {string} Formatted question title
   */
  formatQuestionTitle(category, description) {
    const cleaned = description.replace(/\?+$/, '');
    
    if (cleaned.toLowerCase().startsWith('why')) {
      return `Investigate: ${cleaned}`;
    }
    if (cleaned.toLowerCase().startsWith('how')) {
      return `Research: ${cleaned}`;
    }
    if (cleaned.toLowerCase().startsWith('what')) {
      return `Clarify: ${cleaned}`;
    }
    if (cleaned.toLowerCase().startsWith('should')) {
      return `Decide: ${cleaned}`;
    }
    
    return `Answer: ${cleaned}`;
  }

  /**
   * Extract subject from description
   * @param {string} description - Task description
   * @returns {string} Extracted subject
   */
  extractSubject(description) {
    // Try to extract the main subject (noun phrase) from the description
    const words = description.split(/\s+/);
    
    // Look for common code-related nouns
    const codeNouns = ['function', 'method', 'class', 'variable', 'component', 'module', 
                       'file', 'code', 'logic', 'implementation', 'feature', 'api', 
                       'endpoint', 'route', 'model', 'controller', 'service'];
    
    for (const noun of codeNouns) {
      if (description.toLowerCase().includes(noun)) {
        // Try to get the noun with its descriptor
        const pattern = new RegExp(`(\\w+\\s+)?${noun}(\\s+\\w+)?`, 'i');
        const match = description.match(pattern);
        if (match) {
          return match[0].trim();
        }
      }
    }
    
    // Fallback: return first few words
    return words.slice(0, 3).join(' ');
  }

  /**
   * Generate title for incomplete code
   * @param {Object} incomplete - Incomplete code info
   * @returns {string} Generated title
   */
  generateIncompleteCodeTitle(incomplete) {
    const typeMap = {
      'EMPTY_FUNCTION': 'Implement empty function',
      'EMPTY_METHOD': 'Implement empty method',
      'EMPTY_CLASS': 'Implement empty class',
      'EMPTY_BLOCK': 'Complete empty code block',
      'PLACEHOLDER': 'Replace placeholder implementation',
      'STUB': 'Complete stub implementation',
      'NOT_IMPLEMENTED': 'Implement missing functionality',
      'THROW_NOT_IMPLEMENTED': 'Replace NotImplemented exception',
      'PASS_STATEMENT': 'Replace pass statement with implementation',
      'EMPTY_CATCH': 'Handle exception in empty catch block',
      'EMPTY_FINALLY': 'Add cleanup code to finally block',
      'EMPTY_CONSTRUCTOR': 'Initialize constructor',
      'EMPTY_DESTRUCTOR': 'Implement destructor cleanup',
      'PARTIAL_IMPLEMENTATION': 'Complete partial implementation',
      'MOCK_IMPLEMENTATION': 'Replace mock with real implementation'
    };

    const baseTitle = typeMap[incomplete.type] || `Complete ${incomplete.type.replace(/_/g, ' ').toLowerCase()}`;
    
    // If we have a name or identifier, add it to the title
    if (incomplete.name) {
      return `${baseTitle}: ${incomplete.name}`;
    }
    
    // If we have a description, try to extract something meaningful
    if (incomplete.description) {
      const subject = this.extractSubject(incomplete.description);
      if (subject && subject !== incomplete.description) {
        return `${baseTitle} for ${subject}`;
      }
    }
    
    return baseTitle;
  }

  /**
   * Generate title for security issues
   * @param {Object} securityIssue - Security issue info
   * @returns {string} Generated title
   */
  generateSecurityTitle(securityIssue) {
    const securityTypeMap = {
      'SQL_INJECTION': 'Fix SQL injection vulnerability',
      'XSS': 'Fix XSS (Cross-Site Scripting) vulnerability',
      'CSRF': 'Add CSRF protection',
      'INSECURE_RANDOM': 'Replace insecure random number generation',
      'HARDCODED_SECRET': 'Remove hardcoded secret/credential',
      'HARDCODED_PASSWORD': 'Remove hardcoded password',
      'WEAK_CRYPTO': 'Replace weak cryptographic algorithm',
      'NO_ENCRYPTION': 'Add encryption for sensitive data',
      'PATH_TRAVERSAL': 'Fix path traversal vulnerability',
      'COMMAND_INJECTION': 'Fix command injection vulnerability',
      'LDAP_INJECTION': 'Fix LDAP injection vulnerability',
      'XXE': 'Fix XML External Entity (XXE) vulnerability',
      'INSECURE_DESERIALIZATION': 'Fix insecure deserialization',
      'MISSING_AUTHENTICATION': 'Add authentication check',
      'MISSING_AUTHORIZATION': 'Add authorization check',
      'WEAK_PASSWORD_REQUIREMENTS': 'Strengthen password requirements',
      'INSECURE_COOKIE': 'Secure cookie configuration',
      'MISSING_HTTPS': 'Enforce HTTPS/TLS',
      'EXPOSED_SENSITIVE_DATA': 'Protect exposed sensitive data',
      'UNSAFE_EVAL': 'Remove unsafe eval() usage',
      'UNSAFE_REGEX': 'Fix ReDoS vulnerable regex',
      'RACE_CONDITION': 'Fix race condition vulnerability',
      'BUFFER_OVERFLOW': 'Fix buffer overflow risk',
      'INTEGER_OVERFLOW': 'Fix integer overflow vulnerability',
      'UNVALIDATED_INPUT': 'Add input validation',
      'UNSANITIZED_OUTPUT': 'Sanitize output data',
      'SENSITIVE_DATA_IN_URL': 'Remove sensitive data from URL',
      'SENSITIVE_DATA_IN_LOGS': 'Remove sensitive data from logs',
      'MISSING_RATE_LIMITING': 'Add rate limiting',
      'INSECURE_FILE_UPLOAD': 'Secure file upload handling',
      'DIRECTORY_LISTING': 'Disable directory listing',
      'INFORMATION_DISCLOSURE': 'Prevent information disclosure',
      'MISSING_SECURITY_HEADERS': 'Add security headers',
      'OUTDATED_DEPENDENCY': 'Update vulnerable dependency'
    };

    const baseTitle = securityTypeMap[securityIssue.type] || 
                     `Fix ${securityIssue.type.replace(/_/g, ' ').toLowerCase()}`;
    
    // Add context if available
    if (securityIssue.location) {
      return `${baseTitle} in ${securityIssue.location}`;
    }
    
    if (securityIssue.affectedComponent) {
      return `${baseTitle}: ${securityIssue.affectedComponent}`;
    }
    
    if (securityIssue.description) {
      const subject = this.extractSubject(securityIssue.description);
      if (subject && subject.length < 30) {
        return `${baseTitle} - ${subject}`;
      }
    }
    
    return baseTitle;
  }

  /**
   * Extract code snippet around line number
   * @param {Object} fileAnalysis - File analysis results
   * @param {number} lineNumber - Line number
   * @returns {string} Code snippet
   */
  extractCodeSnippet(fileAnalysis, lineNumber) {
    // This would ideally fetch the actual code
    // For now, return a placeholder
    return `Line ${lineNumber} in ${fileAnalysis.path}`;
  }

  /**
   * Generate suggested next steps
   * @param {string} category - Task category
   * @param {string} description - Task description
   * @returns {string} Suggested steps
   */
  generateSuggestedSteps(category, description) {
    const suggestions = {
      'TODO': 'Review the TODO comment and implement the required functionality',
      'FIXME': 'Investigate the issue described and apply the necessary fix',
      'BUG': 'Debug and resolve the reported bug',
      'SECURITY': 'Address the security vulnerability immediately',
      'OPTIMIZE': 'Profile the code and implement performance improvements',
      'REVIEW': 'Conduct a code review of the flagged section',
      'REFACTOR': 'Refactor the code to improve maintainability',
      'DOCUMENTATION': 'Add or update documentation for this code section'
    };

    return suggestions[category] || 'Review and address the flagged code';
  }

  /**
   * Deduplicate tasks
   * @param {Array} tasks - List of tasks
   * @returns {Array} Deduplicated tasks
   */
  deduplicateTasks(tasks) {
    const seen = new Map();

    for (const task of tasks) {
      const key = `${task.file_path}:${task.line_number}:${task.category}`;
      
      if (!seen.has(key)) {
        seen.set(key, task);
      } else {
        // If duplicate, keep the one with higher priority
        const existing = seen.get(key);
        if (task.priority_score > existing.priority_score) {
          seen.set(key, task);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get default priority weights
   * @returns {Object} Default weights
   */
  getDefaultWeights() {
    return {
      critical_comments: 3,
      days_since_commit: 2,
      open_issues: 2,
      code_complexity: 1.5,
      security_vulnerability: 5,
      custom_priority: 1
    };
  }
}

module.exports = TaskGenerator;
