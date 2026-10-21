/**
 * Guards the `allowScripts` block in package.json against drift.
 *
 * Under npm 12 a dependency's install scripts do not run unless the package is
 * named in `allowScripts`. The failure mode is silent: `npm ci` warns and
 * **exits 0**, the artifact the script would fetch or build is never produced,
 * and nothing fails until something needs it. See #144.
 *
 * That makes the block exactly the kind of config that rots unnoticed, so it
 * gets the same treatment as the audit allowlist (`audit-allowlist.test.js`)
 * and the Node version pins (`node-version-consistency.test.js`): a test that
 * fails at the point someone changes a dependency, rather than a defect
 * discovered on a clean machine weeks later.
 *
 * The contract, which follows npm's own `install-scripts` tooling:
 *
 * - every package the lockfile marks `hasInstallScript` carries a decision;
 * - a grant (`true`) is **pinned** to an exact version, so bumping the package
 *   forces the supply-chain decision to be remade instead of inherited — and
 *   it must name every version the tree resolves, or npm skips the script for
 *   the ones it misses while still exiting 0;
 * - a denial (`false`) is **name-only**, so it survives a bump and any later
 *   `install-scripts approve --all`. A pinned denial goes stale on the next
 *   bump and quietly stops denying;
 * - no entry names a package the tree no longer has.
 *
 * Grant versions must be exact. npm's matcher drops ranges (`^`, `~`, `>=`)
 * and dist-tags with a warning, so `puppeteer@^25.5.0` grants nothing while
 * looking like it grants everything. Exact versions may be joined by `||`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Three numeric parts, then at most one prerelease/build suffix consumed in a
// single pass. Written without nested quantifiers so it cannot backtrack
// exponentially (sonarjs/slow-regex).
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]*)?$/;

/**
 * Split an allowScripts key into its package name and its version spec.
 * Handles scoped names, whose leading `@` is not a version separator.
 *
 * @param {string} key an allowScripts key, e.g. `puppeteer@25.5.0` or `fsevents`
 * @returns {{name: string, spec: string|null}} the name, and the raw spec or null
 */
const splitKey = key => {
  const at = key.lastIndexOf('@');
  if (at <= 0) {
    return { name: key, spec: null };
  }
  return { name: key.slice(0, at), spec: key.slice(at + 1) };
};

/**
 * Every package the lockfile marks `hasInstallScript`, mapped to the set of
 * versions the tree resolves for it. A package can appear more than once at
 * different versions (a nested copy), and each one needs covering.
 *
 * @param {object} lock a parsed package-lock.json
 * @returns {Map<string, Set<string>>} package name to resolved versions
 */
const installScriptPackages = lock => {
  const found = new Map();
  Object.entries(lock.packages || {}).forEach(([location, meta]) => {
    if (!meta.hasInstallScript) {
      return;
    }
    const name = meta.name || location.split('node_modules/').pop();
    if (!found.has(name)) {
      found.set(name, new Set());
    }
    found.get(name).add(meta.version);
  });
  return found;
};

/**
 * Check an allowScripts block against the packages a lockfile resolves.
 *
 * Pure, and exercised below against synthetic inputs as well as the real tree —
 * a guard whose only job is to fail later is worthless unless it is shown to
 * fail when the thing it guards is actually broken.
 *
 * @param {object} allowScripts the package.json allowScripts block
 * @param {Map<string, Set<string>>} resolved package name to resolved versions
 * @returns {{errors: string[]}} one message per violation, empty when clean
 */
