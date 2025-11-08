const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const logger = require('../../utils/logger');

/**
 * Code analyzer for detecting tasks and code patterns
 */
class CodeAnalyzer {
  constructor() {
    // Default keywords for task detection
    this.defaultKeywords = {
      TODO: ['TODO', 'todo', '@todo', 'TODO:'],
      FIXME: ['FIXME', 'fixme', '@fixme', 'FIXME:'],
      BUG: ['BUG', 'bug', '@bug', 'BUG:'],
      HACK: ['HACK', 'hack', '@hack', 'HACK:'],
      XXX: ['XXX', 'xxx', '@xxx', 'XXX:'],
      NOTE: ['NOTE', 'note', '@note', 'NOTE:'],
      OPTIMIZE: ['OPTIMIZE', 'optimize', '@optimize', 'OPTIMIZE:'],
      REVIEW: ['REVIEW', 'review', '@review', 'REVIEW:'],
      SECURITY: ['SECURITY', 'security', '@security', 'SECURITY:', 'FIXME-SECURITY']
    };
  }

  /**
   * Analyze code file for tasks and patterns
   * @param {string} code - Source code content
   * @param {string} filePath - File path
   * @param {Object} customKeywords - Custom keywords from user settings
   * @returns {Object} Analysis results
   */
  analyzeCode(code, filePath, customKeywords = null) {
    const keywords = customKeywords || this.defaultKeywords;
    const language = this.detectLanguage(filePath);

    const results = {
      language,
      comments: [],
      incompleteCode: [],
      complexity: 0,
      hasTests: false,
      hasDocumentation: false,
      securityIssues: []
    };

    try {
      // Extract comments based on language
      results.comments = this.extractComments(code, language);

      // Find task markers in comments
      results.comments.forEach(comment => {
        const tasks = this.findTaskMarkers(comment, keywords);
        comment.tasks = tasks;
      });

      // Analyze code patterns (for JS/TS)
      if (['javascript', 'typescript'].includes(language)) {
        const codePatterns = this.analyzeJavaScript(code);
        results.complexity = codePatterns.complexity;
        results.incompleteCode = codePatterns.incompleteCode;
        results.hasTests = codePatterns.hasTests;
        results.securityIssues = codePatterns.securityIssues;
      } else if (language === 'python') {
        const codePatterns = this.analyzePython(code);
        results.complexity = codePatterns.complexity;
        results.incompleteCode = codePatterns.incompleteCode;
        results.hasTests = codePatterns.hasTests;
      }

      // Check for documentation
      results.hasDocumentation = this.hasDocumentation(code, language);

    } catch (error) {
      logger.error(`Error analyzing code in ${filePath}:`, error);
    }

    return results;
  }

  /**
   * Detect programming language from file path
   * @param {string} filePath - File path
   * @returns {string} Language name
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return languageMap[ext] || 'unknown';
  }

  /**
   * Extract comments from code
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Array} List of comments with line numbers
   */
  extractComments(code, language) {
    const comments = [];
    const lines = code.split('\n');

    // Comment patterns for different languages
    const singleLinePattern = /\/\/|#/;
    const multiLineStartPattern = /\/\*|\"\"\"|'''/;
    const multiLineEndPattern = /\*\/|\"\"\"|'''/;

    let inMultiLineComment = false;
    let multiLineComment = '';
    let multiLineStart = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Handle multi-line comments
      if (!inMultiLineComment && multiLineStartPattern.test(trimmedLine)) {
        inMultiLineComment = true;
        multiLineStart = lineNum;
        multiLineComment = trimmedLine;
      } else if (inMultiLineComment) {
        multiLineComment += '\n' + trimmedLine;
        if (multiLineEndPattern.test(trimmedLine)) {
          comments.push({
            text: multiLineComment,
            lineNumber: multiLineStart,
            type: 'multi-line'
          });
          inMultiLineComment = false;
          multiLineComment = '';
        }
      }
      // Handle single-line comments
      else if (singleLinePattern.test(trimmedLine)) {
        const commentMatch = trimmedLine.match(/(?:\/\/|#)\s*(.+)/);
        if (commentMatch) {
          comments.push({
            text: commentMatch[1],
            lineNumber: lineNum,
            type: 'single-line'
          });
        }
      }
    });

    return comments;
  }

