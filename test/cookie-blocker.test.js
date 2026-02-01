/**
 * Tests for the cookie-blocker.js functionality
 */

describe('Cookie Blocker', () => {
  let originalCreateElement;
  let originalAppendChild;
  let originalInsertBefore;
  let originalSetAttribute;
  let originalCookieDescriptor;
  let originalAddEventListener;
  let mockConsentManager;

  beforeEach(() => {
    // Store original methods
    originalCreateElement = document.createElement;
    originalAppendChild = Element.prototype.appendChild;
    originalInsertBefore = Element.prototype.insertBefore;
    originalSetAttribute = Element.prototype.setAttribute;
    originalAddEventListener = document.addEventListener;
    
    // Store original cookie descriptor
    originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie') ||
                              Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                              Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
    
    // Clear localStorage and cookies
    localStorage.clear();
    
    // Reset document.cookie to empty string
    document.cookie = '';
    
    // Ensure cookie property is configurable for testing
    if (!originalCookieDescriptor || !originalCookieDescriptor.configurable) {
      // Make cookie property configurable for tests
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        writable: true,
        value: ''
      });
    }
    
    // Mock consent manager
    mockConsentManager = {
      getConsent: jest.fn(),
      setConsent: jest.fn(),
      hasConsent: jest.fn()
    };
    
    // Set up window.CookieConsent mock
    window.CookieConsent = mockConsentManager;
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore original methods
    document.createElement = originalCreateElement;
    Element.prototype.appendChild = originalAppendChild;
    Element.prototype.insertBefore = originalInsertBefore;
    Element.prototype.setAttribute = originalSetAttribute;
    document.addEventListener = originalAddEventListener;
    
    // Clean up cookie blocker state
    delete document._cookieBlockerOverridden;
    
    // Restore original cookie descriptor
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    } else {
      // Reset to simple writable property if no original descriptor
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        writable: true,
        value: ''
      });
    }
    
    // Clean up window object
    delete window.CookieConsent;
    delete window.initCookieBlocker;
  });

  describe('Initialization', () => {
    test('should initialize cookie blocker', () => {
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      
      expect(window.initCookieBlocker).toBeDefined();
      expect(typeof window.initCookieBlocker).toBe('function');
    });

    test('should not initialize in non-browser environment', () => {
      const originalWindow = global.window;
      delete global.window;
      
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      
      // Should not throw error
      expect(() => {
        if (typeof window !== 'undefined' && window.initCookieBlocker) {
          window.initCookieBlocker();
        }
      }).not.toThrow();
      
      global.window = originalWindow;
    });

    test('should override DOM methods on initialization', () => {
      if (window.CookieBlocker) {
        window.CookieBlocker.reset();
      }
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      
      window.initCookieBlocker();
      
      // Methods should be overridden
      expect(document.createElement).not.toBe(originalCreateElement);
      expect(Element.prototype.appendChild).not.toBe(originalAppendChild);
      expect(Element.prototype.insertBefore).not.toBe(originalInsertBefore);
      expect(Element.prototype.setAttribute).not.toBe(originalSetAttribute);
    });
  });

  describe('Script Blocking', () => {
    beforeEach(() => {
      if (window.CookieBlocker) {
        window.CookieBlocker.reset();
      }
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should block Google Analytics scripts', () => {
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      // Script should not be actually added
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://www.google-analytics.com/analytics.js'
      );
    });

    test('should block Google Tag Manager scripts', () => {
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX'
      );
    });

    test('should block Facebook pixel scripts', () => {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://connect.facebook.net/en_US/fbevents.js'
      );
    });

    test('should allow non-tracking scripts', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/app.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      // Script should be added normally
      expect(script.parentNode).toBe(parentElement);
      expect(console.log).not.toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://example.com/app.js'
      );
    });

    test('should block inline scripts with tracking code', () => {
      const script = document.createElement('script');
      script.innerHTML = 'ga("send", "pageview");';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked inline tracking script containing:',
        'ga('
      );
    });

    test('should store blocked scripts for later execution', () => {
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      script.setAttribute('data-category', 'analytics');
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      // Script should be stored in blocked scripts
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://www.google-analytics.com/analytics.js'
      );
    });
  });

  describe('Cookie Blocking', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should block analytics cookies', () => {
      // Try to set a Google Analytics cookie
      document.cookie = '_ga=GA1.2.123456789.1234567890';
      
      // Cookie should not be set
      expect(document.cookie).not.toContain('_ga=');
      expect(console.log).toHaveBeenCalledWith(
        'Blocked cookie:',
        '_ga=GA1.2.123456789.1234567890'
      );
    });

    test('should block marketing cookies', () => {
      document.cookie = '_fbp=fb.1.1234567890.123456789';
      
      expect(document.cookie).not.toContain('_fbp=');
      expect(console.log).toHaveBeenCalledWith(
        'Blocked cookie:',
        '_fbp=fb.1.1234567890.123456789'
      );
    });

    test('should allow functional cookies', () => {
      document.cookie = 'testFunctionalCookie=abc123; path=/';

      // Functional cookies should be allowed
      expect(document.cookie).toContain('testFunctionalCookie=abc123');
    });

    test('should allow cookies when consent is given', () => {
      mockConsentManager.hasConsent.mockReturnValue(true);
      
      document.cookie = '_ga=GA1.2.123456789.1234567890';
      
      // Should allow when consent is given
      expect(document.cookie).toContain('_ga=');
    });

    test('should clean existing blocked cookies', () => {
      // Set some cookies before blocker initialization
      const originalCookie = document.cookie;
      document.cookie = '_ga=test; path=/';
      document.cookie = '_fbp=test; path=/';
      
      // Reinitialize blocker
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
      
      // Blocked cookies should be removed
      expect(document.cookie).not.toContain('_ga=test');
      expect(document.cookie).not.toContain('_fbp=test');
    });
  });

  describe('Consent Change Handling', () => {
    beforeEach(() => {
      // Clean up any previous state
      delete document._cookieBlockerOverridden;
      document.cookie = '';
      
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should execute blocked scripts when consent is granted', () => {
      // Block a script first
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      script.setAttribute('data-category', 'analytics');
      
      const parentElement = document.createElement('div');
      document.body.appendChild(parentElement);
      parentElement.appendChild(script);
      
      // Script should be blocked
      expect(script.parentNode).toBeNull();
      
      // Grant consent
      mockConsentManager.hasConsent.mockReturnValue(true);
      
      // Dispatch consent change event
      const consentEvent = new CustomEvent('cookieConsentChanged', {
        detail: { analytics: true }
      });
      document.dispatchEvent(consentEvent);
      
      // Blocked scripts should be executed
      expect(console.log).toHaveBeenCalledWith(
        'Executing previously blocked script:',
        'https://www.google-analytics.com/analytics.js'
      );
    });

  });

  describe('Script Categories', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should detect analytics scripts automatically', () => {
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://www.google-analytics.com/analytics.js'
      );
    });

    test('should detect marketing scripts automatically', () => {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://connect.facebook.net/en_US/fbevents.js'
      );
    });

    test('should respect manual data-category attribute', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/custom-analytics.js';
      script.setAttribute('data-category', 'analytics');
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(script.parentNode).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Blocked tracking script:',
        'https://example.com/custom-analytics.js'
      );
    });

    test('should handle scripts without category', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/unknown-tracking.js';
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      // Should be allowed if not matching known patterns
      expect(script.parentNode).toBe(parentElement);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should handle script execution errors gracefully', () => {
      // Mock original appendChild to throw error
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('Script execution failed');
      });
      
      // Grant consent
      mockConsentManager.hasConsent.mockReturnValue(true);
      
      // Dispatch consent change event
      const consentEvent = new CustomEvent('cookieConsentChanged', {
        detail: { analytics: true }
      });
      
      expect(() => {
        document.dispatchEvent(consentEvent);
      }).not.toThrow();
      
      // Restore
      Element.prototype.appendChild = originalAppendChild;
    });


    test('should handle missing consent manager gracefully', () => {
      delete window.CookieConsent;
      
      expect(() => {
        const consentEvent = new CustomEvent('cookieConsentChanged', {
          detail: { analytics: true }
        });
        document.dispatchEvent(consentEvent);
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should not block legitimate scripts unnecessarily', () => {
      const legitimateScripts = [
        'https://example.com/app.js',
        'https://cdn.example.com/library.js',
        'https://unpkg.com/some-library@1.0.0/dist/lib.js'
      ];
      
      legitimateScripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        
        const parentElement = document.createElement('div');
        parentElement.appendChild(script);
        
        // Should not be blocked
        expect(script.parentNode).toBe(parentElement);
      });
    });

    test('should handle many scripts efficiently', () => {
      const startTime = Date.now();
      
      // Create many scripts
      for (let i = 0; i < 100; i++) {
        const script = document.createElement('script');
        script.src = `https://example.com/script${i}.js`;
        
        const parentElement = document.createElement('div');
        parentElement.appendChild(script);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 100 scripts)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Integration with ConsentManager', () => {
    beforeEach(() => {
      if (window.CookieBlocker) {
        window.CookieBlocker.reset();
      }
      jest.resetModules();
      require('../src/js/cookie-blocker.js');
      window.initCookieBlocker();
    });

    test('should check consent before allowing scripts', () => {
      mockConsentManager.hasConsent.mockReturnValue(false);
      
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      script.setAttribute('data-category', 'analytics');
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(mockConsentManager.hasConsent).toHaveBeenCalledWith('analytics');
      expect(script.parentNode).toBeNull();
    });

    test('should allow scripts when consent is given', () => {
      mockConsentManager.hasConsent.mockReturnValue(true);
      
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      script.setAttribute('data-category', 'analytics');
      
      const parentElement = document.createElement('div');
      parentElement.appendChild(script);
      
      expect(mockConsentManager.hasConsent).toHaveBeenCalledWith('analytics');
      expect(script.parentNode).toBe(parentElement);
    });

  });
});