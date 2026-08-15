# Accessible Cookie Banner

A customizable, WCAG-conformant component designed to provide clear, user-friendly consent for the use of cookies and tracking technologies on websites and web applications. It complies with GDPR, ePrivacy Directive, and CCPA regulations, while maintaining accessibility standards set by WCAG 2.2 AA, ensuring users of all abilities can interact with and understand the banner.

## Features

- **Accessible by Design**
  - Complies with WCAG 2.2 AA
  - Fully operable via keyboard
  - Screen reader-friendly (ARIA roles, live regions, and focus management)
- **Consent Management**
  - Supports "Accept All", "Reject All", and "Customize" buttons
  - Optional granular controls for categories (e.g., functional, analytics, marketing)
- **Compliance Support**
  - GDPR-ready with audit logging hooks
  - CCPA opt-out support
- **Customizable**
  - Theming via CSS variables
  - Optionally include a full preferences modal
- **Internationalization (i18n)**
  - Text fully configurable in JSON or via locale files
  - RTL (Right-To-Left) layout support

## Installation

### Via NPM

```bash
npm install @afixt/accessible-cookie-banner
```

### Manual Installation

1. Download the package
2. Include the necessary files in your HTML:

```html
<link rel="stylesheet" href="path/to/dist/banner.css" />
<script src="path/to/dist/consent.min.js"></script>
```

## Usage

### Basic Usage

```javascript
// Using as a global variable (UMD build)
window.CookieBanner.init({
  locale: 'en',
  theme: 'light', // or 'dark'
  onConsentChange: consent => {
    // Use to enable/disable analytics or ad scripts
    console.log('Consent changed:', consent);

    // Example: Enable Google Analytics if analytics consent is given
    if (consent.analytics) {
      // Initialize analytics
    }
  },
});

// Using as an ES module
import CookieBanner from 'accessible-cookie-banner';

CookieBanner.init({
  locale: 'en',
  theme: 'light',
  // other options...
});
```

### Advanced Configuration

```javascript
CookieBanner.init({
  locale: 'en',
  theme: 'light',
  showModal: true,
  storageMethod: 'localStorage', // or 'cookie'
  expireDays: 365,
  categories: {
    functional: true, // Always required
    analytics: false, // Default state
    marketing: false, // Default state
  },
  onConsentChange: consent => {
    console.log('Consent changed:', consent);
  },
});
```

### Check Consent Status

```javascript
// Check if user has given consent for analytics
if (CookieBanner.hasConsent('analytics')) {
  // Initialize analytics
}

// Get full consent object
const consent = CookieBanner.getConsent();
console.log(consent);
// Example output: { functional: true, analytics: true, marketing: false, timestamp: "2023-..." }
```

### Listening for Consent Changes

```javascript
document.addEventListener('cookieConsentChanged', e => {
  console.log('Consent changed:', e.detail);

  // Enable/disable scripts based on consent
  if (e.detail.analytics) {
    // Initialize analytics
  }

  if (e.detail.marketing) {
    // Initialize marketing scripts
  }
});
```

## Customization

### Changing the Theme

The banner comes with three built-in themes: `light`, `dark`, and `high-contrast`. You can set the theme during initialization:

```javascript
CookieBanner.init({
  theme: 'dark', // 'light', 'dark', or 'high-contrast'
});
```

You can also customize the colors by overriding the CSS variables in your stylesheet:

```css
:root {
  --cookie-bg: #f0f0f0;
  --cookie-text: #333333;
  --cookie-button-primary-bg: #0056b3;
  --cookie-button-primary-text: #ffffff;
  /* ... other variables ... */
}
```

### Localization

You can set the banner language during initialization:

```javascript
CookieBanner.init({
  locale: 'fr', // Uses locales/fr.json
});
```

To add a new language, create a new JSON file in the `locales` directory with the appropriate translations.

## Project Structure

