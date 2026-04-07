/**
 * Tests for subdomain consent synchronization
 */

describe('Subdomain Consent Synchronization', () => {
  let mockPostMessage;
  let messageListeners;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock postMessage - spy on addEventListener to capture message handlers
    messageListeners = [];
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    jest.spyOn(window, 'addEventListener').mockImplementation(function(event, handler, options) {
      if (event === 'message') {
        messageListeners.push(handler);
      }
      return originalAddEventListener.call(this, event, handler, options);
    });

    jest.spyOn(window, 'removeEventListener');

    // Clear any existing modules
    jest.resetModules();
  });

  afterEach(() => {
    // Clear mocks
    jest.restoreAllMocks();
    messageListeners = [];

    // Stop any active sync
    if (window.CookieConsentSync) {
      window.CookieConsentSync.stop();
    }
  });

  function setHostname(hostname) {
    if (window.CookieConsentSync) {
      window.CookieConsentSync._setGetHostname(() => hostname);
    }
  }

  describe('Initialization', () => {
    test('should not initialize when disabled', () => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsentSync.init({
        enabled: false,
        primaryDomain: 'example.com'
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });

    test('should not initialize without primary domain', () => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsentSync.init({
        enabled: true
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });

    test('should initialize when properly configured', () => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www']
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.primaryDomain).toBe('example.com');
      expect(status.isAllowed).toBe(true);
    });

    test('should reject initialization on unauthorized domain', () => {
      require('../src/js/subdomain-sync.js');
      setHostname('evil.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www']
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.isAllowed).toBe(false);
      expect(status.isActive).toBe(false);
    });
  });

  describe('Domain Validation', () => {
    beforeEach(() => {
      require('../src/js/subdomain-sync.js');
    });

    test('should allow primary domain', () => {
      setHostname('example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should allow www subdomain of primary', () => {
      setHostname('www.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should allow configured subdomains', () => {
      setHostname('shop.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'shop', 'blog']
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should reject unconfigured subdomains', () => {
      setHostname('malicious.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'shop']
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(false);
    });
  });

  describe('PostMessage Communication', () => {
    let mockIframe;

    beforeEach(() => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      // Mock iframe creation
      mockIframe = {
        style: {},
        contentWindow: {
          postMessage: jest.fn()
        },
        onload: null
      };

      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'iframe') {
          return mockIframe;
        }
        return Document.prototype.createElement.call(document, tag);
      });

      jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    });

    test('should create iframe for postMessage sync', () => {
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        usePostMessage: true
      });

      expect(document.createElement).toHaveBeenCalledWith('iframe');
      expect(mockIframe.src).toBe('https://example.com/cookie-consent-sync.html');
      expect(mockIframe.style.display).toBe('none');
    });

    test('should handle consent sync response', () => {
      // Set up mock CookieConsent
      window.CookieConsent = {
        getConsent: jest.fn(() => null),
        setConsent: jest.fn()
      };

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      // Simulate iframe load
      mockIframe.onload();

      // Simulate message from primary domain
      const mockConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: new Date().toISOString()
      };

      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_RESPONSE',
          consent: mockConsent
        }
      };

      // Trigger message handler
      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith(mockConsent);
    });

    test('should reject messages from unauthorized origins', () => {
      window.CookieConsent = {
        setConsent: jest.fn()
      };

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      mockIframe.onload();

      const messageEvent = {
        origin: 'https://evil.com',
        data: {
          type: 'CONSENT_SYNC_RESPONSE',
          consent: { functional: true }
        }
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).not.toHaveBeenCalled();
    });
  });

  describe('Consent Synchronization', () => {
    beforeEach(() => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsent = {
        getConsent: jest.fn(),
        setConsent: jest.fn()
      };
    });

    test('should use most recent consent based on timestamp', () => {
      const oldConsent = {
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: '2024-01-01T00:00:00Z'
      };

      const newConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: '2024-01-02T00:00:00Z'
      };

      window.CookieConsent.getConsent.mockReturnValue(oldConsent);

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      // Simulate receiving newer consent
      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_UPDATE',
          consent: newConsent
        }
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith(newConsent);
    });

    test('should not overwrite newer local consent with older remote', () => {
      const newConsent = {
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: '2024-01-02T00:00:00Z'
      };

      const oldConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: '2024-01-01T00:00:00Z'
      };

      window.CookieConsent.getConsent.mockReturnValue(newConsent);

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      // Simulate receiving older consent
      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_UPDATE',
          consent: oldConsent
        }
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).not.toHaveBeenCalled();
    });
  });

  describe('Sync HTML Generation', () => {
    test('should generate valid sync endpoint HTML', () => {
      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www', 'shop']
      });

      const html = window.CookieConsentSync.generateSyncHTML();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Cookie Consent Sync');
      expect(html).toContain('example.com');
      expect(html).toContain("['app', 'www', 'shop']");
    });
  });

  describe('Cleanup', () => {
    test('should properly stop synchronization', () => {
      const mockIframe = {
        style: {},
        contentWindow: { postMessage: jest.fn() },
        parentNode: {
          removeChild: jest.fn()
        }
      };

      jest.spyOn(document, 'createElement').mockImplementation(() => mockIframe);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});

      require('../src/js/subdomain-sync.js');
      setHostname('app.example.com');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app']
      });

      window.CookieConsentSync.stop();

      expect(mockIframe.parentNode.removeChild).toHaveBeenCalledWith(mockIframe);
      expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });
  });
});
