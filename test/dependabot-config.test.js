/**
 * Guards for the Dependabot configuration.
 *
 * CLAUDE.md forbids committing directly to main and requires all work to reach
 * main via develop. Dependabot defaults to the repository's default branch, so
 * an explicit `target-branch: develop` is the only thing keeping it from
 * opening PRs straight against main. That invariant is easy to drop during an
 * edit and produces no error when it is missing, so it is asserted here.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '.github', 'dependabot.yml');

describe('Dependabot configuration', () => {
  let contents;

  beforeAll(() => {
    contents = fs.readFileSync(CONFIG_PATH, 'utf8');
  });

  it('exists', () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });

  it('uses config version 2', () => {
    expect(contents).toMatch(/^version:\s*2\s*$/m);
  });

  it.each(['npm', 'github-actions'])('covers the %s ecosystem', ecosystem => {
    expect(contents).toMatch(new RegExp(`package-ecosystem:\\s*${ecosystem}\\s*$`, 'm'));
  });

  it('targets develop for every ecosystem, never main', () => {
    const ecosystems = contents.match(/package-ecosystem:/g) || [];
    const targets = contents.match(/target-branch:\s*develop\s*$/gm) || [];

    expect(ecosystems.length).toBeGreaterThan(0);
    expect(targets).toHaveLength(ecosystems.length);
    expect(contents).not.toMatch(/target-branch:\s*main\s*$/m);
  });

  it('uses conventional commit prefixes so commitlint accepts the PRs', () => {
    const prefixes = contents.match(/prefix(?:-development)?:\s*'([^']+)'/g) || [];
    expect(prefixes.length).toBeGreaterThan(0);

    prefixes.forEach(line => {
      const value = line.match(/'([^']+)'/)[1];
      expect(value).toMatch(
        /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\(.+\))?$/
      );
    });
  });
});
