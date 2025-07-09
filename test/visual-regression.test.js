/**
 * Visual regression tests for cookie banner components
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = 'http://localhost:8080/example.html';
const VIEWPORT_SIZES = [
  { width: 1280, height: 720, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' }
];

test.describe('Cookie Banner Visual Regression', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing consent data
    await page.addInitScript(() => {
      localStorage.clear();
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });
  });

  // Test banner initial state
  for (const viewport of VIEWPORT_SIZES) {
    test(`banner initial state - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(TEST_URL);
      
      // Wait for banner to appear
      await page.waitForSelector('#cookie-banner', { state: 'visible' });
      
      // Wait for any animations to complete
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await expect(page).toHaveScreenshot(`banner-initial-${viewport.name}.png`);
    });
  }

  // Test modal state
  for (const viewport of VIEWPORT_SIZES) {
    test(`modal open state - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(TEST_URL);
      
      // Wait for banner and click customize
      await page.waitForSelector('#cookie-banner', { state: 'visible' });
      await page.click('#customize-preferences');
      
      // Wait for modal to appear
      await page.waitForSelector('#cookie-modal', { state: 'visible' });
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await expect(page).toHaveScreenshot(`modal-open-${viewport.name}.png`);
    });
  }

  // Test dark theme
  test('banner dark theme - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    // Apply dark theme
    await page.addStyleTag({
      content: `
        .theme-dark {
          --bg-primary: #333333;
          --text-primary: #f8f9fa;
          --border-primary: #555555;
          --button-primary-bg: #0d6efd;
          --button-secondary-bg: #444444;
          --button-secondary-text: #f8f9fa;
          --button-secondary-border: #666666;
        }
      `
    });
    
    await page.evaluate(() => {
      document.body.classList.add('theme-dark');
    });
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('banner-dark-theme.png');
  });

  // Test high contrast theme
  test('banner high contrast theme - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    // Apply high contrast theme
    await page.addStyleTag({
      content: `
        .theme-high-contrast {
          --bg-primary: #000000;
          --text-primary: #ffffff;
          --border-primary: #ffffff;
          --button-primary-bg: #ffff00;
          --button-primary-text: #000000;
          --button-secondary-bg: #000000;
          --button-secondary-text: #ffffff;
          --button-secondary-border: #ffffff;
        }
      `
    });
    
    await page.evaluate(() => {
      document.body.classList.add('theme-high-contrast');
    });
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('banner-high-contrast-theme.png');
  });

  // Test banner with long text content
  test('banner with long text content - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    // Inject longer text content
    await page.evaluate(() => {
      const description = document.getElementById('cookie-description');
      if (description) {
        description.textContent = 'We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, personalize content and advertisements, and provide social media features. By continuing to use our website, you consent to our use of cookies. Please review our privacy policy for more information about how we collect, use, and protect your data.';
      }
    });
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('banner-long-text.png');
  });

  // Test modal form states
  test('modal form states - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.click('#customize-preferences');
    await page.waitForSelector('#cookie-modal', { state: 'visible' });
    
    // Check analytics checkbox
    await page.check('input[name="analytics"]');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('modal-analytics-checked.png');
    
    // Check marketing checkbox
    await page.check('input[name="marketing"]');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('modal-all-checked.png');
  });

  // Test focus states
  test('focus states - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    
    // Focus on accept button
    await page.focus('#accept-all');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('banner-accept-button-focused.png');
    
    // Focus on customize button
    await page.focus('#customize-preferences');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('banner-customize-button-focused.png');
  });

  // Test RTL support
  test('banner RTL support - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_URL);
    
    // Set RTL direction
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });
    
    await page.waitForSelector('#cookie-banner', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('banner-rtl.png');
  });

  // Test banner after consent given (should not appear)
  test('banner hidden after consent - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Set consent in localStorage before page load
    await page.addInitScript(() => {
      localStorage.setItem('cookieConsent', JSON.stringify({
        functional: true,
        analytics: true,
        marketing: false,
        timestamp: new Date().toISOString()
      }));
    });
    
    await page.goto(TEST_URL);
    await page.waitForTimeout(2000);
    
    // Banner should not be visible
    await expect(page.locator('#cookie-banner')).not.toBeVisible();
    
    await expect(page).toHaveScreenshot('banner-hidden-after-consent.png');
  });
});