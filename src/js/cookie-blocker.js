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
  let isInitialized = false;

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
    if (isInitialized) return; // Prevent multiple initializations

    isInitialized = true;

    // Block cookies using document.cookie override - do this first
    overrideCookieProperty();

    // Block existing cookies on page load
    blockExistingCookies();

    // Override document.createElement to intercept script creation
    overrideCreateElement();

    // Override appendChild and insertBefore to intercept script insertion
    overrideAppendMethods();

    // Override setAttribute to catch src changes
    overrideSetAttribute();

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

    const consentManager = (typeof window !== 'undefined' && window.CookieConsent) ? window.CookieConsent : null;
    
    // If no consent yet, block all non-functional cookies
    if (!consentManager) {
      return !cookieName.startsWith('cookie-consent'); // Allow our own consent cookie
    }

    // Check against pattern categories
    for (const [category, patterns] of Object.entries(COOKIE_PATTERNS)) {
      const hasConsent = consentManager.hasConsent ? consentManager.hasConsent(category) : false;
      if (!hasConsent) {
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

    const consentManager = (typeof window !== 'undefined' && window.CookieConsent) ? window.CookieConsent : null;
    
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

  /**
   * Check if inline script content contains tracking code
   * @function
   * @param {string} content - Script content to check
   * @returns {boolean} Whether the script should be blocked
   */
  function shouldBlockInlineScript(content) {
    if (!isBlocking || !content) return false;

    const inlineTrackingPatterns = [
      /ga\s*\(/,
      /gtag\s*\(/,
      /_gaq\./,
      /fbq\s*\(/,
      /dataLayer\.push/
    ];

    return inlineTrackingPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get the tracking keyword from inline script content
   * @function
   * @param {string} content - Script content
   * @returns {string} The tracking keyword found
   */
  function getTrackingKeyword(content) {
    const patterns = {
      'ga(': /ga\s*\(/,
      'gtag(': /gtag\s*\(/,
      '_gaq': /_gaq\./,
      'fbq(': /fbq\s*\(/,
      'dataLayer.push': /dataLayer\.push/
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
   * @function
   * @param {string} src - Script source URL
   * @returns {string} The script category ('analytics' or 'marketing')
   */
  function getScriptCategory(src) {
    if (!src) return 'analytics';
    
    if (src.match(/google-analytics|googletagmanager|_ga|_gid|_gat/i)) {
      return 'analytics';
    } else if (src.match(/facebook|twitter|linkedin|doubleclick/i)) {
      return 'marketing';
    }
    
    return 'analytics'; // Default to analytics
  }

  /**
   * Override document.createElement to intercept script creation
   */
  function overrideCreateElement() {
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
    originalAppendChild = Element.prototype.appendChild;
    originalInsertBefore = Element.prototype.insertBefore;

    Element.prototype.appendChild = function(child) {
      if (child && child.tagName === 'SCRIPT') {
        // Check for manual data-category attribute
        const dataCategory = child.getAttribute && child.getAttribute('data-category');
        if (dataCategory) {
          const consentManager = window.CookieConsent;
          if (!consentManager || !consentManager.hasConsent || !consentManager.hasConsent(dataCategory)) {
            console.log('Blocked tracking script:', child.src || 'inline script');
            // Debug: check data-category scripts
            if (child.src && child.src.includes('facebook')) {
              console.warn(`[Debug] Blocking Facebook script with type: ${dataCategory}`);
            }
            blockedScripts.push({
              element: child,
              src: child.src,
              innerHTML: child.innerHTML,
              type: dataCategory
            });
            return child; // Return the element but don't actually append it
          }
        }
        // Check both external scripts and inline scripts
        else if (child.src && shouldBlockScript(child.src)) {
          console.log('Blocked tracking script:', child.src);
          blockedScripts.push({
            element: child,
            src: child.src,
            type: getScriptCategory(child.src)
          });
          return child; // Return the element but don't actually append it
        } else if (child.innerHTML && shouldBlockInlineScript(child.innerHTML)) {
          console.log('Blocked inline tracking script containing:', getTrackingKeyword(child.innerHTML));
          blockedScripts.push({
            element: child,
            innerHTML: child.innerHTML,
            type: 'analytics'
          });
          return child; // Return the element but don't actually append it
        }
      }
      return originalAppendChild.call(this, child);
    };

    Element.prototype.insertBefore = function(newNode, referenceNode) {
      if (newNode && newNode.tagName === 'SCRIPT') {
        // Check for manual data-category attribute
        const dataCategory = newNode.getAttribute && newNode.getAttribute('data-category');
        if (dataCategory) {
          const consentManager = window.CookieConsent;
          if (!consentManager || !consentManager.hasConsent || !consentManager.hasConsent(dataCategory)) {
            console.log('Blocked tracking script:', newNode.src || 'inline script');
            blockedScripts.push({
              element: newNode,
              src: newNode.src,
              innerHTML: newNode.innerHTML,
              type: dataCategory
            });
            return newNode; // Return the element but don't actually insert it
          }
        }
        // Check both external scripts and inline scripts
        else if (newNode.src && shouldBlockScript(newNode.src)) {
          console.log('Blocked tracking script:', newNode.src);
          blockedScripts.push({
            element: newNode,
            src: newNode.src,
            type: getScriptCategory(newNode.src)
          });
          return newNode; // Return the element but don't actually insert it
        } else if (newNode.innerHTML && shouldBlockInlineScript(newNode.innerHTML)) {
          console.log('Blocked inline tracking script containing:', getTrackingKeyword(newNode.innerHTML));
          blockedScripts.push({
            element: newNode,
            innerHTML: newNode.innerHTML,
            type: 'analytics'
          });
          return newNode; // Return the element but don't actually insert it
        }
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  }

  /**
   * Override setAttribute to catch dynamic src changes
   */
  function overrideSetAttribute() {
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
    // Check if cookie property has already been overridden by us
    if (document._cookieBlockerOverridden) {
      return;
    }
    
    // Get the original cookie descriptor - try different locations
    let originalDescriptor = 
      Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
      Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
    
    // If no descriptor found in prototypes, check document directly
    if (!originalDescriptor) {
      originalDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      // If document.cookie is a simple value property (e.g., in test environment)
      if (!originalDescriptor || (!originalDescriptor.get && !originalDescriptor.set)) {
        // Create a backup storage and wrap the simple property
        let cookieStorage = document.cookie || '';
        originalDescriptor = {
          get: function() { return cookieStorage; },
          set: function(value) { 
            // Simulate real cookie behavior
            if (value) {
              const [cookiePart] = value.split(';');
              const [name, val] = cookiePart.split('=');
              if (name && val) {
                // Simple cookie storage simulation
                const cookies = cookieStorage ? cookieStorage.split('; ') : [];
                const updated = cookies.filter(c => !c.startsWith(name + '='));
                updated.push(cookiePart.trim());
                cookieStorage = updated.join('; ');
              }
            }
            return value;
          },
          configurable: true
        };
      }
    }
    
    if (!originalDescriptor || !originalDescriptor.set) {
      console.warn('[Cookie Banner] Could not find valid cookie descriptor');
      return;
    }

    try {
      // Store the original getter and setter
      const originalGet = originalDescriptor.get || (() => '');
      const originalSet = originalDescriptor.set;
      
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        enumerable: true,
        get: function() {
          try {
            return originalGet.call(this);
          } catch (error) {
            console.error('[Cookie Banner] Error getting cookie:', error.message);
            return '';
          }
        },
        set: function(value) {
          try {
            const [cookieString] = value.split(';');
            const [name] = cookieString.split('=');
            
            if (shouldBlockCookie(name.trim())) {
              console.log('Blocked cookie:', cookieString.trim());
              return; // Don't actually set the cookie
            }
            
            return originalSet.call(this, value);
          } catch (error) {
            // Log error but don't throw to handle gracefully
            console.error('[Cookie Banner] Error setting cookie:', error.message);
            // Try to set cookie anyway in case of error
            try {
              return originalSet.call(this, value);
            } catch (e) {
              // Silently fail
            }
            return;
          }
        }
      });
      
      // Mark as overridden
      document._cookieBlockerOverridden = true;
    } catch (e) {
      // Property may already be defined or not configurable
      console.warn('[Cookie Banner] Could not override cookie property:', e.message);
    }
  }

  /**
   * Handle consent changes and unblock scripts accordingly
   * @param {CustomEvent} event - Consent change event
   */
  function handleConsentChange(event) {
    const consent = event.detail;
    const consentManager = window.CookieConsent;
    
    // Update blocking state based on consent
    // If any tracking category has consent, disable blocking for those categories
    if (consentManager && consentManager.hasConsent) {
      // Check if we should stop blocking based on new consent
      const hasAnyTrackingConsent = consentManager.hasConsent('analytics') || 
                                     consentManager.hasConsent('marketing') || 
                                     consentManager.hasConsent('social');
      
      // Note: We keep blocking enabled per category, not globally
      // isBlocking remains true but we check per-category consent
    }
    
    // Load previously blocked scripts based on new consent
    blockedScripts.forEach(blockedItem => {
      const { element, src, innerHTML, type } = blockedItem;
      
      // Check if this script type is now allowed
      let shouldUnblock = false;
      
      // Only unblock if explicit consent is granted
      if (type === 'analytics') {
        shouldUnblock = consent.analytics === true;
      } else if (type === 'marketing') {
        shouldUnblock = consent.marketing === true;
      } else if (type === 'social') {
        shouldUnblock = consent.social === true;
      } else {
        shouldUnblock = false;
      }
      
      if (shouldUnblock) {
        console.log('Executing previously blocked script:', src || 'inline script');
        
        // Create a new script element and load it
        const newScript = originalCreateElement.call(document, 'script');
        
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
        originalAppendChild.call(document.head || document.body, newScript);
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

  /**
   * Reset the cookie blocker (for testing purposes)
   * @function
   * @returns {void}
   */
  function resetCookieBlocker() {
    // Restore original methods if they were overridden
    if (originalCreateElement) {
      document.createElement = originalCreateElement;
      originalCreateElement = null;
    }
    if (originalAppendChild) {
      Element.prototype.appendChild = originalAppendChild;
      originalAppendChild = null;
    }
    if (originalInsertBefore) {
      Element.prototype.insertBefore = originalInsertBefore;
      originalInsertBefore = null;
    }
    if (originalSetAttribute) {
      Element.prototype.setAttribute = originalSetAttribute;
      originalSetAttribute = null;
    }
    
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
      getBlocked: getBlockedScripts,
      reset: resetCookieBlocker
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