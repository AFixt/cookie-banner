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
<script src="path/to/dist/cookie-banner.min.js"></script>
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
│   ├── cookie-banner.js     # UMD build
│   ├── cookie-banner.min.js # Minified UMD build
│   ├── cookie-banner.esm.js # ES module
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
  - [React](src/examples/react-example.jsx)
  - [Vue](src/examples/vue-example.vue)
  - [Angular](src/examples/angular-example.ts)
- **TypeScript**: [Type-safe implementation](src/examples/typescript-example.ts)
- **Accessibility Features**:
  - [High Contrast Theme](src/examples/high-contrast.html)
  - [RTL Support](src/examples/rtl-support.html)

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

**Note:** If you encounter issues with ad blockers blocking `cookie-banner.min.js`, either disable your ad blocker for localhost or use the unminified version by changing script references from `cookie-banner.min.js` to `cookie-banner.js`.

See the [examples directory](src/examples/) for more detailed examples and implementation guides.

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
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT
