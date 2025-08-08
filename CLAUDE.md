# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Flow Branching Strategy

This repository follows the Git Flow branching model. All development work must adhere to the following branching conventions:

### Branch Types
- **main**: Production-ready code only. Direct commits are not allowed.
- **develop**: Integration branch for features. All feature branches merge here first.
- **feature/***: New features (branch from develop, merge back to develop)
- **release/***: Release preparation (branch from develop, merge to main and develop)
- **hotfix/***: Emergency fixes (branch from main, merge to main and develop)

### Workflow Rules
1. Never commit directly to main or develop branches
2. Always create feature branches from develop
3. Use pull requests for all merges
4. Delete feature branches after merging
5. Tag releases on the main branch with semantic versioning

## Build/Lint/Test Commands

- Node.js version: LTS (use `nvm use` or Node.js 22+)
- Install dependencies: `npm install`
- Run tests: `npm test`
- Run single test: `npm test -- -t "test name pattern"`
- Run tests with coverage: `npm test -- --coverage`
- Run tests with watch mode: `npm test -- --watch`

## Code Style Guidelines

- HTML: Follow WCAG 2.2 AA standards, use semantic elements, include ARIA attributes
- CSS: Use variables for theming, maintain 4.5:1 contrast ratio
- JS: ES6 syntax, small pure functions, descriptive variable names
- Error handling: Use try/catch for async operations, emit events for errors
- File structure: Keep related files together, follow component-based organization

## Testing Guidelines

- Unit tests: Test individual functions and components in isolation
- Integration tests: Test interactions between components
- Accessibility tests: Verify WCAG 2.2 AA compliance
- Use Jest and Testing Library for DOM testing
- Mock browser APIs (localStorage, cookies) for consistent testing
- Test keyboard navigation and focus management
- Test error handling paths for robust code
- Aim for >90% test coverage in core utilities
- Focus on testing the most critical user flows first
- Verify that all required ARIA attributes are present

## Testing Requirements

- **All meaningful new work and changes MUST have tests** - No code should be committed without appropriate test coverage
- **No commits should be made if tests are failing** - All tests must pass before any code is committed to the repository
- Run the full test suite (`npm test`) before committing changes
- If tests fail, investigate and fix the root cause before proceeding
- New features require both unit tests and integration tests where applicable

## Accessibility Requirements

- Keyboard navigation: Support Tab, Enter, Escape keys
- Screen readers: Use proper ARIA roles, labels, and live regions
- Focus management: Trap focus in modals, return focus when closed
- No auto-dismissal of important components
- Support internationalization and RTL layouts