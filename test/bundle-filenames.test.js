/**
 * Guards against reintroducing an ad-blockable bundle filename.
 *
 * Anti-annoyance filter lists (EasyList Cookie List, Fanboy's Annoyance List)
 * match these substrings in request paths in order to suppress cookie consent
 * UI. A bundle named `cookie-banner.min.js` can therefore be cancelled by the
 * browser before it executes, so no banner renders and no consent is recorded —
 * a silent failure invisible to CI and to any clean browser profile.
 *
 * See https://github.com/AFixt/cookie-banner/issues/66.
 *
 * Note: the npm package name (`@afixt/accessible-cookie-banner`) deliberately
 * still contains `cookie-banner`. That name only reaches the network for CDN
 * consumers, which this project does not document, and it carries real
 * discoverability value. These assertions are about asset paths only — do not
 * "fix" the package name to satisfy them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const rollupConfig = fs.readFileSync(path.join(ROOT, 'rollup.config.js'), 'utf8');

/** Substrings matched by anti-annoyance filter lists. */
const BLOCKED_TOKENS = [
  'cookie-banner',
  'cookiebanner',
  'cookie_banner',
  'cookie-consent',
  'cookie-notice',
];

/**
 * Asserts that a path contains none of the blocked substrings.
 *
 * @param {string} assetPath - Path to check.
 */
function expectNotBlockable(assetPath) {
  BLOCKED_TOKENS.forEach(token => {
    expect(assetPath.toLowerCase()).not.toContain(token);
  });
}

describe('published bundle filenames', () => {
  it('exposes a main entry point that ad blockers will not match', () => {
    expectNotBlockable(pkg.main);
  });

  it('exposes a module entry point that ad blockers will not match', () => {
    expectNotBlockable(pkg.module);
  });

  it('points size-limit at the non-blockable bundles', () => {
    expect(pkg['size-limit'].length).toBeGreaterThan(0);
    pkg['size-limit'].forEach(entry => expectNotBlockable(entry.path));
  });

  it('builds the primary bundles under neutral names', () => {
    ['consent.js', 'consent.min.js', 'consent.esm.js'].forEach(name => {
      expect(rollupConfig).toContain(`${name}\``);
    });
  });
});

describe('deprecated filename aliases', () => {
  it('still emits the legacy names so existing integrations keep working', () => {
    ['cookie-banner.js', 'cookie-banner.min.js', 'cookie-banner.esm.js'].forEach(name => {
      expect(rollupConfig).toContain(`'${name}'`);
    });
  });

  it('copies the aliases after the bundles are written to disk', () => {
    expect(rollupConfig).toMatch(/hook:\s*'writeBundle'/);
  });
});

// Only meaningful after `npm run build`; dist/ is gitignored and absent on a
// clean clone, so these are skipped rather than failing for the wrong reason.
const distDir = path.join(ROOT, 'dist');
const hasBuild = fs.existsSync(path.join(distDir, 'consent.js'));

(hasBuild ? describe : describe.skip)('built output', () => {
  it.each([
    ['consent.js', 'cookie-banner.js'],
    ['consent.min.js', 'cookie-banner.min.js'],
    ['consent.esm.js', 'cookie-banner.esm.js'],
  ])('%s and its %s alias are byte-identical', (current, legacy) => {
    const a = fs.readFileSync(path.join(distDir, current));
    const b = fs.readFileSync(path.join(distDir, legacy));
    expect(a.equals(b)).toBe(true);
  });

  it('resolves the declared main entry point', () => {
    expect(fs.existsSync(path.join(ROOT, pkg.main))).toBe(true);
  });

  it('resolves the declared module entry point', () => {
    expect(fs.existsSync(path.join(ROOT, pkg.module))).toBe(true);
  });
});
