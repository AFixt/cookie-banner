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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/test/mocks/styleMock.js'
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