/**
 * @fileoverview Generator for the static sync-endpoint HTML page that the
 * primary domain hosts for postMessage-based consent synchronization.
 * Extracted from subdomain-sync.js (see AFixt/cookie-banner#69).
 * @module subdomain-sync-html
 */

import { isValidDomain, filterValidSubdomains } from './subdomain-sync-validation.js';

/**
 * Create sync endpoint HTML file content
 * @param {Object} config - Sync configuration (primaryDomain, allowedSubdomains)
 * @returns {string} HTML content for the sync endpoint
 */
export function buildSyncEndpointHTML(config) {
  // Validate all config values before embedding in HTML to prevent XSS (C1)
  if (!isValidDomain(config.primaryDomain)) {
    console.error('[Cookie Banner] Cannot generate sync HTML: invalid primaryDomain');
    return '';
  }

  // Build the allowed domains list safely using only validated values
  const validSubdomains = filterValidSubdomains(config.allowedSubdomains);
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
