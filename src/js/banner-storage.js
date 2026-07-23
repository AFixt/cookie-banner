/**
 * @fileoverview Consent storage helpers for the cookie banner — validation,
 * secure cookie construction, and reading/writing consent from localStorage
 * or cookies. Extracted from banner.js (see AFixt/cookie-banner#69).
 * @module banner-storage
 */

/**
 * Validate a consent object against expected schema (M1)
 * @param {Object} obj - Object to validate
 * @returns {Object|null} Validated consent or null
 */
export function validateConsentData(obj) {
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
export function buildSecureCookie(name, value, expires) {
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
}

/**
 * Read consent from the configured storage backend.
 * @param {string} storageMethod - 'localStorage' or 'cookie'
 * @returns {Object|null} Validated consent object or null
 */
export function readStoredConsent(storageMethod) {
  try {
    let parsed = null;
    if (storageMethod === 'localStorage') {
      const storedConsent = localStorage.getItem('cookieConsent');
      parsed = storedConsent ? JSON.parse(storedConsent) : null;
    } else {
      // Cookie method
      const match = document.cookie.match(/cookieConsent=([^;]+)/);
      parsed = match ? JSON.parse(decodeURIComponent(match[1])) : null;
    }
    // Validate parsed consent against expected schema (M1)
    return parsed ? validateConsentData(parsed) : null;
  } catch (e) {
    console.error('Error retrieving consent:', e);
    return null;
  }
}

/**
 * Persist consent to the configured storage backend. Functional cookies are
 * always forced on and a timestamp is stamped onto the stored value.
 * @param {Object} consent - Consent object with boolean values
 * @param {Object} options - Storage options
 * @param {string} options.storageMethod - 'localStorage' or 'cookie'
 * @param {number} options.expireDays - Cookie lifetime in days
 * @returns {Object} The consent object as stored (with timestamp)
 */
export function writeStoredConsent(consent, { storageMethod, expireDays }) {
  const consentData = {
    ...consent,
    functional: true,
    timestamp: new Date().toISOString(),
  };

  const consentString = JSON.stringify(consentData);

  if (storageMethod === 'localStorage') {
    localStorage.setItem('cookieConsent', consentString);
  } else {
    // Cookie method - Set expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expireDays);
    document.cookie = buildSecureCookie(
      'cookieConsent',
      encodeURIComponent(consentString),
      expiryDate.toUTCString()
    );
  }

  return consentData;
}
