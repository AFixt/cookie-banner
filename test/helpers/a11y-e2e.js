/**
 * Bridge between @afixt/a11y-assert's Playwright adapter and the E2E suite.
 *
 * This is the browser-level counterpart to test/helpers/a11y.js. The Jest
 * helper scans a banner that jsdom constructed from src/; this one scans the
 * banner as a real browser rendered it from the built bundle in dist/, which
 * is the only layer that can catch a regression introduced by the build
 * itself.
 *
 * The adapter throws an AccessibilityError carrying every violation rather
 * than returning them, and it offers no rule allowlist, so filtering happens
 * here — same contract as the Jest helper.
 */

import { playwrightAdapter } from '@afixt/a11y-assert/integrations/playwright';

/**
 * Pull the violation list off whatever the adapter threw.
 *
 * @param {Error} error - Error raised by the adapter.
 * @returns {Array<object>|null} Violations, or null if this was not an
 *   accessibility failure and should propagate untouched.
 */
function violationsFrom(error) {
  if (Array.isArray(error?.violations)) {
    return error.violations;
  }
  if (Array.isArray(error?.cause?.violations)) {
    return error.cause.violations;
  }
  return null;
}

/**
 * Run automated accessibility checks against the current page state and
 * return the violations that survive filtering.
 *
 * Returns rather than throws so call sites assert with Playwright's `expect`,
 * which reports the offending rule ids in the failure diff.
 *
 * @param {import('@playwright/test').Page} page - Page to scan.
 * @param {object} [options] - Options forwarded to a11y-assert, plus
 *   `ignoreRules`: rule ids to drop from the results. Use only for rules the
 *   adapter's serialized-DOM scan cannot evaluate, and say why at the call
 *   site.
 * @returns {Promise<string[]>} Rule ids of the remaining violations, empty
 *   when the page is clean.
 */
export async function a11yViolations(page, options = {}) {
  const { ignoreRules = [], ...adapterOptions } = options;

  try {
    await playwrightAdapter(page, [], adapterOptions);
  } catch (error) {
    const violations = violationsFrom(error);
    if (violations === null) {
      throw error;
    }
    return violations
      .filter(violation => !ignoreRules.includes(violation.ruleId))
      .map(violation => violation.ruleId);
  }

  return [];
}
