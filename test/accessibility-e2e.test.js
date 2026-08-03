/**
 * Browser-level accessibility scans of the built banner (@afixt/a11y-assert).
 *
 * Layers 3 and 4 of the defense-in-depth strategy in docs/adr/0001: the Jest
 * suite scans a banner jsdom built from src/, and this suite scans the banner
 * a real browser rendered from dist/ over HTTP. A build that mangles markup,
 * drops an attribute, or ships a stale bundle fails here and nowhere else.
 *
 * Requires `npm run build` — the pages under dist/examples are the ones the
 * README points users at, and the only place ./consent.js and ./banner.css
 * resolve. Jest skips this file via testPathIgnorePatterns; Playwright picks
 * it up via the accessibility-*.test.js match in playwright.config.js.
 */

import { expect, test } from '@playwright/test';

import { a11yViolations } from './helpers/a11y-e2e.js';

const BASE_URL = 'http://localhost:8080/dist/examples';

/**
 * Rules that cannot be satisfied or evaluated in this context.
 *
 * KEYBOARD-01 (visible focus indication): the adapter scans a serialized copy
 * of the page body reparsed in jsdom, so no stylesheet and no computed
 * pseudo-class styles are available — the same limitation the Jest suite has.
 * banner.css ships :focus outlines for every control, the Playwright visual
 * suite renders them in a real browser, and test/accessibility.test.js
 * asserts the focus behaviour itself.
 *
 * NAVIGATION-08 (WCAG 2.4.5 Multiple Ways): requires more than one way to
 * locate a page "within a set of Web pages". Each example is a standalone
 * demo, not a member of a site, so a search facility or sitemap would be
 * meaningless here. It is a page-set criterion, not a banner defect.
 */
const OUT_OF_SCOPE_RULES = ['KEYBOARD-01', 'NAVIGATION-08'];

/**
 * STRUCTURE-22 (all major content inside a landmark) flags the modal's
 * `<h2 id="modal-title">` while the dialog is open, because `role="dialog"`
 * is not a landmark role. That heading is the dialog's accessible name via
 * `aria-labelledby`, and `aria-modal="true"` scopes assistive technology to
 * the dialog, so page-level landmark navigation is not the workflow in play.
 * Wrapping it in a landmark would be wrong, so the rule is dropped for this
 * one state only — it still gates every other scan in this file.
 */
const MODAL_OPEN_RULES = [...OUT_OF_SCOPE_RULES, 'STRUCTURE-22'];

test.beforeEach(async ({ page }) => {
  // A stored consent decision suppresses the banner, leaving nothing to scan.
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test.describe('Built cookie banner accessibility', () => {
  test('banner passes automated checks on first visit', async ({ page }) => {
    await page.goto(`${BASE_URL}/vanilla-js.html`);
    await page.waitForSelector('#cookie-banner', { state: 'visible' });

    expect(await a11yViolations(page, { ignoreRules: OUT_OF_SCOPE_RULES })).toEqual([]);
  });

  test('preferences modal passes automated checks when open', async ({ page }) => {
    await page.goto(`${BASE_URL}/vanilla-js.html`);
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.click('#customize-preferences');
    await page.waitForSelector('#cookie-modal', { state: 'visible' });

    expect(await a11yViolations(page, { ignoreRules: MODAL_OPEN_RULES })).toEqual([]);
  });

  test('page passes automated checks after consent is given', async ({ page }) => {
    await page.goto(`${BASE_URL}/vanilla-js.html`);
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.click('#accept-all');
    // hideBanner() removes the element rather than hiding it.
    await page.waitForSelector('#cookie-banner', { state: 'detached' });

    expect(await a11yViolations(page, { ignoreRules: OUT_OF_SCOPE_RULES })).toEqual([]);
  });
});

test.describe('Built example pages accessibility', () => {
  // Every banner-bearing example ships in the package and is what users copy,
  // so each one is scanned. None of them is covered by the jsdom suite.
  const EXAMPLES = [
    'complete-example.html',
    'custom-categories.html',
    'high-contrast.html',
    'rtl-support.html',
  ];

  for (const example of EXAMPLES) {
    test(`${example} passes automated checks`, async ({ page }) => {
      await page.goto(`${BASE_URL}/${example}`);
      await page.waitForSelector('#cookie-banner', { state: 'visible' });

      expect(await a11yViolations(page, { ignoreRules: OUT_OF_SCOPE_RULES })).toEqual([]);
    });
  }
});
