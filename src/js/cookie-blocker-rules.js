/**
 * @fileoverview Pattern tables and pure classification rules for the cookie
 * blocker: which cookies, script URLs, and inline snippets count as tracking,
 * and whether the current consent state allows them. Extracted from
 * cookie-blocker.js (see AFixt/cookie-banner#69).
 * @module cookie-blocker-rules
 */

// Common tracking script patterns to block
export const TRACKING_PATTERNS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /doubleclick\.net/,
  /facebook\.net/,
  /facebook\.com.*\/tr/,
  /twitter\.com.*\/analytics/,
  /linkedin\.com.*\/analytics/,
  /hotjar\.com/,
  /mixpanel\.com/,
  /segment\.com/,
  /amplitude\.com/,
  /fullstory\.com/,
  /_ga_/,
  /_gid/,
  /_gat/,
  /fbp/,
  /fbc/,
];

// Cookie patterns to block by category
export const COOKIE_PATTERNS = {
  analytics: [
    /^_ga/,
    /^_gid/,
    /^_gat/,
    /^_utm/,
    /^__utma/,
    /^__utmb/,
    /^__utmc/,
    /^__utmt/,
    /^__utmz/,
    /^_dc_gtm/,
  ],
  marketing: [
    /^_fbp/,
    /^_fbc/,
    /^fr/,
    /^tr/,
    /^IDE/,
    /^test_cookie/,
    /^ads-id/,
    /^_gcl_/,
    /^__Secure-3PAPISID/,
    /^__Secure-3PSID/,
  ],
  social: [/^__twitter_sess/, /^li_at/, /^li_gc/, /^bcookie/, /^bscookie/, /^lang/, /^lidc/],
};

const INLINE_TRACKING_PATTERNS = [/ga\s*\(/, /gtag\s*\(/, /_gaq\./, /fbq\s*\(/, /dataLayer\.push/];

/**
 * Check if inline script content contains tracking code
 * @param {string} content - Script content to check
 * @returns {boolean} Whether the content matches a tracking pattern
 */
export function matchesInlineTracking(content) {
  return INLINE_TRACKING_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Get the tracking keyword from inline script content
 * @param {string} content - Script content
 * @returns {string} The tracking keyword found
 */
export function getTrackingKeyword(content) {
  const patterns = {
    'ga(': /ga\s*\(/,
    'gtag(': /gtag\s*\(/,
    _gaq: /_gaq\./,
    'fbq(': /fbq\s*\(/,
    'dataLayer.push': /dataLayer\.push/,
  };

  for (const [keyword, pattern] of Object.entries(patterns)) {
    if (pattern.test(content)) {
      return keyword;
    }
  }

  return 'tracking code';
}

/**
 * Get the category of a script based on its URL
 * @param {string} src - Script source URL
 * @returns {string} The script category ('analytics' or 'marketing')
 */
export function getScriptCategory(src) {
  if (!src) {
    return 'analytics';
  }

  if (src.match(/google-analytics|googletagmanager|_ga|_gid|_gat/i)) {
    return 'analytics';
  } else if (src.match(/facebook|twitter|linkedin|doubleclick/i)) {
    return 'marketing';
  }

  return 'analytics'; // Default to analytics
}

/**
 * Decide whether a cookie should be blocked given the current consent
 * manager. Pure with respect to module state — the caller supplies the
 * consent manager (or null when consent has not been given yet).
 * @param {string} cookieName - Name of the cookie to check
 * @param {Object|null} consentManager - window.CookieConsent or null
 * @returns {boolean} Whether the cookie should be blocked
 */
export function cookieBlockDecision(cookieName, consentManager) {
  // If no consent yet, block all non-functional cookies
  if (!consentManager) {
    return !cookieName.startsWith('cookie-consent'); // Allow our own consent cookie
  }

  // Check against pattern categories
  for (const [category, patterns] of Object.entries(COOKIE_PATTERNS)) {
    const hasConsent = consentManager.hasConsent ? consentManager.hasConsent(category) : false;
    if (!hasConsent && patterns.some(pattern => pattern.test(cookieName))) {
      return true;
    }
  }

  return false;
}

/**
 * Decide whether a script URL should be blocked given the current consent
 * manager. Pure with respect to module state.
 * @param {string} src - Script source URL to check
 * @param {Object|null} consentManager - window.CookieConsent or null
 * @returns {boolean} Whether the script should be blocked
 */
export function scriptBlockDecision(src, consentManager) {
  // If no consent manager or no consent yet, block all tracking scripts
  if (!consentManager || !consentManager.hasConsent) {
    return TRACKING_PATTERNS.some(pattern => pattern.test(src));
  }

  // Get the script category based on pattern matching
  let scriptCategory = null;
  if (src.match(/google-analytics|googletagmanager|_ga|_gid|_gat/i)) {
    scriptCategory = 'analytics';
  } else if (src.match(/facebook|twitter|linkedin|doubleclick/i)) {
    scriptCategory = 'marketing';
  }

  // Check consent for the category
  if (scriptCategory && !consentManager.hasConsent(scriptCategory)) {
    return true;
  }

  // Default: block if matches any tracking pattern and no consent
  return TRACKING_PATTERNS.some(pattern => pattern.test(src));
}
