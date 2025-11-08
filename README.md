# RepoResume 🚀

**Intelligent GitHub Repository Analyzer** - Automatically analyze your GitHub repositories and generate personalized to-dos and assignments to help you resume work on projects you've stepped away from.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

### Core Capabilities
- **🔐 GitHub Integration**: Seamless OAuth authentication for public and private repositories
- **🧠 Intelligent Analysis**: Advanced code analysis with AST parsing for JavaScript, Python, and TypeScript
- **📊 Priority Scoring**: Smart prioritization based on multiple factors (urgency, complexity, security)
- **📝 Context-Aware Tasks**: Detailed task descriptions with file locations, last activity, and suggested next steps
- **📈 Health Metrics**: Repository health tracking (code coverage, technical debt, dependency freshness)
- **🔄 Real-time Sync**: Configurable intervals for automatic repository updates
- **📤 Export & Integration**: Export to JSON, CSV, Markdown, and integrate with Trello, Jira, Asana

### User Interface
- **📱 Responsive Dashboard**: Beautiful card-based layout with color-coded health indicators
- **🎯 Task Management**: Kanban board and list views with advanced filtering
- **🔍 Code Viewer**: Inline syntax-highlighted code viewer
- **🎨 Theme Support**: Light and dark mode
- **⚡ Real-time Updates**: Live repository status updates

## 🚀 Quick Start

### 🖥️ Desktop App (Easiest - Runs in System Tray!)

**Want a lightweight exe that runs in the corner? (~50MB RAM, ~8MB file)**

```bash
# 1. Install Rust (one-time): https://rustup.rs/
# 2. Build desktop app
npm run build:desktop:windows  # Creates repo-resume.exe

# 3. Run it - minimizes to system tray!
# Find exe in: desktop/src-tauri/target/release/
```

✅ **Single executable file**  
✅ **Runs in system tray with low resources**  
✅ **Auto-starts with Windows (optional)**  
✅ **Background monitoring and notifications**

📖 See **DESKTOP_QUICKSTART.md** for full instructions

---

### 🌐 Web App (Full-Featured)

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL 15+ (or use SQLite for development)
- Redis (optional, for background jobs)
- GitHub account

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd AgeisTask

# Copy environment variables
cp .env.example .env

# Edit .env and add your GitHub OAuth credentials
# Get them from: https://github.com/settings/developers

# Start all services
npm run docker:build
npm run docker:up

# Application will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Option 2: Manual Installation

```bash
# 1. Install dependencies
npm run install:all

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Set up database
cd backend
npm run db:migrate

# 4. Start development servers
cd ..
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## 📋 GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: RepoResume (or your choice)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
4. Copy the **Client ID** and **Client Secret**
5. Add them to your `.env` file

## 🏗️ Architecture

```
repo-resume/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models (Sequelize)
│   │   ├── services/       # Business logic
│   │   │   ├── github/     # GitHub API integration
│   │   │   ├── analysis/   # Code analysis engine
│   │   │   └── tasks/      # Task generation
│   │   ├── utils/          # Utility functions
│   │   ├── middleware/     # Express middleware
│   │   ├── jobs/           # Background jobs
│   │   └── routes/         # API routes
│   ├── tests/              # Test files
│   └── Dockerfile
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React Context
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS/Tailwind styles
│   ├── public/             # Static assets
│   └── Dockerfile
└── docker-compose.yml      # Docker orchestration
```

## 🔧 Configuration

### Priority Score Calculation

The intelligent priority score uses the following formula:

```
Priority Score = 
  (Critical Comments × 3) +
  (Days Since Last Commit × 2) +
  (Open Issues Count × 2) +
  (Code Complexity × 1.5) +
  (Security Vulnerabilities × 5) +
  (User Custom Priority)
```

Customize weights in the Settings panel of the application.

### Sync Intervals

Configure automatic repository scanning intervals:
- Minimum: 15 minutes
- Default: 60 minutes
- Maximum: 24 hours

## 📚 API Documentation

Once the backend is running, access the interactive API documentation:
- Swagger UI: `http://localhost:3001/api-docs`

