# Test info

- Name: Cookie Banner Accessibility >> should work with text scaling up to 200%
- Location: /Users/karlgroves/Projects/cookie-banner/test/accessibility-e2e.test.js:127:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#cookie-banner') to be visible

    at /Users/karlgroves/Projects/cookie-banner/test/accessibility-e2e.test.js:19:16
```

# Page snapshot

```yaml
- heading "Cookie Banner - Vanilla JS Example" [level=1]
- paragraph: This example shows how to implement the cookie banner with vanilla JavaScript.
- heading "Implementation" [level=2]
- code: "<!-- Include the CSS --> <link rel=\"stylesheet\" href=\"path/to/banner.css\"> <!-- Include the JavaScript --> <script src=\"path/to/cookie-banner.min.js\"></script> <script> // Initialize the cookie banner window.CookieBanner.init({ locale: 'en', theme: 'light', onConsentChange: (consent) => { console.log('Consent changed:', consent); // Enable/disable functionality based on consent if (consent.analytics) { // Initialize analytics } if (consent.marketing) { // Initialize marketing } } }); </script>"
- heading "Demo Controls" [level=3]
- button "Reset Consent"
- button "Toggle Theme"
- combobox:
  - option "English" [selected]
  - option "French"
  - option "Spanish"
- heading "Current Consent Status:" [level=4]
- text: No consent data found
```

# Test source

```ts
   1 | /**
   2 |  * End-to-end accessibility tests using Playwright and axe-core
   3 |  */
   4 |
   5 | import { test, expect } from '@playwright/test';
   6 | import AxeBuilder from '@axe-core/playwright';
   7 | import path from 'path';
   8 | import { fileURLToPath } from 'url';
   9 |
   10 | const __dirname = path.dirname(fileURLToPath(import.meta.url));
   11 |
   12 | test.describe('Cookie Banner Accessibility', () => {
   13 |   test.beforeEach(async ({ page }) => {
   14 |     // Serve the example file locally
   15 |     const examplePath = path.resolve(__dirname, '../dist/examples/vanilla-js.html');
   16 |     await page.goto(`file://${examplePath}`);
   17 |     
   18 |     // Wait for the banner to load
>  19 |     await page.waitForSelector('#cookie-banner', { timeout: 5000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
   20 |   });
   21 |
   22 |   test('should not have any accessibility violations on initial load', async ({ page }) => {
   23 |     const accessibilityScanResults = await new AxeBuilder({ page })
   24 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
   25 |       .analyze();
   26 |
   27 |     expect(accessibilityScanResults.violations).toEqual([]);
   28 |   });
   29 |
   30 |   test('should be keyboard navigable', async ({ page }) => {
   31 |     // Test Tab navigation through banner buttons
   32 |     await page.keyboard.press('Tab');
   33 |     await expect(page.locator('#accept-all')).toBeFocused();
   34 |     
   35 |     await page.keyboard.press('Tab');
   36 |     await expect(page.locator('#reject-all')).toBeFocused();
   37 |     
   38 |     await page.keyboard.press('Tab');
   39 |     await expect(page.locator('#customize-preferences')).toBeFocused();
   40 |   });
   41 |
   42 |   test('should open modal with keyboard and maintain focus', async ({ page }) => {
   43 |     // Navigate to customize button and activate with Enter
   44 |     await page.keyboard.press('Tab');
   45 |     await page.keyboard.press('Tab');
   46 |     await page.keyboard.press('Tab');
   47 |     await page.keyboard.press('Enter');
   48 |     
   49 |     // Wait for modal to open
   50 |     await page.waitForSelector('#cookie-modal:not([hidden])', { timeout: 2000 });
   51 |     
   52 |     // Check that focus is trapped in modal
   53 |     const modal = page.locator('#cookie-modal');
   54 |     await expect(modal).toBeVisible();
   55 |     
   56 |     // Run accessibility check on modal
   57 |     const accessibilityScanResults = await new AxeBuilder({ page })
   58 |       .include('#cookie-modal')
   59 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
   60 |       .analyze();
   61 |
   62 |     expect(accessibilityScanResults.violations).toEqual([]);
   63 |   });
   64 |
   65 |   test('should close modal with Escape key', async ({ page }) => {
   66 |     // Open modal
   67 |     await page.click('#customize-preferences');
   68 |     await page.waitForSelector('#cookie-modal:not([hidden])');
   69 |     
   70 |     // Close with Escape
   71 |     await page.keyboard.press('Escape');
   72 |     await page.waitForSelector('#cookie-modal[hidden]', { timeout: 2000 });
   73 |     
   74 |     // Focus should return to trigger button
   75 |     await expect(page.locator('#customize-preferences')).toBeFocused();
   76 |   });
   77 |
   78 |   test('should have proper ARIA attributes', async ({ page }) => {
   79 |     const banner = page.locator('#cookie-banner');
   80 |     
   81 |     // Check banner ARIA attributes
   82 |     await expect(banner).toHaveAttribute('role', 'region');
   83 |     await expect(banner).toHaveAttribute('aria-label');
   84 |     
   85 |     const customizeButton = page.locator('#customize-preferences');
   86 |     await expect(customizeButton).toHaveAttribute('aria-haspopup', 'dialog');
   87 |     await expect(customizeButton).toHaveAttribute('aria-controls', 'cookie-modal');
   88 |   });
   89 |
   90 |   test('should work with screen readers (basic simulation)', async ({ page }) => {
   91 |     // Simulate screen reader announcement by checking aria-live region
   92 |     const banner = page.locator('#cookie-banner');
   93 |     await expect(banner).toHaveAttribute('aria-live', 'polite');
   94 |     
   95 |     // Check that all interactive elements have accessible names
   96 |     const buttons = page.locator('#cookie-banner button');
   97 |     const buttonCount = await buttons.count();
   98 |     
   99 |     for (let i = 0; i < buttonCount; i++) {
  100 |       const button = buttons.nth(i);
  101 |       const textContent = await button.textContent();
  102 |       expect(textContent?.trim()).toBeTruthy();
  103 |     }
  104 |   });
  105 |
  106 |   test('should maintain accessibility in high contrast mode', async ({ page }) => {
  107 |     // Simulate high contrast mode
  108 |     await page.addStyleTag({
  109 |       content: `
  110 |         @media (prefers-contrast: high) {
  111 |           * {
  112 |             background: black !important;
  113 |             color: white !important;
  114 |             border-color: white !important;
  115 |           }
  116 |         }
  117 |       `
  118 |     });
  119 |     
```