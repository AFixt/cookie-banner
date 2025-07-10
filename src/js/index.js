/**
 * @fileoverview Accessible Cookie Banner - Entry point for the library
 * @module cookie-banner
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

// Import required modules
import ConsentManager from './consent-manager.js';
import './banner.js';
import './cookie-blocker.js';
import './subdomain-sync.js';

/**
 * @namespace CookieBanner
 * @description The main cookie banner API exposed on the global window object
 */

/**
 * @typedef {Object} ConsentObject
 * @property {boolean} functional - Always true, functional cookies are required
 * @property {boolean} analytics - Whether analytics cookies are allowed
 * @property {boolean} marketing - Whether marketing cookies are allowed
 * @property {string} timestamp - ISO timestamp of when consent was given
 */

/**
 * @typedef {Object} CookieBannerConfig
 * @property {string} [locale='en'] - Language locale for the banner
 * @property {string} [theme='light'] - Theme for the banner ('light' or 'dark')
 * @property {boolean} [showModal=true] - Whether to show the preferences modal
 * @property {Function} [onConsentChange] - Callback function called when consent changes
 * @property {string} [storageMethod='localStorage'] - Storage method ('localStorage' or 'cookie')
 * @property {number} [expireDays=365] - Number of days before consent expires
 * @property {Object} [categories] - Default consent categories
 * @property {boolean} [categories.functional=true] - Functional cookies (always required)
 * @property {boolean} [categories.analytics=false] - Analytics cookies default
 * @property {boolean} [categories.marketing=false] - Marketing cookies default
 */

// Export the ConsentManager class for advanced usage
export { ConsentManager };

// For UMD builds, expose the API on the global object after the modules are loaded
if (typeof window !== 'undefined') {
  /**
   * Global cookie banner API
   * @namespace window.CookieBanner
   * @property {Function} init - Initialize the cookie banner
   * @property {Function} getConsent - Get current consent status
   * @property {Function} setConsent - Set consent status
   * @property {Function} hasConsent - Check if a specific category has consent
   */
  window.CookieBanner = {
    /**
     * Initialize the cookie banner with options
     * @function
     * @memberof window.CookieBanner
     * @param {CookieBannerConfig} options - Configuration options
     * @returns {Promise<void>} Promise that resolves when banner is initialized
     * @example
     * window.CookieBanner.init({
     *   locale: 'en',
     *   theme: 'dark',
     *   onConsentChange: (consent) => console.log('Consent changed:', consent)
     * });
     */
    init: window.initCookieBanner,
    
    /**
     * Get current consent status
     * @function
     * @memberof window.CookieBanner
     * @returns {ConsentObject|null} Current consent object or null if no consent stored
     * @example
     * const consent = window.CookieBanner.getConsent();
     * if (consent && consent.analytics) {
     *   // Analytics cookies are allowed
     * }
     */
    getConsent: () => window.CookieConsent ? window.CookieConsent.getConsent() : null,
    
    /**
     * Set consent status
     * @function
     * @memberof window.CookieBanner
     * @param {ConsentObject} consent - Consent object with boolean values
     * @example
     * window.CookieBanner.setConsent({
     *   functional: true,
     *   analytics: true,
     *   marketing: false
     * });
     */
    setConsent: (consent) => window.CookieConsent ? window.CookieConsent.setConsent(consent) : null,
    
    /**
     * Check if a specific category has consent
     * @function
     * @memberof window.CookieBanner
     * @param {string} category - Category to check ('functional', 'analytics', 'marketing')
     * @returns {boolean} True if consent is given for the category
     * @example
     * if (window.CookieBanner.hasConsent('analytics')) {
     *   // Load analytics scripts
     * }
     */
    hasConsent: (category) => window.CookieConsent ? window.CookieConsent.hasConsent(category) : false
  };
}

/**
 * Default export - the CookieBanner API or null in non-browser environments
 * @type {Object|null}
 */
export default typeof window !== 'undefined' ? window.CookieBanner : null;