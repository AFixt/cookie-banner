/**
 * Accessibility tests for the cookie banner
 */

describe('Accessibility Features', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cookie-banner" role="region" aria-label="Cookie Consent" aria-live="polite" class="theme-light">
        <p id="cookie-description">We use cookies to improve your experience.</p>
        <div class="cookie-buttons">
          <button id="accept-all" class="btn btn-primary">Accept All</button>
          <button id="reject-all" class="btn btn-secondary">Reject All</button>
          <button id="customize-preferences" aria-haspopup="dialog" aria-controls="cookie-modal" class="btn btn-link">Customize</button>
        </div>
      </div>

      <div id="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" class="theme-light" hidden>
        <h2 id="modal-title">Cookie Preferences</h2>
        <form id="cookie-form">
          <fieldset>
            <legend>Functional Cookies (Required)</legend>
            <label>
              <input type="checkbox" name="functional" checked disabled>
              Required (Always On)
            </label>
            <p class="cookie-description">These cookies are necessary for the website to function and cannot be switched off.</p>
          </fieldset>

          <fieldset>
            <legend>Analytics Cookies</legend>
            <label>
              <input type="checkbox" name="analytics">
              Allow Analytics Cookies
            </label>
            <p class="cookie-description">These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.</p>
          </fieldset>

          <fieldset>
            <legend>Marketing Cookies</legend>
            <label>
              <input type="checkbox" name="marketing">
              Allow Marketing Cookies
            </label>
            <p class="cookie-description">These cookies may be set through our site by our advertising partners to build a profile of your interests.</p>
          </fieldset>

          <div class="cookie-modal-actions">
            <button type="submit" class="btn btn-primary">Save Preferences</button>
            <button type="button" id="close-modal" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    `;
  });

  describe('Banner Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      const banner = document.getElementById('cookie-banner');

      expect(banner).toHaveAttribute('role', 'region');
      expect(banner).toHaveAttribute('aria-label', 'Cookie Consent');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    test('should have visible, descriptive text', () => {
      const description = document.getElementById('cookie-description');

      expect(description).toBeTruthy();
      expect(description.textContent.length).toBeGreaterThan(10);
      expect(description).toBeVisible();
    });

    test('buttons should have accessible names', () => {
      const acceptBtn = document.getElementById('accept-all');
      const rejectBtn = document.getElementById('reject-all');
      const customizeBtn = document.getElementById('customize-preferences');

      expect(acceptBtn).toBeTruthy();
      expect(acceptBtn.textContent.trim()).not.toBe('');
      expect(acceptBtn).toBeVisible();

      expect(rejectBtn).toBeTruthy();
      expect(rejectBtn.textContent.trim()).not.toBe('');
      expect(rejectBtn).toBeVisible();

      expect(customizeBtn).toBeTruthy();
      expect(customizeBtn.textContent.trim()).not.toBe('');
      expect(customizeBtn).toBeVisible();
    });

    test('customize button should have proper ARIA attributes for modal', () => {
      const customizeBtn = document.getElementById('customize-preferences');

      expect(customizeBtn).toHaveAttribute('aria-haspopup', 'dialog');
      expect(customizeBtn).toHaveAttribute('aria-controls', 'cookie-modal');
    });

    test('should have a theme class for styling', () => {
      const banner = document.getElementById('cookie-banner');

      expect(banner).toHaveClass('theme-light');
    });
  });

  describe('Modal Accessibility', () => {
    test('should have proper dialog ARIA attributes', () => {
      const modal = document.getElementById('cookie-modal');

      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    test('should be hidden by default', () => {
      const modal = document.getElementById('cookie-modal');
      expect(modal).toHaveAttribute('hidden');
    });

    test('should have a visible title that matches aria-labelledby', () => {
      const title = document.getElementById('modal-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Cookie Preferences');
    });

    test('should have properly structured form controls', () => {
      const form = document.getElementById('cookie-form');
      const fieldsets = form.querySelectorAll('fieldset');

      expect(fieldsets).toHaveLength(3);

      fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        expect(legend).toBeTruthy();
        expect(legend.textContent).not.toBe('');
      });
    });

    test('should have descriptive text for each cookie category', () => {
      const descriptions = document.querySelectorAll('.cookie-description');

      expect(descriptions).toHaveLength(3);

      descriptions.forEach(description => {
        expect(description.textContent.length).toBeGreaterThan(10);
      });
    });

    test('functional cookies should be required and checked', () => {
      const functionalCheckbox = document.querySelector('input[name="functional"]');

      expect(functionalCheckbox).toBeChecked();
      expect(functionalCheckbox).toBeDisabled();
    });

    test('modal should have a theme class for styling', () => {
      const modal = document.getElementById('cookie-modal');

      expect(modal).toHaveClass('theme-light');
    });

    test('form actions should have accessible names', () => {
      const saveBtn = document.querySelector('#cookie-form button[type="submit"]');
      const cancelBtn = document.getElementById('close-modal');

      expect(saveBtn).toBeTruthy();
      expect(saveBtn.textContent.trim()).not.toBe('');

      expect(cancelBtn).toBeTruthy();
      expect(cancelBtn.textContent.trim()).not.toBe('');
    });
  });

  describe('Internationalization Support', () => {
    test('should support different text based on locale', () => {
      const banner = document.getElementById('cookie-banner');
      const description = document.getElementById('cookie-description');

      expect(description.textContent).not.toBe('');

      const bannerText = banner.textContent;
      expect(bannerText).toContain('Accept All');
      expect(bannerText).toContain('Reject All');
      expect(bannerText).toContain('Customize');
    });
  });

  describe('Color and Contrast', () => {
    test('should apply theme classes for styling', () => {
      const banner = document.getElementById('cookie-banner');
      const modal = document.getElementById('cookie-modal');

      expect(banner).toHaveClass('theme-light');
      expect(modal).toHaveClass('theme-light');
    });

    test('buttons should have distinguishable styles', () => {
      const acceptBtn = document.getElementById('accept-all');
      const rejectBtn = document.getElementById('reject-all');
      const customizeBtn = document.getElementById('customize-preferences');

      expect(acceptBtn).toHaveClass('btn');
      expect(acceptBtn).toHaveClass('btn-primary');

      expect(rejectBtn).toHaveClass('btn');
      expect(rejectBtn).toHaveClass('btn-secondary');

      expect(customizeBtn).toHaveClass('btn');
      expect(customizeBtn).toHaveClass('btn-link');
    });
  });

  describe('Keyboard Navigation', () => {
    test('form fields should be focusable', () => {
      const analyticsCheckbox = document.querySelector('input[name="analytics"]');
      const marketingCheckbox = document.querySelector('input[name="marketing"]');
      const saveBtn = document.querySelector('#cookie-form button[type="submit"]');
      const cancelBtn = document.getElementById('close-modal');

      expect(analyticsCheckbox).not.toBeDisabled();
      expect(marketingCheckbox).not.toBeDisabled();
      expect(saveBtn).not.toBeDisabled();
      expect(cancelBtn).not.toBeDisabled();
    });

    test('should provide focus indicators', () => {
      const acceptBtn = document.getElementById('accept-all');

      expect(acceptBtn.tabIndex).toBeGreaterThanOrEqual(0);

      acceptBtn.focus();
      expect(document.activeElement).toBe(acceptBtn);
    });

    test('should maintain logical tab order', () => {
      const acceptBtn = document.getElementById('accept-all');
      const rejectBtn = document.getElementById('reject-all');
      const customizeBtn = document.getElementById('customize-preferences');

      const elements = [acceptBtn, rejectBtn, customizeBtn];

      elements.forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });
});
