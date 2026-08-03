# src/js

Guidance for the library source. The root [CLAUDE.md](../../CLAUDE.md) covers
branching, commits and the test/accessibility requirements that apply
everywhere; this file covers what is specific to these modules.

## Shape of the code

Four subsystems, each a "main" module plus focused modules split out of it
under [#69](https://github.com/AFixt/cookie-banner/issues/69) to satisfy the
`max-lines` / `complexity` lint rules. When changing behaviour, start at the
main module — the split modules are leaves and rarely the whole story.

| Subsystem      | Main module          | Split out of it                                                                 |
| -------------- | -------------------- | ------------------------------------------------------------------------------- |
| Banner UI      | `banner.js`          | `banner-dom.js`, `banner-focus.js`, `banner-storage.js`                         |
| Consent state  | `consent-manager.js` | —                                                                               |
| Auto-blocking  | `cookie-blocker.js`  | `cookie-blocker-cookies.js`, `cookie-blocker-dom.js`, `cookie-blocker-rules.js` |
| Subdomain sync | `subdomain-sync.js`  | `subdomain-sync-html.js`, `subdomain-sync-validation.js`                        |

`index.js` is the public entry point and the only place the package's exported
surface is defined. Anything not re-exported there is internal.

## Conventions that are enforced

- **Plain ES modules, no TypeScript.** Types live in the hand-written
  `src/types/index.d.ts` and must be updated when the public API changes. See
  [docs/adr/0001](../../docs/adr/0001-tooling-stack-decisions.md) for why.
- **JSDoc on every export**, validated by `eslint-plugin-jsdoc`. `@param` and
  `@returns` must match the real signature — read the doc comment before
  reading the body.
- **File and function size limits** (`max-lines` 300, `max-lines-per-function`
  75, `complexity` 10). Hitting one is the signal to split a module, following
  the pattern in the table above, not to add an eslint-disable.
- **`cookie-banner` and similar tokens must not appear in asset paths.**
  Anti-annoyance filter lists block them, which silently kills the banner.
  `test/bundle-filenames.test.js` guards this; the npm package name is a
  deliberate exception.

## Things that bite

- **DOM builders return detached elements.** `banner-dom.js` never inserts
  anything; the caller owns insertion and removal. `hideBanner()` removes the
  banner from the DOM rather than hiding it, so tests must wait for detachment,
  not for `hidden`.
- **The preferences modal is `role="dialog"` with `aria-modal="true"`**, not a
  landmark. Do not wrap its heading in one to satisfy a landmark rule.
- **The blocker overrides global browser APIs** (`document.cookie`,
  `createElement`, `appendChild`, `insertBefore`, `setAttribute`). Changes here
  affect every page the library loads on, and jsdom does not behave like a
  browser for the cookie accessor — `cookie-blocker-cookies.js` carries a
  simulated fallback specifically for that.
- **Accessibility is tested at four layers** (ESLint, jsdom scans in
  `test/accessibility.test.js`, browser scans in
  `test/accessibility-e2e.test.js`, and the Playwright visual suite). A change
  to markup or focus behaviour usually needs updating in more than one.
