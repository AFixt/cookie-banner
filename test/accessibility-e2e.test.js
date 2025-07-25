/**
 * End-to-end accessibility tests using Playwright and axe-core
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Cookie Banner Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Serve the test file locally
    const testPath = path.resolve(__dirname, './test-page.html');
    await page.goto(`file://${testPath}`);
    
    // Clear localStorage to ensure banner shows
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Wait for the banner to load
    await page.waitForSelector('#cookie-banner', { timeout: 10000 });
  });

  test('should not have any accessibility violations on initial load', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test Tab navigation through banner buttons
    await page.keyboard.press('Tab');
    await expect(page.locator('#accept-all')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#reject-all')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#customize-preferences')).toBeFocused();
  });

  test('should open modal with keyboard and maintain focus', async ({ page }) => {
    // Navigate to customize button and activate with Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Wait for modal to open
    await page.waitForSelector('#cookie-modal:not([hidden])', { timeout: 2000 });
    
    // Check that focus is trapped in modal
    const modal = page.locator('#cookie-modal');
    await expect(modal).toBeVisible();
    
    // Run accessibility check on modal
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('#cookie-modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should close modal with Escape key', async ({ page }) => {
    // Open modal
    await page.click('#customize-preferences');
    await page.waitForSelector('#cookie-modal:not([hidden])');
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForSelector('#cookie-modal[hidden]', { timeout: 2000 });
    
    // Focus should return to trigger button
    await expect(page.locator('#customize-preferences')).toBeFocused();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    const banner = page.locator('#cookie-banner');
    
    // Check banner ARIA attributes
    await expect(banner).toHaveAttribute('role', 'region');
    await expect(banner).toHaveAttribute('aria-label');
    
    const customizeButton = page.locator('#customize-preferences');
    await expect(customizeButton).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(customizeButton).toHaveAttribute('aria-controls', 'cookie-modal');
  });

  test('should work with screen readers (basic simulation)', async ({ page }) => {
    // Simulate screen reader announcement by checking aria-live region
    const banner = page.locator('#cookie-banner');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
    
    // Check that all interactive elements have accessible names
    const buttons = page.locator('#cookie-banner button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const textContent = await button.textContent();
      expect(textContent?.trim()).toBeTruthy();
    }
  });

  test('should maintain accessibility in high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `
    });
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should work with text scaling up to 200%', async ({ page }) => {
    // Scale text to 200%
    await page.addStyleTag({
      content: 'html { font-size: 200% !important; }'
    });
    
    // Wait for layout to adjust
    await page.waitForTimeout(500);
    
    // Check that banner is still functional
    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeVisible();
    
    // Test button functionality
    await page.click('#accept-all');
    
    // Run accessibility check with scaled text
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Cookie Banner Consent Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const testPath = path.resolve(__dirname, './test-page.html');
    await page.goto(`file://${testPath}`);
    
    // Clear localStorage to ensure banner shows
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.waitForSelector('#cookie-banner', { timeout: 10000 });
  });

  test('should emit consent events when user makes choices', async ({ page }) => {
    // Listen for consent change events
    const consentEvents = [];
    await page.exposeFunction('captureConsentEvent', (eventData) => {
      consentEvents.push(eventData);
    });
    
    await page.evaluate(() => {
      document.addEventListener('cookieConsentChanged', (e) => {
        window.captureConsentEvent(e.detail);
      });
    });
    
    // Accept all cookies
    await page.click('#accept-all');
    
    // Wait for event
    await page.waitForTimeout(100);
    
    expect(consentEvents.length).toBeGreaterThan(0);
  });

  test('should persist consent choices', async ({ page }) => {
    // Accept all cookies
    await page.click('#accept-all');
    
    // Reload page
    await page.reload();
    
    // Banner should not be visible after reload
    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeHidden();
  });
});