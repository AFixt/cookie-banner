/**
 * Type declarations for Accessible Cookie Banner
 */

declare module 'accessible-cookie-banner' {
  /**
   * Configuration options for initializing the cookie banner
   */
  export interface ConsentOptions {
    /**
     * The locale code to use for text (e.g., 'en', 'fr', 'es')
     */
    locale: string;

    /**
     * The theme to apply to the banner
     * @default 'light'
     */
    theme?: 'light' | 'dark' | 'high-contrast';

    /**
     * Whether to show the preferences modal
     * @default true
     */
    showModal?: boolean;

    /**
     * Storage method to use for consent
     * @default 'localStorage'
     */
    storageMethod?: 'localStorage' | 'cookie';

    /**
     * Number of days until consent expires
     * @default 365
     */
    expireDays?: number;

    /**
     * Default state for consent categories
     */
    categories?: {
      /**
       * Functional cookies are always required
       * @default true
       */
      functional?: boolean;

      /**
       * Analytics cookies
       * @default false
       */
      analytics?: boolean;

      /**
       * Marketing cookies
       * @default false
       */
      marketing?: boolean;

      /**
       * Support for custom categories
       */
      [key: string]: boolean | undefined;
    };

    /**
     * Callback called when consent changes
     */
    onConsentChange?: (consent: ConsentData) => void;
  }

  /**
   * Consent data structure
   */
  export interface ConsentData {
    /**
     * Functional cookies (always true)
     */
    functional: boolean;

    /**
     * Analytics cookies
     */
    analytics: boolean;

    /**
     * Marketing cookies
     */
    marketing: boolean;

    /**
     * ISO date string of when consent was given
     */
    timestamp: string;

    /**
     * Support for custom categories
     */
    [key: string]: any;
  }

  /**
   * Main CookieBanner API
   */
  export interface CookieBannerAPI {
    /**
     * Initialize the cookie banner with options
     * @param options Configuration options
     */
    init(options: ConsentOptions): void;

    /**
     * Get the current consent data
     * @returns Current consent data or null if not set
     */
    getConsent(): ConsentData | null;

    /**
     * Set consent values
     * @param consent Consent values to set
     */
    setConsent(consent: Partial<ConsentData>): void;

    /**
     * Check if consent is given for a specific category
     * @param category Category name to check
     * @returns true if consent is given, false otherwise
     */
    hasConsent(category: string): boolean;
  }

  /**
   * ConsentManager class
   */
  export class ConsentManager {
    /**
     * Create a new ConsentManager instance
     * @param options Configuration options
     */
    constructor(options?: {
      storageMethod?: 'localStorage' | 'cookie';
      expireDays?: number;
      onConsentChange?: (consent: ConsentData) => void;
    });

    /**
     * Get current consent settings
     * @returns Consent data or null if not set
     */
    getConsent(): ConsentData | null;

    /**
     * Set consent settings
     * @param consent Consent data to set
     * @returns Updated consent data
     */
    setConsent(consent: Partial<ConsentData>): ConsentData;

    /**
     * Check if consent is given for a specific category
     * @param category Category to check
     * @returns true if consent is given, false otherwise
     */
    hasConsent(category: string): boolean;

    /**
     * Clear stored consent
     */
    clearConsent(): void;

    /**
     * Check if consent is expired
     * @returns true if consent is expired or not set
     */
    isConsentExpired(): boolean;

    /**
     * Dispatch a custom event with consent data
     * @param consentData Consent data to include in the event
     */
    dispatchConsentEvent(consentData: ConsentData): void;
  }

  /**
   * Main entry point for the cookie banner
   */
  const CookieBanner: CookieBannerAPI;

  export { ConsentManager };
  export default CookieBanner;
}

/**
 * Global declarations
 */
declare global {
  interface Window {
    /**
     * Global CookieBanner object
     */
    CookieBanner: import('accessible-cookie-banner').CookieBannerAPI;

    /**
     * Global ConsentManager constructor
     */
    ConsentManager: typeof import('accessible-cookie-banner').ConsentManager;

    /**
     * Legacy initialization function
     */
    initCookieBanner: (options: import('accessible-cookie-banner').ConsentOptions) => void;
  }
}
