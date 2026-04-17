# Framework Integration Guide

This guide explains how to integrate the Accessible Cookie Banner with popular JavaScript frameworks. The examples provided in this directory demonstrate the basic integration patterns for each framework.

## Available Framework Examples

- [React Example](react-example.jsx)
- [Vue Example](vue-example.vue)
- [Angular Example](angular-example.ts)
- [TypeScript Example](typescript-example.ts)

## General Integration Pattern

Regardless of the framework, the general pattern for integration involves:

1. **Installation**: Install the package via npm or include directly in your HTML
2. **Initialization**: Initialize the banner when your app/component loads
3. **State Management**: Manage consent state within your application's state management pattern
4. **Event Handling**: Listen for consent changes and react accordingly
5. **Conditional Loading**: Load scripts and features based on consent status

## Installation

```bash
npm install accessible-cookie-banner
# or
yarn add accessible-cookie-banner
```

## React Integration

In React applications, it's recommended to initialize the cookie banner in a side effect and manage the consent state with hooks:

```jsx
import { useEffect, useState } from 'react';
import CookieBanner from 'accessible-cookie-banner';
import 'accessible-cookie-banner/dist/banner.css';

function ConsentManager() {
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    // Initialize the banner
    CookieBanner.init({
      locale: 'en',
      theme: 'light',
      onConsentChange: newConsent => {
        setConsent(newConsent);
      },
    });

    // Set initial consent state
    setConsent(CookieBanner.getConsent());

    // Listen for consent change events
    const handleConsentChange = e => setConsent(e.detail);
    document.addEventListener('cookieConsentChanged', handleConsentChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('cookieConsentChanged', handleConsentChange);
    };
  }, []);

  // Rest of your component...
}
```

See [react-example.jsx](react-example.jsx) for a complete implementation.

## Vue Integration

In Vue applications, you can initialize the cookie banner in the `mounted` hook and manage consent in your component's data:

```js
import CookieBanner from 'accessible-cookie-banner';
import 'accessible-cookie-banner/dist/banner.css';

export default {
  data() {
    return {
      consent: null,
    };
  },

  mounted() {
    // Initialize the banner
    CookieBanner.init({
      locale: 'en',
      theme: 'light',
      onConsentChange: newConsent => {
        this.consent = newConsent;
      },
    });

    // Set initial consent
    this.consent = CookieBanner.getConsent();

    // Listen for consent change events
    document.addEventListener('cookieConsentChanged', this.handleConsentChange);
  },

  beforeDestroy() {
    document.removeEventListener('cookieConsentChanged', this.handleConsentChange);
  },

  methods: {
    handleConsentChange(e) {
      this.consent = e.detail;
    },
  },
};
```

See [vue-example.vue](vue-example.vue) for a complete implementation.

## Angular Integration

In Angular applications, it's recommended to create a service to manage consent and initialize the banner in your app component or a dedicated service:

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// You would need to properly import or declare the types
import CookieBanner from 'accessible-cookie-banner';
import 'accessible-cookie-banner/dist/banner.css';

export interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConsentService {
  private consentSubject = new BehaviorSubject<ConsentState | null>(null);
  consent$ = this.consentSubject.asObservable();

  constructor() {
    // Initialize banner
    CookieBanner.init({
      locale: 'en',
      theme: 'light',
      onConsentChange: consent => {
        this.consentSubject.next(consent);
      },
    });

    // Set initial value
    this.consentSubject.next(CookieBanner.getConsent());

    // Listen for changes
    document.addEventListener('cookieConsentChanged', ((e: CustomEvent) => {
      this.consentSubject.next(e.detail);
    }) as EventListener);
  }

  hasConsent(category: string): boolean {
    const consent = this.consentSubject.value;
    return consent ? !!consent[category] : false;
  }
}
```

See [angular-example.ts](angular-example.ts) for a complete implementation.

## TypeScript Integration

For TypeScript projects, you'll want to properly type the cookie banner API:

```typescript
// Type definitions
interface ConsentOptions {
  locale: string;
  theme?: 'light' | 'dark' | 'high-contrast';
  // ... other options
}

interface ConsentData {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  [key: string]: any;
}

interface CookieBannerAPI {
  init(options: ConsentOptions): void;
  getConsent(): ConsentData | null;
  hasConsent(category: string): boolean;
  // ... other methods
}

// Declare global variables
declare global {
  interface Window {
    CookieBanner: CookieBannerAPI;
    // ... other globals
  }
}

// Usage
window.CookieBanner.init({
  locale: 'en',
  theme: 'light',
});
```

See [typescript-example.ts](typescript-example.ts) for a complete implementation.

## Best Practices

### State Management

- In React: Use Context API for app-wide consent management
- In Vue: Use Vuex/Pinia for app-wide consent management
- In Angular: Use a service with RxJS observables

### Script Loading

Always load scripts conditionally based on consent:

```js
if (CookieBanner.hasConsent('analytics')) {
  // Load Google Analytics or similar
  const script = document.createElement('script');
  script.src = 'https://www.google-analytics.com/analytics.js';
  document.body.appendChild(script);
}
```

### Handling Consent Changes

Listen for the `cookieConsentChanged` event to react to consent changes anywhere in your application:

```js
document.addEventListener('cookieConsentChanged', e => {
  const consent = e.detail;

  // Enable/disable features based on consent
  if (consent.analytics) {
    enableAnalytics();
  } else {
    disableAnalytics();
  }
});
```

## Additional Resources

- [Main README](../../README.md)
- [Accessibility Guide](../../ACCESSIBILITY.md)
- [Contributing Guide](../../CONTRIBUTING.md)
