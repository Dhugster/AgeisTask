const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate GitHub OAuth authentication
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: GitHub OAuth callback
 *     responses:
 *       302:
 *         description: Redirect to frontend with auth status
 */
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/failure' }),
  authController.githubCallback
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', isAuthenticated, authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/failure:
 *   get:
 *     tags: [Authentication]
 *     summary: Authentication failure endpoint
 *     responses:
 *       401:
 *         description: Authentication failed
 */
router.get('/failure', authController.authFailure);

/**
 * Test endpoint to verify OAuth configuration
 */
router.get('/test', (req, res) => {
  const passport = require('passport');
  const strategies = Object.keys(passport._strategies || {});
  
  res.json({
    message: 'Auth routes are working',
    githubStrategyRegistered: strategies.includes('github'),
    availableStrategies: strategies,
    clientIdConfigured: !!process.env.GITHUB_CLIENT_ID,
    clientSecretConfigured: !!process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback'
  });
});

module.exports = router;
