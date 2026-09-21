/**
 * Guards against the published typings naming a package that does not exist.
 *
 * `src/types/index.d.ts` declared `module 'accessible-cookie-banner'` and
 * referenced that bare name three more times, while the package publishes as
 * `@afixt/accessible-cookie-banner`. A consumer writing
 *
 *     import { ConsentManager } from '@afixt/accessible-cookie-banner';
 *
 * got an ambient declaration for a name that is not in their node_modules, and
 * the three `import(...)` references inside the `Window` augmentation were
 * unresolvable for the same reason — so the very globals the file exists to
 * type came through as errors or `any`.
 *
 * Nothing caught it: the declaration is syntactically valid, `tsc` does not
 * check that an ambient module name corresponds to anything, and the repo
 * ships no consumer that imports by name. Only a consistency check between the
 * two files can see it, which is what this is.
 *
 * See https://github.com/AFixt/cookie-banner/issues/132.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// package.json's `name` is the single source of truth: it is what npm
// publishes under and therefore what a consumer can import.
const packageName = JSON.parse(read('package.json')).name;
const typings = read('src/types/index.d.ts');

describe('published typings match the package name', () => {
  it('declares the module under the name the package publishes as', () => {
    expect(typings).toContain(`declare module '${packageName}'`);
  });

  it('references that same name everywhere it self-references', () => {
    // `import('…')` inside the Window augmentation has to resolve to the same
    // module the file declares, or the globals it types degrade to `any`.
    const selfReferences = [...typings.matchAll(/import\('([^']+)'\)/g)].map(m => m[1]);

    // Guard the guard: if the Window augmentation stops self-referencing, this
    // test has nothing left to check and wants re-pointing or deleting.
    expect(selfReferences.length).toBeGreaterThan(0);

    for (const reference of selfReferences) {
      expect(reference).toBe(packageName);
    }
  });

  it('carries no reference to the unscoped name', () => {
    // The specific defect: the scope was missing, not the name. A bare
    // `accessible-cookie-banner` is always wrong here, wherever it appears.
    const unscoped = packageName.replace(/^@[^/]+\//, '');
    expect(unscoped).not.toBe(packageName);

    const bare = new RegExp(`(?<!@afixt/)\\b${unscoped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    expect(typings).not.toMatch(bare);
  });
});
