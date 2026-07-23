/**
 * Unit tests for cookie-blocker-rules.js — the pure classification rules
 * behind the cookie blocker. Extracted units from #69.
 */

const {
  cookieBlockDecision,
  scriptBlockDecision,
  matchesInlineTracking,
  getTrackingKeyword,
  getScriptCategory,
} = require('../src/js/cookie-blocker-rules.js');

describe('cookie-blocker-rules', () => {
  describe('cookieBlockDecision', () => {
    test('without a consent manager, blocks everything except the consent cookie', () => {
      expect(cookieBlockDecision('_ga', null)).toBe(true);
      expect(cookieBlockDecision('random_cookie', null)).toBe(true);
      expect(cookieBlockDecision('cookie-consent-state', null)).toBe(false);
    });

    test('blocks category cookies when that category lacks consent', () => {
      const manager = { hasConsent: category => category === 'marketing' };
      expect(cookieBlockDecision('_ga', manager)).toBe(true); // analytics denied
      expect(cookieBlockDecision('_fbp', manager)).toBe(false); // marketing granted
    });

    test('allows unmatched cookies when a consent manager exists', () => {
      const manager = { hasConsent: () => false };
      expect(cookieBlockDecision('session_id', manager)).toBe(false);
    });

    test('treats a manager without hasConsent as denying every category', () => {
      expect(cookieBlockDecision('_gid', {})).toBe(true);
    });
  });

  describe('scriptBlockDecision', () => {
    const GA_SRC = 'https://www.google-analytics.com/analytics.js';
    const FB_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

    test('without a consent manager, blocks tracking scripts by pattern', () => {
      expect(scriptBlockDecision(GA_SRC, null)).toBe(true);
      expect(scriptBlockDecision('https://example.com/app.js', null)).toBe(false);
    });

    test('blocks a category script when its category lacks consent', () => {
      const manager = { hasConsent: () => false };
      expect(scriptBlockDecision(GA_SRC, manager)).toBe(true);
      expect(scriptBlockDecision(FB_SRC, manager)).toBe(true);
    });

    test('non-tracking scripts pass through with a consent manager present', () => {
      const manager = { hasConsent: () => false };
      expect(scriptBlockDecision('https://example.com/app.js', manager)).toBe(false);
    });
  });

  describe('matchesInlineTracking', () => {
    test('detects common inline tracking snippets', () => {
      expect(matchesInlineTracking("ga('send', 'pageview');")).toBe(true);
      expect(matchesInlineTracking("gtag('config', 'UA-1');")).toBe(true);
      expect(matchesInlineTracking('dataLayer.push({});')).toBe(true);
      expect(matchesInlineTracking('console.log("hello");')).toBe(false);
    });
  });

  describe('getTrackingKeyword', () => {
    test('names the matched tracker', () => {
      expect(getTrackingKeyword("ga('send');")).toBe('ga(');
      expect(getTrackingKeyword("fbq('track');")).toBe('fbq(');
      expect(getTrackingKeyword('nothing here')).toBe('tracking code');
    });
  });

  describe('getScriptCategory', () => {
    test('classifies analytics and marketing hosts, defaulting to analytics', () => {
      expect(getScriptCategory('https://www.googletagmanager.com/gtm.js')).toBe('analytics');
      expect(getScriptCategory('https://connect.facebook.net/fbevents.js')).toBe('marketing');
      expect(getScriptCategory('https://example.com/app.js')).toBe('analytics');
      expect(getScriptCategory('')).toBe('analytics');
    });
  });
});
