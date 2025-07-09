/**
 * @fileoverview Cookie Auto-blocking Module - Prevents tracking scripts and cookies from loading before user consent
 * @module cookie-blocker
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

(function() {
  'use strict';

  // Common tracking script patterns to block
  const TRACKING_PATTERNS = [
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
    /fbc/
  ];

  // Cookie patterns to block by category
  const COOKIE_PATTERNS = {
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
      /^_dc_gtm/
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
      /^__Secure-3PSID/
    ],
    social: [
      /^__twitter_sess/,
      /^li_at/,
      /^li_gc/,
      /^bcookie/,
      /^bscookie/,
      /^lang/,
      /^lidc/
    ]
  };

  // Blocked scripts and elements storage
  let blockedScripts = [];
  let originalCreateElement = null;
  let originalAppendChild = null;
  let originalInsertBefore = null;
  let originalSetAttribute = null;
  let isBlocking = true;

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
    if (typeof window === 'undefined') return;

    // Block existing cookies on page load
    blockExistingCookies();

    // Override document.createElement to intercept script creation
    overrideCreateElement();

    // Override appendChild and insertBefore to intercept script insertion
    overrideAppendMethods();

    // Override setAttribute to catch src changes
    overrideSetAttribute();

    // Block cookies using document.cookie override
    overrideCookieProperty();

    // Listen for consent changes
    document.addEventListener('cookieConsentChanged', handleConsentChange);
  }

  /**
   * Block existing cookies based on patterns
   */
  function blockExistingCookies() {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (shouldBlockCookie(name)) {
        // Delete the cookie by setting it to expire immediately
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
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
    if (!isBlocking) return false;

    const consent = (typeof window !== 'undefined' && window.CookieConsent) ? window.CookieConsent.getConsent() : null;
    
    // If no consent yet, block all non-functional cookies
    if (!consent) {
      return !cookieName.startsWith('cookie-consent'); // Allow our own consent cookie
    }

    // Check against pattern categories
    for (const [category, patterns] of Object.entries(COOKIE_PATTERNS)) {
      if (!consent[category]) {
        for (const pattern of patterns) {
          if (pattern.test(cookieName)) {
            return true;
          }
        }
      }
    }

    return false;
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
    if (!isBlocking || !src) return false;

    const consent = (typeof window !== 'undefined' && window.CookieConsent) ? window.CookieConsent.getConsent() : null;
    
    // If no consent yet, block all tracking scripts
    if (!consent) {
      return TRACKING_PATTERNS.some(pattern => pattern.test(src));
    }

    // Block based on consent categories
    if (!consent.analytics || !consent.marketing) {
      return TRACKING_PATTERNS.some(pattern => pattern.test(src));
    }

    return false;
  }

  /**
   * Override document.createElement to intercept script creation
   */
  function overrideCreateElement() {
    if (originalCreateElement) return; // Already overridden

    originalCreateElement = document.createElement;
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        // Store reference to check later when src is set
        element._cookieBannerTracked = true;
        
        // Override the src setter
        let originalSrc = '';
        Object.defineProperty(element, 'src', {
          get: function() {
            return originalSrc;
          },
          set: function(value) {
            originalSrc = value;
            
            if (shouldBlockScript(value)) {
              console.log('[Cookie Banner] Blocked script:', value);
              blockedScripts.push({
                element: element,
                src: value,
                type: 'analytics' // Could be enhanced to detect type
              });
              return; // Don't actually set the src
            }
            
            // Set the src normally if not blocked
            originalCreateElement.call(document, 'script').src = value;
          },
          configurable: true
        });
      }
      
      return element;
    };
  }

  /**
   * Override appendChild and insertBefore methods
   */
  function overrideAppendMethods() {
    if (originalAppendChild) return; // Already overridden

    originalAppendChild = Node.prototype.appendChild;
    originalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.appendChild = function(child) {
      if (child.tagName === 'SCRIPT' && child._cookieBannerTracked && shouldBlockScript(child.src)) {
        console.log('[Cookie Banner] Blocked script appendChild:', child.src);
        return child; // Return the element but don't actually append it
      }
      return originalAppendChild.call(this, child);
    };

    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (newNode.tagName === 'SCRIPT' && newNode._cookieBannerTracked && shouldBlockScript(newNode.src)) {
        console.log('[Cookie Banner] Blocked script insertBefore:', newNode.src);
        return newNode; // Return the element but don't actually insert it
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  }

  /**
   * Override setAttribute to catch dynamic src changes
   */
  function overrideSetAttribute() {
    if (originalSetAttribute) return; // Already overridden

    originalSetAttribute = Element.prototype.setAttribute;

    Element.prototype.setAttribute = function(name, value) {
      if (this.tagName === 'SCRIPT' && name === 'src' && shouldBlockScript(value)) {
        console.log('[Cookie Banner] Blocked script setAttribute:', value);
        blockedScripts.push({
          element: this,
          src: value,
          type: 'analytics'
        });
        return; // Don't set the attribute
      }
      return originalSetAttribute.call(this, name, value);
    };
  }

  /**
   * Override document.cookie property to block cookie setting
   */
  function overrideCookieProperty() {
    // Check if cookie property has already been overridden
    const currentDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
    if (currentDescriptor && currentDescriptor.configurable === false) {
      // Already overridden and not configurable, skip
      return;
    }
    
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                   Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
    
    if (!originalCookieDescriptor) return;

    try {
      Object.defineProperty(document, 'cookie', {
        get: function() {
          return originalCookieDescriptor.get.call(this);
        },
        set: function(value) {
          const [cookieString] = value.split(';');
          const [name] = cookieString.split('=');
          
          if (shouldBlockCookie(name.trim())) {
            console.log('[Cookie Banner] Blocked cookie:', name);
            return; // Don't actually set the cookie
          }
          
          return originalCookieDescriptor.set.call(this, value);
        },
        configurable: true
      });
    } catch (e) {
      // Property may already be defined, ignore the error
      console.warn('[Cookie Banner] Could not override cookie property:', e.message);
    }
  }

  /**
   * Handle consent changes and unblock scripts accordingly
   * @param {CustomEvent} event - Consent change event
   */
  function handleConsentChange(event) {
    const consent = event.detail;
    
    // Load previously blocked scripts based on new consent
    blockedScripts.forEach(blockedItem => {
      const { element, src, type } = blockedItem;
      
      // Check if this script type is now allowed
      let shouldUnblock = false;
      
      if (type === 'analytics' && consent.analytics) {
        shouldUnblock = true;
      } else if (type === 'marketing' && consent.marketing) {
        shouldUnblock = true;
      }
      
      if (shouldUnblock) {
        console.log('Executing previously blocked script:', src);
        
        // Create a new script element and load it
        const newScript = document.createElement('script');
        newScript.src = src;
        newScript.async = element.async || false;
        newScript.defer = element.defer || false;
        
        // Copy other attributes
        Array.from(element.attributes).forEach(attr => {
          if (attr.name !== 'src') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        
        // Add to document
        (document.head || document.body).appendChild(newScript);
      }
    });

    // Clear blocked scripts that have been unblocked
    blockedScripts = blockedScripts.filter(item => {
      if (item.type === 'analytics' && consent.analytics) return false;
      if (item.type === 'marketing' && consent.marketing) return false;
      return true;
    });
  }

  /**
   * @typedef {Object} BlockedScript
   * @property {HTMLScriptElement} element - The blocked script element
   * @property {string} src - The source URL of the blocked script
   * @property {string} type - The type of script (e.g., 'analytics', 'marketing')
   */

  /**
   * Disable script and cookie blocking
   * @function
   * @returns {void}
   * @example
   * // Disable all blocking
   * window.CookieBlocker.disable();
   */
  function disableBlocking() {
    isBlocking = false;
  }

  /**
   * Enable script and cookie blocking
   * @function
   * @returns {void}
   * @example
   * // Enable all blocking
   * window.CookieBlocker.enable();
   */
  function enableBlocking() {
    isBlocking = true;
  }

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

  // Export functions to global scope
  if (typeof window !== 'undefined') {
    /**
     * Cookie blocker API
     * @namespace window.CookieBlocker
     * @property {Function} init - Initialize the cookie blocker
     * @property {Function} disable - Disable script and cookie blocking
     * @property {Function} enable - Enable script and cookie blocking
     * @property {Function} getBlocked - Get list of blocked scripts
     */
    window.CookieBlocker = {
      init: initCookieBlocker,
      disable: disableBlocking,
      enable: enableBlocking,
      getBlocked: getBlockedScripts
    };
    
    /**
     * Initialize the cookie blocker (backward compatibility)
     * @function
     * @memberof window
     * @deprecated Use window.CookieBlocker.init() instead
     */
    window.initCookieBlocker = initCookieBlocker;

    // Auto-initialize when script loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCookieBlocker);
    } else {
      initCookieBlocker();
    }
  }

})();