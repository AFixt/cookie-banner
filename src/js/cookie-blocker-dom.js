/**
 * @fileoverview DOM API overrides for the cookie blocker: intercepts script
 * creation (document.createElement), insertion (appendChild/insertBefore),
 * and src assignment (setAttribute) so tracking scripts can be held back
 * until consent is granted. Extracted from cookie-blocker.js (see
 * AFixt/cookie-banner#69).
 * @module cookie-blocker-dom
 */

import { getTrackingKeyword, getScriptCategory } from './cookie-blocker-rules.js';

// Original DOM methods, captured when overrides are installed
let originalCreateElement = null;
let originalAppendChild = null;
let originalInsertBefore = null;
let originalSetAttribute = null;

/**
 * Create an element bypassing the createElement override (used to execute
 * previously blocked scripts once consent arrives).
 * @param {string} tagName - Tag to create
 * @returns {Element}
 */
export function createElementBypassingBlock(tagName) {
  const create = originalCreateElement || document.createElement;
  return create.call(document, tagName);
}

/**
 * Append a child bypassing the appendChild override.
 * @param {Element} parent - Parent element
 * @param {Element} child - Child to append
 * @returns {Element}
 */
export function appendChildBypassingBlock(parent, child) {
  const append = originalAppendChild || Element.prototype.appendChild;
  return append.call(parent, child);
}

/**
 * Classify a script node about to be inserted into the DOM. Returns the
 * block record when the node must be held back, or null to let it through.
 * Shared by the appendChild and insertBefore overrides.
 * @param {Element} node - Node being inserted
 * @param {Object} handlers - Blocking predicates from the coordinator
 * @param {Function} handlers.shouldBlockScript - (src) => boolean
 * @param {Function} handlers.shouldBlockInlineScript - (content) => boolean
 * @returns {Object|null} Block record or null
 */
function classifyScriptInsertion(node, handlers) {
  // A manual data-category attribute takes precedence over pattern matching
  const dataCategory = node.getAttribute && node.getAttribute('data-category');
  if (dataCategory) {
    return classifyByDeclaredCategory(node, dataCategory);
  }
  return classifyByContent(node, handlers);
}

/**
 * Classify a script that declares its own data-category attribute: blocked
 * unless the consent manager grants that category.
 * @param {Element} node - Script node
 * @param {string} dataCategory - Declared category
 * @returns {Object|null} Block record or null
 */
function classifyByDeclaredCategory(node, dataCategory) {
  const consentManager = window.CookieConsent;
  if (!consentManager || !consentManager.hasConsent || !consentManager.hasConsent(dataCategory)) {
    console.log('Blocked tracking script:', node.src || 'inline script');
    return {
      element: node,
      src: node.src,
      innerHTML: node.innerHTML,
      type: dataCategory,
    };
  }
  return null;
}

/**
 * Classify a script by its src URL or inline content against the blocking
 * predicates.
 * @param {Element} node - Script node
 * @param {Object} handlers - Blocking predicates from the coordinator
 * @returns {Object|null} Block record or null
 */
function classifyByContent(node, handlers) {
  // Check both external scripts and inline scripts
  if (node.src && handlers.shouldBlockScript(node.src)) {
    console.log('Blocked tracking script:', node.src);
    return {
      element: node,
      src: node.src,
      type: getScriptCategory(node.src),
    };
  }

  if (node.innerHTML && handlers.shouldBlockInlineScript(node.innerHTML)) {
    console.log('Blocked inline tracking script containing:', getTrackingKeyword(node.innerHTML));
    return {
      element: node,
      innerHTML: node.innerHTML,
      type: 'analytics',
    };
  }

  return null;
}

/**
 * Override document.createElement to intercept script creation. Each created
 * script gets a guarded `src` setter that consults the blocking predicate.
 * @param {Object} handlers - Callbacks from the coordinator
 * @param {Function} handlers.shouldBlockScript - (src) => boolean
 * @param {Function} handlers.onBlocked - (record) => void
 */
export function overrideCreateElement(handlers) {
  originalCreateElement = document.createElement;

  document.createElement = function (tagName) {
    const element = originalCreateElement.call(this, tagName);

    if (tagName.toLowerCase() === 'script') {
      // Store reference to check later when src is set
      element._cookieBannerTracked = true;
      installGuardedSrcSetter(element, handlers);
    }

    return element;
  };
}

/**
 * Install a src accessor on a script element that refuses blocked URLs.
 * @param {HTMLScriptElement} element - Script element to guard
 * @param {Object} handlers - Callbacks from the coordinator
 */
function installGuardedSrcSetter(element, handlers) {
  // Store reference to the original src descriptor to properly set src on non-blocked scripts
  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');

  let originalSrc = '';
  Object.defineProperty(element, 'src', {
    get: function () {
      return originalSrc;
    },
    set: function (value) {
      originalSrc = value;

      if (handlers.shouldBlockScript(value)) {
        console.log('[Cookie Banner] Blocked script:', value);
        handlers.onBlocked({
          element: element,
          src: value,
          type: 'analytics', // Could be enhanced to detect type
        });
        return; // Don't actually set the src
      }

      // Set the src normally using the original setter
      if (originalSrcDescriptor && originalSrcDescriptor.set) {
        originalSrcDescriptor.set.call(element, value);
      }
    },
    configurable: true,
  });
}

/**
 * Override appendChild and insertBefore to intercept script insertion.
 * @param {Object} handlers - Callbacks from the coordinator
 * @param {Function} handlers.shouldBlockScript - (src) => boolean
 * @param {Function} handlers.shouldBlockInlineScript - (content) => boolean
 * @param {Function} handlers.onBlocked - (record) => void
 */
export function overrideAppendMethods(handlers) {
  originalAppendChild = Element.prototype.appendChild;
  originalInsertBefore = Element.prototype.insertBefore;

  Element.prototype.appendChild = function (child) {
    if (child && child.tagName === 'SCRIPT') {
      const record = classifyScriptInsertion(child, handlers);
      if (record) {
        handlers.onBlocked(record);
        return child; // Return the element but don't actually append it
      }
    }
    return originalAppendChild.call(this, child);
  };

  Element.prototype.insertBefore = function (newNode, referenceNode) {
    if (newNode && newNode.tagName === 'SCRIPT') {
      const record = classifyScriptInsertion(newNode, handlers);
      if (record) {
        handlers.onBlocked(record);
        return newNode; // Return the element but don't actually insert it
      }
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

/**
 * Override setAttribute to catch dynamic src changes.
 * @param {Object} handlers - Callbacks from the coordinator
 * @param {Function} handlers.shouldBlockScript - (src) => boolean
 * @param {Function} handlers.onBlocked - (record) => void
 */
export function overrideSetAttribute(handlers) {
  originalSetAttribute = Element.prototype.setAttribute;

  Element.prototype.setAttribute = function (name, value) {
    if (this.tagName === 'SCRIPT' && name === 'src' && handlers.shouldBlockScript(value)) {
      console.log('[Cookie Banner] Blocked script setAttribute:', value);
      handlers.onBlocked({
        element: this,
        src: value,
        type: 'analytics',
      });
      return; // Don't set the attribute
    }
    return originalSetAttribute.call(this, name, value);
  };
}

/**
 * Restore every overridden DOM method to its original implementation.
 */
export function restoreDomOverrides() {
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
}
