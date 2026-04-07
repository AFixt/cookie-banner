/**
 * @fileoverview Subdomain Consent Synchronization - Enterprise feature for cross-subdomain consent sharing
 * @module subdomain-sync
 * @author Karl Groves <karlgroves@gmail.com>
 * @version 1.0.0
 */

(function () {
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
   * Initialize subdomain consent synchronization
   * @param {SubdomainSyncConfig} userConfig - Configuration options
   * @returns {void}
   */
  function initSubdomainSync(userConfig = {}) {
    config = { ...defaultConfig, ...userConfig };

    if (!config.enabled || !config.primaryDomain) {
      console.log('[Cookie Banner] Subdomain sync disabled or no primary domain configured');
      return;
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
   * Check if current domain is allowed for sync
   * @returns {boolean} Whether the current domain is allowed
   */
  function isAllowedDomain() {
    const currentDomain = window.location.hostname;
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
    if (!remoteConsent) {
      return;
    }

    // Get local consent
    const localConsent = window.CookieConsent ? window.CookieConsent.getConsent() : null;

    // Compare timestamps - use most recent
    if (
      !localConsent ||
      !localConsent.timestamp ||
      (remoteConsent.timestamp &&
        new Date(remoteConsent.timestamp) > new Date(localConsent.timestamp))
    ) {
      // Update local consent with remote data
      if (window.CookieConsent && window.CookieConsent.setConsent) {
        // Temporarily remove listener to avoid loops
        document.removeEventListener('cookieConsentChanged', handleLocalConsentChange);

        window.CookieConsent.setConsent(remoteConsent);

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
    if (!config.syncEndpoint) {
      return;
    }

    try {
      const response = await fetch(config.syncEndpoint, {
        method: 'GET',
        credentials: 'include',
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
    if (!config.syncEndpoint) {
      return;
    }

    try {
      await fetch(config.syncEndpoint, {
        method: 'POST',
        credentials: 'include',
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
  
  // Allowed domains for sync: ['${config.allowedSubdomains.join("', '")}']
  const ALLOWED_DOMAINS = ${JSON.stringify(config.allowedSubdomains.map(s => s + '.' + config.primaryDomain))};
  ALLOWED_DOMAINS.push('${config.primaryDomain}');
  
  // Storage key
  const CONSENT_KEY = 'cookieConsent';
  
  // Handle incoming messages
  window.addEventListener('message', function(event) {
    // Validate origin
    const origin = new URL(event.origin).hostname;
    if (!ALLOWED_DOMAINS.some(domain => origin === domain || origin.endsWith('.' + domain))) {
      return;
    }
    
    // Handle message types
    switch (event.data.type) {
      case 'CONSENT_SYNC_REQUEST':
        // Send current consent back
        const consent = localStorage.getItem(CONSENT_KEY);
        event.source.postMessage({
          type: 'CONSENT_SYNC_RESPONSE',
          consent: consent ? JSON.parse(consent) : null
        }, event.origin);
        break;
        
      case 'CONSENT_SYNC_UPDATE':
        // Update local consent
        if (event.data.consent) {
          localStorage.setItem(CONSENT_KEY, JSON.stringify(event.data.consent));
          
          // Broadcast to other frames
          broadcastConsent(event.data.consent, event.origin);
        }
        break;
    }
  });
  
  // Broadcast consent to all allowed domains
  function broadcastConsent(consent, excludeOrigin) {
    // This would need to maintain references to all connected frames
    // For simplicity, we'll rely on periodic sync instead
  }
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
      currentDomain: window.location.hostname,
      isAllowed: isAllowedDomain(),
      syncMethod: config.usePostMessage ? 'postMessage' : 'api',
      isActive: !!(syncFrame || syncInterval),
    };
  }

  // Export API
  if (typeof window !== 'undefined') {
    window.CookieConsentSync = {
      init: initSubdomainSync,
      stop: stopSubdomainSync,
      getStatus: getSyncStatus,
      generateSyncHTML: generateSyncEndpointHTML,
    };
  }

  // CommonJS export for Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      initSubdomainSync,
      stopSubdomainSync,
      getSyncStatus,
      generateSyncEndpointHTML,
    };
  }
})();
