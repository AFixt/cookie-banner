/**
 * Stub for `puppeteer` inside the Jest project.
 *
 * `@afixt/a11y-assert` reaches `@afixt/afixt-engine`, which does a CommonJS
 * `require('puppeteer')`. Since afixt-engine 4.0.0 that resolves to puppeteer
 * 25, which is `"type": "module"`. Node itself copes -- `require(esm)` works
 * from Node 22 -- but Jest's CJS runtime does not implement it, so loading the
 * a11y matchers in test/setup.js took down 18 of 19 suites with
 * `SyntaxError: Unexpected token 'export'`.
 *
 * Stubbing rather than transforming, because nothing this Jest project runs
 * needs a browser: all 19 files are jsdom or node unit tests, and the suites
 * that do drive a real browser (`*e2e*`, visual-regression) are excluded by
 * testPathIgnorePatterns and run under Playwright, which brings its own.
 *
 * The accessibility assertions still execute for real against jsdom -- verified
 * by mutation: injecting an `<img>` with no alt, an unlabelled `<input>` and an
 * empty `<button>` into the banner fails
 * `rendered banner passes automated accessibility checks` with
 * "Accessibility violations found". The stub removes a dependency the checks
 * never used; it does not weaken them.
 *
 * `launch` and `connect` throw instead of returning a dummy, so a future test
 * that genuinely needs a browser fails loudly here rather than silently
 * exercising a stub.
 */

'use strict';

const needsRealBrowser = name => () => {
  throw new Error(
    `puppeteer.${name}() was called inside the Jest project, which stubs puppeteer ` +
      '(test/mocks/puppeteerMock.js). Nothing here should need a real browser -- ' +
      'move this test to the Playwright suite, or drop the stub and solve the ' +
      'ESM-under-Jest problem properly.'
  );
};

module.exports = {
  // The only binding afixt-engine destructures at require time. An empty object
  // keeps the import valid; no test reads from it.
  KnownDevices: {},
  launch: needsRealBrowser('launch'),
  connect: needsRealBrowser('connect'),
};
