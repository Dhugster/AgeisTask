const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

if (!SECRET) {
  throw new Error(
    'JWT_SECRET or SESSION_SECRET environment variable is required for token authentication.'
  );
}

const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || '7d';
const ISSUER = process.env.JWT_ISSUER || 'repo-resume';

const createAuthToken = (user) => {
  const payload = {
    sub: user.id,
    username: user.username,
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: TOKEN_EXPIRATION,
    issuer: ISSUER,
  });
};

const verifyAuthToken = (token) => {
  return jwt.verify(token, SECRET, {
    issuer: ISSUER,
  });
};

module.exports = {
  createAuthToken,
  verifyAuthToken,
};
