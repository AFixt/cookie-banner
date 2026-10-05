/**
 * Guards for the GitHub Actions layout.
 *
 * Issue #62 reduces Actions to a safety net: one blocking `ci.yml`, a
 * `release.yml`, and two on-demand workflows (`security.yml`,
 * `link-check.yml`). Issue #103 removes every cron schedule: checks run on
 * pull requests, where a failure is attributable to the change that caused
 * it, with `workflow_dispatch` for manual runs. The failure modes this file
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

/**
 * Every step permitted to report a failure as a success, and why.
 *
 * Keyed by workflow file, valued by the `name:` of the step. A silenced gate
 * catches nothing, so each one has to be argued for here rather than added
 * quietly in YAML.
 */
const PERMITTED_SILENCED_STEPS = {
  // Baselines are captured on macOS and re-render differently on Linux.
  'ci.yml': ['Run visual regression tests'],
};

describe('no workflow silences its own gates', () => {
  /*
   * This guard was once scoped to `ci.yml`, and the identical defect was sitting
   * in `security.yml` the whole time — `npm audit` marked `continue-on-error:
   * true`, reporting green while the command it runs exited non-zero — where it
   * could not be seen, because the guard read one file. #62 removed the pattern
   * from `ci.yml`; nothing stopped it reappearing anywhere else.
   *
   * `security.yml` carried the last allowed exception until #109 closed: the
   * dependency tree is clean, so that step is blocking and nothing in it is
   * permitted to be silenced. Re-adding the flag there fails this test.
   *
   * Reading the directory rather than a list also means a fifth workflow is
   * covered the day it is added.
   */
  const workflowFiles = fs
    .readdirSync(WORKFLOW_DIR)
    .filter(name => /\.ya?ml$/.test(name))
    .sort();

  it('finds workflows to check at all — a vacuous guard is not a guard', () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  it.each(workflowFiles)('%s silences only the steps argued for here', name => {
    const contents = workflow(name);
    const permitted = PERMITTED_SILENCED_STEPS[name] || [];

    const silenced = contents
      .split('\n')
      .filter(line => /^\s*continue-on-error:\s*true\s*$/.test(line));
    expect(silenced).toHaveLength(permitted.length);

    // Named, not just counted: swapping which step carries the flag would
    // otherwise keep the count right and the meaning wrong.
    //
    // The name is matched to end-of-line. Without that, an allowlisted `Run npm audit`
    // also matches a `Run npm audit (production dependencies)` step declared above it,
    // and the block that gets checked is the wrong one — which is how this guard first
    // went red against a change that was correct.
    for (const step of permitted) {
      const from = contents.indexOf(`name: ${step}\n`);
      expect(from).toBeGreaterThan(-1);
      const nextStep = contents.indexOf('\n      - name:', from + 1);
      const block = contents.slice(from, nextStep === -1 ? undefined : nextStep);
      expect(block).toMatch(/continue-on-error: true/);
    }
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

describe('no scheduled workflows (issue #103)', () => {
  // Policy: no regularly scheduled GitHub Action, ever. A timer-triggered
  // check reports failures against no particular change and gets ignored;
  // the same check on a pull request gates the defect at introduction.
  // `workflow_dispatch` (manual runs) remains allowed.
  it('no workflow has a schedule or cron trigger', () => {
    const files = fs.readdirSync(WORKFLOW_DIR).filter(name => /\.ya?ml$/.test(name));
    for (const name of files) {
      const lines = workflow(name).split('\n');
      expect(lines.some(line => line.trim() === 'schedule:')).toBe(false);
      expect(lines.some(line => line.trim().startsWith('- cron:'))).toBe(false);
    }
  });

  it('no job is gated on the schedule event', () => {
    const files = fs.readdirSync(WORKFLOW_DIR).filter(name => /\.ya?ml$/.test(name));
    for (const name of files) {
      // A job gated on `github.event_name == 'schedule'` is dead code once no
      // schedule trigger exists — the inverse of how OWASP Dependency Check
      // once never ran. Gate manual-only jobs on `workflow_dispatch` instead.
      expect(workflow(name)).not.toMatch(/github\.event_name == 'schedule'/);
    }
  });

  it('link-check.yml runs the link check on pull requests', () => {
    const contents = workflow('link-check.yml');
    expect(contents).toMatch(/pull_request:/);
    expect(contents).toMatch(/--offline/);
    expect(contents).toMatch(/fail: true/);
    // No timer-triggered auto-filed issues: the PR failure is the signal.
    expect(contents).not.toMatch(/create-issue-from-file/);
  });

  // The hook is the primary gate and this workflow is the net under it, so a
  // check that runs only in `check:all` is invisible to `--no-verify` pushes
  // and web UI merges — the two cases the header comment says this file exists
  // for. knip was added to the hook in #130 and is asserted here so it cannot
  // quietly become hook-only again.
  it('ci.yml runs knip as a blocking step', () => {
    expect(workflow('ci.yml')).toMatch(/run: npm run knip/);
  });

  it('security.yml keeps its manual-only jobs runnable via workflow_dispatch', () => {
    const contents = workflow('security.yml');
    expect(contents).toMatch(/workflow_dispatch:/);
    expect(contents).toMatch(/github\.event_name == 'workflow_dispatch'/);
  });
});

/**
 * The OWASP Dependency-Check job is a gate (AFixt/fleet-security#4). Each
 * property below is one way it has already failed to be one somewhere in the
 * fleet: a wrapper that ran an unpinned `latest` and dropped every flag passed
 * as `args`, no CVSS threshold, a job that only ran on manual dispatch, and an
 * exit 14 ("an analyzer threw, the threshold was never evaluated") treated as
 * a pass.
 */
describe('security.yml Dependency-Check gate', () => {
  let contents;
  let job;

  beforeAll(() => {
    contents = workflow('security.yml');
    const start = contents.indexOf('\n  owasp-dependency-check:');
    const next = contents.slice(start + 1).search(/\n {2}[a-z][\w-]*:\n/);
    job = contents.slice(start, next === -1 ? undefined : start + 1 + next);
  });

  it('runs on every pull request, not only on manual dispatch', () => {
    expect(contents).toMatch(/pull_request:/);
    expect(job.length).toBeGreaterThan(0);
    expect(job).not.toMatch(/^ +if: github\.event_name == 'workflow_dispatch'/m);
  });

  it('runs the scanner image pinned by digest, not through the 75ba02d wrapper', () => {
    expect(job).toMatch(/DC_IMAGE: owasp\/dependency-check-action@sha256:[0-9a-f]{64}/);
    expect(job).not.toMatch(/Dependency-Check_Action@/);
  });

  it.each([
    ['fails at CVSS 7', /--failOnCVSS 7\b/],
    ['runs the retired analyzers too', /--enableRetired/],
    [
      'reads the reviewed suppressions',
      /--suppression \/src\/\.dependency-check-suppressions\.xml/,
    ],
  ])('%s', (_label, pattern) => {
    expect(job).toMatch(pattern);
  });

  it('passes only on exit 0 and never on a second non-0/non-15 exit', () => {
    expect(job).toMatch(/0\) ;;/);
    expect(job).toMatch(/exit "\$rc"/);
  });

  // CLAUDE.md forbids --ignore-scripts wherever the package is tested or
  // validated, and ci.yml is held to that above. This job tests nothing: it
  // installs only so the scanner can read node_modules, and no install script
  // should run in a security job. It is the one permitted use in the repo.
  it('is the only place in the workflows that installs with --ignore-scripts', () => {
    const files = fs.readdirSync(WORKFLOW_DIR).filter(name => /\.ya?ml$/.test(name));
    const total = files.reduce(
      (sum, name) => sum + (workflow(name).match(/--ignore-scripts/g) || []).length,
      0
    );
    expect(job.match(/run: npm ci --ignore-scripts/g) || []).toHaveLength(1);
    expect(total).toBe((job.match(/--ignore-scripts/g) || []).length);
  });
});
