/**
 * @file Focus management for the preferences modal: capturing focus
 * on open, trapping Tab/Shift+Tab inside the dialog, and restoring focus on
 * close (WCAG 2.2 focus management). Extracted from banner.js (see
 * AFixt/cookie-banner#69).
 * @module banner-focus
 */

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Create a focus manager for a modal dialog. Each manager instance owns the
 * focus bookkeeping that previously lived as module state in banner.js.
 * @returns {object} Focus manager API
 */
export function createFocusManager() {
  let firstFocusableElement = null;
  let lastFocusableElement = null;
  let previouslyFocusedElement = null;

  return {
    /**
     * Remember the element that triggered the modal, so focus can return to
     * it on close.
     * @param {Element} element - The triggering element
     */
    rememberTrigger(element) {
      previouslyFocusedElement = element;
    },

    /**
     * Capture focus inside the modal: record the previously focused element
     * (unless a trigger was already remembered) and focus the first
     * focusable element.
     * @param {HTMLElement} modal - The modal element
     */
    captureFocus(modal) {
      if (!previouslyFocusedElement) {
        previouslyFocusedElement = document.activeElement;
      }

      const focusableElements = modal.querySelectorAll(FOCUSABLE_SELECTOR);
      firstFocusableElement = focusableElements[0];
      lastFocusableElement = focusableElements[focusableElements.length - 1];

      firstFocusableElement.focus();
    },

    /**
     * Return focus to the element that had it before the modal opened.
     */
    restoreFocus() {
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null; // Reset after use
      }
    },

    /**
     * Keydown handler that traps Tab / Shift+Tab within the modal.
     * @param {KeyboardEvent} e - Keyboard event
     */
    trapFocus(e) {
      if (e.key !== 'Tab') {
        return;
      }
      if (e.shiftKey) {
        // Going backwards from the first element wraps to the last
        if (document.activeElement === firstFocusableElement) {
          e.preventDefault();
          lastFocusableElement.focus();
        }
      } else if (document.activeElement === lastFocusableElement) {
        // Going forwards from the last element wraps to the first
        e.preventDefault();
        firstFocusableElement.focus();
      }
    },
  };
}