const evaluate = (allowScripts, resolved) => {
  const errors = [];
  const decisions = new Map();

  Object.entries(allowScripts || {}).forEach(([key, value]) => {
    const { name, spec } = splitKey(key);
    if (!decisions.has(name)) {
      decisions.set(name, []);
    }
    decisions.get(name).push({ key, spec, value });
  });

  // Every install-script package carries a decision.
  [...resolved.keys()].sort().forEach(name => {
    if (!decisions.has(name)) {
      errors.push(
        `${name} runs install scripts but is not decided in allowScripts ` +
          `(resolved ${[...resolved.get(name)].sort().join(', ')})`
      );
    }
  });

  [...decisions.keys()].sort().forEach(name => {
    const entries = decisions.get(name);

    // No entry names a package the tree no longer has.
    if (!resolved.has(name)) {
      errors.push(
        `${name} is decided in allowScripts but no package in the lockfile ` +
          `runs install scripts under that name — stale entry, remove it`
      );
      return;
    }

    const versions = resolved.get(name);

    entries.forEach(({ key, spec, value }) => {
      if (value === true) {
        if (spec === null) {
          errors.push(
            `${key} grants install scripts without pinning a version; a grant ` +
              `must name the reviewed version so a bump forces a fresh decision`
          );
          return;
        }
        spec
          .split('||')
          .map(part => part.trim())
          .forEach(part => {
            if (!EXACT_VERSION.test(part)) {
              errors.push(
                `${key} pins "${part}", which is not an exact version; npm drops ` +
                  `ranges and dist-tags with a warning, so this grants nothing`
              );
            }
          });
        return;
      }

      if (value === false && spec !== null) {
        errors.push(
          `${key} pins a denial to a version; a denial must be name-only so it ` +
            `survives a bump and any later \`install-scripts approve --all\``
        );
      }
    });

    // A grant must cover every version the tree resolves.
    const granted = new Set(
      entries
        .filter(entry => entry.value === true && entry.spec !== null)
        .flatMap(entry => entry.spec.split('||').map(part => part.trim()))
    );
    if (granted.size > 0) {
      [...versions]
        .sort()
        .filter(version => !granted.has(version))
        .forEach(version => {
          errors.push(
            `${name}@${version} is resolved by the lockfile but not granted; ` +
              `npm skips its install script and still exits 0`
          );
        });
    }
  });

  return { errors };
};

describe('allowScripts contract', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const resolved = installScriptPackages(lock);

  it('declares an allowScripts block', () => {
    expect(pkg.allowScripts).toBeDefined();
  });

  it('the lockfile has install-script packages to decide', () => {
    // Guards the guard: if this ever hits zero the suite below passes
    // vacuously, which would hide the very drift it exists to catch.
    expect(resolved.size).toBeGreaterThan(0);
  });

  it('decides every install-script package, with the right key form', () => {
    expect(evaluate(pkg.allowScripts, resolved).errors).toEqual([]);
  });

  it('does not mirror allowScripts into the lockfile', () => {
    // npm does not track the block in package-lock.json, so a change to it
    // must not dirty the lockfile. Verified against npm 12.0.2.
    expect(lock.packages['']).not.toHaveProperty('allowScripts');
  });

  describe('the check itself fires', () => {
    const tree = new Map([
      ['puppeteer', new Set(['25.5.0'])],
      ['fsevents', new Set(['2.3.2', '2.3.3'])],
    ]);
    const clean = { 'puppeteer@25.5.0': true, fsevents: false };

    it('accepts a correct block', () => {
      expect(evaluate(clean, tree).errors).toEqual([]);
    });

    it('catches an undecided install-script package', () => {
      const { errors } = evaluate({ 'puppeteer@25.5.0': true }, tree);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^fsevents runs install scripts but is not decided/);
    });

    it('catches a grant that no longer names the resolved version', () => {
      const bumped = new Map([...tree, ['puppeteer', new Set(['25.6.0'])]]);
      const { errors } = evaluate(clean, bumped);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^puppeteer@25\.6\.0 is resolved by the lockfile but not granted/);
    });

    it('catches an unpinned grant', () => {
      const { errors } = evaluate({ puppeteer: true, fsevents: false }, tree);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/grants install scripts without pinning a version/);
    });

    it('catches a range or dist-tag masquerading as a pin', () => {
      ['^25.5.0', '~25.5.0', '>=25.0.0', 'latest'].forEach(spec => {
        const { errors } = evaluate({ [`puppeteer@${spec}`]: true, fsevents: false }, tree);
        expect(errors.some(e => /is not an exact version/.test(e))).toBe(true);
      });
    });

    it('accepts exact versions joined by ||', () => {
      const both = new Map([['puppeteer', new Set(['25.5.0', '25.6.0'])]]);
      expect(evaluate({ 'puppeteer@25.5.0 || 25.6.0': true }, both).errors).toEqual([]);
    });

    it('catches a pinned denial, which goes stale on the next bump', () => {
      const { errors } = evaluate({ 'puppeteer@25.5.0': true, 'fsevents@2.3.3': false }, tree);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^fsevents@2\.3\.3 pins a denial to a version/);
    });

    it('catches a stale entry for a package that has left the tree', () => {
      const { errors } = evaluate({ ...clean, 'tesseract.js': false }, tree);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^tesseract\.js is decided in allowScripts but no package/);
    });

    it('splits scoped names without mistaking the scope for a version', () => {
      expect(splitKey('@parcel/watcher')).toEqual({ name: '@parcel/watcher', spec: null });
      expect(splitKey('@parcel/watcher@2.6.0')).toEqual({
        name: '@parcel/watcher',
        spec: '2.6.0',
      });
      expect(splitKey('fsevents')).toEqual({ name: 'fsevents', spec: null });
    });
  });
});
