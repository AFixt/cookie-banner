/**
 * Unit tests for banner-focus.js — modal focus capture, restore, and the
 * Tab/Shift+Tab trap. Extracted units from #69.
 */

const { createFocusManager } = require('../src/js/banner-focus.js');

describe('banner-focus', () => {
  let manager;
  let modal;
  let outsideButton;
  let first;
  let last;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="outside">outside</button>
      <div id="modal">
        <button id="first">first</button>
        <input id="middle" type="checkbox" />
        <button id="last">last</button>
      </div>
    `;
    manager = createFocusManager();
    modal = document.getElementById('modal');
    outsideButton = document.getElementById('outside');
    first = document.getElementById('first');
    last = document.getElementById('last');
  });

  function tabEvent(shiftKey) {
    return {
      key: 'Tab',
      shiftKey,
      preventDefault: jest.fn(),
    };
  }

  test('captureFocus records the active element and focuses the first focusable', () => {
    outsideButton.focus();
    manager.captureFocus(modal);
    expect(document.activeElement).toBe(first);

    manager.restoreFocus();
    expect(document.activeElement).toBe(outsideButton);
  });

  test('a remembered trigger wins over the active element and resets after restore', () => {
    manager.rememberTrigger(outsideButton);
    document.getElementById('middle').focus();
    manager.captureFocus(modal);

    manager.restoreFocus();
    expect(document.activeElement).toBe(outsideButton);

    // Second restore is a no-op: the remembered element was cleared
    first.focus();
    manager.restoreFocus();
    expect(document.activeElement).toBe(first);
  });

  test('Tab on the last element wraps focus to the first', () => {
    manager.captureFocus(modal);
    last.focus();

    const event = tabEvent(false);
    manager.trapFocus(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  test('Shift+Tab on the first element wraps focus to the last', () => {
    manager.captureFocus(modal);
    first.focus();

    const event = tabEvent(true);
    manager.trapFocus(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });

  test('Tab in the middle of the dialog is left alone', () => {
    manager.captureFocus(modal);
    document.getElementById('middle').focus();

    const event = tabEvent(false);
    manager.trapFocus(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test('non-Tab keys are ignored', () => {
    manager.captureFocus(modal);
    const event = { key: 'Enter', shiftKey: false, preventDefault: jest.fn() };
    manager.trapFocus(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
