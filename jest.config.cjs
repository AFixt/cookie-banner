/**
 * Jest configuration file
 */

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  // Structured accessibility reporting (#56): violations captured by
  // @afixt/a11y-assert during the run are written to reports/a11y in
  // human- (html, md) and machine-readable (json) formats.
  reporters: [
    'default',
    [
      '@afixt/a11y-assert-reporter/jest',
      {
        outputDir: 'reports/a11y',
        formats: ['html', 'json', 'markdown'],
        reportTitle: 'Cookie Banner Accessibility Report',
      },
    ],
  ],
  testMatch: ['**/test/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/test/.*e2e.*\\.js$',
    '<rootDir>/test/visual-regression.test.js',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/test/mocks/styleMock.js',
  },
  // @afixt/a11y-assert (and its dependency uuid) ship native ESM; let
  // babel-jest transform them so the CJS test environment can load them.
  transformIgnorePatterns: ['/node_modules/(?!(@afixt|uuid)/)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/js/**/*.js', '!**/node_modules/**', '!**/dist/**', '!**/coverage/**'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 20,
      lines: 14,
      statements: 14,
    },
  },
};
