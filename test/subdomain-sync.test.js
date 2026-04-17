/**
 * Tests for subdomain consent synchronization
 */

describe('Subdomain Consent Synchronization', () => {
  let messageListeners;

  beforeEach(() => {
    localStorage.clear();

    messageListeners = [];
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler);
      }
    });

    window.removeEventListener = jest.fn();

    jest.resetModules();
  });

  afterEach(() => {
    if (window.CookieConsentSync) {
      window.CookieConsentSync.stop();
    }

    jest.clearAllMocks();
    messageListeners = [];
  });

  describe('Initialization', () => {
    test('should not initialize when disabled', () => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: false,
        primaryDomain: 'example.com',
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });

    test('should not initialize without primary domain', () => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: true,
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });

    test('should initialize when properly configured', () => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www'],
        currentHostname: 'app.example.com',
      });

      const status = window.CookieConsentSync.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.primaryDomain).toBe('example.com');
      expect(status.isAllowed).toBe(true);
    });

    test('should reject initialization on unauthorized domain', () => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www'],
        currentHostname: 'evil.com',
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
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'example.com',
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should allow www subdomain of primary', () => {
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'www.example.com',
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should allow configured subdomains', () => {
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'shop', 'blog'],
        currentHostname: 'shop.example.com',
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(true);
    });

    test('should reject unconfigured subdomains', () => {
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'shop'],
        currentHostname: 'malicious.example.com',
      });

      expect(window.CookieConsentSync.getStatus().isAllowed).toBe(false);
    });
  });

  describe('PostMessage Communication', () => {
    let mockIframe;

    beforeEach(() => {
      require('../src/js/subdomain-sync.js');

      // Mock iframe creation
      mockIframe = {
        style: {},
        contentWindow: {
          postMessage: jest.fn(),
        },
        onload: null,
      };

      document.createElement = jest.fn(tag => {
        if (tag === 'iframe') {
          return mockIframe;
        }
        return document.createElement.bind(document)(tag);
      });

      document.body.appendChild = jest.fn();
    });

    test('should create iframe for postMessage sync', () => {
      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        usePostMessage: true,
        currentHostname: 'app.example.com',
      });

      expect(document.createElement).toHaveBeenCalledWith('iframe');
      expect(mockIframe.src).toBe('https://example.com/cookie-consent-sync.html');
      expect(mockIframe.style.display).toBe('none');
    });

    test('should handle consent sync response', () => {
      // Set up mock CookieConsent
      window.CookieConsent = {
        getConsent: jest.fn(() => null),
        setConsent: jest.fn(),
      };

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'app.example.com',
      });

      // Simulate iframe load
      mockIframe.onload();

      // Simulate message from primary domain
      const mockConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: new Date().toISOString(),
      };

      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_RESPONSE',
          consent: mockConsent,
        },
      };

      // Trigger message handler
      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith(mockConsent);
    });

    test('should reject messages from unauthorized origins', () => {
      window.CookieConsent = {
        setConsent: jest.fn(),
      };

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'app.example.com',
      });

      mockIframe.onload();

      const messageEvent = {
        origin: 'https://evil.com',
        data: {
          type: 'CONSENT_SYNC_RESPONSE',
          consent: { functional: true },
        },
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).not.toHaveBeenCalled();
    });
  });

  describe('Consent Synchronization', () => {
    beforeEach(() => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsent = {
        getConsent: jest.fn(),
        setConsent: jest.fn(),
      };
    });

    test('should use most recent consent based on timestamp', () => {
      const oldConsent = {
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: '2024-01-01T00:00:00Z',
      };

      const newConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: '2024-01-02T00:00:00Z',
      };

      window.CookieConsent.getConsent.mockReturnValue(oldConsent);

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'app.example.com',
      });

      // Simulate receiving newer consent
      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_UPDATE',
          consent: newConsent,
        },
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith(newConsent);
    });

    test('should not overwrite newer local consent with older remote', () => {
      const newConsent = {
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: '2024-01-02T00:00:00Z',
      };

      const oldConsent = {
        functional: true,
        analytics: false,
        marketing: true,
        timestamp: '2024-01-01T00:00:00Z',
      };

      window.CookieConsent.getConsent.mockReturnValue(newConsent);

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'app.example.com',
      });

      // Simulate receiving older consent
      const messageEvent = {
        origin: 'https://example.com',
        data: {
          type: 'CONSENT_SYNC_UPDATE',
          consent: oldConsent,
        },
      };

      messageListeners.forEach(handler => handler(messageEvent));

      expect(window.CookieConsent.setConsent).not.toHaveBeenCalled();
    });
  });

  describe('Sync HTML Generation', () => {
    test('should generate valid sync endpoint HTML', () => {
      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app', 'www', 'shop'],
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
          removeChild: jest.fn(),
        },
      };

      document.createElement = jest.fn(() => mockIframe);
      document.body.appendChild = jest.fn();

      require('../src/js/subdomain-sync.js');

      window.CookieConsentSync.init({
        enabled: true,
        primaryDomain: 'example.com',
        allowedSubdomains: ['app'],
        currentHostname: 'app.example.com',
      });

      window.CookieConsentSync.stop();

      expect(mockIframe.parentNode.removeChild).toHaveBeenCalledWith(mockIframe);
      expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));

      const status = window.CookieConsentSync.getStatus();
      expect(status.isActive).toBe(false);
    });
  });
});
