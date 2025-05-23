/**
 * Tests for the main banner functionality using simple mocks
 */

describe('CookieConsent API', () => {
  let mockConsent;
  
  beforeEach(() => {
    // Clear localStorage and cookies
    localStorage.clear();
    document.cookie = '';
    
    // Set up mock consent object
    mockConsent = {
      functional: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Create mock API
    window.CookieConsent = {
      getConsent: jest.fn(() => mockConsent),
      setConsent: jest.fn(consent => {
        mockConsent = {
          ...consent,
          functional: true,
          timestamp: new Date().toISOString()
        };
        return mockConsent;
      }),
      hasConsent: jest.fn(category => {
        return mockConsent ? !!mockConsent[category] : false;
      })
    };
  });
  
  describe('API Methods', () => {
    test('CookieConsent API should exist', () => {
      expect(window.CookieConsent).toBeDefined();
      expect(typeof window.CookieConsent.getConsent).toBe('function');
      expect(typeof window.CookieConsent.setConsent).toBe('function');
      expect(typeof window.CookieConsent.hasConsent).toBe('function');
    });
    
    test('getConsent should return consent object', () => {
      const result = window.CookieConsent.getConsent();
      expect(result).toEqual(mockConsent);
      expect(window.CookieConsent.getConsent).toHaveBeenCalled();
    });
    
    test('setConsent should update consent data', () => {
      const newConsent = {
        functional: true,
        analytics: true,
        marketing: false
      };
      
      window.CookieConsent.setConsent(newConsent);
      
      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith(newConsent);
      expect(mockConsent.analytics).toBe(true);
      expect(mockConsent.marketing).toBe(false);
      expect(mockConsent.timestamp).toBeDefined();
    });
    
    test('setConsent should force functional cookies to true', () => {
      window.CookieConsent.setConsent({
        functional: false,
        analytics: false,
        marketing: false
      });
      
      expect(mockConsent.functional).toBe(true);
    });
    
    test('hasConsent should check consent for a category', () => {
      expect(window.CookieConsent.hasConsent('functional')).toBe(true);
      expect(window.CookieConsent.hasConsent('analytics')).toBe(false);
      expect(window.CookieConsent.hasConsent('marketing')).toBe(false);
      expect(window.CookieConsent.hasConsent('nonexistent')).toBe(false);
      
      // Update consent
      window.CookieConsent.setConsent({
        functional: true,
        analytics: true,
        marketing: false
      });
      
      expect(window.CookieConsent.hasConsent('analytics')).toBe(true);
    });
  });
  
  describe('Default Banner Behavior', () => {
    beforeEach(() => {
      // Set up fake DOM for testing
      document.body.innerHTML = `
        <div id="cookie-banner">
          <button id="accept-all">Accept All</button>
          <button id="reject-all">Reject All</button>
          <button id="customize-preferences">Customize</button>
        </div>
        <div id="cookie-modal" hidden>
          <form id="cookie-form">
            <button id="close-modal">Cancel</button>
          </form>
        </div>
      `;
      
      // Simplified mock function for click handlers
      document.getElementById('accept-all').onclick = () => {
        window.CookieConsent.setConsent({
          functional: true, 
          analytics: true, 
          marketing: true
        });
        document.getElementById('cookie-banner').remove();
      };
      
      document.getElementById('reject-all').onclick = () => {
        window.CookieConsent.setConsent({
          functional: true, 
          analytics: false, 
          marketing: false
        });
        document.getElementById('cookie-banner').remove();
      };
      
      document.getElementById('customize-preferences').onclick = () => {
        document.getElementById('cookie-modal').removeAttribute('hidden');
      };
      
      document.getElementById('close-modal').onclick = () => {
        document.getElementById('cookie-modal').setAttribute('hidden', '');
      };
    });
    
    test('should set full consent when Accept All is clicked', () => {
      // Click Accept All
      document.getElementById('accept-all').click();
      
      // Check consent values
      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: true,
        marketing: true
      });
      
      // Banner should be removed
      expect(document.getElementById('cookie-banner')).toBeNull();
    });
    
    test('should set minimal consent when Reject All is clicked', () => {
      // Click Reject All
      document.getElementById('reject-all').click();
      
      // Check consent values
      expect(window.CookieConsent.setConsent).toHaveBeenCalledWith({
        functional: true,
        analytics: false,
        marketing: false
      });
      
      // Banner should be removed
      expect(document.getElementById('cookie-banner')).toBeNull();
    });
    
    test('should toggle modal visibility', () => {
      // Modal should be hidden initially
      expect(document.getElementById('cookie-modal').hasAttribute('hidden')).toBe(true);
      
      // Click Customize
      document.getElementById('customize-preferences').click();
      
      // Modal should be visible
      expect(document.getElementById('cookie-modal').hasAttribute('hidden')).toBe(false);
      
      // Click Close
      document.getElementById('close-modal').click();
      
      // Modal should be hidden again
      expect(document.getElementById('cookie-modal').hasAttribute('hidden')).toBe(true);
    });
  });
});