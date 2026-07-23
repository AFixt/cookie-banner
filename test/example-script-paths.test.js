/**
 * Guards the asset paths in the example pages.
 *
 * `examples/*` is copied into `dist/examples/` at build time and the README
 * points readers at that copy, so every page must load its scripts and
 * stylesheet with paths that resolve from there. Old references like
 * `../dist/consent.js`, `../js/consent-manager.js`, `../js/banner.js` and
 * `../css/banner.css` all 404ed from the copy (some from the source tree
 * too), so the banner never initialised or rendered unstyled. The build
 * copies consent.js and banner.css next to the pages so `./consent.js` and
 * `./banner.css` resolve. See
 * https://github.com/AFixt/cookie-banner/issues/72 and
 * https://github.com/AFixt/cookie-banner/issues/86.
 *
 * The bundle also fetches `locales/<locale>.json` relative to the page, so
 * the build copies src/locales/ next to the pages as dist/examples/locales/;
 * without it the language-switch demos silently fall back to English.
 *
 * src/html/banner.html and preferences-modal.html are markup references, not
 * runnable examples: their `../js/*.js` and `../css/banner.css` references
 * only resolve inside the source tree, so they are no longer copied into
 * dist/examples/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLES_DIR = path.join(ROOT, 'examples');
const examplePages = fs.readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.html'));

// Real tags only, tolerating extra attributes (defer, type) — escaped
// `&lt;script src="path/to/..."&gt;` snippets inside the pages'
// documentation blocks are intentionally not matched.
const scriptSrcs = html => [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
const stylesheetHrefs = html =>
  [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);

describe('example page asset paths', () => {
  it('finds the example pages', () => {
    expect(examplePages).toContain('vanilla-js.html');
    expect(examplePages.length).toBeGreaterThanOrEqual(6);
  });

  examplePages.forEach(page => {
    describe(page, () => {
      const html = fs.readFileSync(path.join(EXAMPLES_DIR, page), 'utf8');

      it('loads assets from paths that survive the copy into dist/examples', () => {
        [...scriptSrcs(html), ...stylesheetHrefs(html)].forEach(src => {
          expect(src).toMatch(/^\.\//);
        });
      });

      it('does not reference files that are never published', () => {
        expect(scriptSrcs(html)).not.toContain('../js/consent-manager.js');
        expect(scriptSrcs(html)).not.toContain('../js/banner.js');
        expect(scriptSrcs(html)).not.toContain('../dist/consent.js');
        expect(stylesheetHrefs(html)).not.toContain('../css/banner.css');
      });

      it('does not use globals the UMD bundle never defines', () => {
        // consent.js only sets window.CookieBanner, window.initCookieBanner,
        // window.CookieConsent and window.CookieBlocker; a bare
        // `new ConsentManager()` throws a ReferenceError.
        expect(html).not.toMatch(/new ConsentManager\(/);
      });
    });
  });
});

describe('rollup copies the assets next to the examples', () => {
  const rollupConfig = fs.readFileSync(path.join(ROOT, 'rollup.config.js'), 'utf8');

  // Tolerate reformatting: only require copy targets whose src is the asset
  // and whose dest is the examples directory.
  it('copies the bundle so ./consent.js resolves', () => {
    expect(rollupConfig).toMatch(
      /src:\s*[`'"][^`'"]*consent\.js[`'"],\s*dest:\s*[`'"][^`'"]*examples[`'"]/
    );
  });

  it('copies the stylesheet so ./banner.css resolves', () => {
    expect(rollupConfig).toMatch(
      /src:\s*[`'"][^`'"]*banner\.css[`'"],\s*dest:\s*[`'"][^`'"]*examples[`'"]/
    );
  });

  it('copies the locales so locales/<locale>.json resolves from the pages', () => {
    expect(rollupConfig).toMatch(
      /src:\s*[`'"][^`'"]*locales\/\*[`'"],\s*dest:\s*[`'"][^`'"]*examples\/locales[`'"]/
    );
  });

  it('does not ship the src/html markup references as examples', () => {
    // Their ../js and ../css references only resolve from src/html/, so a
    // copy under dist/examples/ 404s every asset it loads.
    expect(rollupConfig).not.toMatch(/src:\s*[`'"]src\/html\//);
  });
});

// Only meaningful after `npm run build`; dist/ is gitignored and absent on a
// clean clone, so this is skipped rather than failing for the wrong reason.
const BUILT_DIR = path.join(ROOT, 'dist', 'examples');

(fs.existsSync(BUILT_DIR) ? describe : describe.skip)('built example pages', () => {
  examplePages.forEach(page => {
    it(`${page} resolves every script and stylesheet it references`, () => {
      const builtPage = path.join(BUILT_DIR, page);
      expect(fs.existsSync(builtPage)).toBe(true);

      const html = fs.readFileSync(builtPage, 'utf8');
      [...scriptSrcs(html), ...stylesheetHrefs(html)].forEach(src => {
        expect(fs.existsSync(path.join(BUILT_DIR, src))).toBe(true);
      });
    });
  });

  it('references at least one script across the example pages', () => {
    const all = examplePages.flatMap(page =>
      scriptSrcs(fs.readFileSync(path.join(BUILT_DIR, page), 'utf8'))
    );
    expect(all.length).toBeGreaterThan(0);
  });

  it('ships every locale next to the pages so the language switchers work', () => {
    const sourceLocales = fs.readdirSync(path.join(ROOT, 'src', 'locales'));
    expect(sourceLocales.length).toBeGreaterThan(0);
    sourceLocales.forEach(locale => {
      expect(fs.existsSync(path.join(BUILT_DIR, 'locales', locale))).toBe(true);
    });
  });

  it('does not ship the src/html markup references', () => {
    expect(fs.existsSync(path.join(BUILT_DIR, 'banner.html'))).toBe(false);
    expect(fs.existsSync(path.join(BUILT_DIR, 'preferences-modal.html'))).toBe(false);
  });
});
