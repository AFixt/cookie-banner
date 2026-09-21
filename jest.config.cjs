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
    '^puppeteer$': '<rootDir>/test/mocks/puppeteerMock.js',
  },
  // @afixt/a11y-assert (and its dependency uuid) ship native ESM; let
  // babel-jest transform them so the CJS test environment can load them.
  transformIgnorePatterns: ['/node_modules/(?!(@afixt|uuid)/)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/js/**/*.js', '!**/node_modules/**', '!**/dist/**', '!**/coverage/**'],
  coverageThreshold: {
    // Floors at the coverage measured when #128 was fixed, so the gate fails on
    // any regression. The old values (14/14/20/25) sat 60+ points below what the
    // suite actually covers and could not catch anything. Raise these as
    // coverage grows; never lower them to make a change pass.
    global: {
      branches: 74,
      functions: 87,
      lines: 86,
      statements: 85,
    },
  },
};
