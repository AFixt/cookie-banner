/**
 * Accessible Cookie Banner
 * Entry point for the library
 */

// Import required modules
import ConsentManager from './consent-manager.js';
import './banner.js';

// The library is now initialized and the public API is available via:
// - window.initCookieBanner(options) - Initialize the cookie banner with options
// - window.CookieConsent.getConsent() - Get current consent status
// - window.CookieConsent.setConsent(consent) - Set consent status
// - window.CookieConsent.hasConsent(category) - Check if a specific category has consent

// Export the ConsentManager class for advanced usage
export { ConsentManager };

// For UMD builds, expose the API on the global object after the modules are loaded
if (typeof window !== 'undefined') {
  // Re-export the public API as CookieBanner for convenience
  window.CookieBanner = {
    init: window.initCookieBanner,
    getConsent: () => window.CookieConsent ? window.CookieConsent.getConsent() : null,
    setConsent: (consent) => window.CookieConsent ? window.CookieConsent.setConsent(consent) : null,
    hasConsent: (category) => window.CookieConsent ? window.CookieConsent.hasConsent(category) : false
  };
}

// Default export
export default typeof window !== 'undefined' ? window.CookieBanner : null;