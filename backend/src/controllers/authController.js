const { User, UserSettings } = require('../models');
const logger = require('../utils/logger');
const { createAuthToken } = require('../utils/authToken');

/**
 * GitHub OAuth callback handler
 */
const githubCallback = async (req, res) => {
  try {
    // User is authenticated via Passport
    const user = req.user;
    
    // Update last login
    await user.update({ last_login_at: new Date() });
    
    // Ensure user has settings
    let settings = await UserSettings.findOne({ where: { user_id: user.id } });
    if (!settings) {
      settings = await UserSettings.create({ user_id: user.id });
    }
    
    logger.info(`User ${user.username} logged in successfully`);
    
    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shouldEmbedToken = /tauri\.localhost|tauri:\/\//i.test(frontendUrl);
    const redirectUrl = new URL(`${frontendUrl}/dashboard`);
    redirectUrl.searchParams.set('login', 'success');

    if (shouldEmbedToken) {
      const sessionToken = createAuthToken(user);
      redirectUrl.searchParams.set('sessionToken', sessionToken);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('GitHub callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?login=error`);
  }
};

/**
 * Logout user
 */
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        message: err.message
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', err);
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
};

/**
 * Get current authenticated user
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'avatar_url', 'profile_data', 'created_at'],
      include: [{
        model: UserSettings,
        as: 'settings'
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user data'
    });
  }
};

/**
 * Authentication failure handler
 */
const authFailure = (req, res) => {
  res.status(401).json({
    error: 'Authentication Failed',
    message: 'GitHub authentication failed'
  });
};

module.exports = {
  githubCallback,
  logout,
  getCurrentUser,
  authFailure
};
