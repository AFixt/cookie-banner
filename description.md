# Accessible Cookie Banner

The Accessible Cookie Banner is a customizable, WCAG-conformant component designed to provide clear, user-friendly consent for the use of cookies and tracking technologies on websites and web applications. It complies with GDPR, ePrivacy Directive, and CCPA regulations, while maintaining accessibility standards set by WCAG 2.2 AA, ensuring users of all abilities can interact with and understand the banner.

This banner is framework-agnostic and can be embedded into static websites, single-page applications (SPAs), or server-rendered environments. It supports localization, keyboard navigation, screen reader support, and full visual customization through CSS.

## Key Features

* Accessible by Design
  * Complies with WCAG 2.2 AA
  * Fully operable via keyboard
  * Screen reader-friendly (ARIA roles, live regions, and focus management)
* Consent Management
  * Supports "Accept All", "Reject All", and "Customize" buttons
  * Optional granular controls for categories (e.g., functional, analytics, marketing)
* Compliance Support
  * GDPR-ready with audit logging hooks
  * CCPA opt-out support
* Customizable
  * Theming via CSS variables
  * Optionally include a full preferences modal
* Internationalization (i18n)
  * Text fully configurable in JSON or via locale files
  * RTL (Right-To-Left) layout support

## Architecture Overview

cookie-banner/
├── index.js                  # Entry script
├── banner.html               # HTML markup
├── banner.css                # CSS styles with accessible contrast
├── preferences-modal.html    # Optional modal for granular consent
├── consent-manager.js        # Logic for storing, reading, and updating consent
├── locales/
│   ├── en.json
│   ├── fr.json
│   └── ...
└── README.md

## Technical Specification

### 1. Accessibility Requirements (WCAG 2.2)

| Feature | Details |
| ------- | ------- |
| Keyboard Navigation | Tab, Shift+Tab, Enter, Escape supported |
| Focus Management | Focus is trapped in modal; returned to invoking element on close |
| ARIA Roles and Properties | role="dialog", aria-labelledby, aria-describedby, live regions |
| Color Contrast | All elements must meet at least 4.5:1 contrast ratio |
| Visible Focus Indicator | All focusable elements have visible focus outlines |
| Time Limits | No auto-dismissal; waits for user input |
| Responsive Design | Works on mobile, tablet, and desktop |

### 2. Banner HTML Structure

```html
<div id="cookie-banner" role="region" aria-label="Cookie Consent" aria-live="polite">
  <p id="cookie-description">We use cookies to improve your experience. You can manage your preferences below.</p>
  <div class="cookie-buttons">
    <button id="accept-all">Accept All</button>
    <button id="reject-all">Reject All</button>
    <button id="customize-preferences" aria-haspopup="dialog" aria-controls="cookie-modal">Customize</button>
  </div>
</div>
```

### 3. Modal HTML Structure (Optional)

```html
<div id="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
  <h2 id="modal-title">Cookie Preferences</h2>
  <form id="cookie-form">
    <fieldset>
      <legend>Functional Cookies</legend>
      <label><input type="checkbox" name="functional" checked disabled /> Required (Always On)</label>
    </fieldset>
    <fieldset>
      <legend>Analytics Cookies</legend>
      <label><input type="checkbox" name="analytics" /> Allow analytics</label>
    </fieldset>
    <fieldset>
      <legend>Marketing Cookies</legend>
      <label><input type="checkbox" name="marketing" /> Allow marketing</label>
    </fieldset>
    <div class="cookie-modal-actions">
      <button type="submit">Save Preferences</button>
      <button type="button" id="close-modal">Cancel</button>
    </div>
  </form>
</div>
```

### 4. JavaScript Behavior

#### Consent Storage

* Stores user preference in `localStorage` or cookies with expiration.
* Fires events on consent change (`cookieConsentChanged`).
* Provides methods:
  * `getConsent()`
  * `setConsent({ functional, analytics, marketing })`
  * `hasConsent(category)`

#### Events

```javascript
document.addEventListener('cookieConsentChanged', (e) => {
  console.log('Consent changed:', e.detail);
});
```

### 5. i18n Format

```json
{
  "description": "We use cookies to improve your experience.",
  "acceptAll": "Accept All",
  "rejectAll": "Reject All",
  "customize": "Customize",
  "modal": {
    "title": "Cookie Preferences",
    "functional": "Functional Cookies (Required)",
    "analytics": "Allow Analytics Cookies",
    "marketing": "Allow Marketing Cookies",
    "save": "Save Preferences",
    "cancel": "Cancel"
  }
}
```

### 6. Theming with CSS Variables

```css
:root {
  --cookie-bg: #fff;
  --cookie-text: #111;
  --cookie-button-bg: #005fcc;
  --cookie-button-text: #fff;
  --cookie-outline: 2px solid #000;
}
```

## Usage

### Installation

```html
<link rel="stylesheet" href="banner.css" />
<script src="index.js" defer></script>
```

### Initialization

```javascript
window.initCookieBanner({
  locale: 'en',
  theme: 'light', // or 'dark'
  onConsentChange: (consent) => {
    // Use to enable/disable analytics or ad scripts
  },
});
```

## Privacy & Compliance Notes

* GDPR: Includes "Reject All" and granular consent.
* CCPA: Can be configured to include "Do Not Sell My Info."
* Logs: Emits consent change events to be hooked into audit systems.
* TTL: Consent must be renewed annually.

## Future Enhancements

* Auto-blocking of cookies prior to consent
* Consent syncing across subdomains
* Integration with Tag Managers (e.g., GTM)
* Logging with anonymized analytics
* Consent revocation UI (via footer link)
