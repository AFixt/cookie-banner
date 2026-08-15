/**
 * @jest-environment node
 */

/**
 * Server-side-rendering guard for the cookie blocker.
 *
 * `cookie-blocker.js` attaches `window.CookieBlocker` and auto-initializes at
 * module scope, both behind `typeof window !== 'undefined'`. Importing it
 * where there is no DOM — Next.js, Astro, Remix, any SSR build — must be
 * inert rather than a `ReferenceError` that takes the render down.
 *
 * This lives in its own file because the check is only meaningful when
 * `window` genuinely does not exist. The previous version of this test ran
 * under jsdom and tried to `delete global.window` first, which throws
 * `TypeError: Cannot delete property 'window'` on current jsdom because the
 * property is not configurable. A `@jest-environment node` file gets the
 * absent global for free.
 */

describe('cookie-blocker without a DOM', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('has no window to attach to', () => {
    expect(typeof window).toBe('undefined');
  });

  it('imports without throwing', () => {
    expect(() => require('../src/js/cookie-blocker.js')).not.toThrow();
  });

  it('still exports its API for consumers that import it isomorphically', () => {
    const blocker = require('../src/js/cookie-blocker.js');

    expect(typeof blocker.initCookieBlocker).toBe('function');
    expect(typeof blocker.getBlockedScripts).toBe('function');
  });

  it('does not auto-initialize, and initializing explicitly is a no-op', () => {
    const blocker = require('../src/js/cookie-blocker.js');

    expect(() => blocker.initCookieBlocker()).not.toThrow();
    expect(blocker.getBlockedScripts()).toEqual([]);
  });
});
