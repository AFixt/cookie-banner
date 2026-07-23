/**
 * Unit tests for subdomain-sync-validation.js — domain/endpoint vetting and
 * sync config preparation. Extracted units from #69.
 */

const {
  MIN_SYNC_INTERVAL,
  isValidDomain,
  filterValidSubdomains,
  sanitizeConfig,
  validateConsentSchema,
  isValidSyncEndpoint,
  prepareSyncConfig,
} = require('../src/js/subdomain-sync-validation.js');

const DEFAULTS = {
  enabled: false,
  primaryDomain: null,
  allowedSubdomains: [],
  syncEndpoint: null,
  syncInterval: 5000,
  usePostMessage: true,
};

describe('subdomain-sync-validation', () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  describe('isValidDomain', () => {
    test('accepts well-formed domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.co.uk')).toBe(true);
    });

    test('rejects malformed values', () => {
      expect(isValidDomain('-bad.com')).toBe(false);
      expect(isValidDomain('exa mple.com')).toBe(false);
      expect(isValidDomain('a'.repeat(254))).toBe(false);
      expect(isValidDomain(42)).toBe(false);
    });
  });

  describe('filterValidSubdomains', () => {
    test('keeps single labels and drops injection attempts', () => {
      expect(filterValidSubdomains(['app', 'www2', 'evil.com', '<script>', 7, null])).toEqual([
        'app',
        'www2',
      ]);
      expect(filterValidSubdomains(undefined)).toEqual([]);
    });
  });

  describe('sanitizeConfig', () => {
    test('drops keys outside the allowlist (prototype pollution guard)', () => {
      const sanitized = sanitizeConfig({
        enabled: true,
        primaryDomain: 'example.com',
        __proto__: { polluted: true },
        constructor: 'x',
        extraneous: 'y',
      });
      expect(sanitized).toEqual({ enabled: true, primaryDomain: 'example.com' });
    });
  });

  describe('validateConsentSchema', () => {
    test('normalizes shapes and rejects non-objects', () => {
      expect(validateConsentSchema(null)).toBeNull();
      expect(validateConsentSchema([])).toBeNull();
      expect(validateConsentSchema({ analytics: true })).toEqual({
        functional: false,
        analytics: true,
        marketing: false,
        timestamp: null,
      });
    });
  });

  describe('isValidSyncEndpoint', () => {
    const config = { primaryDomain: 'example.com', allowedSubdomains: ['app'] };

    test('accepts https endpoints on the primary domain or allowed subdomains', () => {
      expect(isValidSyncEndpoint('https://example.com/sync', config)).toBe(true);
      expect(isValidSyncEndpoint('https://app.example.com/sync', config)).toBe(true);
    });

    test('rejects http, foreign hosts, and unparseable URLs', () => {
      expect(isValidSyncEndpoint('http://example.com/sync', config)).toBe(false);
      expect(isValidSyncEndpoint('https://evil.com/sync', config)).toBe(false);
      expect(isValidSyncEndpoint('not a url', config)).toBe(false);
      expect(console.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('prepareSyncConfig', () => {
    test('reports disabled when sync is off or the primary domain is missing', () => {
      expect(prepareSyncConfig({}, DEFAULTS).status).toBe('disabled');
      expect(prepareSyncConfig({ enabled: true }, DEFAULTS).status).toBe('disabled');
    });

    test('reports invalid-domain for a malformed primary domain', () => {
      const prepared = prepareSyncConfig({ enabled: true, primaryDomain: 'bad domain' }, DEFAULTS);
      expect(prepared.status).toBe('invalid-domain');
    });

    test('filters subdomains, clamps the interval, and drops a bad endpoint', () => {
      const prepared = prepareSyncConfig(
        {
          enabled: true,
          primaryDomain: 'example.com',
          allowedSubdomains: ['app', 'evil.com'],
          syncInterval: 10,
          syncEndpoint: 'http://example.com/sync',
        },
        DEFAULTS
      );
      expect(prepared.status).toBe('ok');
      expect(prepared.config.allowedSubdomains).toEqual(['app']);
      expect(prepared.config.syncInterval).toBe(MIN_SYNC_INTERVAL);
      expect(prepared.config.syncEndpoint).toBeNull();
    });

    test('keeps a valid https endpoint on an allowed domain', () => {
      const prepared = prepareSyncConfig(
        {
          enabled: true,
          primaryDomain: 'example.com',
          syncEndpoint: 'https://example.com/consent-sync',
        },
        DEFAULTS
      );
      expect(prepared.config.syncEndpoint).toBe('https://example.com/consent-sync');
    });
  });
});