```text
accessible-cookie-banner/
├── dist/                    # Distribution files
│   ├── consent.js           # UMD build
│   ├── consent.min.js       # Minified UMD build
│   ├── consent.esm.js       # ES module
│   ├── cookie-banner.*.js   # Deprecated aliases (see Ad blockers below)
│   ├── banner.css           # Styles
│   ├── locales/             # Localization files
│   ├── types/               # TypeScript declarations
│   └── examples/            # Example pages
├── src/                     # Source code
│   ├── js/                  # JavaScript source
│   │   ├── banner.js        # Banner implementation
│   │   ├── consent-manager.js # Consent management
│   │   └── index.js         # Entry point
│   ├── css/                 # CSS source
│   ├── html/                # HTML examples
│   ├── examples/            # Implementation examples
│   ├── types/               # TypeScript type definitions
│   └── locales/             # Translation files
└── test/                    # Test files
```

## Examples

The package includes various examples to help you implement the cookie banner in different environments:

- **Basic Usage**: Simple implementation with vanilla JavaScript
- **Framework Integration**:
  - [React](examples/react-example.jsx)
  - [Vue](examples/vue-example.vue)
  - [Angular](examples/angular-example.ts)
- **TypeScript**: [Type-safe implementation](examples/typescript-example.ts)
- **Accessibility Features**:
  - [High Contrast Theme](examples/high-contrast.html)
  - [RTL Support](examples/rtl-support.html)

### Running Examples Locally

To view the examples in your browser:

1. **Install dependencies and build the project:**

```bash
   npm install --legacy-peer-deps
   npm run build
```

1. **Start the development server:**

```bash
   npm start
```

This will build the project and start a local HTTP server at `http://localhost:8080`

1. **View examples:**

- Main examples index: `http://localhost:8080/dist/examples/`
- Vanilla JS example: `http://localhost:8080/dist/examples/vanilla-js.html`
- High contrast theme: `http://localhost:8080/dist/examples/high-contrast.html`
- RTL support: `http://localhost:8080/dist/examples/rtl-support.html`
- Custom categories: `http://localhost:8080/dist/examples/custom-categories.html`

### Ad blockers

