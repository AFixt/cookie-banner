/**
 * @fileoverview document.cookie override for the cookie blocker: wraps the
 * native cookie accessor so writes are vetted against the blocking rules,
 * with a simulated fallback for environments (like jsdom) where the native
 * descriptor is missing. Extracted from cookie-blocker.js (see
 * AFixt/cookie-banner#69).
 * @module cookie-blocker-cookies
 */

/**
 * Build a descriptor that simulates real cookie behavior on top of a plain
 * string, for environments where document.cookie is a simple value property
 * (e.g. some test environments).
 * @param {string} initialValue - Current document.cookie value
 * @returns {Object} Property descriptor with get/set
 */
function createSimulatedCookieDescriptor(initialValue) {
  let cookieStorage = initialValue || '';
  return {
    get: function () {
      return cookieStorage;
    },
    set: function (value) {
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
    configurable: true,
  };
}

/**
 * Locate the original document.cookie accessor descriptor, falling back to a
 * simulated one when the environment exposes cookie as a plain value.
 * @returns {Object|null} A descriptor with get/set, or null when unusable
 */
function resolveOriginalCookieDescriptor() {
  // Get the original cookie descriptor - try different locations
  let originalDescriptor =
    Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

  // If no descriptor found in prototypes, check document directly
  if (!originalDescriptor) {
    originalDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
    // If document.cookie is a simple value property (e.g., in test environment)
    if (!originalDescriptor || (!originalDescriptor.get && !originalDescriptor.set)) {
      originalDescriptor = createSimulatedCookieDescriptor(document.cookie);
    }
  }

  return originalDescriptor;
}

/**
 * Override document.cookie so writes are vetted by the supplied predicate.
 * Blocked writes are logged and dropped; failures in the blocking logic fail
 * closed (the cookie is not set — L4).
 * @param {Function} shouldBlockCookie - (cookieName) => boolean
 */
export function overrideCookieProperty(shouldBlockCookie) {
  // Check if cookie property has already been overridden by us
  if (document._cookieBlockerOverridden) {
    return;
  }

  const originalDescriptor = resolveOriginalCookieDescriptor();

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
      get: function () {
        try {
          return originalGet.call(this);
        } catch (error) {
          console.error('[Cookie Banner] Error getting cookie:', error.message);
          return '';
        }
      },
      set: function (value) {
        try {
          const [cookieString] = value.split(';');
          const [name] = cookieString.split('=');

          if (shouldBlockCookie(name.trim())) {
            console.log('Blocked cookie:', cookieString.trim());
            return; // Don't actually set the cookie
          }

          originalSet.call(this, value);
        } catch (error) {
          // Fail closed: do not set the cookie if blocking logic errors (L4)
          console.error('[Cookie Banner] Error in cookie blocking logic:', error.message);
          return;
        }
      },
    });

    // Mark as overridden
    document._cookieBlockerOverridden = true;
  } catch (e) {
    // Property may already be defined or not configurable
    console.warn('[Cookie Banner] Could not override cookie property:', e.message);
  }
}

/**
 * Expire existing cookies that the blocking predicate rejects.
 * @param {Function} shouldBlockCookie - (cookieName) => boolean
 */
export function blockExistingCookies(shouldBlockCookie) {
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
