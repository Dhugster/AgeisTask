# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub OAuth authentication system
- Repository analysis and health scoring
- Task generation based on code analysis
- Desktop application using Tauri
- Export functionality (JSON, CSV, Markdown)
- User settings and preferences
- Real-time repository synchronization
- Comprehensive documentation

### Fixed
- Duplicate `isProduction` declaration in backend
- Cross-origin cookie handling for authentication
- Session management for OAuth flow
- CORS configuration for multiple frontends

### Security
- Implemented secure session management
- Added rate limiting for API endpoints
- Enhanced CORS policy configuration
- Secure cookie settings with httpOnly and sameSite

## [1.0.0] - 2024-11-08

### Added
- Initial release of RepoResume
- Core features:
  - GitHub repository integration
  - Code quality analysis
  - Task tracking and management
  - User authentication via GitHub OAuth
  - Dashboard with repository overview
  - Settings page for user preferences
  - Export capabilities for tasks and reports

### Technical Stack
- Backend: Node.js, Express, Sequelize, SQLite
- Frontend: React, Vite, TailwindCSS, Tanstack Query
- Desktop: Tauri, Rust
- Authentication: Passport.js with GitHub OAuth 2.0

### Documentation
- Complete setup guides
- User documentation
- API documentation with Swagger
- Desktop build instructions
- OAuth configuration guides

## [0.1.0] - 2024-10-01

### Added
- Initial project setup
- Basic repository structure
- Development environment configuration

---

## Version Guidelines

### Version Numbering
- MAJOR version: Incompatible API changes
- MINOR version: Backwards-compatible functionality additions
- PATCH version: Backwards-compatible bug fixes

### Release Process
1. Update version in package.json files
2. Update CHANGELOG.md
3. Create git tag: `git tag -a v1.0.0 -m "Release version 1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub release with changelog notes
