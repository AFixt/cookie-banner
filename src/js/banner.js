/**
 * @file Accessible Cookie Banner - Main functionality for banner and preference modal
 * @module banner
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

import { readStoredConsent, writeStoredConsent } from './banner-storage.js';
import { createBannerElement, createModalElement } from './banner-dom.js';
import { createFocusManager } from './banner-focus.js';

// Wrapped in an IIFE so the existing internal helpers, state, and indentation
// stay untouched while still surfacing the public API as ES-module exports.
// Without the explicit export+import chain in index.js, Rollup's tree-shaker
// previously dropped this entire module from the published bundle and left
// `window.initCookieBanner` undefined. See AFixt/cookie-banner#... for context.
const _bannerAPI = (function () {
  'use strict';

  // Default configuration
  const defaultConfig = {
    locale: 'en',
    theme: 'light',
    showModal: true,
    onConsentChange: null,
    storageMethod: 'localStorage', // or 'cookie'
    expireDays: 365,
    categories: {
      functional: true,
      analytics: false,
      marketing: false,
    },
  };

  /** Allowed config keys to prevent prototype pollution (H5) */
  const ALLOWED_BANNER_CONFIG_KEYS = [
    'locale',
    'theme',
    'showModal',
    'onConsentChange',
    'storageMethod',
    'expireDays',
    'categories',
  ];

  /** Locale format pattern (M4) */
  const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

  // State
  let config = {};
  let banner = null;
  let modal = null;
  let localeStrings = {};
  let isModalOpen = false;
  const focusManager = createFocusManager();

  /**
   * Initialize the cookie banner
   * @param {object} userConfig - Configuration options
   */
  function initCookieBanner(userConfig = {}) {
    try {
      // Merge user configuration with defaults using allowlisted keys (H5)
      const sanitized = {};
      for (const key of ALLOWED_BANNER_CONFIG_KEYS) {
        if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
          sanitized[key] = userConfig[key];
        }
      }
      config = { ...defaultConfig, ...sanitized };

      // Check if consent is already given
      const consent = window.CookieConsent
        ? window.CookieConsent.getConsent()
        : getConsentFromStorage();
      if (consent && Object.prototype.hasOwnProperty.call(consent, 'functional')) {
        // User has already made a choice
        dispatchConsentEvent(consent);
        return Promise.resolve();
      }

      // Load locale strings. The chain resolves with no value by contract;
      // callers only await completion.
      /* eslint-disable promise/always-return */
      return loadLocaleStrings(config.locale)
        .then(() => {
          try {
            // Create and append banner
            banner = createBannerElement(config, localeStrings);
            document.body.appendChild(banner);

            // Create and append modal if enabled
            if (config.showModal) {
              modal = createModalElement(config, localeStrings);
              document.body.appendChild(modal);
            }

            // Add event listeners
            addEventListeners();
          } catch (error) {
            console.error('Failed to initialize cookie banner:', error);
            throw error;
          }
        })
        .catch(error => {
          console.error('Failed to initialize cookie banner:', error);
          throw error;
        });
      /* eslint-enable promise/always-return */
    } catch (error) {
      console.error('Failed to initialize cookie banner:', error);
      throw error;
    }
  }

  /**
   * Load locale strings based on configured locale
   * @param {string} locale - Locale code (e.g., 'en')
   * @returns {Promise}
   */
  function loadLocaleStrings(locale) {
    return new Promise(resolve => {
      // Use default English strings as fallback
      localeStrings = {
        description: 'We use cookies to improve your experience.',
        acceptAll: 'Accept All',
        rejectAll: 'Reject All',
        customize: 'Customize',
        modal: {
          title: 'Cookie Preferences',
          functional: 'Functional Cookies (Required)',
          analytics: 'Allow Analytics Cookies',
          marketing: 'Allow Marketing Cookies',
          save: 'Save Preferences',
          cancel: 'Cancel',
        },
      };

      // Try to load locale file if not English
      if (locale !== 'en') {
        // Validate locale format to prevent path traversal (M4)
        if (!LOCALE_REGEX.test(locale)) {
          console.warn(`Invalid locale format '${locale}', using default English.`);
          return resolve();
        }
        fetch(`locales/${locale}.json`)
          .then(response => {
            if (!response.ok) {
              console.warn(`Locale ${locale} not found, using default English.`);
              return resolve();
            }
            return response.json();
          })
          .then(data => {
            // Merge with defaults to ensure all required properties exist
            localeStrings = {
              ...localeStrings,
              ...data,
              modal: {
                ...localeStrings.modal,
                ...(data.modal || {}),
              },
            };
            resolve();
          })
          .catch(error => {
            console.warn(`Failed to load locale ${locale}, using default English:`, error);
            resolve();
          });
      } else {
        resolve();
      }
    });
  }

  /**
   * Add keyboard event handler to button
   * @param button
   * @param callback
   */
  function addKeyboardHandler(button, callback) {
    button.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        callback();
      }
    });
  }

  /**
   * Route a consent decision through an external CookieConsent manager when
   * one is installed, otherwise store it directly. Shared by the accept,
   * reject, and save-preferences paths.
   * @param {object} consentData - Consent object with boolean values
   */
  function applyConsent(consentData) {
    if (window.CookieConsent && window.CookieConsent.setConsent !== setConsent) {
      window.CookieConsent.setConsent(consentData);
      // Also dispatch the event and call callbacks
      dispatchConsentEvent(consentData);
      if (typeof config.onConsentChange === 'function') {
        config.onConsentChange(consentData);
      }
    } else {
      setConsent(consentData);
    }
  }

  /**
   * Add event listeners to buttons and form
   */
  function addEventListeners() {
    // Accept all button
    const acceptAllHandler = () => {
      try {
        applyConsent({ functional: true, analytics: true, marketing: true });
        hideBanner();
      } catch (error) {
        console.error('[Cookie Banner] Error setting consent:', error);
      }
    };

    const acceptBtn = document.querySelector('#accept-all');
    acceptBtn.addEventListener('click', acceptAllHandler);
    addKeyboardHandler(acceptBtn, acceptAllHandler);

    // Reject all button (functional is always required)
    const rejectAllHandler = () => {
      try {
        applyConsent({ functional: true, analytics: false, marketing: false });
        hideBanner();
      } catch (error) {
        console.error('[Cookie Banner] Error setting consent:', error);
      }
    };

    const rejectBtn = document.querySelector('#reject-all');
    rejectBtn.addEventListener('click', rejectAllHandler);
    addKeyboardHandler(rejectBtn, rejectAllHandler);

    // Customize button
    const customizeBtn = document.querySelector('#customize-preferences');
    if (customizeBtn && config.showModal) {
      customizeBtn.addEventListener('click', e => {
        // Store the element that triggered the modal opening
        focusManager.rememberTrigger(e.target);
        openModal();
      });
    }

    // Modal events (if enabled)
    if (config.showModal) {
      // Close button
      document.querySelector('#close-modal').addEventListener('click', closeModal);

      // Form submission
      document.querySelector('#cookie-form').addEventListener('submit', e => {
        e.preventDefault();
        try {
          const form = e.target;
          applyConsent({
            functional: true, // Always required
            analytics: form.elements.analytics.checked,
            marketing: form.elements.marketing.checked,
          });
          closeModal();
          hideBanner();
        } catch (error) {
          console.error('[Cookie Banner] Error setting consent:', error);
        }
      });

      // Close modal on Escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isModalOpen) {
          closeModal();
        }
      });

      // Trap focus in modal
      modal.addEventListener('keydown', focusManager.trapFocus);
    }
  }

  /**
   * Open the preferences modal
   */
  function openModal() {
    if (!modal) {
      return;
    }

    // Show the modal
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    isModalOpen = true;

    // Record prior focus and move focus into the dialog
    focusManager.captureFocus(modal);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'cookie-modal-overlay';
    document.body.appendChild(overlay);
  }

  /**
   * Close the preferences modal
   */
  function closeModal() {
    if (!modal) {
      return;
    }

    // Hide the modal
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    isModalOpen = false;

    // Remove overlay
    const overlay = document.querySelector('#cookie-modal-overlay');
    if (overlay) {
      overlay.remove();
    }

    // Return focus to the element that had focus before opening the modal
    focusManager.restoreFocus();
  }

  /**
   * Hide the cookie banner
   */
  function hideBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  /**
   * Get current consent settings from storage directly
   * @returns {object | null} - Consent object or null if no consent is stored
   */
  function getConsentFromStorage() {
    return readStoredConsent(config.storageMethod);
  }

  /**
   * Get current consent settings (public API)
   * @returns {object | null} - Consent object or null if no consent is stored
   */
  function getConsent() {
    return getConsentFromStorage();
  }

  /**
   * Set consent settings
   * @param {object} consent - Consent object with boolean values
   */
  function setConsent(consent) {
    try {
      const consentData = writeStoredConsent(consent, {
        storageMethod: config.storageMethod,
        expireDays: config.expireDays,
      });

      // Dispatch event
      dispatchConsentEvent(consentData);

      // Call onConsentChange callback if provided
      if (typeof config.onConsentChange === 'function') {
        config.onConsentChange(consentData);
      }
    } catch (e) {
      console.error('Error setting consent:', e);
    }
  }

  /**
   * Check if consent is given for a specific category
   * @param {string} category - Category to check ('functional', 'analytics', 'marketing')
   * @returns {boolean} - True if consent is given, false otherwise
   */
  function hasConsent(category) {
    const consent = getConsentFromStorage();
    return consent ? !!consent[category] : false;
  }

  /**
   * Dispatch a custom event with consent data
   * @param {object} consentData - Consent data
   */
  function dispatchConsentEvent(consentData) {
    const event = new CustomEvent('cookieConsentChanged', {
      detail: consentData,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  // Return the public API so it survives Rollup tree-shaking via the module
  // binding below. Globals are set outside the IIFE for the same reason.
  return { initCookieBanner, getConsent, setConsent, hasConsent };
})();

// Expose the renderer on `window` for script-tag and ESM consumers alike.
if (typeof window !== 'undefined') {
  window.initCookieBanner = _bannerAPI.initCookieBanner;

  // Only create CookieConsent if it doesn't already exist
  if (!window.CookieConsent) {
    window.CookieConsent = {
      getConsent: _bannerAPI.getConsent,
      setConsent: _bannerAPI.setConsent,
      hasConsent: _bannerAPI.hasConsent,
    };
  }
}

// ES-module exports. The fact that these are imported from `src/js/index.js`
// is what guarantees Rollup keeps `_bannerAPI` (and therefore the entire IIFE)
// in the published bundle.
export const initCookieBanner = _bannerAPI.initCookieBanner;
export const getConsent = _bannerAPI.getConsent;
export const setConsent = _bannerAPI.setConsent;
export const hasConsent = _bannerAPI.hasConsent;
