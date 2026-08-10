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

## License

MIT