### Key Endpoints

```
POST   /api/auth/github              # Initiate GitHub OAuth
GET    /api/auth/github/callback     # OAuth callback
GET    /api/repositories              # List all repositories
POST   /api/repositories/sync        # Sync repositories
GET    /api/repositories/:id/tasks   # Get tasks for repository
PUT    /api/tasks/:id                # Update task
POST   /api/tasks/:id/complete       # Mark task complete
GET    /api/export/tasks             # Export tasks (JSON/CSV/MD)
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Run with coverage
npm run test:coverage
```

Current test coverage: 80%+

## 📊 Project Health Metrics

The application tracks:
- **Code Coverage**: Percentage of code covered by tests
- **Technical Debt Ratio**: Ratio of TODOs/FIXMEs to total code
- **Dependency Freshness**: How up-to-date your dependencies are
- **Documentation Completeness**: Presence of README, comments, docs
- **Test Reliability Score**: Test pass rate and stability

## 🔒 Security

- GitHub tokens stored encrypted in database
- Rate limiting on all API endpoints
- HTTPS enforced in production
- CSRF protection enabled
- Input validation and sanitization
- Regular dependency updates
- Secure session management

## 🎯 Supported Languages

Currently supports code analysis for:
- ✅ JavaScript/TypeScript
- ✅ Python
- ✅ Java
- 🔄 More coming soon!

## 📤 Export & Integration

### Export Formats
- JSON: Complete task data with metadata
- CSV: Spreadsheet-compatible format
- Markdown: Human-readable task lists

### Integrations
- **Trello**: Create cards from tasks
- **Jira**: Create issues from tasks
- **Asana**: Add tasks to projects
- **Slack**: Notifications for critical issues
- **Discord**: Team notifications

## 🚢 Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_32_chars
FRONTEND_URL=https://yourdomain.com
```

### Deploy to Cloud

#### Heroku
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

#### DigitalOcean/AWS/Azure
Use the provided `docker-compose.yml` for easy deployment.

## 🛠️ Development

### Project Structure
- `backend/`: Node.js/Express API
- `frontend/`: React/Vite SPA
- Database: PostgreSQL (SQLite for dev)
- Cache/Queue: Redis (optional)

### Tech Stack
- **Backend**: Node.js, Express, Sequelize, Bull
- **Frontend**: React, Vite, Tailwind CSS, React Query
- **Database**: PostgreSQL
- **Authentication**: Passport.js (GitHub OAuth)
- **Code Analysis**: Babel Parser, AST analysis
- **Testing**: Jest, React Testing Library, Supertest

## 📖 User Guide

### Getting Started
1. **Login**: Authenticate with GitHub
2. **Add Repositories**: Select repositories to monitor
3. **Configure**: Set sync intervals and priority weights
4. **View Dashboard**: See all repositories and their health
5. **Manage Tasks**: View, filter, and complete tasks
6. **Export**: Export tasks to your preferred format

### Task Categories
- 🔴 **Critical**: Security issues, broken builds
- 🟡 **High**: TODOs, failing tests, outdated deps
- 🟢 **Medium**: Code improvements, refactoring
- ⚪ **Low**: Documentation, minor enhancements

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Ensure PostgreSQL is running
sudo service postgresql start
# Or use SQLite by changing DATABASE_URL in .env
```

**GitHub OAuth not working**
- Verify callback URL matches your OAuth app settings
- Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are correct

**Port already in use**
```bash
# Change PORT in .env file or kill existing process
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

## 📞 Support

For issues and questions:
- 📧 Email: support@ageis.ai
- 🐛 Issues: GitHub Issues
- 💬 Discord: [Community Server]

## 🎉 Acknowledgments

Built with ❤️ for developers who manage multiple projects.

---

**Made with** ☕ **and** 💻
