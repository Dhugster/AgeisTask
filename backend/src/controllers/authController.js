const { User, UserSettings } = require('../models');
const logger = require('../utils/logger');

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
    
    // Detect if running in Tauri mode (FRONTEND_URL is http://localhost:3001)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isTauri = frontendUrl === 'http://localhost:3001';
    
    if (isTauri) {
      // For Tauri opened in external browser: show a simple page and attempt to close
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>Login Successful</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 2rem; }
            .ok { color: #16a34a; font-weight: 600; }
          </style>
        </head>
        <body>
          <p class="ok">✓ Login successful.</p>
          <p>You can now return to the RepoResume app. This window can be closed.</p>
          <script>
            try { window.close(); } catch (e) {}
          </script>
        </body>
        </html>
      `);
    }
    
    // For web browser, use standard redirect
    res.redirect(`${frontendUrl}/dashboard?login=success`);
  } catch (error) {
    logger.error('GitHub callback error:', error);
    
    // Detect if running in Tauri mode
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isTauri = frontendUrl === 'http://localhost:3001';
    
    if (isTauri) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>Login Failed</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 2rem; }
            .err { color: #dc2626; font-weight: 600; }
          </style>
        </head>
        <body>
          <p class="err">✗ Login failed.</p>
          <p>Please return to the RepoResume app and try again. This window can be closed.</p>
          <script>
            try { window.close(); } catch (e) {}
          </script>
        </body>
        </html>
      `);
    }
    
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
