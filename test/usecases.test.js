/**
 * Guards for the AFixt use case templates in docs/usecases.
 *
 * The templates in `docs/usecases/*.uc.yaml` are executable documents, not
 * prose: `@afixt/usecase-runner` parses them into Playwright tests. Nothing
 * else in this repo runs them, so without this file a template can stop
 * parsing — or quietly start meaning something different — and land green.
 *
 * Two failure modes from the house library (AFixt/audit-usecases) are worth
 * asserting by name:
 *
 * - An unknown keyword or modifier is a *warning*, not an error, so a typo
 *   parses successfully and then does nothing at runtime.
 * - `steps_override.from_step` is a positional index into the parent. Insert
 *   a step in the parent and every child silently overrides from the wrong
 *   place, with validation still passing because the index is still in range.
 */

const fs = require('fs');
const path = require('path');

const { parseUseCaseDirectory, getParseWarnings, STEP_KEYWORDS } = require('@afixt/usecase-runner');

const USECASE_DIR = path.join(__dirname, '..', 'docs', 'usecases');

/** Flows issue #105 requires the library to cover. */
const REQUIRED_IDS = [
  'cookie-banner-accept-all',
  'cookie-banner-reject-all',
  'cookie-banner-customize-preferences',
  'cookie-banner-consent-persists-on-revisit',
  'cookie-banner-reopen-preferences',
  'cookie-banner-escape-dismisses-modal',
  'cookie-banner-storage-blocked',
  'cookie-banner-rtl-localized',
];

describe('docs/usecases templates', () => {
  let useCases;

  beforeAll(async () => {
    // Drain warnings left over from any earlier parse before the real run, so
    // the assertion below reports only this directory's warnings.
    getParseWarnings();
    useCases = await parseUseCaseDirectory(USECASE_DIR);
  });

  it('parses every .uc.yaml in the directory', () => {
    const files = fs.readdirSync(USECASE_DIR).filter(name => name.endsWith('.uc.yaml'));
    expect(files.length).toBeGreaterThan(0);
    expect(useCases).toHaveLength(files.length);
  });

  it('parses with no warnings, so no keyword or modifier is silently ignored', () => {
    expect(getParseWarnings()).toEqual([]);
  });

  it('covers every flow issue #105 asks for', () => {
    expect(useCases.map(useCase => useCase.id).sort()).toEqual([...REQUIRED_IDS].sort());
  });

  it.each(REQUIRED_IDS)('%s carries an id, title, type and at least one audit step', id => {
    const useCase = useCases.find(candidate => candidate.id === id);
    expect(useCase).toBeDefined();
    expect(useCase.title).toBeTruthy();
    expect(['positive', 'negative', 'extension']).toContain(useCase.type);
    expect(useCase.steps.some(step => step.keyword === 'audit')).toBe(true);
  });

  it('uses only keywords the pinned runner actually ships', () => {
    const keywords = new Set(useCases.flatMap(useCase => useCase.steps.map(step => step.keyword)));
    expect([...keywords].filter(keyword => !STEP_KEYWORDS.includes(keyword))).toEqual([]);
  });

  it('keeps escape-dismisses-modal pointed at its parent’s save tail', () => {
    // The child inherits steps 1..from_step-1 and replaces the rest. If the
    // parent gains a step above the save tail, this index now cuts the parent
    // mid-flow and the child stops testing what it claims to.
    const child = fs.readFileSync(path.join(USECASE_DIR, 'escape-dismisses-modal.uc.yaml'), 'utf8');
    const fromStep = Number(/from_step:\s*(\d+)/.exec(child)[1]);

    const parent = useCases.find(useCase => useCase.id === 'cookie-banner-customize-preferences');
    const boundaryStep = parent.steps[fromStep - 1];

    expect(boundaryStep.keyword).toBe('locate');
    expect(boundaryStep.target).toEqual({ role: 'button', name: 'Save Preferences' });
  });
});
