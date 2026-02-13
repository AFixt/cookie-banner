/**
 * Jest configuration file
 */

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: ['**/test/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/test/.*e2e.*\\.js$',
    '<rootDir>/test/accessibility-regression.test.js',
    '<rootDir>/test/visual-regression.test.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!@afixt/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/test/mocks/styleMock.js',
    '^@afixt/a11y-assert/keyboard$': '<rootDir>/node_modules/@afixt/a11y-assert/dist/helpers/keyboardUtils.js'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 20,
      lines: 14,
      statements: 14
    }
  }
};