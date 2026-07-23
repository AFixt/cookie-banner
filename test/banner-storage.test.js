/**
 * Unit tests for banner-storage.js — consent validation, secure cookie
 * construction, and storage read/write. Extracted units from #69.
 */

const {
  validateConsentData,
  buildSecureCookie,
  readStoredConsent,
  writeStoredConsent,
} = require('../src/js/banner-storage.js');

describe('banner-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    console.error = jest.fn();
  });

  describe('validateConsentData', () => {
    test('returns null for non-objects, null, and arrays', () => {
      expect(validateConsentData('consent')).toBeNull();
      expect(validateConsentData(null)).toBeNull();
      expect(validateConsentData([true, true])).toBeNull();
      expect(validateConsentData(42)).toBeNull();
    });

    test('coerces non-boolean category values to false', () => {
      const result = validateConsentData({
        functional: 'yes',
        analytics: 1,
        marketing: true,
      });
      expect(result).toEqual({
        functional: false,
        analytics: false,
        marketing: true,
        timestamp: null,
      });
    });

    test('keeps a string timestamp and rejects other types', () => {
      const iso = '2026-01-01T00:00:00.000Z';
      expect(validateConsentData({ timestamp: iso }).timestamp).toBe(iso);
      expect(validateConsentData({ timestamp: 12345 }).timestamp).toBeNull();
    });
  });

  describe('buildSecureCookie', () => {
    test('builds a SameSite=Lax cookie string without Secure on http', () => {
      // jsdom test environment serves http://localhost
      const cookie = buildSecureCookie('name', 'value', 'Thu, 01 Jan 2026 00:00:00 GMT');
      expect(cookie).toBe(
        'name=value; expires=Thu, 01 Jan 2026 00:00:00 GMT; path=/; SameSite=Lax'
      );
      expect(cookie).not.toContain('Secure');
    });
  });

  describe('readStoredConsent', () => {
    test('reads and validates consent from localStorage', () => {
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ functional: true, analytics: true, marketing: false })
      );
      expect(readStoredConsent('localStorage')).toEqual({
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: null,
      });
    });

    test('returns null when nothing is stored', () => {
      expect(readStoredConsent('localStorage')).toBeNull();
    });

    test('reads consent from a cookie when configured for cookies', () => {
      document.cookie = `cookieConsent=${encodeURIComponent(
        JSON.stringify({ functional: true, analytics: false, marketing: false })
      )}`;
      expect(readStoredConsent('cookie')).toEqual({
        functional: true,
        analytics: false,
        marketing: false,
        timestamp: null,
      });
    });

    test('returns null and logs on corrupt stored JSON', () => {
      localStorage.setItem('cookieConsent', '{not json');
      expect(readStoredConsent('localStorage')).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error retrieving consent:', expect.anything());
    });

    test('rejects stored values that are not consent-shaped', () => {
      localStorage.setItem('cookieConsent', JSON.stringify(['a', 'b']));
      expect(readStoredConsent('localStorage')).toBeNull();
    });
  });

  describe('writeStoredConsent', () => {
    test('forces functional true and stamps a timestamp', () => {
      const stored = writeStoredConsent(
        { functional: false, analytics: true, marketing: false },
        { storageMethod: 'localStorage', expireDays: 365 }
      );
      expect(stored.functional).toBe(true);
      expect(typeof stored.timestamp).toBe('string');
      expect(JSON.parse(localStorage.getItem('cookieConsent'))).toEqual(stored);
    });

    test('writes to document.cookie when configured for cookies', () => {
      writeStoredConsent(
        { analytics: false, marketing: true },
        { storageMethod: 'cookie', expireDays: 1 }
      );
      expect(document.cookie).toContain('cookieConsent=');
      const roundTripped = readStoredConsent('cookie');
      expect(roundTripped.marketing).toBe(true);
      expect(roundTripped.functional).toBe(true);
    });
  });
});
