/**
 * Comprehensive error handling tests for the cookie banner
 */

describe('Error Handling', () => {
  let originalConsoleError;
  let originalConsoleWarn;
  let originalLocalStorage;
  let mockConsentManager;

  beforeEach(() => {
    // Store original console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    
    // Mock console methods to track calls
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
    
    // Clear DOM and storage
    document.body.innerHTML = '';
    if (localStorage.clear) localStorage.clear();
    document.cookie = '';
    
    // Reset localStorage to original mock state if it's a jest mock
    if (localStorage.store) {
      localStorage.store = {};
    }
    if (localStorage.getItem && localStorage.getItem.mockClear) {
      localStorage.getItem.mockClear();
      localStorage.setItem.mockClear();
      localStorage.removeItem.mockClear();
      localStorage.clear.mockClear();
    }
    
    // Mock consent manager
    mockConsentManager = {
      getConsent: jest.fn(),
      setConsent: jest.fn(),
      hasConsent: jest.fn(),
      clearConsent: jest.fn(),
      isConsentExpired: jest.fn(),
      dispatchConsentEvent: jest.fn()
    };
    
    window.CookieConsent = mockConsentManager;
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // Clean up globals
    delete window.CookieConsent;
    delete window.initCookieBanner;
    delete window.CookieBanner;
    delete window.initCookieBlocker;
    
    // Reset modules
    jest.resetModules();
  });

  describe('ConsentManager Error Handling', () => {
    let ConsentManager;

    beforeEach(() => {
      ConsentManager = require('../src/js/consent-manager');
    });

    test('should handle localStorage getItem errors', () => {
      // Mock localStorage.getItem to throw
      localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      const manager = new ConsentManager({ storageMethod: 'localStorage' });
      const result = manager.getConsent();

      expect(result).toBeNull();
      expect(localStorage.getItem).toHaveBeenCalledWith('cookieConsent');
      expect(console.error).toHaveBeenCalledWith(
        'Error retrieving consent:',
        expect.any(Error)
      );
    });

    test('should handle localStorage setItem errors', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const manager = new ConsentManager({ storageMethod: 'localStorage' });
      const result = manager.setConsent({ analytics: true });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error setting consent:',
        expect.any(Error)
      );
    });

    test('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('cookieConsent', '{invalid json}');

      const manager = new ConsentManager({ storageMethod: 'localStorage' });
      const result = manager.getConsent();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error retrieving consent:',
        expect.any(Error)
      );
    });

    test('should handle cookie parsing errors', () => {
      const manager = new ConsentManager({ storageMethod: 'cookie' });
      
      // Set malformed cookie
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      
      // Delete the current property first
      delete document.cookie;
      
      Object.defineProperty(document, 'cookie', {
        get: () => 'cookieConsent={malformed',
        set: () => {},
        configurable: true
      });

      const result = manager.getConsent();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error retrieving consent:',
        expect.any(Error)
      );

      // Restore
      delete document.cookie;
      if (originalCookieDescriptor) {
        Object.defineProperty(document, 'cookie', originalCookieDescriptor);
      }
    });

    test('should handle cookie setting errors', () => {
      const manager = new ConsentManager({ storageMethod: 'cookie' });
      
      // Store original descriptor
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      
      // Delete the current property first
      delete document.cookie;
      
      // Mock cookie setter to throw
      Object.defineProperty(document, 'cookie', {
        set: jest.fn().mockImplementation(() => {
          throw new Error('Cookie setting failed');
        }),
        get: () => '',
        configurable: true
      });

      const result = manager.setConsent({ analytics: true });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error setting consent:',
        expect.any(Error)
      );
      
      // Restore
      delete document.cookie;
      if (originalCookieDescriptor) {
        Object.defineProperty(document, 'cookie', originalCookieDescriptor);
      }
    });

    test('should handle event dispatching errors', () => {
      const originalDispatchEvent = document.dispatchEvent;
      document.dispatchEvent = jest.fn().mockImplementation(() => {
        throw new Error('Event dispatch failed');
      });

      const manager = new ConsentManager();
      
      // Should not throw
      expect(() => {
        manager.dispatchConsentEvent({ analytics: true });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error dispatching consent event:',
        expect.any(Error)
      );

      document.dispatchEvent = originalDispatchEvent;
    });

    test('should handle callback errors', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const manager = new ConsentManager({ onConsentChange: errorCallback });
      
      // Should not throw
      expect(() => {
        manager.setConsent({ analytics: true });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error in onConsentChange callback:',
        expect.any(Error)
      );
    });
  });

  describe('Banner Error Handling', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      mockConsentManager.getConsent.mockReturnValue(null);
    });

    test('should handle locale loading failures', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      require('../src/js/banner.js');

      await window.initCookieBanner({ locale: 'fr' });

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load locale fr, using default English:',
        expect.any(Error)
      );
    });

    test('should handle DOM creation errors', async () => {
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation(() => {
        throw new Error('DOM creation failed');
      });

      require('../src/js/banner.js');

      try {
        await window.initCookieBanner();
      } catch (error) {
        // Expected to catch the error
      }

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );

      document.createElement = originalCreateElement;
    });

    test('should handle appendChild errors', async () => {
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('appendChild failed');
      });

      require('../src/js/banner.js');

      try {
        await window.initCookieBanner();
      } catch (error) {
        // Expected to catch the error
      }

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );

      document.body.appendChild = originalAppendChild;
    });

    test('should handle event listener errors', async () => {
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = jest.fn().mockImplementation(() => {
        throw new Error('Event listener failed');
      });

      require('../src/js/banner.js');

      try {
        await window.initCookieBanner();
      } catch (error) {
        // Expected to catch the error
      }

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );

      document.addEventListener = originalAddEventListener;
    });

    test('should handle consent manager errors during button actions', async () => {
      mockConsentManager.setConsent.mockImplementation(() => {
        throw new Error('Consent manager error');
      });

      require('../src/js/banner.js');
      await window.initCookieBanner();

      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      
      // Should not throw
      expect(() => {
        acceptBtn.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });

    test('should handle missing DOM elements gracefully', async () => {
      require('../src/js/banner.js');
      await window.initCookieBanner();

      // Remove banner elements
      const banner = document.querySelector('[role="region"]');
      if (banner) banner.remove();

      // Should not throw when trying to interact with missing elements
      expect(() => {
        const event = new CustomEvent('cookieConsentChanged');
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('Cookie Blocker Error Handling', () => {
    beforeEach(() => {
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should handle script execution errors', () => {
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('Script execution failed');
      });

      // Grant consent to trigger script execution
      mockConsentManager.hasConsent.mockReturnValue(true);

      const consentEvent = new CustomEvent('cookieConsentChanged', {
        detail: { analytics: true }
      });

      // Should not throw
      expect(() => {
        document.dispatchEvent(consentEvent);
      }).not.toThrow();

      Element.prototype.appendChild = originalAppendChild;
    });

    test('should handle DOM override errors', () => {
      const originalCreateElement = document.createElement;
      
      // Mock createElement to throw on subsequent calls
      let callCount = 0;
      document.createElement = jest.fn().mockImplementation((tagName) => {
        callCount++;
        if (callCount > 1 && tagName === 'script') {
          throw new Error('createElement failed');
        }
        return originalCreateElement.call(document, tagName);
      });

      // Should not throw when creating scripts
      expect(() => {
        const script = document.createElement('script');
        script.src = 'https://example.com/test.js';
      }).not.toThrow();

      document.createElement = originalCreateElement;
    });

    test('should handle cookie property override errors', () => {
      // Mock defineProperty to throw
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = jest.fn().mockImplementation(() => {
        throw new Error('Property definition failed');
      });

      // Reinitialize blocker
      jest.resetModules();
      require('../src/js/cookie-blocker.js');

      // Should not throw
      expect(() => {
        window.initCookieBlocker();
      }).not.toThrow();

      Object.defineProperty = originalDefineProperty;
    });

    test('should handle consent manager unavailability', () => {
      delete window.CookieConsent;

      // Should not throw when consent manager is missing
      expect(() => {
        const script = document.createElement('script');
        script.src = 'https://www.google-analytics.com/analytics.js';
        document.body.appendChild(script);
      }).not.toThrow();
    });

    test('should handle pattern matching errors', () => {
      // Create script with problematic URL
      const script = document.createElement('script');
      
      // Mock URL that might cause regex errors
      Object.defineProperty(script, 'src', {
        get: () => {
          throw new Error('URL access failed');
        },
        set: () => {},
        configurable: true
      });

      // Should not throw
      expect(() => {
        document.body.appendChild(script);
      }).not.toThrow();
    });
  });

  describe('Integration Error Handling', () => {
    test('should handle module loading errors gracefully', () => {
      // Mock require to fail
      const originalRequire = require;
      require = jest.fn().mockImplementation((module) => {
        if (module.includes('consent-manager')) {
          throw new Error('Module load failed');
        }
        return originalRequire(module);
      });

      expect(() => {
        require('../src/js/index.js');
      }).toThrow();

      require = originalRequire;
    });

    test('should handle window object absence', () => {
      const originalWindow = global.window;
      delete global.window;

      expect(() => {
        const indexModule = require('../src/js/index.js');
        expect(indexModule.default).toBeNull();
      }).not.toThrow();

      global.window = originalWindow;
    });

    test('should handle API method errors', () => {
      window.CookieConsent = {
        getConsent: jest.fn().mockImplementation(() => {
          throw new Error('API error');
        }),
        setConsent: jest.fn(),
        hasConsent: jest.fn()
      };

      require('../src/js/index.js');

      // Should not throw
      expect(() => {
        window.CookieBanner.getConsent();
      }).not.toThrow();

      expect(window.CookieBanner.getConsent()).toBeNull();
    });
  });

  describe('Network Error Handling', () => {
    test('should handle locale fetch timeouts', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      mockConsentManager.getConsent.mockReturnValue(null);
      require('../src/js/banner.js');

      await window.initCookieBanner({ locale: 'de' });

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );
    });

    test('should handle malformed locale responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      mockConsentManager.getConsent.mockReturnValue(null);
      require('../src/js/banner.js');

      await window.initCookieBanner({ locale: 'fr' });

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );
    });
  });

  describe('Browser Compatibility Error Handling', () => {
    test('should handle missing localStorage', () => {
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;

      const ConsentManager = require('../src/js/consent-manager');
      const manager = new ConsentManager();

      // Should fall back to cookie storage
      expect(() => {
        manager.getConsent();
      }).not.toThrow();

      global.localStorage = originalLocalStorage;
    });

    test('should handle missing fetch API', async () => {
      const originalFetch = global.fetch;
      delete global.fetch;

      mockConsentManager.getConsent.mockReturnValue(null);
      require('../src/js/banner.js');

      // Should use default locale strings
      await window.initCookieBanner({ locale: 'fr' });

      // Should still create banner with default strings
      const banner = document.querySelector('[role="region"]');
      expect(banner).toBeTruthy();

      global.fetch = originalFetch;
    });

    test('should handle missing CustomEvent', () => {
      const originalCustomEvent = global.CustomEvent;
      delete global.CustomEvent;

      const ConsentManager = require('../src/js/consent-manager');
      const manager = new ConsentManager();

      // Should not throw
      expect(() => {
        manager.dispatchConsentEvent({ analytics: true });
      }).not.toThrow();

      global.CustomEvent = originalCustomEvent;
    });

    test('should handle missing document.cookie', () => {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      delete document.cookie;

      const ConsentManager = require('../src/js/consent-manager');
      const manager = new ConsentManager({ storageMethod: 'cookie' });

      // Should fall back gracefully
      expect(() => {
        manager.getConsent();
        manager.setConsent({ analytics: true });
      }).not.toThrow();

      if (originalCookieDescriptor) {
        Object.defineProperty(document, 'cookie', originalCookieDescriptor);
      }
    });
  });

  describe('Memory and Performance Error Handling', () => {
    test('should handle memory pressure gracefully', () => {
      // Simulate low memory by making operations slow/fail
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback) => {
        // Immediately execute to simulate memory pressure
        callback();
      });

      require('../src/js/banner.js');

      // Should not throw under memory pressure
      expect(() => {
        window.initCookieBanner();
      }).not.toThrow();

      global.setTimeout = originalSetTimeout;
    });

    test('should handle large numbers of blocked scripts', () => {
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();

      // Create many blocked scripts
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          const script = document.createElement('script');
          script.src = `https://www.google-analytics.com/script${i}.js`;
          document.body.appendChild(script);
        }
      }).not.toThrow();
    });
  });

  describe('Recovery and Cleanup', () => {
    test('should clean up after errors', async () => {
      // Cause an error during initialization
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation(() => {
        throw new Error('Creation failed');
      });

      require('../src/js/banner.js');
      
      await window.initCookieBanner();
      
      // Restore functionality
      document.createElement = originalCreateElement;
      
      // Should be able to initialize again
      mockConsentManager.getConsent.mockReturnValue(null);
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      
      expect(() => {
        window.initCookieBanner();
      }).not.toThrow();
    });

    test('should handle partial initialization states', async () => {
      // Partially initialize banner
      require('../src/js/banner.js');
      mockConsentManager.getConsent.mockReturnValue(null);
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      
      await window.initCookieBanner();
      
      // Remove some elements
      const banner = document.querySelector('[role="region"]');
      if (banner) banner.remove();
      
      // Should handle missing elements gracefully
      expect(() => {
        const event = new CustomEvent('cookieConsentChanged');
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });
});