const express = require('express');
const router = express.Router();
const repositoryController = require('../controllers/repositoryController');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Use optional auth - routes will check if auth is needed
router.use(optionalAuth);

/**
 * @swagger
 * /api/repositories:
 *   get:
 *     tags: [Repositories]
 *     summary: Get all repositories for authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of repositories
 */
router.get('/', asyncHandler(repositoryController.getRepositories));

/**
 * @swagger
 * /api/repositories/sync:
 *   post:
 *     tags: [Repositories]
 *     summary: Sync repositories from GitHub
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Repositories synced successfully
 */
router.post('/sync', asyncHandler(repositoryController.syncRepositories));

/**
 * @swagger
 * /api/repositories/{id}:
 *   get:
 *     tags: [Repositories]
 *     summary: Get repository by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repository details
 *       404:
 *         description: Repository not found
 */
router.get('/:id', asyncHandler(repositoryController.getRepository));

/**
 * @swagger
 * /api/repositories/{id}/analyze:
 *   post:
 *     tags: [Repositories]
 *     summary: Analyze repository
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Analysis started
 */
router.post('/:id/analyze', asyncHandler(repositoryController.analyzeRepository));

/**
 * @swagger
 * /api/repositories/{id}/tasks:
 *   get:
 *     tags: [Repositories]
 *     summary: Get tasks for repository
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/:id/tasks', asyncHandler(repositoryController.getRepositoryTasks));

/**
 * @swagger
 * /api/repositories/{id}:
 *   put:
 *     tags: [Repositories]
 *     summary: Update repository settings
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repository updated
 */
router.put('/:id', asyncHandler(repositoryController.updateRepository));

/**
 * @swagger
 * /api/repositories/{id}:
 *   delete:
 *     tags: [Repositories]
 *     summary: Delete repository from tracking
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Repository deleted
 */
router.delete('/:id', asyncHandler(repositoryController.deleteRepository));

module.exports = router;
