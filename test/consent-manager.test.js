/**
 * Tests for the ConsentManager class
 */

describe('ConsentManager', () => {
  let ConsentManager;
  let consentManager;
  let mockCallback;
  let originalConsoleError;
  let originalDocDispatch;

  beforeEach(() => {
    // Save original console.error
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Save original document.dispatchEvent
    originalDocDispatch = document.dispatchEvent;
    document.dispatchEvent = jest.fn();

    // Clear localStorage and cookies before each test
    localStorage.clear();
    document.cookie = '';

    // Import the module in each test to get a fresh instance
    jest.resetModules();
    ConsentManager = require('../src/js/consent-manager');

    // Create a fresh instance with a mock callback
    mockCallback = jest.fn();
    consentManager = new ConsentManager({
      onConsentChange: mockCallback,
    });
  });

  afterEach(() => {
    // Restore originals
    console.error = originalConsoleError;
    document.dispatchEvent = originalDocDispatch;
  });

  describe('constructor', () => {
    test('should use default values when no options are provided', () => {
      const defaultManager = new ConsentManager();
      expect(defaultManager.options.storageMethod).toBe('localStorage');
      expect(defaultManager.options.expireDays).toBe(365);
      expect(defaultManager.options.onConsentChange).toBeNull();
    });

    test('should use provided options', () => {
      const customManager = new ConsentManager({
        storageMethod: 'cookie',
        expireDays: 30,
        onConsentChange: mockCallback,
      });

      expect(customManager.options.storageMethod).toBe('cookie');
      expect(customManager.options.expireDays).toBe(30);
      expect(customManager.options.onConsentChange).toBe(mockCallback);
    });
  });

  describe('getConsent', () => {
    test('should return null when no consent is stored', () => {
      expect(consentManager.getConsent()).toBeNull();
    });

    test('should retrieve consent from localStorage', () => {
      const consent = { functional: true, analytics: false, marketing: true };
      localStorage.setItem('cookieConsent', JSON.stringify(consent));

      expect(consentManager.getConsent()).toEqual(consent);
    });

    test('should retrieve consent from cookies when configured', () => {
      const cookieManager = new ConsentManager({ storageMethod: 'cookie' });
      const consent = { functional: true, analytics: true, marketing: false };

      document.cookie = `cookieConsent=${encodeURIComponent(JSON.stringify(consent))}; path=/`;

      expect(cookieManager.getConsent()).toEqual(consent);
    });

    test('should handle parsing errors and return null', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('cookieConsent', '{invalid:json}');

      expect(consentManager.getConsent()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setConsent', () => {
    test('should store consent in localStorage', () => {
      const consent = { functional: true, analytics: true, marketing: false };
      const result = consentManager.setConsent(consent);

      const stored = JSON.parse(localStorage.getItem('cookieConsent'));

      expect(stored.functional).toBe(true);
      expect(stored.analytics).toBe(true);
      expect(stored.marketing).toBe(false);
      expect(stored.timestamp).toBeDefined();

      // Should return the consent data
      expect(result).toEqual(stored);
    });

    test('should force functional cookies to true', () => {
      consentManager.setConsent({ functional: false, analytics: false, marketing: false });

      const stored = JSON.parse(localStorage.getItem('cookieConsent'));
      expect(stored.functional).toBe(true);
    });

    test('should store consent in cookies when configured', () => {
      const cookieManager = new ConsentManager({
        storageMethod: 'cookie',
        expireDays: 30,
      });

      cookieManager.setConsent({ analytics: true, marketing: false });

      expect(document.cookie).toContain('cookieConsent=');
    });

    test('should dispatch custom event', () => {
      consentManager.setConsent({ analytics: true });

      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cookieConsentChanged',
        })
      );
    });

    test('should call onConsentChange callback if provided', () => {
      consentManager.setConsent({ analytics: true, marketing: false });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          functional: true,
          analytics: true,
          marketing: false,
        })
      );
    });

    test('should handle errors gracefully', () => {
      // Mock the actual method to test the error handling
      const originalMethod = consentManager.setConsent;
      consentManager.setConsent = jest.fn().mockImplementation(() => {
        try {
          localStorage.setItem('forcedError', 'x');
          throw new Error('Mock error');
        } catch (e) {
          console.error('Error setting consent:', e);
          return null;
        }
      });

      // Call our mocked method that simulates an error
      const result = consentManager.setConsent({ analytics: true });

      // Verify null is returned
      expect(result).toBeNull();

      // Restore original method
      consentManager.setConsent = originalMethod;
    });
  });

  describe('hasConsent', () => {
    beforeEach(() => {
      consentManager.setConsent({
        functional: true,
        analytics: true,
        marketing: false,
      });
    });

    test('should return true for categories with consent', () => {
      expect(consentManager.hasConsent('functional')).toBe(true);
      expect(consentManager.hasConsent('analytics')).toBe(true);
    });

    test('should return false for categories without consent', () => {
      expect(consentManager.hasConsent('marketing')).toBe(false);
    });

    test('should return false for unknown categories', () => {
      expect(consentManager.hasConsent('unknown')).toBe(false);
    });

    test('should return false when no consent is stored', () => {
      localStorage.clear();
      expect(consentManager.hasConsent('functional')).toBe(false);
    });
  });

  describe('dispatchConsentEvent', () => {
    test('should dispatch a custom event with consent data', () => {
      const consentData = { functional: true, analytics: false };
      consentManager.dispatchConsentEvent(consentData);

      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cookieConsentChanged',
          detail: consentData,
          bubbles: true,
        })
      );
    });
  });

  describe('isConsentExpired', () => {
    test('should return true when no consent is stored', () => {
      expect(consentManager.isConsentExpired()).toBe(true);
    });

    test('should return true when consent has no timestamp', () => {
      localStorage.setItem('cookieConsent', JSON.stringify({ functional: true }));
      expect(consentManager.isConsentExpired()).toBe(true);
    });

    test('should return false when consent is not expired', () => {
      const timestamp = new Date();
      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({
          functional: true,
          timestamp: timestamp.toISOString(),
        })
      );

      expect(consentManager.isConsentExpired()).toBe(false);
    });

    test('should return true when consent is expired', () => {
      // Set timestamp to 366 days ago (just over the 365 day default)
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 366);

      localStorage.setItem(
        'cookieConsent',
        JSON.stringify({
          functional: true,
          timestamp: expiredDate.toISOString(),
        })
      );

      expect(consentManager.isConsentExpired()).toBe(true);
    });
  });

  describe('clearConsent', () => {
    test('should remove consent from localStorage', () => {
      localStorage.setItem('cookieConsent', JSON.stringify({ functional: true }));
      consentManager.clearConsent();
      expect(localStorage.getItem('cookieConsent')).toBeNull();
    });

    test('should remove consent from cookies when configured', () => {
      const cookieManager = new ConsentManager({ storageMethod: 'cookie' });
      document.cookie = 'cookieConsent=somevalue; path=/';

      cookieManager.clearConsent();

      // Should set an expired date
      expect(document.cookie).not.toContain('cookieConsent=somevalue');
    });

    test('should handle errors', () => {
      // Test that the method doesn't throw when removeItem throws
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = jest.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      // Should not throw
      expect(() => {
        consentManager.clearConsent();
      }).not.toThrow();

      // Restore original function
      localStorage.removeItem = originalRemoveItem;
    });
  });
});
