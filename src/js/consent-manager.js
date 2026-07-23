/**
 * @file Consent Manager - Handles storage, retrieval, and validation of cookie consent
 * @module consent-manager
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

class ConsentManager {
  /**
   * Validate a consent object against expected schema (M1)
   * @param {object} obj - Object to validate
   * @returns {object | null} Validated consent or null
   */
  static validateConsent(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return null;
    }
    return {
      functional: obj.functional === true,
      analytics: obj.analytics === true,
      marketing: obj.marketing === true,
      timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : null,
    };
  }

  /**
   * Build a cookie string with proper security attributes (H1)
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {string} expires - Expiry date string
   * @returns {string} Complete cookie string
   */
  static buildSecureCookie(name, value, expires) {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    return `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
  }

  /**
   * Create a new ConsentManager instance
   * @param {object} options - Configuration options
   * @param {string} options.storageMethod - 'localStorage' or 'cookie'
   * @param {number} options.expireDays - Number of days before consent expires
   * @param {Function} options.onConsentChange - Callback for consent changes
   */
  constructor(options = {}) {
    this.options = {
      storageMethod: options.storageMethod || 'localStorage',
      expireDays: options.expireDays || 365,
      onConsentChange: options.onConsentChange || null,
    };

    this.consentKey = 'cookieConsent';
    // Escape consentKey for safe use in RegExp (M2)
    this._escapedConsentKey = this.consentKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get current consent settings
   * @returns {object | null} - Consent object or null if no consent is stored
   */
  getConsent() {
    try {
      let parsed = null;
      if (this.options.storageMethod === 'localStorage') {
        const storedConsent = localStorage.getItem(this.consentKey);
        parsed = storedConsent ? JSON.parse(storedConsent) : null;
      } else {
        // Cookie method - use escaped key for RegExp safety (M2)
        const match = document.cookie.match(new RegExp(`${this._escapedConsentKey}=([^;]+)`));
        parsed = match ? JSON.parse(decodeURIComponent(match[1])) : null;
      }
      // Validate parsed consent against expected schema (M1)
      return parsed ? ConsentManager.validateConsent(parsed) : null;
    } catch (e) {
      console.error('Error retrieving consent:', e);
      return null;
    }
  }

  /**
   * Set consent settings
   * @param {object} consent - Consent object with boolean values
   */
  setConsent(consent) {
    // Ensure functional cookies are always enabled
    const consentData = {
      ...consent,
      functional: true,
      timestamp: new Date().toISOString(),
    };

    const consentString = JSON.stringify(consentData);

    try {
      if (this.options.storageMethod === 'localStorage') {
        localStorage.setItem(this.consentKey, consentString);
      } else {
        // Cookie method - Set expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.options.expireDays);
        document.cookie = ConsentManager.buildSecureCookie(
          this.consentKey,
          encodeURIComponent(consentString),
          expiryDate.toUTCString()
        );
      }
    } catch (e) {
      console.error('Error setting consent:', e);
      return null;
    }

    // Dispatch event
    this.dispatchConsentEvent(consentData);

    // Call onConsentChange callback if provided
    if (typeof this.options.onConsentChange === 'function') {
      try {
        this.options.onConsentChange(consentData);
      } catch (e) {
        console.error('Error in onConsentChange callback:', e);
      }
    }

    return consentData;
  }

  /**
   * Check if consent is given for a specific category
   * @param {string} category - Category to check ('functional', 'analytics', 'marketing')
   * @returns {boolean} - True if consent is given, false otherwise
   */
  hasConsent(category) {
    const consent = this.getConsent();
    return consent ? !!consent[category] : false;
  }

  /**
   * Dispatch a custom event with consent data
   * @param {object} consentData - Consent data
   */
  dispatchConsentEvent(consentData) {
    try {
      const event = new CustomEvent('cookieConsentChanged', {
        detail: consentData,
        bubbles: true,
      });
      document.dispatchEvent(event);
    } catch (e) {
      console.error('Error dispatching consent event:', e);
    }
  }

  /**
   * Check if the consent is expired
   * @returns {boolean} - True if consent is expired or not set
   */
  isConsentExpired() {
    const consent = this.getConsent();
    if (!consent || !consent.timestamp) {
      return true;
    }

    const consentDate = new Date(consent.timestamp);
    const expiryDate = new Date(consentDate);
    expiryDate.setDate(expiryDate.getDate() + this.options.expireDays);

    return new Date() > expiryDate;
  }

  /**
   * Clear stored consent
   */
  clearConsent() {
    try {
      if (this.options.storageMethod === 'localStorage') {
        localStorage.removeItem(this.consentKey);
      } else {
        // Cookie method - Set expiry in the past
        document.cookie = ConsentManager.buildSecureCookie(
          this.consentKey,
          '',
          'Thu, 01 Jan 1970 00:00:00 UTC'
        );
      }
    } catch (e) {
      console.error('Error clearing consent:', e);
    }
  }
}

// Export the ConsentManager class
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ConsentManager;
} else {
  window.ConsentManager = ConsentManager;
}
