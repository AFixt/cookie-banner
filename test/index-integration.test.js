/**
 * Integration tests for the index.js main entry point
 */

describe('Index.js Integration', () => {
  let mockConsentManager;
  let originalWindow;

  beforeEach(() => {
    // Clear DOM and localStorage
    document.body.innerHTML = '';
    localStorage.clear();
    document.cookie = '';
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
    
    // Mock consent manager
    mockConsentManager = {
      getConsent: jest.fn(),
      setConsent: jest.fn(),
      hasConsent: jest.fn(),
      clearConsent: jest.fn(),
      isConsentExpired: jest.fn(),
      dispatchConsentEvent: jest.fn()
    };
    
    // Clean up any existing globals
    delete window.CookieConsent;
    delete window.initCookieBanner;
    delete window.CookieBanner;
    delete window.initCookieBlocker;
  });

  afterEach(() => {
    // Clean up window object
    delete window.CookieConsent;
    delete window.initCookieBanner;
    delete window.CookieBanner;
    delete window.initCookieBlocker;
    
    // Reset modules
    jest.resetModules();
  });

  describe('Module Loading', () => {
    test('should load all modules without errors', () => {
      expect(() => {
        require('../src/js/index.js');
      }).not.toThrow();
    });

    test('should export ConsentManager class', () => {
      const indexModule = require('../src/js/index.js');
      expect(indexModule.ConsentManager).toBeDefined();
      expect(typeof indexModule.ConsentManager).toBe('function');
    });

    test('should have default export', () => {
      const indexModule = require('../src/js/index.js');
      expect(indexModule.default).toBeDefined();
    });
  });

  describe('Global API Setup', () => {
    test('should expose CookieBanner API on window', () => {
      // Mock window.CookieConsent
      window.CookieConsent = mockConsentManager;
      
      require('../src/js/index.js');
      
      expect(window.CookieBanner).toBeDefined();
      expect(typeof window.CookieBanner.init).toBe('function');
      expect(typeof window.CookieBanner.getConsent).toBe('function');
      expect(typeof window.CookieBanner.setConsent).toBe('function');
      expect(typeof window.CookieBanner.hasConsent).toBe('function');
    });

    test('should handle missing CookieConsent gracefully', () => {
      // Don't set up window.CookieConsent
      require('../src/js/index.js');
      
      expect(window.CookieBanner).toBeDefined();
      expect(window.CookieBanner.getConsent()).toBeNull();
      expect(window.CookieBanner.setConsent({})).toBeNull();
      expect(window.CookieBanner.hasConsent('analytics')).toBe(false);
    });

    test('should not expose API in non-browser environment', () => {
      const originalWindow = global.window;
      delete global.window;
      
      const indexModule = require('../src/js/index.js');
      expect(indexModule.default).toBeNull();
      
      global.window = originalWindow;
    });
  });

  describe('CookieBanner API Methods', () => {
    beforeEach(() => {
      window.CookieConsent = mockConsentManager;
      require('../src/js/index.js');
    });

    test('should delegate getConsent to CookieConsent', () => {
      const mockConsent = { functional: true, analytics: false };
      mockConsentManager.getConsent.mockReturnValue(mockConsent);
      
      const result = window.CookieBanner.getConsent();
      
      expect(mockConsentManager.getConsent).toHaveBeenCalled();
      expect(result).toBe(mockConsent);
    });

    test('should delegate setConsent to CookieConsent', () => {
      const consentData = { functional: true, analytics: true };
      const mockResult = { ...consentData, timestamp: '2023-01-01' };
      mockConsentManager.setConsent.mockReturnValue(mockResult);
      
      const result = window.CookieBanner.setConsent(consentData);
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith(consentData);
      expect(result).toBe(mockResult);
    });

    test('should delegate hasConsent to CookieConsent', () => {
      mockConsentManager.hasConsent.mockReturnValue(true);
      
      const result = window.CookieBanner.hasConsent('analytics');
      
      expect(mockConsentManager.hasConsent).toHaveBeenCalledWith('analytics');
      expect(result).toBe(true);
    });

    test('should delegate init to initCookieBanner', () => {
      // Mock initCookieBanner
      window.initCookieBanner = jest.fn();
      
      const options = { theme: 'dark' };
      window.CookieBanner.init(options);
      
      expect(window.initCookieBanner).toHaveBeenCalledWith(options);
    });
  });

  describe('Integration with Banner Module', () => {
    test('should initialize banner when CookieBanner.init is called', () => {
      window.CookieConsent = mockConsentManager;
      mockConsentManager.getConsent.mockReturnValue(null);
      
      // Mock fetch for locale loading
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });
      
      require('../src/js/index.js');
      
      // Initialize banner
      window.CookieBanner.init();
      
      // Should create banner elements
      setTimeout(() => {
        const banner = document.querySelector('[role="region"]');
        expect(banner).toBeTruthy();
      }, 0);
    });

    test('should not initialize banner if consent already exists', () => {
      window.CookieConsent = mockConsentManager;
      mockConsentManager.getConsent.mockReturnValue({
        functional: true,
        analytics: false
      });
      
      require('../src/js/index.js');
      
      // Initialize banner
      window.CookieBanner.init();
      
      // Should not create banner
      const banner = document.querySelector('[role="region"]');
      expect(banner).toBeNull();
    });
  });

  describe('Integration with Cookie Blocker', () => {
    test('should initialize cookie blocker on module load', () => {
      require('../src/js/index.js');
      
      expect(window.initCookieBlocker).toBeDefined();
      expect(typeof window.initCookieBlocker).toBe('function');
    });

    test('should block tracking scripts after initialization', () => {
      require('../src/js/index.js');
      
      // Initialize blocker
      window.initCookieBlocker();
      
      // Try to add a tracking script
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      // Script should be blocked
      expect(script.parentNode).toBeNull();
    });
  });

  describe('Full Integration Flow', () => {
    test('should complete full consent flow', async () => {
      // Set up all mocks
      window.CookieConsent = mockConsentManager;
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: new Date().toISOString()
      });
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });
      
      require('../src/js/index.js');
      
      // Initialize everything
      window.initCookieBlocker();
      await window.CookieBanner.init();
      
      // Check that APIs are available
      expect(window.CookieBanner.getConsent).toBeDefined();
      expect(window.CookieBanner.setConsent).toBeDefined();
      expect(window.CookieBanner.hasConsent).toBeDefined();
      
      // Test the flow
      const result = window.CookieBanner.setConsent({
        functional: true,
        analytics: true,
        marketing: false
      });
      
      expect(result).toBeDefined();
      expect(result.functional).toBe(true);
      expect(result.analytics).toBe(true);
      expect(result.marketing).toBe(false);
    });

    test('should handle errors in integration gracefully', async () => {
      // Set up consent manager to throw error
      window.CookieConsent = {
        getConsent: jest.fn().mockImplementation(() => {
          throw new Error('Storage error');
        }),
        setConsent: jest.fn(),
        hasConsent: jest.fn()
      };
      
      require('../src/js/index.js');
      
      // Should not throw
      expect(() => {
        window.CookieBanner.getConsent();
      }).not.toThrow();
    });
  });

  describe('Module Dependencies', () => {
    test('should load ConsentManager dependency', () => {
      const indexModule = require('../src/js/index.js');
      expect(indexModule.ConsentManager).toBeDefined();
      
      // Should be able to create an instance
      const manager = new indexModule.ConsentManager();
      expect(manager).toBeDefined();
      expect(typeof manager.getConsent).toBe('function');
    });

    test('should load banner module side effects', () => {
      require('../src/js/index.js');
      
      // Banner module should have set up global functions
      expect(window.initCookieBanner).toBeDefined();
    });

    test('should load cookie blocker module side effects', () => {
      require('../src/js/index.js');
      
      // Cookie blocker module should have set up global functions
      expect(window.initCookieBlocker).toBeDefined();
    });
  });

  describe('UMD Build Support', () => {
    test('should work in browser environment', () => {
      // Simulate browser environment
      global.window = window;
      
      const indexModule = require('../src/js/index.js');
      expect(indexModule.default).toBeDefined();
    });

    test('should work in Node.js environment', () => {
      // Simulate Node.js environment
      const originalWindow = global.window;
      delete global.window;
      
      const indexModule = require('../src/js/index.js');
      expect(indexModule.ConsentManager).toBeDefined();
      expect(indexModule.default).toBeNull();
      
      global.window = originalWindow;
    });

    test('should export ConsentManager for advanced usage', () => {
      const indexModule = require('../src/js/index.js');
      const ConsentManager = indexModule.ConsentManager;
      
      expect(ConsentManager).toBeDefined();
      expect(typeof ConsentManager).toBe('function');
      
      // Should be able to create custom instance
      const customManager = new ConsentManager({
        storageMethod: 'cookie',
        expireDays: 30
      });
      
      expect(customManager).toBeDefined();
      expect(customManager.options.storageMethod).toBe('cookie');
      expect(customManager.options.expireDays).toBe(30);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dependencies gracefully', () => {
      // Mock require to fail for a dependency
      const originalRequire = require;
      require = jest.fn().mockImplementation((module) => {
        if (module.includes('consent-manager')) {
          throw new Error('Module not found');
        }
        return originalRequire(module);
      });
      
      expect(() => {
        require('../src/js/index.js');
      }).toThrow();
      
      // Restore
      require = originalRequire;
    });

    test('should handle initialization errors', () => {
      window.CookieConsent = mockConsentManager;
      mockConsentManager.getConsent.mockImplementation(() => {
        throw new Error('Consent manager error');
      });
      
      require('../src/js/index.js');
      
      // API should still be available but handle errors
      expect(() => {
        window.CookieBanner.getConsent();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should load modules quickly', () => {
      const startTime = Date.now();
      
      require('../src/js/index.js');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load in under 100ms
      expect(loadTime).toBeLessThan(100);
    });

    test('should not pollute global namespace excessively', () => {
      const beforeGlobals = Object.keys(window);
      
      require('../src/js/index.js');
      
      const afterGlobals = Object.keys(window);
      const newGlobals = afterGlobals.filter(key => !beforeGlobals.includes(key));
      
      // Should only add expected globals
      expect(newGlobals).toEqual(
        expect.arrayContaining(['CookieBanner', 'initCookieBanner', 'initCookieBlocker'])
      );
      expect(newGlobals.length).toBeLessThanOrEqual(4); // Allow for CookieConsent too
    });
  });
});