# Contributing to AI Job Automation Platform

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ai-job-automation.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make changes and test thoroughly
5. Commit with clear messages: `git commit -m 'Add feature: description'`
6. Push to your fork: `git push origin feature/your-feature`
7. Create Pull Request

## Development Guidelines

### Backend
- Use TypeScript for all new code
- Follow Express.js best practices
- Write comprehensive error handling
- Add unit tests for services
- Document API endpoints

### Frontend
- Use React functional components with hooks
- Follow consistent component structure
- Maintain responsive design
- Test on multiple screen sizes
- Use semantic HTML

### Git Workflow
- Create feature branches from `develop`
- Use descriptive commit messages
- Keep commits atomic and focused
- Rebase before submitting PR
- Ensure CI passes before merge

### Commit Message Format
```
[TYPE] Brief description

Optional detailed explanation of changes.

Fixes #issue-number (if applicable)
```

Types: feat, fix, docs, style, refactor, test, chore

## Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run build
```

## Code Style

### Backend
- Use ESLint and Prettier
- Follow 2-space indentation
- Use semicolons
- Use type annotations

### Frontend
- Follow Airbnb React style guide
- Use meaningful component names
- Keep components focused and reusable
- Comment complex logic

## Pull Request Process

1. Update README.md if needed
2. Ensure all tests pass
3. Update CHANGELOG.md
4. Request review from maintainers
5. Address feedback constructively
6. Rebase if conflicts occur

## Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- System information (OS, Node version, etc.)

## Feature Requests

When suggesting features, include:
- Use case and problem it solves
- Proposed implementation (if any)
- Potential impacts
- Alternative solutions

## Questions?

Create a discussion on GitHub or email the maintainers.

Thank you for contributing! 🎉
