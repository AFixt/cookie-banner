/**
 * TypeScript Example of Accessible Cookie Banner
 * This file demonstrates how to use the cookie banner with TypeScript
 */

// Type definitions for the cookie banner
// In a real project, you might want to put these in a separate .d.ts file

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
    [key: string]: boolean | undefined;
  };
  onConsentChange?: (consent: ConsentData) => void;
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
  setConsent(consent: Partial<ConsentData>): void;
  hasConsent(category: string): boolean;
}

interface ConsentManagerClass {
  new (options?: {
    storageMethod?: 'localStorage' | 'cookie';
    expireDays?: number;
    onConsentChange?: (consent: ConsentData) => void;
  }): {
    getConsent(): ConsentData | null;
    setConsent(consent: Partial<ConsentData>): ConsentData;
    hasConsent(category: string): boolean;
    clearConsent(): void;
    isConsentExpired(): boolean;
  };
}

// Declare global variables for the library
declare global {
  interface Window {
    CookieBanner: CookieBannerAPI;
    ConsentManager: ConsentManagerClass;
    initCookieBanner: (options: ConsentOptions) => void;
  }
}

/**
 * Example TypeScript class to manage cookie consent
 */
class TypescriptConsentManager {
  private consent: ConsentData | null = null;
  
  constructor() {
    // Initialize the banner
    this.initBanner();
    
    // Set up event listener for consent changes
    document.addEventListener('cookieConsentChanged', this.handleConsentChange.bind(this));
  }
  
  /**
   * Initialize the cookie banner with options
   */
  private initBanner(): void {
    window.CookieBanner.init({
      locale: 'en',
      theme: 'light',
      showModal: true,
      storageMethod: 'localStorage',
      expireDays: 365,
      categories: {
        functional: true,  // Required
        analytics: false,  // Off by default
        marketing: false   // Off by default
      },
      onConsentChange: (newConsent) => {
        console.log('Consent changed:', newConsent);
        this.consent = newConsent;
        this.handleConsentStateChange();
      }
    });
    
    // Get initial consent
    this.consent = window.CookieBanner.getConsent();
    if (this.consent) {
      this.handleConsentStateChange();
    }
  }
  
  /**
   * Handle consent change event
   */
  private handleConsentChange(event: CustomEvent<ConsentData>): void {
    this.consent = event.detail;
    this.handleConsentStateChange();
  }
  
  /**
   * React to consent state changes
   */
  private handleConsentStateChange(): void {
    if (!this.consent) return;
    
    // Load appropriate scripts based on consent
    if (this.consent.analytics) {
      this.loadAnalytics();
    }
    
    if (this.consent.marketing) {
      this.loadMarketingScripts();
    }
  }
  
  /**
   * Load analytics scripts if consent is given
   */
  private loadAnalytics(): void {
    console.log('Loading analytics scripts...');
    // Actual implementation would load scripts
  }
  
  /**
   * Load marketing scripts if consent is given
   */
  private loadMarketingScripts(): void {
    console.log('Loading marketing scripts...');
    // Actual implementation would load scripts
  }
  
  /**
   * Check if consent is given for a specific category
   */
  public hasConsent(category: string): boolean {
    return window.CookieBanner.hasConsent(category);
  }
  
  /**
   * Reset all consent settings
   */
  public resetConsent(): void {
    const manager = new window.ConsentManager();
    manager.clearConsent();
    window.location.reload();
  }
  
  /**
   * Get the current consent data
   */
  public getConsentData(): ConsentData | null {
    return this.consent;
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const consentManager = new TypescriptConsentManager();
  
  // Example: Add a reset button event listener
  const resetButton = document.getElementById('reset-consent');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      consentManager.resetConsent();
    });
  }
  
  // Example: Display current consent in a pre element
  const updateConsentDisplay = () => {
    const consentDisplay = document.getElementById('consent-status');
    if (consentDisplay) {
      const consent = consentManager.getConsentData();
      if (consent) {
        consentDisplay.textContent = JSON.stringify(consent, null, 2);
      } else {
        consentDisplay.textContent = 'No consent data found';
      }
    }
  };
  
  // Update display initially and when consent changes
  updateConsentDisplay();
  document.addEventListener('cookieConsentChanged', updateConsentDisplay);
});

/**
 * Note: This is a demonstration file only.
 * 
 * To use in a real TypeScript project:
 * 
 * 1. Install the package: npm install accessible-cookie-banner
 * 2. Create proper TypeScript declarations or use a declaration file if provided
 * 3. Import the necessary modules and styles
 * 4. Initialize the banner in your application
 */