  /**
   * Find task markers in comment text
   * @param {Object} comment - Comment object
   * @param {Object} keywords - Keywords to search for
   * @returns {Array} List of found tasks
   */
  findTaskMarkers(comment, keywords) {
    const tasks = [];
    const commentText = comment.text;

    // Single pass through keywords - break early when marker found to avoid duplicates
    for (const [category, markers] of Object.entries(keywords)) {
      // Find first matching marker for this category
      for (const marker of markers) {
        if (commentText.includes(marker)) {
          // Extract the actual task description
          const markerIndex = commentText.indexOf(marker);
          const description = commentText.substring(markerIndex + marker.length).trim();
          
          tasks.push({
            category,
            marker,
            description: description || commentText,
            lineNumber: comment.lineNumber
          });
          // Break to avoid adding same category multiple times
          break;
        }
      }
    }

    return tasks;
  }

  /**
   * Analyze JavaScript/TypeScript code
   * @param {string} code - Source code
   * @returns {Object} Analysis results
   */
  analyzeJavaScript(code) {
    const results = {
      complexity: 0,
      incompleteCode: [],
      hasTests: false,
      securityIssues: []
    };

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      let functionCount = 0;
      let conditionals = 0;
      let loops = 0;

      traverse(ast, {
        FunctionDeclaration(path) {
          functionCount++;
        },
        ArrowFunctionExpression(path) {
          functionCount++;
        },
        IfStatement(path) {
          conditionals++;
        },
        SwitchStatement(path) {
          conditionals++;
        },
        ForStatement(path) {
          loops++;
        },
        WhileStatement(path) {
          loops++;
        },
        // Detect incomplete code patterns
        ThrowStatement(path) {
          const argument = path.node.argument;
          if (argument && argument.type === 'NewExpression') {
            const message = argument.arguments[0];
            if (message && message.value) {
              const errorMsg = message.value.toLowerCase();
              if (errorMsg.includes('not implemented') || 
                  errorMsg.includes('todo') ||
                  errorMsg.includes('unimplemented')) {
                results.incompleteCode.push({
                  type: 'unimplemented',
                  lineNumber: path.node.loc?.start.line || 0,
                  description: message.value
                });
              }
            }
          }
        },
        // Detect test files
        CallExpression(path) {
          const callee = path.node.callee;
          if (callee.name && ['describe', 'it', 'test', 'expect'].includes(callee.name)) {
            results.hasTests = true;
          }
          
          // Detect security issues
          if (callee.name === 'eval') {
            results.securityIssues.push({
              type: 'eval_usage',
              lineNumber: path.node.loc?.start.line || 0,
              description: 'Use of eval() is a security risk'
            });
          }
        },
        // Detect console.log (code smell)
        MemberExpression(path) {
          if (path.node.object.name === 'console' && 
              path.node.property.name === 'log') {
            // This could be tracked as a code smell
          }
        }
      });

      // Calculate cyclomatic complexity
      results.complexity = 1 + conditionals + loops;

    } catch (error) {
      // If parsing fails, it might indicate syntax errors (incomplete code)
      logger.debug('JavaScript parsing error:', error.message);
      results.incompleteCode.push({
        type: 'syntax_error',
        description: 'Possible syntax error or incomplete code'
      });
    }

    return results;
  }

  /**
   * Analyze Python code
   * @param {string} code - Source code
   * @returns {Object} Analysis results
   */
  analyzePython(code) {
    const results = {
      complexity: 0,
      incompleteCode: [],
      hasTests: false
    };

    // Simple pattern-based analysis for Python
    const lines = code.split('\n');
    
    let complexity = 1;
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Count control structures for complexity
      if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) complexity++;
      if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) complexity++;
      if (trimmed.startsWith('except ') || trimmed.startsWith('except:')) complexity++;
      
      // Detect test functions
      if (trimmed.includes('def test_') || trimmed.includes('import unittest') || 
          trimmed.includes('import pytest')) {
        results.hasTests = true;
      }
      
      // Detect incomplete code
      if (trimmed === 'pass' && index > 0) {
        const prevLine = lines[index - 1].trim();
        if (prevLine.endsWith(':')) {
          results.incompleteCode.push({
            type: 'empty_implementation',
            lineNumber: index + 1,
            description: 'Empty function or class with only pass statement'
          });
        }
      }
      
      if (trimmed.includes('raise NotImplementedError')) {
        results.incompleteCode.push({
          type: 'not_implemented',
          lineNumber: index + 1,
          description: 'NotImplementedError raised'
        });
      }
    });

    results.complexity = complexity;
    return results;
  }

  /**
   * Check if code has documentation
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {boolean} Has documentation
   */
  hasDocumentation(code, language) {
    const lowerCode = code.toLowerCase();
    
    // Check for common documentation patterns
    if (code.includes('/**') || code.includes('///')) return true;
    if (lowerCode.includes('readme') || lowerCode.includes('@param') || 
        lowerCode.includes('@returns') || lowerCode.includes('@description')) return true;
    if (code.includes('"""') && language === 'python') return true;
    
    return false;
  }
}

module.exports = CodeAnalyzer;
