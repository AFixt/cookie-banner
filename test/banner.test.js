/**
 * Tests for the banner.js functionality
 */

describe('Banner Functionality', () => {
  let originalFetch;
  let originalDocumentBody;
  let originalCreateElement;
  let originalAppendChild;
  let originalQuerySelector;
  let originalAddEventListener;
  let originalRemoveEventListener;
  let mockConsentManager;

  beforeEach(() => {
    // Reset cookie-blocker if it exists (before clearing DOM)
    if (window.CookieBlocker && window.CookieBlocker.reset) {
      window.CookieBlocker.reset();
    }
    
    // Clear DOM and localStorage
    document.body.innerHTML = '';
    localStorage.clear();
    document.cookie = '';
    
    // Mock fetch for locale loading
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Mock consent manager
    mockConsentManager = {
      getConsent: jest.fn(),
      setConsent: jest.fn(),
      hasConsent: jest.fn()
    };
    
    // Set up window.CookieConsent mock
    window.CookieConsent = mockConsentManager;
  });

  afterEach(() => {
    // Reset cookie-blocker if it exists (important to do this first)
    if (window.CookieBlocker && window.CookieBlocker.reset) {
      window.CookieBlocker.reset();
    }
    
    // Restore original fetch
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    
    // Clean up window object
    delete window.CookieConsent;
    delete window.initCookieBanner;
    delete window.CookieBanner;
    
    // Clean up event listeners
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('click', () => {});
    
    // Clear any DOM modifications
    document.body.innerHTML = '';
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initCookieBanner', () => {
    beforeEach(() => {
      // Mock fetch to resolve immediately with default strings
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });
      
      // Re-import the module to get a fresh copy
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should initialize with default configuration', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      
      await window.initCookieBanner();
      
      // Check that banner was created
      const banner = document.querySelector('[role="region"]');
      expect(banner).toBeTruthy();
    });

    test('should skip initialization if consent already exists', async () => {
      mockConsentManager.getConsent.mockReturnValue({
        functional: true,
        analytics: false,
        marketing: false
      });
      
      await window.initCookieBanner();
      
      // Banner should not be created
      const banner = document.querySelector('[role="region"]');
      expect(banner).toBeNull();
    });

    test('should merge user config with defaults', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      
      await window.initCookieBanner({
        locale: 'fr',
        theme: 'dark',
        showModal: false
      });
      
      // Should still create banner with custom config
      const banner = document.querySelector('[role="region"]');
      expect(banner).toBeTruthy();
    });

    test('should handle initialization errors gracefully', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      
      // Instead of mocking createElement, let's mock something else that would cause an error
      // Mock body.appendChild to throw an error
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('Failed to append banner to body');
      });
      
      // The initCookieBanner should reject with an error
      await expect(window.initCookieBanner()).rejects.toThrow('Failed to append banner to body');
      
      // Console.error should be called (possibly twice due to try-catch structure)
      expect(console.error).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize cookie banner:',
        expect.any(Error)
      );
      
      // Restore
      document.body.appendChild = originalAppendChild;
    });
  });

  describe('loadLocaleStrings', () => {
    beforeEach(() => {
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should use default English strings', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });
      
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ locale: 'en' });
      
      const banner = document.querySelector('[role="region"]');
      expect(banner.textContent).toContain('Accept All');
      expect(banner.textContent).toContain('Reject All');
    });

    test('should load custom locale strings', async () => {
      const frenchStrings = {
        description: 'Nous utilisons des cookies',
        acceptAll: 'Accepter tout',
        rejectAll: 'Refuser tout',
        customize: 'Personnaliser'
      };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(frenchStrings)
      });
      
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ locale: 'fr' });
      
      const banner = document.querySelector('[role="region"]');
      expect(banner.textContent).toContain('Accepter tout');
      expect(banner.textContent).toContain('Refuser tout');
    });

    test('should fall back to English when locale load fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });
      
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ locale: 'invalid' });
      
      expect(console.warn).toHaveBeenCalledWith(
        'Locale invalid not found, using default English.'
      );
    });
  });

  describe('Banner Creation', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should create banner with proper ARIA attributes', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner();
      
      const banner = document.querySelector('[role="region"]');
      expect(banner).toHaveAttribute('role', 'region');
      expect(banner).toHaveAttribute('aria-label', 'Cookie Consent');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    test('should create banner with theme class', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ theme: 'dark' });
      
      const banner = document.querySelector('[role="region"]');
      expect(banner).toHaveClass('theme-dark');
    });

    test('should create banner with all required buttons', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner();
      
      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      const rejectBtn = document.querySelector('[data-action="reject-all"]');
      const customizeBtn = document.querySelector('[data-action="customize"]');
      
      expect(acceptBtn).toBeTruthy();
      expect(rejectBtn).toBeTruthy();
      expect(customizeBtn).toBeTruthy();
    });

    test('should not create modal when showModal is false', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: false });
      
      const modal = document.querySelector('[role="dialog"]');
      expect(modal).toBeNull();
    });
  });

  describe('Modal Creation', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should create modal with proper ARIA attributes', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const modal = document.querySelector('[role="dialog"]');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-hidden', 'true');
    });

    test('should create modal with form and checkboxes', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const form = document.querySelector('#cookie-form');
      const functionalCheckbox = document.querySelector('input[name="functional"]');
      const analyticsCheckbox = document.querySelector('input[name="analytics"]');
      const marketingCheckbox = document.querySelector('input[name="marketing"]');
      
      expect(form).toBeTruthy();
      expect(functionalCheckbox).toBeTruthy();
      expect(functionalCheckbox).toBeChecked();
      expect(functionalCheckbox).toBeDisabled();
      expect(analyticsCheckbox).toBeTruthy();
      expect(marketingCheckbox).toBeTruthy();
    });
  });

  describe('Button Actions', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should set full consent when Accept All is clicked', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: true,
        marketing: true
      });
      
      await window.initCookieBanner();
      
      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      acceptBtn.click();
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: true,
        marketing: true
      });
    });

    test('should set minimal consent when Reject All is clicked', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: false,
        marketing: false
      });
      
      await window.initCookieBanner();
      
      const rejectBtn = document.querySelector('[data-action="reject-all"]');
      rejectBtn.click();
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: false,
        marketing: false
      });
    });

    test('should open modal when Customize is clicked', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const modal = document.querySelector('[role="dialog"]');
      
      customizeBtn.click();
      
      expect(modal).toHaveAttribute('aria-hidden', 'false');
    });

    test('should close modal when Cancel is clicked', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const cancelBtn = document.querySelector('[data-action="cancel"]');
      const modal = document.querySelector('[role="dialog"]');
      
      // Open modal first
      customizeBtn.click();
      expect(modal).toHaveAttribute('aria-hidden', 'false');
      
      // Then close it
      cancelBtn.click();
      expect(modal).toHaveAttribute('aria-hidden', 'true');
    });

    test('should save preferences when Save is clicked', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: false,
        marketing: true
      });
      
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const saveBtn = document.querySelector('[data-action="save"]');
      const marketingCheckbox = document.querySelector('input[name="marketing"]');
      
      // Open modal
      customizeBtn.click();
      
      // Check marketing checkbox
      marketingCheckbox.checked = true;
      
      // Save preferences
      saveBtn.click();
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: false,
        marketing: true
      });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should handle Escape key to close modal', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const modal = document.querySelector('[role="dialog"]');
      
      // Open modal
      customizeBtn.click();
      expect(modal).toHaveAttribute('aria-hidden', 'false');
      
      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(modal).toHaveAttribute('aria-hidden', 'true');
    });

    test('should handle Enter key on buttons', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: true,
        marketing: true
      });
      
      await window.initCookieBanner();
      
      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      acceptBtn.focus();
      
      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      acceptBtn.dispatchEvent(enterEvent);
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: true,
        marketing: true
      });
    });

    test('should handle Space key on buttons', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: false,
        marketing: false
      });
      
      await window.initCookieBanner();
      
      const rejectBtn = document.querySelector('[data-action="reject-all"]');
      rejectBtn.focus();
      
      // Press Space
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      rejectBtn.dispatchEvent(spaceEvent);
      
      expect(mockConsentManager.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: false,
        marketing: false
      });
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should focus first element when modal opens', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const modal = document.querySelector('[role="dialog"]');
      
      // Mock focus method
      const firstFocusable = modal.querySelector('input, button, [tabindex]');
      firstFocusable.focus = jest.fn();
      
      customizeBtn.click();
      
      expect(firstFocusable.focus).toHaveBeenCalled();
    });

    test('should return focus to trigger when modal closes', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ showModal: true });
      
      const customizeBtn = document.querySelector('[data-action="customize"]');
      const cancelBtn = document.querySelector('[data-action="cancel"]');
      
      // Mock focus method
      customizeBtn.focus = jest.fn();
      
      // Open modal
      customizeBtn.click();
      
      // Close modal
      cancelBtn.click();
      
      expect(customizeBtn.focus).toHaveBeenCalled();
    });
  });

  describe('Theme Support', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should apply light theme by default', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner();
      
      const banner = document.querySelector('[role="region"]');
      expect(banner).toHaveClass('theme-light');
    });

    test('should apply dark theme when configured', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ theme: 'dark' });
      
      const banner = document.querySelector('[role="region"]');
      expect(banner).toHaveClass('theme-dark');
    });

    test('should apply custom theme', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      await window.initCookieBanner({ theme: 'custom' });
      
      const banner = document.querySelector('[role="region"]');
      expect(banner).toHaveClass('theme-custom');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should handle consent manager errors gracefully', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      
      await window.initCookieBanner();
      
      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      
      // Should not throw
      expect(() => {
        acceptBtn.click();
      }).not.toThrow();
    });

    test('should handle DOM manipulation errors', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      
      // Mock appendChild to throw
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      // Should reject with the error
      await expect(window.initCookieBanner()).rejects.toThrow('DOM error');
      
      expect(console.error).toHaveBeenCalled();
      
      // Restore
      document.body.appendChild = originalAppendChild;
    });
  });

  describe('Event Dispatching', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      jest.resetModules();
      
      // Reset cookie-blocker if it exists
      if (window.CookieBlocker && window.CookieBlocker.reset) {
        window.CookieBlocker.reset();
      }
      
      require('../src/js/banner.js');
    });

    test('should dispatch consent event when preferences are saved', async () => {
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: false,
        marketing: false
      });
      
      const dispatchEvent = jest.spyOn(document, 'dispatchEvent');
      
      await window.initCookieBanner();
      
      const rejectBtn = document.querySelector('[data-action="reject-all"]');
      rejectBtn.click();
      
      expect(dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cookieConsentChanged'
        })
      );
      
      dispatchEvent.mockRestore();
    });

    test('should call onConsentChange callback if provided', async () => {
      const onConsentChange = jest.fn();
      mockConsentManager.getConsent.mockReturnValue(null);
      mockConsentManager.setConsent.mockReturnValue({
        functional: true,
        analytics: true,
        marketing: true
      });
      
      await window.initCookieBanner({ onConsentChange });
      
      const acceptBtn = document.querySelector('[data-action="accept-all"]');
      acceptBtn.click();
      
      expect(onConsentChange).toHaveBeenCalledWith({
        functional: true,
        analytics: true,
        marketing: true
      });
    });
  });
});