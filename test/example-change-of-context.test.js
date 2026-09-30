/**
 * Runs LANG-24 (WCAG 3.2.1 / 3.2.2: no change of context without user
 * request) over every example page, inside `npm test`.
 *
 * The browser scan in test/accessibility-e2e.test.js is the only other place
 * this rule runs, and Jest ignores that file (see jest.config.cjs). LANG-24
 * kept that scan red on vanilla-js.html for weeks behind a green `npm test`
 * (#135): the page's inline script paired a load-time `setTimeout` with the
 * Reset button's `location.reload()`, and the detector cannot tell that the
 * reload only runs on a click. The timer was never needed — consent.js is a
 * synchronous classic script — so it was removed.
 *
 * The detector is static (it reads markup and inline script text, and never
 * executes anything), so parsing each page into a document is enough to
 * reproduce what the browser scan reports for this rule.
 */

const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
// Loaded by path, like test/rule-severity-contract.test.js: the package's
// `exports` map does not expose dist/, and this is the copy a11y-assert runs.
const LANG_24 = require(
  path.join(__dirname, '..', 'node_modules/@afixt/afixt-tests/dist/LANG-24.js')
);

const PAGES = fs
  .readdirSync(EXAMPLES_DIR)
  .filter(name => name.endsWith('.html'))
  .sort();

describe('LANG-24 over the example pages', () => {
  it('finds the example pages to scan', () => {
    expect(PAGES).toEqual(expect.arrayContaining(['vanilla-js.html', 'complete-example.html']));
  });

  it.each(PAGES)('%s causes no change of context without user request', page => {
    const html = fs.readFileSync(path.join(EXAMPLES_DIR, page), 'utf8');
    // Parsed, not rendered: DOMParser never runs the page's scripts.
    const document = new DOMParser().parseFromString(html, 'text/html');

    const result = LANG_24.runAuto({ document });

    expect(result.errors).toEqual([]);
    expect(result.map(({ details }) => details)).toEqual([]);
    expect(result.status).not.toBe('fail');
  });
});
