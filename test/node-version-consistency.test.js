/**
 * Guards against Node version drift between local tooling and CI.
 *
 * `.nvmrc` previously contained `lts/*`, which silently re-resolves whenever
 * a new Node line goes LTS. Local machines then run a different npm major
 * than CI, producing package-lock.json structures `npm ci` rejects.
 * See https://github.com/AFixt/cookie-banner/issues/71.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// The engines field is the single source of truth for the supported major.
const engines = JSON.parse(read('package.json')).engines.node;
const major = engines.match(/(\d+)/)[1];

describe('Node version consistency', () => {
  it('derives a major version from package.json engines', () => {
    expect(major).toBeTruthy();
  });

  it('.nvmrc pins the same major as engines, not a floating alias', () => {
    expect(read('.nvmrc').trim()).toBe(major);
  });

  it('.node-version pins the same major as engines', () => {
    expect(read('.node-version').trim()).toBe(major);
  });

  it('every workflow node-version names the same major', () => {
    const workflowDir = path.join(ROOT, '.github', 'workflows');
    fs.readdirSync(workflowDir)
      .filter(f => /\.ya?ml$/.test(f))
      .forEach(file => {
        const yaml = fs.readFileSync(path.join(workflowDir, file), 'utf8');
        const versions = [
          ...yaml.matchAll(/node-version:[ \t]*(?:\[[ \t]*)?['"]?([^'"\]\s]+)/g),
        ].map(m => m[1]);
        versions.forEach(version => {
          // Accept forms like 22, 22.x, ${{ matrix.node-version }} (resolved
          // from a matrix that is itself checked by this loop).
          if (version.startsWith('$')) {
            return;
          }
          expect({ file, version: version.split('.')[0] }).toEqual({ file, version: major });
        });
      });
  });

  it('lockfile retains platform-specific optional rollup packages', () => {
    const lock = JSON.parse(read('package-lock.json'));
    expect(lock.packages['node_modules/@rollup/rollup-linux-x64-gnu']).toBeDefined();
  });
});
