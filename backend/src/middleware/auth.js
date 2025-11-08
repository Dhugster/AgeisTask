const logger = require('../utils/logger');

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Reduce noise: /api/auth/me is polled frequently; log at debug level
  const isAuthStatusPath = req.originalUrl?.includes('/api/auth/me') || req.path === '/auth/me';
  const logPayload = { path: req.path, method: req.method, ip: req.ip };
  if (isAuthStatusPath) {
    logger.debug('Unauthorized auth status check', logPayload);
  } else {
    logger.warn('Unauthorized access attempt', logPayload);
  }
  
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'You must be logged in to access this resource'
  });
};

/**
 * Middleware to attach user to request (optional auth)
 */
const optionalAuth = (req, res, next) => {
  // User will be attached if authenticated, but won't block if not
  next();
};

module.exports = {
  isAuthenticated,
  optionalAuth
};
