# Contributing to RepoResume

Thank you for your interest in contributing to RepoResume! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Submit a pull request

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Use cases and examples
- Any potential drawbacks or considerations

### Code Contributions

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/RepoResume.git
   cd RepoResume
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Make Your Changes**
   - Write clear, readable code
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

5. **Test Your Changes**
   ```bash
   # Backend tests
   cd backend && npm test
   
   # Frontend tests
   cd frontend && npm test
   ```

6. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature" # Use conventional commits
   ```

7. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request**

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- GitHub account (for OAuth testing)
- SQLite

### Environment Variables

Copy `.env.example` to `.env` in the backend directory and configure:

```env
# Required
SESSION_SECRET=your-secret-key-min-32-chars
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **For Desktop Development**
   ```bash
   cd desktop
   npm run tauri dev
   ```

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the README.md with details of changes if applicable
3. Add tests for new features
4. Ensure all tests pass
5. Update documentation as needed
6. Request review from maintainers
7. Address any feedback
8. Once approved, your PR will be merged

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Handle errors appropriately
- Use async/await for asynchronous operations

### React

- Use functional components with hooks
- Keep components small and focused
- Use PropTypes or TypeScript for type checking
- Follow React best practices

### Git Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add GitHub repository sync
fix: resolve authentication cookie issue
docs: update installation instructions
```

## Testing

### Backend Testing

```bash
cd backend
npm test          # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```

### Frontend Testing

```bash
cd frontend
npm test          # Run all tests
npm run test:watch # Watch mode
```

### End-to-End Testing

```bash
npm run test:e2e
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation for endpoint changes
- Include inline comments for complex logic
- Update CHANGELOG.md for releases

## Community

- Join our [Discord server](https://discord.gg/reporesume) (if applicable)
- Follow us on [Twitter](https://twitter.com/reporesume) (if applicable)
- Check out our [blog](https://blog.reporesume.com) (if applicable)

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to RepoResume! 🚀
