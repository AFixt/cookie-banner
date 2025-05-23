/**
 * Accessible Cookie Banner
 * Main functionality for banner and preference modal
 */

(function() {
  'use strict';

  // Default configuration
  const defaultConfig = {
    locale: 'en',
    theme: 'light',
    showModal: true,
    onConsentChange: null,
    storageMethod: 'localStorage', // or 'cookie'
    expireDays: 365,
    categories: {
      functional: true,
      analytics: false,
      marketing: false
    }
  };

  // State
  let config = {};
  let banner = null;
  let modal = null;
  let localeStrings = {};
  let focusableElements = [];
  let firstFocusableElement = null;
  let lastFocusableElement = null;
  let previouslyFocusedElement = null;
  let isModalOpen = false;

  /**
   * Initialize the cookie banner
   * @param {Object} userConfig - Configuration options
   */
  function initCookieBanner(userConfig = {}) {
    // Merge user configuration with defaults
    config = { ...defaultConfig, ...userConfig };

    // Check if consent is already given
    const consent = getConsent();
    if (consent && consent.hasOwnProperty('functional')) {
      // User has already made a choice
      dispatchConsentEvent(consent);
      return;
    }

    // Load locale strings
    loadLocaleStrings(config.locale)
      .then(() => {
        // Create and append banner
        createBanner();
        
        // Create and append modal if enabled
        if (config.showModal) {
          createModal();
        }
        
        // Add event listeners
        addEventListeners();
      })
      .catch(error => {
        console.error('Failed to initialize cookie banner:', error);
      });
  }

  /**
   * Load locale strings based on configured locale
   * @param {string} locale - Locale code (e.g., 'en')
   * @returns {Promise}
   */
  function loadLocaleStrings(locale) {
    return new Promise((resolve, reject) => {
      // Use default English strings as fallback
      localeStrings = {
        description: 'We use cookies to improve your experience.',
        acceptAll: 'Accept All',
        rejectAll: 'Reject All',
        customize: 'Customize',
        modal: {
          title: 'Cookie Preferences',
          functional: 'Functional Cookies (Required)',
          analytics: 'Allow Analytics Cookies',
          marketing: 'Allow Marketing Cookies',
          save: 'Save Preferences',
          cancel: 'Cancel'
        }
      };

      // Try to load locale file if not English
      if (locale !== 'en') {
        fetch(`locales/${locale}.json`)
          .then(response => {
            if (!response.ok) {
              console.warn(`Locale ${locale} not found, using default English.`);
              return resolve();
            }
            return response.json();
          })
          .then(data => {
            localeStrings = data;
            resolve();
          })
          .catch(error => {
            console.warn(`Failed to load locale ${locale}, using default English:`, error);
            resolve();
          });
      } else {
        resolve();
      }
    });
  }

  /**
   * Create and append the cookie banner to the DOM
   */
  function createBanner() {
    banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie Consent');
    banner.setAttribute('aria-live', 'polite');
    
    const description = document.createElement('p');
    description.id = 'cookie-description';
    description.textContent = localeStrings.description;
    
    const buttons = document.createElement('div');
    buttons.className = 'cookie-buttons';
    
    const acceptAllBtn = document.createElement('button');
    acceptAllBtn.id = 'accept-all';
    acceptAllBtn.textContent = localeStrings.acceptAll;
    
    const rejectAllBtn = document.createElement('button');
    rejectAllBtn.id = 'reject-all';
    rejectAllBtn.textContent = localeStrings.rejectAll;
    
    const customizeBtn = document.createElement('button');
    customizeBtn.id = 'customize-preferences';
    customizeBtn.textContent = localeStrings.customize;
    if (config.showModal) {
      customizeBtn.setAttribute('aria-haspopup', 'dialog');
      customizeBtn.setAttribute('aria-controls', 'cookie-modal');
    }
    
    // Append elements
    buttons.appendChild(acceptAllBtn);
    buttons.appendChild(rejectAllBtn);
    buttons.appendChild(customizeBtn);
    banner.appendChild(description);
    banner.appendChild(buttons);
    
    // Apply theme
    banner.classList.add(`theme-${config.theme}`);
    
    // Add to the DOM
    document.body.appendChild(banner);
  }

  /**
   * Create and append the preferences modal to the DOM
   */
  function createModal() {
    modal = document.createElement('div');
    modal.id = 'cookie-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('hidden', '');
    
    const title = document.createElement('h2');
    title.id = 'modal-title';
    title.textContent = localeStrings.modal.title;
    
    const form = document.createElement('form');
    form.id = 'cookie-form';
    
    // Cookie categories fieldset - groups all related checkboxes
    const cookieFieldset = document.createElement('fieldset');
    const cookieLegend = document.createElement('legend');
    cookieLegend.textContent = 'Cookie Categories';
    cookieFieldset.appendChild(cookieLegend);
    
    // Functional cookies (always required)
    const functionalDiv = document.createElement('div');
    functionalDiv.className = 'cookie-category';
    
    const functionalLabel = document.createElement('label');
    const functionalCheckbox = document.createElement('input');
    functionalCheckbox.type = 'checkbox';
    functionalCheckbox.name = 'functional';
    functionalCheckbox.checked = true;
    functionalCheckbox.disabled = true;
    functionalLabel.appendChild(functionalCheckbox);
    functionalLabel.appendChild(document.createTextNode(' ' + localeStrings.modal.functional));
    
    functionalDiv.appendChild(functionalLabel);

    // Add description if available
    if (localeStrings.modal.functionalDescription) {
      const functionalDesc = document.createElement('p');
      functionalDesc.className = 'cookie-description';
      functionalDesc.textContent = localeStrings.modal.functionalDescription;
      functionalDiv.appendChild(functionalDesc);
    }
    
    // Analytics cookies
    const analyticsDiv = document.createElement('div');
    analyticsDiv.className = 'cookie-category';
    
    const analyticsLabel = document.createElement('label');
    const analyticsCheckbox = document.createElement('input');
    analyticsCheckbox.type = 'checkbox';
    analyticsCheckbox.name = 'analytics';
    analyticsCheckbox.checked = config.categories.analytics;
    analyticsLabel.appendChild(analyticsCheckbox);
    analyticsLabel.appendChild(document.createTextNode(' ' + localeStrings.modal.analytics));
    
    analyticsDiv.appendChild(analyticsLabel);

    // Add description if available
    if (localeStrings.modal.analyticsDescription) {
      const analyticsDesc = document.createElement('p');
      analyticsDesc.className = 'cookie-description';
      analyticsDesc.textContent = localeStrings.modal.analyticsDescription;
      analyticsDiv.appendChild(analyticsDesc);
    }
    
    // Marketing cookies
    const marketingDiv = document.createElement('div');
    marketingDiv.className = 'cookie-category';
    
    const marketingLabel = document.createElement('label');
    const marketingCheckbox = document.createElement('input');
    marketingCheckbox.type = 'checkbox';
    marketingCheckbox.name = 'marketing';
    marketingCheckbox.checked = config.categories.marketing;
    marketingLabel.appendChild(marketingCheckbox);
    marketingLabel.appendChild(document.createTextNode(' ' + localeStrings.modal.marketing));
    
    marketingDiv.appendChild(marketingLabel);

    // Add description if available
    if (localeStrings.modal.marketingDescription) {
      const marketingDesc = document.createElement('p');
      marketingDesc.className = 'cookie-description';
      marketingDesc.textContent = localeStrings.modal.marketingDescription;
      marketingDiv.appendChild(marketingDesc);
    }
    
    // Add all categories to the fieldset
    cookieFieldset.appendChild(functionalDiv);
    cookieFieldset.appendChild(analyticsDiv);
    cookieFieldset.appendChild(marketingDiv);
    
    // Modal actions
    const actions = document.createElement('div');
    actions.className = 'cookie-modal-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = localeStrings.modal.save;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'close-modal';
    cancelBtn.textContent = localeStrings.modal.cancel;
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    
    // Append everything to the form
    form.appendChild(cookieFieldset);
    form.appendChild(actions);
    
    // Append to modal
    modal.appendChild(title);
    modal.appendChild(form);
    
    // Apply theme
    modal.classList.add(`theme-${config.theme}`);
    
    // Add to the DOM
    document.body.appendChild(modal);
  }

  /**
   * Add event listeners to buttons and form
   */
  function addEventListeners() {
    // Accept all button
    document.getElementById('accept-all').addEventListener('click', () => {
      setConsent({
        functional: true,
        analytics: true,
        marketing: true
      });
      hideBanner();
    });
    
    // Reject all button
    document.getElementById('reject-all').addEventListener('click', () => {
      setConsent({
        functional: true, // Functional is always required
        analytics: false,
        marketing: false
      });
      hideBanner();
    });
    
    // Customize button
    const customizeBtn = document.getElementById('customize-preferences');
    if (customizeBtn && config.showModal) {
      customizeBtn.addEventListener('click', openModal);
    }
    
    // Modal events (if enabled)
    if (config.showModal) {
      // Close button
      document.getElementById('close-modal').addEventListener('click', closeModal);
      
      // Form submission
      document.getElementById('cookie-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        setConsent({
          functional: true, // Always required
          analytics: form.elements.analytics.checked,
          marketing: form.elements.marketing.checked
        });
        closeModal();
        hideBanner();
      });
      
      // Close modal on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
          closeModal();
        }
      });
      
      // Trap focus in modal
      modal.addEventListener('keydown', trapFocus);
    }
  }

  /**
   * Open the preferences modal
   */
  function openModal() {
    if (!modal) return;
    
    // Store the element that had focus before opening the modal
    previouslyFocusedElement = document.activeElement;
    
    // Show the modal
    modal.removeAttribute('hidden');
    isModalOpen = true;
    
    // Find all focusable elements in the modal
    focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    firstFocusableElement = focusableElements[0];
    lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    // Focus the first element
    firstFocusableElement.focus();
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'cookie-modal-overlay';
    document.body.appendChild(overlay);
  }

  /**
   * Close the preferences modal
   */
  function closeModal() {
    if (!modal) return;
    
    // Hide the modal
    modal.setAttribute('hidden', '');
    isModalOpen = false;
    
    // Remove overlay
    const overlay = document.getElementById('cookie-modal-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Return focus to the element that had focus before opening the modal
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }
  }

  /**
   * Trap focus within the modal
   * @param {Event} e - Keyboard event
   */
  function trapFocus(e) {
    // If Tab key is pressed
    if (e.key === 'Tab') {
      // If Shift + Tab (going backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          e.preventDefault();
          lastFocusableElement.focus();
        }
      } else {
        // If just Tab (going forwards)
        if (document.activeElement === lastFocusableElement) {
          e.preventDefault();
          firstFocusableElement.focus();
        }
      }
    }
  }

  /**
   * Hide the cookie banner
   */
  function hideBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  /**
   * Get current consent settings
   * @returns {Object|null} - Consent object or null if no consent is stored
   */
  function getConsent() {
    try {
      if (config.storageMethod === 'localStorage') {
        const storedConsent = localStorage.getItem('cookieConsent');
        return storedConsent ? JSON.parse(storedConsent) : null;
      } else {
        // Cookie method
        const match = document.cookie.match(/cookieConsent=([^;]+)/);
        return match ? JSON.parse(decodeURIComponent(match[1])) : null;
      }
    } catch (e) {
      console.error('Error retrieving consent:', e);
      return null;
    }
  }

  /**
   * Set consent settings
   * @param {Object} consent - Consent object with boolean values
   */
  function setConsent(consent) {
    try {
      // Ensure functional cookies are always enabled
      const consentData = {
        ...consent,
        functional: true,
        timestamp: new Date().toISOString()
      };
      
      const consentString = JSON.stringify(consentData);
      
      if (config.storageMethod === 'localStorage') {
        localStorage.setItem('cookieConsent', consentString);
      } else {
        // Cookie method - Set expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + config.expireDays);
        document.cookie = `cookieConsent=${encodeURIComponent(consentString)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      }
      
      // Dispatch event
      dispatchConsentEvent(consentData);
      
      // Call onConsentChange callback if provided
      if (typeof config.onConsentChange === 'function') {
        config.onConsentChange(consentData);
      }
      
    } catch (e) {
      console.error('Error setting consent:', e);
    }
  }

  /**
   * Check if consent is given for a specific category
   * @param {string} category - Category to check ('functional', 'analytics', 'marketing')
   * @returns {boolean} - True if consent is given, false otherwise
   */
  function hasConsent(category) {
    const consent = getConsent();
    return consent ? !!consent[category] : false;
  }

  /**
   * Dispatch a custom event with consent data
   * @param {Object} consentData - Consent data
   */
  function dispatchConsentEvent(consentData) {
    const event = new CustomEvent('cookieConsentChanged', {
      detail: consentData,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  // Export public API
  window.initCookieBanner = initCookieBanner;
  window.CookieConsent = {
    getConsent,
    setConsent,
    hasConsent
  };
})();