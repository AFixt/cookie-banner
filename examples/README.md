# Accessible Cookie Banner Examples

This directory contains various examples demonstrating how to implement and customize the Accessible Cookie Banner in different scenarios.

## Available Examples

### Basic Implementation

- [Vanilla JavaScript Example](vanilla-js.html): Demonstrates basic implementation with vanilla JavaScript, no frameworks.

### Accessibility Features

- [High Contrast Theme](high-contrast.html): Shows how to implement the high contrast theme for users with low vision.
- [RTL Support](rtl-support.html): Demonstrates right-to-left language support for languages like Arabic and Hebrew.

### Advanced Customization

- [Custom Categories](custom-categories.html): Shows how to add custom consent categories beyond the default ones.

## Using the Examples

To run these examples locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open the examples in your browser

Or, you can view the compiled examples in the `dist/examples/` directory after running `npm run build`.

## Implementation Guide

### Basic Implementation

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="path/to/banner.css">

<!-- Include the JavaScript -->
<script src="path/to/cookie-banner.min.js"></script>

<script>
  // Initialize the cookie banner
  window.CookieBanner.init({
    locale: 'en',
    theme: 'light',
    onConsentChange: (consent) => {
      console.log('Consent changed:', consent);
      
      // Enable/disable functionality based on consent
      if (consent.analytics) {
        // Initialize analytics
      }
    }
  });
</script>
```

### ES Module Implementation

```javascript
import CookieBanner from 'accessible-cookie-banner';
import 'accessible-cookie-banner/dist/banner.css';

// Initialize the cookie banner
CookieBanner.init({
  locale: 'en',
  theme: 'light',
  onConsentChange: (consent) => {
    console.log('Consent changed:', consent);
  }
});
```

### Available Options

```javascript
CookieBanner.init({
  // Required options
  locale: 'en',                     // Locale code (en, fr, es, etc.)
  
  // Appearance options
  theme: 'light',                   // 'light', 'dark', or 'high-contrast'
  showModal: true,                  // Whether to show the preferences modal
  
  // Storage options
  storageMethod: 'localStorage',    // 'localStorage' or 'cookie'
  expireDays: 365,                  // Days until consent expires
  
  // Consent categories with default values
  categories: {
    functional: true,               // Always required
    analytics: false,               // Default state
    marketing: false                // Default state
    // Add custom categories here
  },
  
  // Callbacks
  onConsentChange: (consent) => {   // Called when consent changes
    console.log('Consent changed:', consent);
  }
});
```

## Best Practices

1. **Always include the functional category**: The functional category should always be enabled and cannot be disabled by users.

2. **Set sensible defaults**: Set non-essential categories (analytics, marketing) to `false` by default to comply with privacy regulations.

3. **Provide clear descriptions**: Use the locale files to provide clear descriptions of what each cookie category does.

4. **Listen for consent changes**: Use the `onConsentChange` callback or listen for `cookieConsentChanged` events to respond to user consent changes.

5. **Check consent before loading scripts**: Always check if consent is given before loading any tracking or marketing scripts:

```javascript
if (CookieBanner.hasConsent('analytics')) {
  // Load analytics scripts
}
```

6. **Respect user choices**: Once a user has made their choice, respect it and do not show the banner again until consent expires.

7. **Provide a way to update choices**: Add a link in your footer or privacy policy to allow users to update their consent preferences.

## Getting Help

If you encounter any issues or have questions, please:

1. Check the main [README.md](../../README.md) for general information
2. Review the [ACCESSIBILITY.md](../../ACCESSIBILITY.md) document for accessibility features
3. See [CONTRIBUTING.md](../../CONTRIBUTING.md) if you'd like to contribute
4. Open an issue on GitHub if you need further assistance