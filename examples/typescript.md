# TypeScript Integration Guide

This guide explains how to use the Accessible Cookie Banner with TypeScript. The library includes TypeScript declarations to provide type safety and IntelliSense/autocompletion in TypeScript projects.

## Installation

```bash
npm install accessible-cookie-banner
# or
yarn add accessible-cookie-banner
```

## Basic Usage

```typescript
// Import the library and its types
import CookieBanner, { ConsentData, ConsentOptions } from 'accessible-cookie-banner';
import 'accessible-cookie-banner/dist/banner.css';

// Initialize with type-checked options
const options: ConsentOptions = {
  locale: 'en',
  theme: 'light',
  showModal: true,
  storageMethod: 'localStorage',
  expireDays: 365,
  categories: {
    functional: true, // Always required
    analytics: false, // Default state
    marketing: false, // Default state
  },
  onConsentChange: (consent: ConsentData) => {
    console.log('Consent changed:', consent);

    // Type-safe consent data
    if (consent.analytics) {
      // Initialize analytics
    }
  },
};

// Initialize the banner
CookieBanner.init(options);
```

## Type Declarations

The library provides the following TypeScript interfaces:

### ConsentOptions

```typescript
interface ConsentOptions {
  locale: string;
  theme?: 'light' | 'dark' | 'high-contrast';
  showModal?: boolean;
  storageMethod?: 'localStorage' | 'cookie';
  expireDays?: number;
  categories?: {
    functional?: boolean;
    analytics?: boolean;
    marketing?: boolean;
    [key: string]: boolean | undefined; // For custom categories
  };
  onConsentChange?: (consent: ConsentData) => void;
}
```

### ConsentData

```typescript
interface ConsentData {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  [key: string]: any; // For custom categories
}
```

## Class-Based Approach

You can create a typed class to manage consent in your application:

```typescript
import CookieBanner, { ConsentData, ConsentManager } from 'accessible-cookie-banner';

class AppConsentManager {
  private consent: ConsentData | null = null;

  constructor() {
    // Initialize the banner
    CookieBanner.init({
      locale: 'en',
      theme: 'light',
      onConsentChange: this.handleConsentChange.bind(this),
    });

    // Get initial consent
    this.consent = CookieBanner.getConsent();

    // Listen for consent changes
    document.addEventListener('cookieConsentChanged', ((e: CustomEvent<ConsentData>) => {
      this.consent = e.detail;
    }) as EventListener);
  }

  private handleConsentChange(consent: ConsentData): void {
    this.consent = consent;
    this.updateFeatures();
  }

  private updateFeatures(): void {
    if (!this.consent) return;

    // Type-safe feature enablement
    if (this.consent.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }
  }

  private enableAnalytics(): void {
    // Enable analytics
  }

  private disableAnalytics(): void {
    // Disable analytics
  }

  public resetConsent(): void {
    const manager = new ConsentManager();
    manager.clearConsent();
    window.location.reload();
  }
}
```

## Working with Global Variables

If you prefer to use the global variables, TypeScript requires you to declare them:

```typescript
// Already included in the library's type declarations
declare global {
  interface Window {
    CookieBanner: import('accessible-cookie-banner').CookieBannerAPI;
    ConsentManager: typeof import('accessible-cookie-banner').ConsentManager;
    initCookieBanner: (options: import('accessible-cookie-banner').ConsentOptions) => void;
  }
}

// Now you can use them in a type-safe way
window.CookieBanner.init({
  locale: 'en',
  theme: 'light',
});
```

## Using Custom Categories

The type system supports custom consent categories with string indexing:

```typescript
// Define your custom consent interface
interface MyConsentData extends ConsentData {
  preferences: boolean;
  personalization: boolean;
}

// Initialize with custom categories
CookieBanner.init({
  locale: 'en',
  theme: 'light',
  categories: {
    functional: true,
    analytics: false,
    marketing: false,
    preferences: false, // Custom category
    personalization: false, // Custom category
  },
  onConsentChange: consent => {
    // You may need to cast if using the extended interface
    const myConsent = consent as MyConsentData;

    if (myConsent.preferences) {
      // Enable preferences features
    }

    if (myConsent.personalization) {
      // Enable personalization features
    }
  },
});
```

## Framework Integration

See the [Framework Integration Guide](framework-integration.md) for specific examples of using the cookie banner with TypeScript in React, Vue, and Angular applications.

## Full TypeScript Example

For a complete implementation example, see [typescript-example.ts](typescript-example.ts).
