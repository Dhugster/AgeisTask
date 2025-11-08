const logger = require('../utils/logger');

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if ((req.isAuthenticated && req.isAuthenticated()) || req.user) {
    return next();
  }
  
  logger.warn('Unauthorized access attempt', { 
    path: req.path, 
    method: req.method,
    ip: req.ip 
  });
  
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
