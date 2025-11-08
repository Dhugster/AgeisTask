# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of RepoResume seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:
- Open a public GitHub issue for security vulnerabilities
- Post about it publicly on social media

### Please DO:
- Email us at: security@repo.ageis.ai 
- Include the following information:
  - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
  - Full paths of source file(s) related to the issue
  - Location of affected source code (tag/branch/commit or direct URL)
  - Step-by-step instructions to reproduce the issue
  - Proof-of-concept or exploit code (if possible)
  - Impact of the issue

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: Within 72 hours, we'll provide an initial assessment
- **Updates**: We'll keep you informed about our progress
- **Resolution**: We aim to resolve critical issues within 7 days
- **Credit**: We'll credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Environment Variables
- **Never commit `.env` files** to version control
- Use strong, unique values for `SESSION_SECRET` (minimum 32 characters)
- Rotate secrets regularly
- Use different secrets for different environments

### GitHub OAuth
- Keep your Client ID and Client Secret secure
- Use the correct callback URLs for your environment
- Regularly review and audit OAuth app permissions
- Revoke access for unused OAuth apps

### Database
- Use strong passwords for database access
- Keep database software updated
- Regular backups
- Encrypt sensitive data at rest

### Dependencies
- Regularly update dependencies: `npm audit fix`
- Review dependency licenses and security advisories
- Use `npm audit` to check for vulnerabilities

### Production Deployment
- Always use HTTPS in production
- Set `NODE_ENV=production`
- Enable security headers (helmet.js is configured)
- Implement rate limiting (already configured)
- Use secure session cookies
- Keep the application and all dependencies updated

## Security Features

RepoResume includes several security features:

### Authentication & Authorization
- GitHub OAuth 2.0 for authentication
- Session-based authentication with secure cookies
- CSRF protection

### Input Validation
- Input sanitization and validation
- SQL injection prevention via Sequelize ORM
- XSS protection headers

### Rate Limiting
- API rate limiting to prevent abuse
- Stricter limits on authentication endpoints

### Security Headers
- Helmet.js for security headers
- Content Security Policy (CSP)
- X-Frame-Options to prevent clickjacking
- X-Content-Type-Options to prevent MIME sniffing
- Strict-Transport-Security for HTTPS

### Data Protection
- Passwords are never stored (OAuth only)
- Session secrets are required and validated
- Secure cookie configuration

## Security Checklist for Contributors

Before submitting a PR, ensure:

- [ ] No secrets or credentials in code
- [ ] Input validation for all user inputs
- [ ] Proper error handling (no stack traces to users)
- [ ] SQL queries use parameterized statements
- [ ] Authentication checks on protected routes
- [ ] Rate limiting on resource-intensive endpoints
- [ ] Security headers are maintained
- [ ] Dependencies are up to date
- [ ] Code has been tested for common vulnerabilities

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0.0   | 2024-11-08 | Initial security implementation |

---

**Last Updated**: November 2024
**Contact**: security@reporesume.com
