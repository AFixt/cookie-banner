/**
 * Guards for the GitHub Actions layout.
 *
 * Issue #62 reduces Actions to a safety net: one blocking `ci.yml`, a
 * `release.yml`, and two scheduled workflows. The failure modes this file
 * exists to catch have all already happened here:
 *
 * - `security.yml` gated two jobs on `schedule` while the workflow had no
 *   schedule trigger, so OWASP Dependency Check never ran once.
 * - Every lint step in `ci.yml` carried `continue-on-error: true`, so the
 *   safety net reported failures as successes.
 * - `pr-check.yml` re-ran lint and tests with `npm ci --ignore-scripts`,
 *   which CLAUDE.md forbids outright.
 *
 * None of those is visible from a green checkmark, so they are asserted here.
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');

/**
 * Reads a workflow file as raw text.
 *
 * @param {string} name - Workflow filename, e.g. 'ci.yml'.
 * @returns {string} File contents.
 */
function workflow(name) {
  return fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
}

describe('GitHub Actions layout', () => {
  it('contains only the four workflows issue #62 specifies', () => {
    const files = fs.readdirSync(WORKFLOW_DIR).filter(name => /\.ya?ml$/.test(name));
    expect(files.sort()).toEqual(['ci.yml', 'link-check.yml', 'release.yml', 'security.yml']);
  });
});

describe('ci.yml', () => {
  let contents;

  beforeAll(() => {
    contents = workflow('ci.yml');
  });

  it('runs on pushes to the long-lived branches and on pull requests', () => {
    expect(contents).toMatch(/push:/);
    expect(contents).toMatch(/pull_request:/);
  });

  it.each([
    ['npm run lint', /run: npm run lint$/m],
    ['npm run format:check', /run: npm run format:check/],
    ['npm run lint:css', /run: npm run lint:css/],
    ['npm run lint:md', /run: npm run lint:md/],
    ['npm run lint:cpd:ci', /run: npm run lint:cpd:ci/],
    ['npm run lint:licenses', /run: npm run lint:licenses/],
    ['npm run test:coverage', /run: npm run test:coverage/],
    ['npm run test:a11y', /run: npm run test:a11y/],
    ['npm run size', /run: npm run size/],
  ])('runs the %s gate', (_label, pattern) => {
    expect(contents).toMatch(pattern);
  });

  it('does not silence the quality gates', () => {
    // The visual regression suite is the sole permitted exception: its
    // baselines are captured on macOS and re-render differently on Linux.
    const silenced = contents.split('\n').filter(line => /^\s*continue-on-error:/.test(line));
    expect(silenced).toHaveLength(1);

    const visualStep = contents.slice(contents.indexOf('Run visual regression tests'));
    expect(visualStep).toMatch(/continue-on-error: true/);
  });

  it('never installs dependencies with --ignore-scripts', () => {
    expect(contents).not.toMatch(/--ignore-scripts/);
  });

  it('takes the Node version from .nvmrc rather than hardcoding it', () => {
    expect(contents).toMatch(/node-version-file: \.nvmrc/);
    expect(contents).not.toMatch(/node-version: '2\d/);
  });
});

describe('release.yml', () => {
  let contents;

  beforeAll(() => {
    contents = workflow('release.yml');
  });

  it('only releases from main', () => {
    expect(contents).toMatch(/branches: \[main\]/);
  });

  it('runs the test suite before publishing', () => {
    expect(contents.indexOf('run: npm test')).toBeGreaterThan(-1);
    expect(contents.indexOf('run: npm test')).toBeLessThan(contents.indexOf('run: npm publish'));
  });

  it('publishes with the organisation NPM_TOKEN secret', () => {
    expect(contents).toMatch(/NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  });
});

describe('npm authentication', () => {
  // @afixt/a11y-assert depends on the restricted @afixt/test-utils, so an
  // unauthenticated `npm ci` 404s on its tarball and the whole job dies before
  // any gate runs. That is what broke CI on develop the moment #96 landed.
  // setup-node only writes the auth line into .npmrc when registry-url is set,
  // so the token and the registry-url have to travel together.
  it.each(['ci.yml', 'release.yml', 'security.yml'])(
    '%s authenticates every npm ci against the registry',
    name => {
      const contents = workflow(name);
      const installs = contents.split('run: npm ci').length - 1;

      expect(installs).toBeGreaterThan(0);
      expect(contents.split('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}').length - 1).toBe(
        name === 'release.yml' ? installs + 1 : installs // release also publishes
      );
      expect(contents.split("registry-url: 'https://registry.npmjs.org'").length - 1).toBe(
        installs
      );
    }
  );
});

describe('scheduled workflows', () => {
  it.each(['security.yml', 'link-check.yml'])('%s has a cron schedule', name => {
    const lines = workflow(name).split('\n');
    const scheduleIndex = lines.findIndex(line => /^\s*schedule:\s*$/.test(line));
    expect(scheduleIndex).toBeGreaterThan(-1);
    expect(lines.slice(scheduleIndex).some(line => /^\s*- cron:/.test(line))).toBe(true);
  });

  it('security.yml schedules the jobs that are gated on the schedule event', () => {
    const contents = workflow('security.yml');
    // Every `if: github.event_name == 'schedule'` job is dead code without a
    // schedule trigger. This is exactly how OWASP Dependency Check never ran.
    expect(contents).toMatch(/github\.event_name == 'schedule'/);
    expect(contents).toMatch(/- cron:/);
  });
});
