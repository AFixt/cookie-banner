/**
 * @file Cookie Auto-blocking Module - Prevents tracking scripts and cookies from loading before user consent
 * @module cookie-blocker
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

import {
  matchesInlineTracking,
  cookieBlockDecision,
  scriptBlockDecision,
} from './cookie-blocker-rules.js';
import {
  overrideCreateElement,
  overrideAppendMethods,
  overrideSetAttribute,
  restoreDomOverrides,
  createElementBypassingBlock,
  appendChildBypassingBlock,
} from './cookie-blocker-dom.js';
import { overrideCookieProperty, blockExistingCookies } from './cookie-blocker-cookies.js';

// See banner.js for why the IIFE result is captured into a module-level
// binding and re-exported: Rollup tree-shakes side-effect-only IIFE imports
// out of the published bundle. The exported binding below is what guarantees
// this module survives bundling.
const _blockerAPI = (function () {
  'use strict';

  // Blocked scripts and elements storage
  let blockedScripts = [];
  let isBlocking = true;
  let isInitialized = false;

  /**
   * Get the installed consent manager, if any
   * @returns {object | null} window.CookieConsent or null
   */
  function getConsentManager() {
    return typeof window !== 'undefined' && window.CookieConsent ? window.CookieConsent : null;
  }

  /**
   * Initialize the cookie blocker - sets up script and cookie blocking mechanisms
   * @function
   * @memberof CookieBlocker
   * @returns {void}
   * @example
   * // Initialize cookie blocker
   * window.CookieBlocker.init();
   */
  function initCookieBlocker() {
    if (typeof window === 'undefined') {
      return;
    }
    if (isInitialized) {
      return;
    } // Prevent multiple initializations

    isInitialized = true;

    const handlers = {
      shouldBlockScript,
      shouldBlockInlineScript,
      onBlocked: record => blockedScripts.push(record),
    };

    // Block cookies using document.cookie override - do this first
    overrideCookieProperty(shouldBlockCookie);

    // Block existing cookies on page load
    blockExistingCookies(shouldBlockCookie);

    // Override document.createElement to intercept script creation
    overrideCreateElement(handlers);

    // Override appendChild and insertBefore to intercept script insertion
    overrideAppendMethods(handlers);

    // Override setAttribute to catch src changes
    overrideSetAttribute(handlers);

    // Listen for consent changes
    document.addEventListener('cookieConsentChanged', handleConsentChange);
  }

  /**
   * Check if a cookie should be blocked based on current consent
   * @function
   * @param {string} cookieName - Name of the cookie to check
   * @returns {boolean} Whether the cookie should be blocked
   * @example
   * // Check if Google Analytics cookie should be blocked
   * const shouldBlock = shouldBlockCookie('_ga');
   */
  function shouldBlockCookie(cookieName) {
    if (!isBlocking) {
      return false;
    }
    return cookieBlockDecision(cookieName, getConsentManager());
  }

  /**
   * Check if a script URL should be blocked based on tracking patterns and consent
   * @function
   * @param {string} src - Script source URL to check
   * @returns {boolean} Whether the script should be blocked
   * @example
   * // Check if Google Analytics script should be blocked
   * const shouldBlock = shouldBlockScript('https://www.google-analytics.com/analytics.js');
   */
  function shouldBlockScript(src) {
    if (!isBlocking || !src) {
      return false;
    }
    return scriptBlockDecision(src, getConsentManager());
  }

  /**
   * Check if inline script content contains tracking code
   * @function
   * @param {string} content - Script content to check
   * @returns {boolean} Whether the script should be blocked
   */
  function shouldBlockInlineScript(content) {
    if (!isBlocking || !content) {
      return false;
    }
    return matchesInlineTracking(content);
  }

  /**
   * Check whether a consent object allows scripts of the given type
   * @param {string} type - Blocked script category
   * @param {object} consent - Consent detail from the change event
   * @returns {boolean} True when the script may now execute
   */
  function consentAllowsType(type, consent) {
    if (type === 'analytics') {
      return consent.analytics === true;
    }
    if (type === 'marketing') {
      return consent.marketing === true;
    }
    if (type === 'social') {
      return consent.social === true;
    }
    return false;
  }

  /**
   * Re-create and execute a previously blocked script, copying its
   * attributes, using the original DOM methods so the override is bypassed.
   * @param {object} blockedItem - Record captured when the script was blocked
   */
  function executeBlockedScript(blockedItem) {
    const { element, src, innerHTML } = blockedItem;

    console.log('Executing previously blocked script:', src || 'inline script');

    // Create a new script element and load it
    const newScript = createElementBypassingBlock('script');

    if (src) {
      newScript.src = src;
    } else if (innerHTML) {
      newScript.innerHTML = innerHTML;
    }

    if (element) {
      newScript.async = element.async || false;
      newScript.defer = element.defer || false;

      // Copy other attributes
      Array.from(element.attributes).forEach(attr => {
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
    }

    // Add to document using original appendChild to bypass our override
    appendChildBypassingBlock(document.head || document.body, newScript);
  }

  /**
   * Handle consent changes and unblock scripts accordingly
   * @param {CustomEvent} event - Consent change event
   */
  function handleConsentChange(event) {
    const consent = event.detail;

    // Blocking remains enabled globally; per-category consent is checked
    // below when deciding whether to unblock each previously blocked script.

    // Load previously blocked scripts based on new consent
    blockedScripts.forEach(blockedItem => {
      // Only unblock if explicit consent is granted for this script type
      if (consentAllowsType(blockedItem.type, consent)) {
        executeBlockedScript(blockedItem);
      }
    });

    // Clear blocked scripts that have been unblocked
    blockedScripts = blockedScripts.filter(item => {
      if (item.type === 'analytics' && consent.analytics) {
        return false;
      }
      if (item.type === 'marketing' && consent.marketing) {
        return false;
      }
      return true;
    });
  }

  /**
   * @typedef {object} BlockedScript
   * @property {HTMLScriptElement} element - The blocked script element
   * @property {string} src - The source URL of the blocked script
   * @property {string} type - The type of script (e.g., 'analytics', 'marketing')
   */

  /**
   * Get list of currently blocked scripts
   * @function
   * @returns {BlockedScript[]} Array of blocked script objects
   * @example
   * // Get all blocked scripts
   * const blocked = window.CookieBlocker.getBlocked();
   * console.log('Blocked scripts:', blocked);
   */
  function getBlockedScripts() {
    return [...blockedScripts];
  }

  /**
   * Reset the cookie blocker (for testing purposes)
   * @function
   * @returns {void}
   */
  function resetCookieBlocker() {
    // Restore original methods if they were overridden
    restoreDomOverrides();

    // Reset state
    blockedScripts = [];
    isBlocking = true;
    isInitialized = false;

    // Reset cookie override flag
    if (document._cookieBlockerOverridden) {
      delete document._cookieBlockerOverridden;
    }

    // Remove event listener
    document.removeEventListener('cookieConsentChanged', handleConsentChange);
  }

  // Return the public API; globals + auto-init are wired up outside the IIFE
  // so the bindings stay live for the bundler.
  return {
    initCookieBlocker,
    getBlockedScripts,
    resetCookieBlocker,
  };
})();

// Expose the cookie blocker API on `window` for script-tag consumers.
if (typeof window !== 'undefined') {
  /**
   * Cookie blocker API
   * @namespace window.CookieBlocker
   */
  window.CookieBlocker = Object.freeze({
    init: _blockerAPI.initCookieBlocker,
    getBlocked: _blockerAPI.getBlockedScripts,
    // Internal method for testing - not part of public API contract
    _reset: _blockerAPI.resetCookieBlocker,
  });

  /**
   * @deprecated Use window.CookieBlocker.init() instead
   */
  window.initCookieBlocker = _blockerAPI.initCookieBlocker;

  // Auto-initialize when script loads. Best-effort: never let init failures
  // propagate out of the module evaluation (tests mock Object.defineProperty
  // to throw at load time, and the consent UI should still load).
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _blockerAPI.initCookieBlocker);
    } else {
      _blockerAPI.initCookieBlocker();
    }
  } catch (err) {
    console.warn('[Cookie Banner] Cookie blocker auto-init failed:', err && err.message);
  }
}

// ES-module exports — referenced from `src/js/index.js` to defeat tree-shaking.
export const initCookieBlocker = _blockerAPI.initCookieBlocker;
export const getBlockedScripts = _blockerAPI.getBlockedScripts;
