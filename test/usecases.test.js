/**
 * Guards for the AFixt use case templates in docs/usecases.
 *
 * The templates in `docs/usecases/*.uc.yaml` are executable documents, not
 * prose: `@afixt/usecase-runner` parses them into Playwright tests. Nothing
 * else in this repo runs them, so without this file a template can stop
 * parsing — or quietly start meaning something different — and land green.
 *
 * Three failure modes are worth asserting by name. The first two come from the
 * house library (AFixt/audit-usecases); the third is why the keyword guard
 * below is pointed where it is.
 *
 * - An unknown *modifier* is a warning, not an error, so a typo parses
 *   successfully and then does nothing at runtime. (An unknown *keyword* does
 *   throw — the two are not symmetric, and conflating them is what made the
 *   original version of that guard a tautology.)
 * - `steps_override.from_step` is a positional index into the parent. Insert
 *   a step in the parent and every child silently overrides from the wrong
 *   place, with validation still passing because the index is still in range.
 * - The runner's keyword table is version-dependent. Downgrading the pin below
 *   1.4.0 removes verbs these templates use.
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

/**
 * Verbs the runner only gained in 1.4.0. Versions 1.2.0–1.3.3 ship a
 * 15-keyword table without them, and a template using one dies there with
 * `Unknown step keyword` — which looks exactly like a malformed template and
 * has been misdiagnosed as one before (see the audit-usecases README).
 * Downgrading the pin is therefore the realistic way these templates break.
 */
const VERBS_ADDED_IN_1_4_0 = ['contrast', 'lang_check', 'read_image', 'sr_says'];

/** Lowest runner version that ships all of the above. */
const MIN_RUNNER = [1, 4, 0];

/**
 * Lowest version a semver range can resolve to. `^1.5.1`, `~1.5.1` and
 * `>=1.5.1` all floor at 1.5.1; anything without three numeric parts (`*`,
 * `latest`, a git URL) yields null and is treated as unpinnable.
 *
 * @param {string} range - A semver range from package.json.
 * @returns {number[] | null} `[major, minor, patch]`, or null if unpinnable.
 */
function versionFloor(range) {
  const parts = String(range).replace(/^\D*/, '').split('.').map(Number);
  return parts.length === 3 && parts.every(Number.isInteger) ? parts : null;
}

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

  // The obvious version of this — "no template uses a keyword outside
  // STEP_KEYWORDS" — is a tautology. `parseStep` throws on an unrecognized
  // keyword, so every parsed step's keyword is in the table by construction
  // and the assertion can never fail. The exposure runs the other way: the
  // table losing a verb the templates depend on.
  it('runs against a keyword table that still ships the verbs the templates use', () => {
    const used = new Set(useCases.flatMap(useCase => useCase.steps.map(step => step.keyword)));
    const atRisk = VERBS_ADDED_IN_1_4_0.filter(verb => used.has(verb));

    // Guard the guard: if no template uses one of these any more, this test
    // has stopped watching anything and wants re-pointing or deleting.
    expect(atRisk.length).toBeGreaterThan(0);

    for (const verb of atRisk) {
      expect(STEP_KEYWORDS).toContain(verb);
    }
  });

  it('pins @afixt/usecase-runner at or above the version that added those verbs', () => {
    const range = require('../package.json').devDependencies['@afixt/usecase-runner'];
    const floor = versionFloor(range);

    expect(floor).not.toBeNull();
    // Compare as a tuple so 1.10.0 sorts above 1.4.0 rather than below it.
    expect(floor.map((n, i) => n - MIN_RUNNER[i]).find(d => d !== 0) ?? 0).toBeGreaterThanOrEqual(
      0
    );
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
