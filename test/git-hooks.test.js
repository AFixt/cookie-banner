/**
 * Guards for the Husky hook configuration.
 *
 * These hooks are the project's primary quality gate — the strategy documented
 * in CLAUDE.md prefers local gates over GitHub Actions minutes. A hook file that
 * exists but is empty silently disables that gate without any visible failure,
 * which is exactly how `pre-push` came to be a no-op. These tests fail loudly if
 * that happens again.
 */

const fs = require('fs');
const path = require('path');

const HUSKY_DIR = path.join(__dirname, '..', '.husky');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const LINT_STAGED_CONFIG = path.join(__dirname, '..', '.lintstagedrc.json');

/**
 * Reads a hook file and strips comments and blank lines, leaving only the
 * commands the hook actually runs.
 *
 * @param {string} name - Hook filename, e.g. 'pre-commit'.
 * @returns {string[]} Executable command lines.
 */
function hookCommands(name) {
  const contents = fs.readFileSync(path.join(HUSKY_DIR, name), 'utf8');
  return contents
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

describe('Husky hooks', () => {
  describe.each(['pre-commit', 'commit-msg', 'pre-push'])('%s', hook => {
    it('exists', () => {
      expect(fs.existsSync(path.join(HUSKY_DIR, hook))).toBe(true);
    });

    it('contains at least one command', () => {
      expect(hookCommands(hook).length).toBeGreaterThan(0);
    });
  });

  it('runs lint-staged and the test suite before each commit', () => {
    const commands = hookCommands('pre-commit').join('\n');
    expect(commands).toMatch(/lint-staged/);
    expect(commands).toMatch(/npm test/);
  });

  it('scans staged changes for secrets before each commit', () => {
    const commands = hookCommands('pre-commit').join('\n');
    expect(commands).toMatch(/gitleaks protect --staged/);
  });

  it('warns rather than silently skipping when gitleaks is absent', () => {
    const commands = hookCommands('pre-commit').join('\n');
    expect(commands).toMatch(/command -v gitleaks/);
    expect(commands).toMatch(/WARNING: gitleaks is not installed/);
  });

  it('runs the full check suite and tests before each push', () => {
    const commands = hookCommands('pre-push').join('\n');
    expect(commands).toMatch(/npm run check/);
    expect(commands).toMatch(/npm test/);
  });

  it('validates commit messages against commitlint', () => {
    expect(hookCommands('commit-msg').join('\n')).toMatch(/commitlint/);
  });
});

describe('lint-staged configuration', () => {
  let config;

  beforeAll(() => {
    config = JSON.parse(fs.readFileSync(LINT_STAGED_CONFIG, 'utf8'));
  });

  it('lints and formats JavaScript', () => {
    expect(config['*.js']).toEqual(expect.arrayContaining(['eslint --fix', 'prettier --write']));
  });

  it('lints and formats CSS', () => {
    expect(config['*.css']).toEqual(
      expect.arrayContaining(['stylelint --fix', 'prettier --write'])
    );
  });

  it('formats documentation and config files', () => {
    expect(config['*.{md,json,yml,yaml}']).toEqual(expect.arrayContaining(['prettier --write']));
  });
});

describe('check script', () => {
  let scripts;

  beforeAll(() => {
    scripts = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).scripts;
  });

  it('is defined so the pre-push hook has something to run', () => {
    expect(scripts.check).toBeDefined();
  });

  it.each(['lint', 'format:check', 'lint:css', 'lint:md'])('includes the %s gate', gate => {
    expect(scripts.check).toContain(gate);
    expect(scripts[gate]).toBeDefined();
  });
});