Ad blockers subscribe to anti-annoyance filter lists (EasyList Cookie List,
Fanboy's Annoyance List) whose entire purpose is suppressing cookie consent
UI. Those lists match the substring `cookie-banner` in a request path, so a
script with that name can be cancelled before it ever executes — and the
blocked resource is the consent mechanism itself, so no banner renders and no
consent is recorded.

For this reason the bundles are named `consent.js`, `consent.min.js` and
`consent.esm.js`. **Use those names.**

The old `cookie-banner.*.js` filenames are still published as copies so
existing integrations keep working, but they are deprecated, they are subject
to blocking, and they will be removed in the next major release.

Two further recommendations:

- **Self-host the bundle rather than loading it from a CDN.** The package name
  contains `cookie-banner` too, so a CDN URL such as
  `unpkg.com/@afixt/accessible-cookie-banner/dist/consent.min.js` still carries
  the blocked substring in its path even with the renamed file.
- **Avoid putting `cookie-banner`, `cookie-consent`, or `cookie-notice` in the
  path you serve the script from**, for the same reason.

If the script fails to load during local development, check your blocker's
logger before assuming a build problem — a blocked request usually surfaces as
`ERR_BLOCKED_BY_CLIENT` or `ERR_FAILED` rather than a 404.

See the [examples directory](examples/) for more detailed examples and implementation guides.

## Accessibility Features

- Proper ARIA roles, states, and properties
- Focus management in the modal dialog
- Visible focus indicators
- Keyboard navigation support
- High-contrast theme option
- Readable text with sufficient color contrast
- No time limits or auto-dismissal

Accessibility is verified automatically: `@afixt/a11y-assert` scans the
rendered banner and preferences modal during `npm test`, and
`@afixt/a11y-assert-reporter` writes an HTML/JSON/Markdown report to
`reports/a11y/` on every run.

## Use Case Documents

[`docs/usecases/`](docs/usecases/) holds AFixt-style use case documents for the
banner's flows, written in the `.uc.yaml` DSL from
[`@afixt/usecase-runner`](https://github.com/AFixt/usecase-runner) and following
the house format used in
[AFixt/audit-usecases](https://github.com/AFixt/audit-usecases). The runner
turns each one into a Playwright test that fails whenever an element is missing
from the accessibility tree, cannot take keyboard focus, or does not meet WCAG
when audited.

They are templates, not fixtures. Every site-specific value lives in the file's
`data:` block, so auditing someone else's cookie banner is a single pass through
that block plus the `start_location` at the top. `grep -n REPLACE docs/usecases`
lists everything worth reviewing before a run.

| File                                                                                       | Type     | Flow                                                                    |
| ------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| [`accept-all.uc.yaml`](docs/usecases/accept-all.uc.yaml)                                   | positive | First visit, accept every category, keyboard only                       |
| [`reject-all.uc.yaml`](docs/usecases/reject-all.uc.yaml)                                   | positive | Decline optional categories straight from the banner                    |
| [`customize-preferences.uc.yaml`](docs/usecases/customize-preferences.uc.yaml)             | positive | Open the dialog, toggle a category, save — focus move, trap, and return |
| [`consent-persists-on-revisit.uc.yaml`](docs/usecases/consent-persists-on-revisit.uc.yaml) | positive | Revisit after consent; the banner must not ask again                    |
| [`reopen-preferences.uc.yaml`](docs/usecases/reopen-preferences.uc.yaml)                   | positive | Reopen from a persistent control and withdraw a prior consent           |
| [`escape-dismisses-modal.uc.yaml`](docs/usecases/escape-dismisses-modal.uc.yaml)           | negative | Escape closes the dialog, discards the change, returns focus            |
| [`storage-blocked.uc.yaml`](docs/usecases/storage-blocked.uc.yaml)                         | negative | Banner behaviour with cookies and site data blocked                     |
| [`rtl-localized.uc.yaml`](docs/usecases/rtl-localized.uc.yaml)                             | negative | RTL layout and localized strings; language mismatch detection           |

### Running the use cases

`@afixt/usecase-runner` is already a dev dependency, so parsing needs nothing
extra:

```bash
npm run validate:usecases
```

That is also asserted by `test/usecases.test.js` during `npm test`, which
additionally fails on parse _warnings_ — an unknown keyword or modifier
otherwise parses successfully and then does nothing at runtime.

Actually driving a browser needs Playwright (already a dev dependency here) and,
for the `audit:` steps, the engine:

```bash
npm install --save-dev @afixt/afixt-engine @afixt/test-utils
```

The templates default to this repo's own example pages, so build and serve them
first:

```bash
npm start
npx usecase-runner run docs/usecases/accept-all.uc.yaml --headed
```

Point the runner at the directory rather than a single file when running
`escape-dismisses-modal.uc.yaml` — it resolves its parent by `id:`, and the
parent has to be discoverable:

```bash
npx usecase-runner run docs/usecases
```

Or generate committed Playwright specs instead:

```bash
npx usecase-runner generate docs/usecases --outdir ./test/generated
npx playwright test ./test/generated
```

### What the templates expect that this library does not yet do

Three of them are written against conformant behaviour that the bundled
examples do not currently exhibit. The failures are the finding, not a broken
template — see [#105](https://github.com/AFixt/cookie-banner/issues/105):

- **Focus after the banner is dismissed.** The activated button is removed from
  the DOM, so focus falls to `document.body` (WCAG 2.4.3). `accept-all`,
  `reject-all` and `customize-preferences` assert a real focus target.
- **Focus when the dialog opens.** The first focusable match inside the dialog
  is the disabled "functional" checkbox, and `focus()` on a disabled control is
  a no-op, so the dialog opens without moving focus into itself.
- **A persistent control to reopen preferences.** Once consent is stored,
  `initCookieBanner()` returns before rendering anything, so there is nothing to
  reopen the dialog with. `reopen-preferences.uc.yaml` assumes the host page
  supplies that control.

`storage-blocked.uc.yaml` additionally needs storage blocked for the origin
before the run; the DSL has no verb for that, so configure it in the browser
context or profile.

## Privacy & Compliance Notes

- GDPR: Includes "Reject All" button and granular consent options
- CCPA: Can be configured to include "Do Not Sell My Info"
- Audit logging: Emits consent change events to hook into audit systems
- Time-to-live: Consent expires after the specified period (default: 365 days)

## Browser Support

Supports all modern browsers, including:

- Chrome, Firefox, Safari, Edge (latest versions)
- IE11 with appropriate polyfills

## Development

```bash
# Use the pinned Node version (matches CI)
nvm use

# Install dependencies
npm install

# Optional: install external scanner binaries (gitleaks, semgrep,
# osv-scanner, lychee) used by local gates and scheduled scans
npm run bootstrap

# Run development server
npm run dev

# Run tests
npm test

# Full local quality gate: lint, formatting, CSS/Markdown lint,
# duplication, license allowlist, and the test suite. The pre-push
# hook runs exactly this, so run it before pushing.
npm run check:all

# Build for production
npm run build
```

Tooling decisions (what is enforced locally vs. in CI, and why) are
documented in [docs/adr/](docs/adr/). Templates for new READMEs and ADRs
live in [docs/templates/](docs/templates/).

### Scripts

| Script                      | What it does                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`               | Build the CSS and watch the bundle for changes                                         |
| `npm run build`             | Clean, build the CSS, and produce the production bundles in `dist/`                    |
| `npm start`                 | Build, then serve the project at <http://localhost:8080>                               |
| `npm test`                  | Jest unit, integration and accessibility suites                                        |
| `npm run test:coverage`     | The same suites with a coverage report                                                 |
| `npm run test:a11y`         | Playwright accessibility scans of the built pages (needs `npm run build` and a server) |
| `npm run test:visual`       | Playwright visual regression suite                                                     |
| `npm run validate:usecases` | Parse every `.uc.yaml` in `docs/usecases` without launching a browser                  |
| `npm run lint`              | ESLint over the whole repo                                                             |
| `npm run lint:css`          | Stylelint over `src/**/*.css`                                                          |
| `npm run lint:md`           | markdownlint over the Markdown files                                                   |
| `npm run lint:cpd`          | jscpd duplication report                                                               |
| `npm run lint:licenses`     | Fail on a production dependency outside the licence allowlist                          |
| `npm run format`            | Prettier write; `format:check` to verify only                                          |
| `npm run check`             | Lint, format check, CSS and Markdown lint                                              |
| `npm run check:all`         | `check` plus duplication, licences and tests — what the pre-push hook runs             |
| `npm run size`              | Enforce the bundle budgets declared in `package.json`                                  |
| `npm run docs:build`        | Regenerate the API documentation from JSDoc comments                                   |

Accessibility scans and duplication reports are written to `reports/`.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) has the full
guide; the short version:

1. Branch from `develop` using a `feature/*` name — `main` and `develop` do
   not take direct commits.
2. Write tests for the change. Nothing lands without them, and the suite must
   be green.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
   messages — the changelog is generated from them.
4. Run `npm run check:all` before pushing. The pre-push hook runs it for you;
   do not bypass it with `--no-verify`.
5. Open a pull request against `develop`.

Accessibility is the point of this project: keyboard support, focus
management, ARIA correctness and WCAG 2.2 AA conformance are requirements, not
nice-to-haves. See [ACCESSIBILITY.md](ACCESSIBILITY.md).

## License

MIT — see [LICENSE](LICENSE).
