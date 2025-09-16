/**
 * @fileoverview Consent Manager - Handles storage, retrieval, and validation of cookie consent
 * @module consent-manager
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

class ConsentManager {
  /**
   * Create a new ConsentManager instance
   * @param {Object} options - Configuration options
   * @param {string} options.storageMethod - 'localStorage' or 'cookie'
   * @param {number} options.expireDays - Number of days before consent expires
   * @param {Function} options.onConsentChange - Callback for consent changes
   */
  constructor(options = {}) {
    this.options = {
      storageMethod: options.storageMethod || 'localStorage',
      expireDays: options.expireDays || 365,
      onConsentChange: options.onConsentChange || null
    };
    
    this.consentKey = 'cookieConsent';
  }

  /**
   * Get current consent settings
   * @returns {Object|null} - Consent object or null if no consent is stored
   */
  getConsent() {
    try {
      if (this.options.storageMethod === 'localStorage') {
        const storedConsent = localStorage.getItem(this.consentKey);
        return storedConsent ? JSON.parse(storedConsent) : null;
      } else {
        // Cookie method
        const match = document.cookie.match(new RegExp(`${this.consentKey}=([^;]+)`));
        return match ? JSON.parse(decodeURIComponent(match[1])) : null;
      }
    } catch (e) {
      console.error('Error retrieving consent:', e);
      return null;
    }
  }

  /**
   * Set consent settings
   * @param {Object} consent - Consent object with boolean values
   */
  setConsent(consent) {
    // Ensure functional cookies are always enabled
    const consentData = {
      ...consent,
      functional: true,
      timestamp: new Date().toISOString()
    };
    
    const consentString = JSON.stringify(consentData);
    
    try {
      if (this.options.storageMethod === 'localStorage') {
        localStorage.setItem(this.consentKey, consentString);
      } else {
        // Cookie method - Set expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.options.expireDays);
        document.cookie = `${this.consentKey}=${encodeURIComponent(consentString)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
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
   * @param {Object} consentData - Consent data
   */
  dispatchConsentEvent(consentData) {
    try {
      const event = new CustomEvent('cookieConsentChanged', {
        detail: consentData,
        bubbles: true
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
    if (!consent || !consent.timestamp) return true;
    
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
        document.cookie = `${this.consentKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
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