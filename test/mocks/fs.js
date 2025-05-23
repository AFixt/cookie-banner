// Mock implementation of fs module for testing

const fs = jest.createMockFromModule('fs');

// This is a custom function that our tests can use to set
// what the fs.readFileSync mock should return
let mockFiles = {};
function __setMockFiles(newMockFiles) {
  mockFiles = newMockFiles;
}

// Mock of readFileSync
function readFileSync(filePath, options) {
  if (filePath.includes('index.js')) {
    return `
      // Mock index.js for testing
      (function() {
        'use strict';

        // Simplified implementation for testing
        const defaultConfig = {
          locale: 'en',
          theme: 'light',
          showModal: true,
          onConsentChange: null,
          storageMethod: 'localStorage',
          expireDays: 365,
          categories: {
            functional: true,
            analytics: false,
            marketing: false
          }
        };
        
        let config = {};
        let banner = null;
        let modal = null;
        let localeStrings = {};
        let isModalOpen = false;
        
        function initCookieBanner(userConfig = {}) {
          config = { ...defaultConfig, ...userConfig };
          
          const consent = getConsent();
          if (consent && consent.hasOwnProperty('functional')) {
            dispatchConsentEvent(consent);
            return;
          }
          
          loadLocaleStrings(config.locale)
            .then(() => {
              createBanner();
              if (config.showModal) {
                createModal();
              }
              addEventListeners();
            })
            .catch(error => {
              console.error('Failed to initialize cookie banner:', error);
            });
        }
        
        function loadLocaleStrings(locale) {
          return new Promise((resolve, reject) => {
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
            
            if (locale !== 'en') {
              fetch('locales/' + locale + '.json')
                .then(response => {
                  if (!response.ok) {
                    console.warn('Locale ' + locale + ' not found, using default English.');
                    return resolve();
                  }
                  return response.json();
                })
                .then(data => {
                  localeStrings = data;
                  resolve();
                })
                .catch(error => {
                  console.warn('Failed to load locale ' + locale + ', using default English:', error);
                  resolve();
                });
            } else {
              resolve();
            }
          });
        }
        
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
          
          buttons.appendChild(acceptAllBtn);
          buttons.appendChild(rejectAllBtn);
          buttons.appendChild(customizeBtn);
          banner.appendChild(description);
          banner.appendChild(buttons);
          
          banner.classList.add('theme-' + config.theme);
          
          document.body.appendChild(banner);
        }
        
        function createModal() {
          modal = document.createElement('div');
          modal.id = 'cookie-modal';
          modal.setAttribute('role', 'dialog');
          modal.setAttribute('aria-modal', 'true');
          modal.setAttribute('aria-labelledby', 'modal-title');
          modal.setAttribute('hidden', '');
          
          // Create simplified modal content
          const title = document.createElement('h2');
          title.id = 'modal-title';
          title.textContent = localeStrings.modal.title;
          
          const form = document.createElement('form');
          form.id = 'cookie-form';
          
          // Functional cookies fieldset
          const functionalFieldset = document.createElement('fieldset');
          const functionalLegend = document.createElement('legend');
          functionalLegend.textContent = localeStrings.modal.functional;
          
          const functionalLabel = document.createElement('label');
          const functionalCheckbox = document.createElement('input');
          functionalCheckbox.type = 'checkbox';
          functionalCheckbox.name = 'functional';
          functionalCheckbox.checked = true;
          functionalCheckbox.disabled = true;
          functionalLabel.appendChild(functionalCheckbox);
          functionalLabel.appendChild(document.createTextNode(' Required (Always On)'));
          
          functionalFieldset.appendChild(functionalLegend);
          functionalFieldset.appendChild(functionalLabel);
          
          // Analytics cookies fieldset
          const analyticsFieldset = document.createElement('fieldset');
          const analyticsLegend = document.createElement('legend');
          analyticsLegend.textContent = 'Analytics Cookies';
          
          const analyticsLabel = document.createElement('label');
          const analyticsCheckbox = document.createElement('input');
          analyticsCheckbox.type = 'checkbox';
          analyticsCheckbox.name = 'analytics';
          analyticsCheckbox.checked = config.categories.analytics;
          analyticsLabel.appendChild(analyticsCheckbox);
          analyticsLabel.appendChild(document.createTextNode(' ' + localeStrings.modal.analytics));
          
          analyticsFieldset.appendChild(analyticsLegend);
          analyticsFieldset.appendChild(analyticsLabel);
          
          // Marketing cookies fieldset
          const marketingFieldset = document.createElement('fieldset');
          const marketingLegend = document.createElement('legend');
          marketingLegend.textContent = 'Marketing Cookies';
          
          const marketingLabel = document.createElement('label');
          const marketingCheckbox = document.createElement('input');
          marketingCheckbox.type = 'checkbox';
          marketingCheckbox.name = 'marketing';
          marketingCheckbox.checked = config.categories.marketing;
          marketingLabel.appendChild(marketingCheckbox);
          marketingLabel.appendChild(document.createTextNode(' ' + localeStrings.modal.marketing));
          
          marketingFieldset.appendChild(marketingLegend);
          marketingFieldset.appendChild(marketingLabel);
          
          // Actions
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
          
          form.appendChild(functionalFieldset);
          form.appendChild(analyticsFieldset);
          form.appendChild(marketingFieldset);
          form.appendChild(actions);
          
          modal.appendChild(title);
          modal.appendChild(form);
          
          modal.classList.add('theme-' + config.theme);
          
          document.body.appendChild(modal);
        }
        
        function addEventListeners() {
          document.getElementById('accept-all').addEventListener('click', () => {
            setConsent({
              functional: true,
              analytics: true,
              marketing: true
            });
            hideBanner();
          });
          
          document.getElementById('reject-all').addEventListener('click', () => {
            setConsent({
              functional: true,
              analytics: false,
              marketing: false
            });
            hideBanner();
          });
          
          const customizeBtn = document.getElementById('customize-preferences');
          if (customizeBtn && config.showModal) {
            customizeBtn.addEventListener('click', openModal);
          }
          
          if (config.showModal) {
            document.getElementById('close-modal').addEventListener('click', closeModal);
            
            document.getElementById('cookie-form').addEventListener('submit', (e) => {
              e.preventDefault();
              const form = e.target;
              setConsent({
                functional: true,
                analytics: form.elements.analytics.checked,
                marketing: form.elements.marketing.checked
              });
              closeModal();
              hideBanner();
            });
            
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' && isModalOpen) {
                closeModal();
              }
            });
            
            modal.addEventListener('keydown', trapFocus);
          }
        }
        
        function openModal() {
          if (!modal) return;
          
          previouslyFocusedElement = document.activeElement;
          
          modal.removeAttribute('hidden');
          isModalOpen = true;
          
          focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          firstFocusableElement = focusableElements[0];
          lastFocusableElement = focusableElements[focusableElements.length - 1];
          
          firstFocusableElement.focus();
          
          const overlay = document.createElement('div');
          overlay.id = 'cookie-modal-overlay';
          document.body.appendChild(overlay);
        }
        
        function closeModal() {
          if (!modal) return;
          
          modal.setAttribute('hidden', '');
          isModalOpen = false;
          
          const overlay = document.getElementById('cookie-modal-overlay');
          if (overlay) {
            overlay.remove();
          }
          
          if (previouslyFocusedElement) {
            previouslyFocusedElement.focus();
          }
        }
        
        function trapFocus(e) {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstFocusableElement) {
                e.preventDefault();
                lastFocusableElement.focus();
              }
            } else {
              if (document.activeElement === lastFocusableElement) {
                e.preventDefault();
                firstFocusableElement.focus();
              }
            }
          }
        }
        
        function hideBanner() {
          if (banner) {
            banner.remove();
            banner = null;
          }
        }
        
        function getConsent() {
          try {
            if (config.storageMethod === 'localStorage') {
              const storedConsent = localStorage.getItem('cookieConsent');
              return storedConsent ? JSON.parse(storedConsent) : null;
            } else {
              const match = document.cookie.match(/cookieConsent=([^;]+)/);
              return match ? JSON.parse(decodeURIComponent(match[1])) : null;
            }
          } catch (e) {
            console.error('Error retrieving consent:', e);
            return null;
          }
        }
        
        function setConsent(consent) {
          try {
            const consentData = {
              ...consent,
              functional: true,
              timestamp: new Date().toISOString()
            };
            
            const consentString = JSON.stringify(consentData);
            
            if (config.storageMethod === 'localStorage') {
              localStorage.setItem('cookieConsent', consentString);
            } else {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + config.expireDays);
              document.cookie = 'cookieConsent=' + encodeURIComponent(consentString) + '; expires=' + expiryDate.toUTCString() + '; path=/; SameSite=Lax';
            }
            
            dispatchConsentEvent(consentData);
            
            if (typeof config.onConsentChange === 'function') {
              config.onConsentChange(consentData);
            }
            
          } catch (e) {
            console.error('Error setting consent:', e);
          }
        }
        
        function hasConsent(category) {
          const consent = getConsent();
          return consent ? !!consent[category] : false;
        }
        
        function dispatchConsentEvent(consentData) {
          const event = new CustomEvent('cookieConsentChanged', {
            detail: consentData,
            bubbles: true
          });
          document.dispatchEvent(event);
        }
        
        window.initCookieBanner = initCookieBanner;
        window.CookieConsent = {
          getConsent,
          setConsent,
          hasConsent
        };
      })();
    `;
  }
  
  return mockFiles[filePath] || '';
}

fs.readFileSync = readFileSync;
fs.__setMockFiles = __setMockFiles;

module.exports = fs;