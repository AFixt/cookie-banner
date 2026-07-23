// Import testing-library extensions
require('@testing-library/jest-dom');

// Register @afixt/a11y-assert matchers (toBeAccessible, toHaveAriaAttributes,
// etc.) so accessibility assertions are available in every suite. Violations
// are picked up by @afixt/a11y-assert-reporter (see jest.config.cjs).
const { setupJestAccessibility } = require('@afixt/a11y-assert/integrations/jest');
setupJestAccessibility();

// Mock localStorage using jest functions for easier testing
const localStorageMock = {
  store: {},
  clear: jest.fn(function () {
    this.store = {};
  }),
  getItem: jest.fn(function (key) {
    return this.store[key] || null;
  }),
  setItem: jest.fn(function (key, value) {
    this.store[key] = String(value);
  }),
  removeItem: jest.fn(function (key) {
    delete this.store[key];
  }),
};

// Set up localStorage mock
global.localStorage = localStorageMock;

// Mock document.cookie with configurable property
Object.defineProperty(document, 'cookie', {
  writable: true,
  configurable: true,
  value: '',
});
