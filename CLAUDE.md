# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

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

## Accessibility Requirements

- Keyboard navigation: Support Tab, Enter, Escape keys
- Screen readers: Use proper ARIA roles, labels, and live regions
- Focus management: Trap focus in modals, return focus when closed
- No auto-dismissal of important components
- Support internationalization and RTL layouts