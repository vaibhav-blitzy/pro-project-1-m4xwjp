# Contributing to Task Management System

Thank you for your interest in contributing to our Task Management System! This document provides comprehensive guidelines for contributing to the project effectively and securely.

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)
- [Performance Guidelines](#performance-guidelines)

## Development Environment Setup

### Prerequisites
- Node.js 20.x or higher
- npm 9.x or higher
- Git 2.x or higher

### Required VS Code Extensions
- ESLint
- Prettier
- TypeScript
- GitLens
- Jest
- Docker

### Installation Steps
1. Clone the repository:
```bash
git clone https://github.com/your-org/task-management-system.git
cd task-management-system
```

2. Install dependencies for both frontend and backend:
```bash
# Backend
cd src/backend
npm ci

# Frontend
cd ../web
npm ci
```

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled
- Null checks enforced
- Explicit return types required
- No implicit any types

### ESLint Rules
Backend rules follow `src/backend/.eslintrc.ts`:
- Strict TypeScript checks
- Security-focused linting
- Import order enforcement
- No console logs (except warn/error)

Frontend rules follow `src/web/.eslintrc.ts`:
- React-specific best practices
- Accessibility requirements
- Component naming conventions
- Import organization

### Formatting
Using Prettier v2.8.8 with the following configuration:
- Single quotes
- No semi-colons
- 2 space indentation
- 80 character line limit

## Git Workflow

### Branch Naming Convention
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical fixes for production
- `release/*` - Release preparation
- `security/*` - Security-related changes

### Commit Message Format
Following Conventional Commits specification:
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

### Pull Request Process
1. Create branch from `develop`
2. Implement changes
3. Ensure all tests pass
4. Update documentation
5. Submit PR using template at `.github/PULL_REQUEST_TEMPLATE.md`
6. Obtain two approvals
7. Squash and merge

## Testing Requirements

### Coverage Requirements
Minimum thresholds:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Test Types
1. Unit Tests
   - Jest for both frontend and backend
   - Test individual components/functions
   - Mock external dependencies

2. Integration Tests
   - API endpoint testing
   - Database interactions
   - Service communications

3. E2E Tests
   - Cypress for frontend flows
   - Complete user journeys
   - Cross-browser testing

### Performance Testing
Targets:
- Page Load: < 3s
- API Response: < 500ms
- Lighthouse Scores:
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

## Security Guidelines

### Code Security
- No secrets in code
- Input validation
- Output encoding
- Secure dependencies
- Regular security updates

### Security Scanning
Automated checks:
- Dependency scanning
- SAST analysis
- Container scanning
- Secret detection

### Authentication & Authorization
- JWT token validation
- Role-based access control
- Session management
- Rate limiting

## Performance Guidelines

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle size monitoring
- Performance budgets

### Backend Optimization
- Query optimization
- Caching strategy
- Connection pooling
- Resource monitoring

## Questions or Need Help?

Please reach out to the development team through:
- GitHub Issues
- Development Slack channel
- Technical documentation

## License

By contributing, you agree that your contributions will be licensed under the project's license.