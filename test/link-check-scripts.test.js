/**
 * The local link-check scripts must run exactly what `link-check.yml` runs.
 *
 * GitHub Actions cannot run for this repository, so every workflow check has
 * to be runnable locally (#152). `npm run links` is the pull-request run
 * (lychee `--offline`: relative links and anchors only) and
 * `npm run links:external` is the manual-dispatch run (external URLs too).
 * The arguments are read from the workflow rather than copied into this test,
 * so a change to either side that is not made to the other fails here.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/**
 * Splits a command line on whitespace.
 *
 * @param {string} command - Command line.
 * @returns {string[]} Its tokens.
 */
function tokens(command) {
  return command.trim().split(/\s+/);
}

/**
 * Reads the lychee `args` of the link-check.yml step with the given name.
 *
 * @param {string} stepName - The step's `name:` value.
 * @returns {string[]} The step's lychee arguments, tokenised.
 */
function workflowArgs(stepName) {
  const lines = fs
    .readFileSync(path.join(ROOT, '.github', 'workflows', 'link-check.yml'), 'utf8')
    .split('\n')
    .map(line => line.trim());
  const step = lines.indexOf(`- name: ${stepName}`);
  const start = step === -1 ? -1 : lines.indexOf('args: >-', step);
  const end = start === -1 ? -1 : lines.indexOf('fail: true', start);
  if (end === -1) {
    throw new Error(`link-check.yml: lychee args for "${stepName}" not found`);
  }
  return tokens(lines.slice(start + 1, end).join(' '));
}

/**
 * Reads an npm script from package.json.
 *
 * @param {string} name - Script name.
 * @returns {string} The script's command line, or '' if absent.
 */
function script(name) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.scripts[name] || '';
}

describe('local link-check scripts mirror link-check.yml (#152)', () => {
  it('links runs lychee with the pull-request step arguments', () => {
    const args = workflowArgs('Run lychee (offline — pull request)');
    expect(args).toContain('--offline');
    expect(tokens(script('links'))).toEqual(['lychee', ...args]);
  });

  it('links:external runs lychee with the manual-dispatch step arguments', () => {
    const args = workflowArgs('Run lychee (full — manual)');
    expect(args).not.toContain('--offline');
    expect(tokens(script('links:external'))).toEqual(['lychee', ...args]);
  });
});
