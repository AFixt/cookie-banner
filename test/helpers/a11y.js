/**
 * Bridge between @afixt/a11y-assert and @afixt/a11y-assert-reporter for Jest.
 *
 * The Jest integration of a11y-assert returns rule results instead of
 * throwing, while the reporter discovers violations by parsing failure
 * messages that start with "Accessibility violations found:". This helper
 * runs the checks and, when violations exist, fails the test with exactly
 * that parseable format so they land in reports/a11y (see jest.config.cjs).
 */

const { jestAdapter } = require('@afixt/a11y-assert/integrations/jest');

/**
 * Run automated accessibility checks against an element and fail the test
 * with a reporter-parseable error when violations are found.
 * @param {Function} getElement - Returns the element (or document) to scan
 * @param {Object} [options] - Options forwarded to a11y-assert, plus
 *   `ignoreRules`: rule ids to drop from the results. Use only for rules
 *   jsdom cannot evaluate (say why at the call site) — every ignore here is
 *   a rule the Playwright browser runs must cover instead.
 * @returns {Promise<void>}
 */
async function expectAccessible(getElement, options = {}) {
  const { ignoreRules = [], ...adapterOptions } = options;
  const results =
    (await jestAdapter(getElement, [], { returnResults: true, ...adapterOptions })) || [];
  const violations = results.filter(violation => !ignoreRules.includes(violation.ruleId));
  if (violations.length > 0) {
    throw new Error(`Accessibility violations found: ${JSON.stringify(violations, null, 2)}`);
  }
}

module.exports = { expectAccessible };
