/**
 * @file Validation and configuration preparation for subdomain
 * consent synchronization: domain/subdomain patterns, consent schema checks,
 * endpoint vetting, and config sanitization. Extracted from
 * subdomain-sync.js (see AFixt/cookie-banner#69).
 * @module subdomain-sync-validation
 */

/** Minimum allowed sync interval in ms */
export const MIN_SYNC_INTERVAL = 1000;

/** Strict domain name pattern */
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

/** Single-label subdomain pattern */
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

/**
 * Allowed config keys to prevent prototype pollution. `currentHostname` is a
 *  documented test-only override consumed by `getCurrentHostname()`.
 */
const ALLOWED_SYNC_CONFIG_KEYS = [
  'enabled',
  'primaryDomain',
  'allowedSubdomains',
  'syncEndpoint',
  'syncInterval',
  'usePostMessage',
  'currentHostname',
];

/**
 * Validate a domain name against a strict pattern
 * @param {string} domain - Domain to validate
 * @returns {boolean} Whether the domain is valid
 */
export function isValidDomain(domain) {
  return typeof domain === 'string' && DOMAIN_REGEX.test(domain) && domain.length <= 253;
}

/**
 * Keep only syntactically valid single-label subdomains
 * @param {Array} subdomains - Candidate subdomain list
 * @returns {string[]} Valid subdomains
 */
export function filterValidSubdomains(subdomains) {
  return (subdomains || []).filter(s => typeof s === 'string' && SUBDOMAIN_REGEX.test(s));
}

/**
 * Sanitize config by allowlisting known keys and validating values
 * @param {object} userConfig - User-provided configuration
 * @returns {object} Sanitized configuration
 */
export function sanitizeConfig(userConfig) {
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
 * @param {object} obj - Object to validate
 * @returns {object | null} Validated consent or null
 */
export function validateConsentSchema(obj) {
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
 * Validate that a sync endpoint URL is safe: HTTPS and on the primary domain
 * or an allowed subdomain of it.
 * @param {string} endpoint - URL to validate
 * @param {object} config - Sync configuration (primaryDomain, allowedSubdomains)
 * @returns {boolean} Whether the endpoint is valid
 */
export function isValidSyncEndpoint(endpoint, config) {
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
 * Merge, sanitize, and validate a user config against the defaults.
 * Normalizes the subdomain list, clamps the sync interval, and drops an
 * invalid endpoint. Reports a status the initializer maps to its logging
 * and early-return behavior.
 * @param {object} userConfig - User-provided configuration
 * @param {object} defaultConfig - Module defaults
 * @returns {{config: object, status: string}} Prepared config and one of
 *   'disabled' | 'invalid-domain' | 'ok'
 */
export function prepareSyncConfig(userConfig, defaultConfig) {
  const config = { ...defaultConfig, ...sanitizeConfig(userConfig) };

  if (!config.enabled || !config.primaryDomain) {
    return { config, status: 'disabled' };
  }

  // Validate primaryDomain format
  if (!isValidDomain(config.primaryDomain)) {
    return { config, status: 'invalid-domain' };
  }

  // Validate allowedSubdomains entries
  if (Array.isArray(config.allowedSubdomains)) {
    config.allowedSubdomains = filterValidSubdomains(config.allowedSubdomains);
  }

  // Enforce minimum sync interval
  if (typeof config.syncInterval === 'number' && config.syncInterval < MIN_SYNC_INTERVAL) {
    config.syncInterval = MIN_SYNC_INTERVAL;
  }

  // Validate sync endpoint if provided
  if (config.syncEndpoint && !isValidSyncEndpoint(config.syncEndpoint, config)) {
    config.syncEndpoint = null;
  }

  return { config, status: 'ok' };
}
