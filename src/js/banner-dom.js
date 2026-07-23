/**
 * @file DOM construction for the cookie banner and preferences modal.
 * Builders receive configuration and locale strings and return detached
 * elements; the caller owns insertion into the document. Extracted from
 * banner.js (see AFixt/cookie-banner#69).
 * @module banner-dom
 */

/** Theme name validation pattern - alphanumeric and hyphens only (C2) */
const THEME_REGEX = /^[a-z0-9-]+$/i;

/**
 * Apply a validated theme class to an element (C2)
 * @param {HTMLElement} element - Element to receive the theme class
 * @param {string} theme - Theme name from configuration
 */
function applyTheme(element, theme) {
  if (theme && THEME_REGEX.test(theme)) {
    element.classList.add(`theme-${theme}`);
  }
}

/**
 * Create a banner action button
 * @param {string} id - Element id
 * @param {string} action - data-action value
 * @param {string} label - Visible button text
 * @returns {HTMLButtonElement} The configured action button
 */
function buildBannerButton(id, action, label) {
  const button = document.createElement('button');
  button.id = id;
  button.setAttribute('data-action', action);
  button.textContent = label;
  return button;
}

/**
 * Create the cookie banner element (detached)
 * @param {object} config - Banner configuration
 * @param {object} strings - Locale strings
 * @returns {HTMLDivElement} The banner element
 */
export function createBannerElement(config, strings) {
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie Consent');
  banner.setAttribute('aria-live', 'polite');

  const description = document.createElement('p');
  description.id = 'cookie-description';
  description.textContent = strings.description;

  const buttons = document.createElement('div');
  buttons.className = 'cookie-buttons';

  const acceptAllBtn = buildBannerButton('accept-all', 'accept-all', strings.acceptAll);
  const rejectAllBtn = buildBannerButton('reject-all', 'reject-all', strings.rejectAll);
  const customizeBtn = buildBannerButton('customize-preferences', 'customize', strings.customize);
  if (config.showModal) {
    customizeBtn.setAttribute('aria-haspopup', 'dialog');
    customizeBtn.setAttribute('aria-controls', 'cookie-modal');
  }

  buttons.appendChild(acceptAllBtn);
  buttons.appendChild(rejectAllBtn);
  buttons.appendChild(customizeBtn);
  banner.appendChild(description);
  banner.appendChild(buttons);

  applyTheme(banner, config.theme);

  return banner;
}

/**
 * Create one cookie-category row: a labelled checkbox with optional
 * description paragraph.
 * @param {object} options - Category options
 * @param {string} options.name - Checkbox name attribute
 * @param {boolean} options.checked - Initial checked state
 * @param {boolean} options.disabled - Whether the checkbox is locked
 * @param {string} options.label - Visible label text
 * @param {string} [options.description] - Optional description text
 * @returns {HTMLDivElement} The category row container
 */
function buildCategoryRow({ name, checked, disabled, label, description }) {
  const container = document.createElement('div');
  container.className = 'cookie-category';

  const labelElement = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = name;
  checkbox.checked = checked;
  if (disabled) {
    checkbox.disabled = true;
  }
  labelElement.appendChild(checkbox);
  labelElement.appendChild(document.createTextNode(' ' + label));

  container.appendChild(labelElement);

  if (description) {
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'cookie-description';
    descriptionElement.textContent = description;
    container.appendChild(descriptionElement);
  }

  return container;
}

/**
 * Create the fieldset grouping all cookie-category checkboxes
 * @param {object} config - Banner configuration
 * @param {object} strings - Locale strings
 * @returns {HTMLFieldSetElement} The fieldset grouping all category checkboxes
 */
function buildCategoryFieldset(config, strings) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Cookie Categories';
  fieldset.appendChild(legend);

  fieldset.appendChild(
    buildCategoryRow({
      name: 'functional',
      checked: true,
      disabled: true,
      label: strings.modal.functional,
      description: strings.modal.functionalDescription,
    })
  );
  fieldset.appendChild(
    buildCategoryRow({
      name: 'analytics',
      checked: config.categories.analytics,
      disabled: false,
      label: strings.modal.analytics,
      description: strings.modal.analyticsDescription,
    })
  );
  fieldset.appendChild(
    buildCategoryRow({
      name: 'marketing',
      checked: config.categories.marketing,
      disabled: false,
      label: strings.modal.marketing,
      description: strings.modal.marketingDescription,
    })
  );

  return fieldset;
}

/**
 * Create the modal action buttons (save / cancel)
 * @param {object} strings - Locale strings
 * @returns {HTMLDivElement} The container holding the save and cancel buttons
 */
function buildModalActions(strings) {
  const actions = document.createElement('div');
  actions.className = 'cookie-modal-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.setAttribute('data-action', 'save');
  saveBtn.textContent = strings.modal.save;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.id = 'close-modal';
  cancelBtn.setAttribute('data-action', 'cancel');
  cancelBtn.textContent = strings.modal.cancel;

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);

  return actions;
}

/**
 * Create the preferences modal element (detached, hidden)
 * @param {object} config - Banner configuration
 * @param {object} strings - Locale strings
 * @returns {HTMLDivElement} The modal element
 */
export function createModalElement(config, strings) {
  const modal = document.createElement('div');
  modal.id = 'cookie-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('hidden', '');

  const title = document.createElement('h2');
  title.id = 'modal-title';
  title.textContent = strings.modal.title;

  const form = document.createElement('form');
  form.id = 'cookie-form';
  form.appendChild(buildCategoryFieldset(config, strings));
  form.appendChild(buildModalActions(strings));

  modal.appendChild(title);
  modal.appendChild(form);

  applyTheme(modal, config.theme);

  return modal;
}
