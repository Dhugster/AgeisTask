require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const logger = require('./utils/logger');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerSetup = require('./config/swagger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.github.com", "http://localhost:3001"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // May break some features
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));

// CORS configuration - restrict to known origins
const defaultAllowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:3000',
  'https://localhost:3000',
  'tauri://localhost', // Tauri v1 (custom scheme)
  'http://tauri.localhost', // Tauri v2 dev in loose mode
  'https://tauri.localhost', // Tauri v2 secure mode
];

const parsedAdditionalOrigins = (process.env.CORS_ADDITIONAL_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (origin) => {
  if (typeof origin !== 'string') {
    throw new TypeError('Origin must be a string');
  }

  return origin.replace(/\/+$/, '').toLowerCase();
};

const allowedOriginSet = new Set();

for (const origin of [...defaultAllowedOrigins, ...parsedAdditionalOrigins].filter(Boolean)) {
  try {
    allowedOriginSet.add(normalizeOrigin(origin));
  } catch (error) {
    logger.warn(`Skipping invalid configured CORS origin "${origin}": ${error.message}`);
  }
}

const isNullLikeOrigin = (origin) => origin === 'null';

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return false;
  }

  if (isNullLikeOrigin(origin)) {
    return !isProduction;
  }

  try {
    return allowedOriginSet.has(normalizeOrigin(origin));
  } catch (error) {
    logger.warn(`Failed to normalize request origin "${origin}": ${error.message}`);
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS: Blocked origin ${origin}`);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400 // 24 hours
}));

// Compression
app.use(compression());

// Body parsing middleware - reduced limits to prevent DoS
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Reduced from 10mb
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// Session configuration
// CRITICAL: Session secret must be set via environment variable
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable is required. ' +
    'Set a strong random secret (minimum 32 characters) in your .env file.'
  );
}

if (SESSION_SECRET.length < 32) {
  throw new Error(
    'SESSION_SECRET must be at least 32 characters long for security. ' +
    'Current length: ' + SESSION_SECRET.length
  );
}

// isProduction already declared at line 21, reusing it
const forceHttps = process.env.FORCE_HTTPS === 'true';
const useSecureCookies = isProduction || forceHttps;
const configuredSameSite = (process.env.SESSION_COOKIE_SAMESITE || '').toLowerCase();
const validSameSiteValues = new Set(['lax', 'strict', 'none']);

// For development with cross-origin requests (frontend on 5173, backend on 3001),
// we need SameSite=none with secure cookies, or SameSite=lax without
let sameSiteMode = validSameSiteValues.has(configuredSameSite)
  ? configuredSameSite
  : 'lax'; // Changed default to 'lax' for better cross-origin support

if (sameSiteMode === 'none' && !useSecureCookies) {
  logger.warn(
    'SESSION_COOKIE_SAMESITE=none requires secure cookies; falling back to SameSite=lax for development.'
  );
  sameSiteMode = 'lax';
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'repo-resume.sid', // Don't use default 'connect.sid'
  cookie: {
    secure: useSecureCookies,
    httpOnly: true,
    sameSite: sameSiteMode, // Balance CSRF protection with cross-site auth flows
    maxAge: 8 * 60 * 60 * 1000, // 8 hours (reduced from 24)
    // Remove domain restriction for localhost development
    // This allows the cookie to work across different ports on localhost
    domain: process.env.COOKIE_DOMAIN || undefined,
    // Ensure cookie path is set to root
    path: '/'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Rate limiting - stricter limits
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reduced from 100
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very strict for auth
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// Swagger documentation
swaggerSetup(app);

// Health check endpoint - minimal information disclosure
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
    // Removed: uptime, environment (information disclosure)
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Database sync and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models (in development only, use migrations in production)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully');
  await sequelize.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
