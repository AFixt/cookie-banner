# Test info

- Name: Cookie Banner Consent Functionality >> should persist consent choices
- Location: /Users/karlgroves/Projects/cookie-banner/test/accessibility-e2e.test.js:181:3

# Error details

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#cookie-banner') to be visible

    at /Users/karlgroves/Projects/cookie-banner/test/accessibility-e2e.test.js:156:16
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
  120 |     const accessibilityScanResults = await new AxeBuilder({ page })
  121 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  122 |       .analyze();
  123 |
  124 |     expect(accessibilityScanResults.violations).toEqual([]);
  125 |   });
  126 |
  127 |   test('should work with text scaling up to 200%', async ({ page }) => {
  128 |     // Scale text to 200%
  129 |     await page.addStyleTag({
  130 |       content: 'html { font-size: 200% !important; }'
  131 |     });
  132 |     
  133 |     // Wait for layout to adjust
  134 |     await page.waitForTimeout(500);
  135 |     
  136 |     // Check that banner is still functional
  137 |     const banner = page.locator('#cookie-banner');
  138 |     await expect(banner).toBeVisible();
  139 |     
  140 |     // Test button functionality
  141 |     await page.click('#accept-all');
  142 |     
  143 |     // Run accessibility check with scaled text
  144 |     const accessibilityScanResults = await new AxeBuilder({ page })
  145 |       .withTags(['wcag2a', 'wcag2aa'])
  146 |       .analyze();
  147 |
  148 |     expect(accessibilityScanResults.violations).toEqual([]);
  149 |   });
  150 | });
  151 |
  152 | test.describe('Cookie Banner Consent Functionality', () => {
  153 |   test.beforeEach(async ({ page }) => {
  154 |     const examplePath = path.resolve(__dirname, '../dist/examples/vanilla-js.html');
  155 |     await page.goto(`file://${examplePath}`);
> 156 |     await page.waitForSelector('#cookie-banner');
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  157 |   });
  158 |
  159 |   test('should emit consent events when user makes choices', async ({ page }) => {
  160 |     // Listen for consent change events
  161 |     const consentEvents = [];
  162 |     await page.exposeFunction('captureConsentEvent', (eventData) => {
  163 |       consentEvents.push(eventData);
  164 |     });
  165 |     
  166 |     await page.evaluate(() => {
  167 |       document.addEventListener('cookieConsentChanged', (e) => {
  168 |         window.captureConsentEvent(e.detail);
  169 |       });
  170 |     });
  171 |     
  172 |     // Accept all cookies
  173 |     await page.click('#accept-all');
  174 |     
  175 |     // Wait for event
  176 |     await page.waitForTimeout(100);
  177 |     
  178 |     expect(consentEvents.length).toBeGreaterThan(0);
  179 |   });
  180 |
  181 |   test('should persist consent choices', async ({ page }) => {
  182 |     // Accept all cookies
  183 |     await page.click('#accept-all');
  184 |     
  185 |     // Reload page
  186 |     await page.reload();
  187 |     
  188 |     // Banner should not be visible after reload
  189 |     const banner = page.locator('#cookie-banner');
  190 |     await expect(banner).toBeHidden();
  191 |   });
  192 | });
```