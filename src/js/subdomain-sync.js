/**
 * @fileoverview Subdomain Consent Synchronization - Enterprise feature for cross-subdomain consent sharing
 * @module subdomain-sync
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

// See banner.js for why the IIFE result is captured into a module-level
// binding and re-exported.
const _subdomainSyncAPI = (function () {
  'use strict';

  /**
   * Configuration for subdomain sync
   * @typedef {Object} SubdomainSyncConfig
   * @property {boolean} enabled - Whether subdomain sync is enabled
   * @property {string} primaryDomain - The primary domain for consent storage
   * @property {string[]} allowedSubdomains - List of allowed subdomains
   * @property {string} syncEndpoint - Optional custom sync endpoint URL
   * @property {number} syncInterval - Interval in ms for sync checks (default: 5000)
   * @property {boolean} usePostMessage - Use postMessage for iframe communication
   */

  /** Minimum allowed sync interval in ms */
  const MIN_SYNC_INTERVAL = 1000;

  /** Strict domain name pattern */
  const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

  /** Allowed config keys to prevent prototype pollution. `currentHostname` is a
   *  documented test-only override consumed by `getCurrentHostname()`. */
  const ALLOWED_SYNC_CONFIG_KEYS = [
    'enabled',
    'primaryDomain',
    'allowedSubdomains',
    'syncEndpoint',
    'syncInterval',
    'usePostMessage',
    'currentHostname',
  ];

  const defaultConfig = {
    enabled: false,
    primaryDomain: null,
    allowedSubdomains: [],
    syncEndpoint: null,
    syncInterval: 5000,
    usePostMessage: true,
  };

  let config = { ...defaultConfig };
  let syncFrame = null;
  let syncInterval = null;

  /**
   * Validate a domain name against a strict pattern
   * @param {string} domain - Domain to validate
   * @returns {boolean} Whether the domain is valid
   */
  function isValidDomain(domain) {
    return typeof domain === 'string' && DOMAIN_REGEX.test(domain) && domain.length <= 253;
  }

  /**
   * Sanitize config by allowlisting known keys and validating values
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} Sanitized configuration
   */
  function sanitizeConfig(userConfig) {
    const sanitized = {};
    for (const key of ALLOWED_SYNC_CONFIG_KEYS) {
      if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
        sanitized[key] = userConfig[key];
      }
    }
    return sanitized;
  }

  /**
   * Validate a consent object against expected schema
   * @param {Object} obj - Object to validate
   * @returns {Object|null} Validated consent or null
   */
  function validateConsentSchema(obj) {
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
   * Validate that a sync endpoint URL is safe
   * @param {string} endpoint - URL to validate
   * @returns {boolean} Whether the endpoint is valid
   */
  function isValidSyncEndpoint(endpoint) {
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') {
        console.error('[Cookie Banner] Sync endpoint must use HTTPS');
        return false;
      }
      const validDomains = [
        config.primaryDomain,
        ...config.allowedSubdomains.map(s => s + '.' + config.primaryDomain),
      ];
      if (!validDomains.some(d => url.hostname === d)) {
        console.error('[Cookie Banner] Sync endpoint must be on an allowed domain');
        return false;
      }
      return true;
    } catch (e) {
      console.error('[Cookie Banner] Invalid sync endpoint URL:', e.message);
      return false;
    }
  }

  /**
   * Initialize subdomain consent synchronization
   * @param {SubdomainSyncConfig} userConfig - Configuration options
   * @returns {void}
   */
  function initSubdomainSync(userConfig = {}) {
    config = { ...defaultConfig, ...sanitizeConfig(userConfig) };

    if (!config.enabled || !config.primaryDomain) {
      console.log('[Cookie Banner] Subdomain sync disabled or no primary domain configured');
      return;
    }

    // Validate primaryDomain format
    if (!isValidDomain(config.primaryDomain)) {
      console.error('[Cookie Banner] Invalid primaryDomain format');
      return;
    }

    // Validate allowedSubdomains entries
    if (Array.isArray(config.allowedSubdomains)) {
      config.allowedSubdomains = config.allowedSubdomains.filter(
        s => typeof s === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(s)
      );
    }

    // Enforce minimum sync interval
    if (typeof config.syncInterval === 'number' && config.syncInterval < MIN_SYNC_INTERVAL) {
      config.syncInterval = MIN_SYNC_INTERVAL;
    }

    // Validate sync endpoint if provided
    if (config.syncEndpoint && !isValidSyncEndpoint(config.syncEndpoint)) {
      config.syncEndpoint = null;
    }

    // Validate current domain is allowed
    if (!isAllowedDomain()) {
      console.warn('[Cookie Banner] Current domain not in allowed subdomains list');
      return;
    }

    // Set up sync based on configuration
    if (config.usePostMessage) {
      setupPostMessageSync();
    } else if (config.syncEndpoint) {
      setupAPISync();
    }

    // Listen for local consent changes
    document.addEventListener('cookieConsentChanged', handleLocalConsentChange);
  }

  /**
   * Resolve the current hostname. Tests may override by setting
   * `currentHostname` in the config passed to `init`.
   * @returns {string}
   */
  function getCurrentHostname() {
    return config.currentHostname || window.location.hostname;
  }

  /**
   * Check if current domain is allowed for sync
   * @returns {boolean} Whether the current domain is allowed
   */
  function isAllowedDomain() {
    const currentDomain = getCurrentHostname();
    const primaryDomain = config.primaryDomain;

    // Check if we're on the primary domain
    if (currentDomain === primaryDomain) {
      return true;
    }

    // Always allow www subdomain
    if (currentDomain === `www.${primaryDomain}`) {
      return true;
    }

    // Check if we're on an allowed subdomain
    return config.allowedSubdomains.some(subdomain => {
      const fullSubdomain = subdomain + '.' + primaryDomain;
      return currentDomain === fullSubdomain;
    });
  }

  /**
   * Set up PostMessage-based synchronization using iframes
   * @returns {void}
   */
  function setupPostMessageSync() {
    // Register message handler immediately
    window.addEventListener('message', handleSyncMessage);

    // Create hidden iframe for cross-domain communication
    syncFrame = document.createElement('iframe');
    syncFrame.style.display = 'none';
    syncFrame.src = `https://${config.primaryDomain}/cookie-consent-sync.html`;
    syncFrame.sandbox = 'allow-scripts allow-same-origin';

    // Wait for iframe to load
    syncFrame.onload = () => {
      // Request current consent from primary domain
      requestConsentSync();

      // Set up periodic sync checks
      if (config.syncInterval > 0) {
        syncInterval = setInterval(requestConsentSync, config.syncInterval);
      }
    };

    document.body.appendChild(syncFrame);
  }

  /**
   * Set up API-based synchronization
   * @returns {void}
   */
  function setupAPISync() {
    // Initial sync
    fetchConsentFromAPI();

    // Set up periodic sync
    if (config.syncInterval > 0) {
      syncInterval = setInterval(fetchConsentFromAPI, config.syncInterval);
    }
  }

  /**
   * Handle messages from the sync iframe
   * @param {MessageEvent} event - The message event
   * @returns {void}
   */
  function handleSyncMessage(event) {
    // Validate origin
    const expectedOrigin = `https://${config.primaryDomain}`;
    if (event.origin !== expectedOrigin) {
      return;
    }

    // Validate message structure
    if (!event.data || !event.data.type) {
      return;
    }

    switch (event.data.type) {
      case 'CONSENT_SYNC_RESPONSE':
        handleRemoteConsent(event.data.consent);
        break;

      case 'CONSENT_SYNC_UPDATE':
        handleRemoteConsent(event.data.consent);
        break;

      default:
        // Unknown message type
        break;
    }
  }

  /**
   * Request consent sync from primary domain
   * @returns {void}
   */
  function requestConsentSync() {
    if (!syncFrame || !syncFrame.contentWindow) {
      return;
    }

    const message = {
      type: 'CONSENT_SYNC_REQUEST',
      domain: window.location.hostname,
    };

    syncFrame.contentWindow.postMessage(message, `https://${config.primaryDomain}`);
  }

  /**
   * Handle local consent changes and propagate to other domains
   * @param {CustomEvent} event - The consent change event
   * @returns {void}
   */
  function handleLocalConsentChange(event) {
    const consent = event.detail;

    if (config.usePostMessage && syncFrame && syncFrame.contentWindow) {
      // Send update via postMessage
      const message = {
        type: 'CONSENT_SYNC_UPDATE',
        consent: consent,
        domain: window.location.hostname,
      };

      syncFrame.contentWindow.postMessage(message, `https://${config.primaryDomain}`);
    } else if (config.syncEndpoint) {
      // Send update via API
      pushConsentToAPI(consent);
    }
  }

  /**
   * Handle remote consent data
   * @param {Object} remoteConsent - Consent data from remote domain
   * @returns {void}
   */
  function handleRemoteConsent(remoteConsent) {
    // Validate consent object against expected schema
    const validated = validateConsentSchema(remoteConsent);
    if (!validated) {
      return;
    }

    // Get local consent
    const localConsent = window.CookieConsent ? window.CookieConsent.getConsent() : null;

    // Compare timestamps - use most recent
    if (
      !localConsent ||
      !localConsent.timestamp ||
      (validated.timestamp && new Date(validated.timestamp) > new Date(localConsent.timestamp))
    ) {
      // Update local consent with remote data
      if (window.CookieConsent && window.CookieConsent.setConsent) {
        // Temporarily remove listener to avoid loops
        document.removeEventListener('cookieConsentChanged', handleLocalConsentChange);

        window.CookieConsent.setConsent(validated);

        // Re-add listener after a short delay
        setTimeout(() => {
          document.addEventListener('cookieConsentChanged', handleLocalConsentChange);
        }, 100);
      }
    }
  }

  /**
   * Fetch consent from API endpoint
   * @returns {Promise<void>}
   */
  async function fetchConsentFromAPI() {
    if (!config.syncEndpoint || !isValidSyncEndpoint(config.syncEndpoint)) {
      return;
    }

    try {
      const response = await fetch(config.syncEndpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        handleRemoteConsent(data.consent);
      }
    } catch (error) {
      console.error('[Cookie Banner] Failed to fetch consent from API:', error);
    }
  }

  /**
   * Push consent to API endpoint
   * @param {Object} consent - Consent data to push
   * @returns {Promise<void>}
   */
  async function pushConsentToAPI(consent) {
    if (!config.syncEndpoint || !isValidSyncEndpoint(config.syncEndpoint)) {
      return;
    }

    try {
      await fetch(config.syncEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consent: consent,
          domain: window.location.hostname,
        }),
      });
    } catch (error) {
      console.error('[Cookie Banner] Failed to push consent to API:', error);
    }
  }

  /**
   * Create sync endpoint HTML file content
   * @returns {string} HTML content for the sync endpoint
   */
  function generateSyncEndpointHTML() {
    // Validate all config values before embedding in HTML to prevent XSS (C1)
    if (!isValidDomain(config.primaryDomain)) {
      console.error('[Cookie Banner] Cannot generate sync HTML: invalid primaryDomain');
      return '';
    }

    // Build the allowed domains list safely using only validated values
    const validSubdomains = (config.allowedSubdomains || []).filter(
      s => typeof s === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(s)
    );
    const allowedDomains = validSubdomains.map(s => s + '.' + config.primaryDomain);
    allowedDomains.push(config.primaryDomain);

    // Use JSON.stringify for safe injection into script context
    const domainsJSON = JSON.stringify(allowedDomains);

    return `<!DOCTYPE html>
<html>
<head>
  <title>Cookie Consent Sync</title>
  <meta charset="utf-8">
</head>
<body>
<script>
(function() {
  'use strict';

  var ALLOWED_DOMAINS = ${domainsJSON};

  var CONSENT_KEY = 'cookieConsent';

  window.addEventListener('message', function(event) {
    var origin;
    try {
      origin = new URL(event.origin).hostname;
    } catch (e) {
      return;
    }
    // Use exact domain matching only (H4)
    if (ALLOWED_DOMAINS.indexOf(origin) === -1) {
      return;
    }

    if (!event.data || !event.data.type) {
      return;
    }

    switch (event.data.type) {
      case 'CONSENT_SYNC_REQUEST':
        var consent = localStorage.getItem(CONSENT_KEY);
        event.source.postMessage({
          type: 'CONSENT_SYNC_RESPONSE',
          consent: consent ? JSON.parse(consent) : null
        }, event.origin);
        break;

      case 'CONSENT_SYNC_UPDATE':
        if (event.data.consent) {
          localStorage.setItem(CONSENT_KEY, JSON.stringify(event.data.consent));
        }
        break;
    }
  });
})();
</script>
</body>
</html>`;
  }

  /**
   * Stop subdomain synchronization
   * @returns {void}
   */
  function stopSubdomainSync() {
    // Clear interval
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }

    // Remove iframe
    if (syncFrame && syncFrame.parentNode) {
      syncFrame.parentNode.removeChild(syncFrame);
      syncFrame = null;
    }

    // Remove event listeners
    window.removeEventListener('message', handleSyncMessage);
    document.removeEventListener('cookieConsentChanged', handleLocalConsentChange);
  }

  /**
   * Get sync status information
   * @returns {Object} Sync status
   */
  function getSyncStatus() {
    return {
      enabled: config.enabled,
      primaryDomain: config.primaryDomain,
      currentDomain: getCurrentHostname(),
      isAllowed: isAllowedDomain(),
      syncMethod: config.usePostMessage ? 'postMessage' : 'api',
      isActive: !!(syncFrame || syncInterval),
    };
  }

  return {
    initSubdomainSync,
    stopSubdomainSync,
    getSyncStatus,
    generateSyncEndpointHTML,
  };
})();

// Expose API on `window` for script-tag consumers.
if (typeof window !== 'undefined') {
  window.CookieConsentSync = {
    init: _subdomainSyncAPI.initSubdomainSync,
    stop: _subdomainSyncAPI.stopSubdomainSync,
    getStatus: _subdomainSyncAPI.getSyncStatus,
    generateSyncHTML: _subdomainSyncAPI.generateSyncEndpointHTML,
  };
}

// ES-module exports — referenced from `src/js/index.js` to defeat tree-shaking.
export const initSubdomainSync = _subdomainSyncAPI.initSubdomainSync;
export const stopSubdomainSync = _subdomainSyncAPI.stopSubdomainSync;
export const getSyncStatus = _subdomainSyncAPI.getSyncStatus;
export const generateSyncEndpointHTML = _subdomainSyncAPI.generateSyncEndpointHTML;
