/**
 * Guards the tree against GHSA-mrhx-c7xc-m3w5 (high): zod can exhaust memory
 * while validating oversized constrained collections. Everything below zod
 * 4.6.6 is affected and there is no fix in the 3.x line.
 *
 * zod arrives here only through the browser stack —
 * `@afixt/a11y-assert` -> `@afixt/afixt-engine` -> `puppeteer` ->
 * `puppeteer-core` -> `chromium-bidi`, which uses zod to parse WebDriver BiDi
 * protocol messages. `@afixt/afixt-engine` pins `puppeteer` to an exact
 * version, so no in-range update could move it: the `puppeteer` override in
 * package.json is what lifts the tree onto a `chromium-bidi` that depends on
 * zod 4 (`^4.6.5`) rather than zod 3.
 *
 * That makes the override load-bearing while looking redundant, which is the
 * dangerous combination. #123 already removed a batch of overrides that an
 * upgrade had made unnecessary; the same reasoning applied here silently
 * reintroduces a high advisory. `npm run security:check` would catch it, but
 * `check:all` — what `pre-push` runs — does not include `security:check`, so
 * nothing local would fail at the point of the change.
 *
 * So this pins the property rather than the mechanism: no resolved zod may be
 * below 4.6.6, however the tree gets there. If a later `@afixt/a11y-assert`
 * carries a fixed puppeteer on its own, the override can go and this test
 * keeps passing — it only objects to the advisory coming back.
 *
 * See https://github.com/AFixt/cookie-banner/issues/147.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// The first zod release outside GHSA-mrhx-c7xc-m3w5.
const FIRST_SAFE_ZOD = [4, 6, 6];

/**
 * The numeric release triple of a version, without any prerelease suffix.
 *
 * @param {string} version - A semver version, e.g. `4.6.7`.
 * @returns {number[]} Its major, minor and patch numbers.
 */
const releaseTriple = version =>
  version
    .split('-')[0]
    .split('.')
    .map(part => Number(part));

/**
 * Whether a version is below a floor. Written as a loop rather than nested
 * comparisons so it reads the same for each position. A prerelease of the floor
 * sorts below it, as in semver, so the advisory's `< 4.6.6` range includes it.
 *
 * @param {string} version - The version to judge.
 * @param {number[]} floor - The lowest acceptable release triple.
 * @returns {boolean} True when `version` is below `floor`.
 */
const isBelow = (version, floor) => {
  const parts = releaseTriple(version);
  for (let index = 0; index < floor.length; index += 1) {
    const part = parts[index] || 0;
    if (part !== floor[index]) {
      return part < floor[index];
    }
  }
  return version.includes('-');
};

/**
 * Every zod copy the lockfile resolves, as `location@version`.
 *
 * @param {object} lock - A parsed package-lock.json.
 * @returns {{location: string, version: string}[]} The resolved copies.
 */
const resolvedZod = lock =>
  Object.entries(lock.packages || {})
    .filter(([location]) => /(^|\/)zod$/.test(location))
    .map(([location, meta]) => ({ location, version: meta.version }));

describe('zod stays outside GHSA-mrhx-c7xc-m3w5', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const copies = resolvedZod(lock);

  it('resolves zod at all', () => {
    // Guards the guard: if the browser stack stops pulling zod, the check
    // below passes vacuously and wants re-pointing or deleting.
    expect(copies.length).toBeGreaterThan(0);
  });

  it('resolves no copy below 4.6.6', () => {
    const affected = copies
      .filter(copy => isBelow(copy.version, FIRST_SAFE_ZOD))
      .map(copy => `${copy.location} resolves zod ${copy.version}`);

    expect(affected).toEqual([]);
  });

  it('keeps the puppeteer override that moves chromium-bidi onto zod 4', () => {
    // The mechanism, recorded so removing it is a deliberate act. If a fixed
    // puppeteer ever arrives without the override, delete this one assertion
    // and leave the version floor above in place.
    expect(pkg.overrides).toHaveProperty('puppeteer');
  });

  describe('the version floor itself', () => {
    // A guard whose only job is to fail later is worthless unless it is shown
    // to fail when the thing it guards is actually broken.
    it.each([
      ['3.25.76', true],
      ['4.6.5', true],
      ['4.5.9', true],
      ['4.6.6', false],
      ['4.6.7', false],
      ['5.0.0', false],
    ])('puts %s below the floor: %s', (version, expected) => {
      expect(isBelow(version, FIRST_SAFE_ZOD)).toBe(expected);
    });

    it('puts a prerelease of the fixed version below the floor', () => {
      expect(isBelow('4.6.6-beta.1', FIRST_SAFE_ZOD)).toBe(true);
    });
  });
});
