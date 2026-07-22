/**
 * Guards the script path in the vanilla JS example.
 *
 * `examples/*` is copied into `dist/examples/` at build time and the README
 * points readers at that copy, so the page must load the bundle with a path
 * that resolves from there. The old `../dist/consent.js` reference resolved
 * to `dist/dist/consent.js` from the copy, a 404, so the banner never
 * initialised. See https://github.com/AFixt/cookie-banner/issues/72.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const examplePage = fs.readFileSync(path.join(ROOT, 'examples', 'vanilla-js.html'), 'utf8');
const rollupConfig = fs.readFileSync(path.join(ROOT, 'rollup.config.js'), 'utf8');

describe('vanilla JS example script path', () => {
  it('loads the bundle from a path that survives the copy into dist/examples', () => {
    expect(examplePage).toContain('<script src="./consent.js"></script>');
    expect(examplePage).not.toContain('../dist/consent.js');
  });

  it('copies the bundle next to the examples so ./consent.js resolves', () => {
    // Tolerate reformatting: only require a copy target whose src is the
    // consent.js bundle and whose dest is the examples directory.
    expect(rollupConfig).toMatch(
      /src:\s*[`'"][^`'"]*consent\.js[`'"],\s*dest:\s*[`'"][^`'"]*examples[`'"]/
    );
  });
});

// Only meaningful after `npm run build`; dist/ is gitignored and absent on a
// clean clone, so this is skipped rather than failing for the wrong reason.
const builtPage = path.join(ROOT, 'dist', 'examples', 'vanilla-js.html');

(fs.existsSync(builtPage) ? describe : describe.skip)('built example page', () => {
  it('resolves every script it references', () => {
    const html = fs.readFileSync(builtPage, 'utf8');
    const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    srcs.forEach(src => {
      expect(fs.existsSync(path.join(path.dirname(builtPage), src))).toBe(true);
    });
  });
});
