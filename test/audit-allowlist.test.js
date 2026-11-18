/**
 * Unit tests for scripts/audit-allowlist.js — the pure half of
 * `npm run security:check`, which audits production dependencies only.
 *
 * Ported with the module from AFixt/apg-mocha `test/check-audit.test.js`
 * (itself from AFixt/afixt-tests). The fixtures are real `npm audit --json`
 * output captured on 2026-10-04, not hand-written: the full tree (14 highs,
 * every one from braces GHSA-vfj7-8cjw-p6xm), the production tree (empty:
 * this package has no runtime dependencies), and what npm prints when the
 * advisory endpoint cannot be reached. The full-tree capture stands in for a
 * production tree that has gained a high advisory.
 */

const fs = require('fs');
const path = require('path');

const { evaluate, parseAudit, ACCEPTED } = require('../scripts/audit-allowlist.js');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'audit');
const load = name => JSON.parse(JSON.stringify(require(path.join(FIXTURES, name))));
const BRACES = 'GHSA-vfj7-8cjw-p6xm';

describe('audit-allowlist: npm audit of the production tree', () => {
  it('passes the real production tree, and says how much it audited', () => {
    const result = evaluate(load('prod-2026-10-04.json'));
    expect(result.errors).toEqual([]);
    // npm counts the root package itself as the one production dependency.
    expect(result.notes).toEqual(['audited 0 production dependencies (--omit=dev)']);
  });

  it('fails a high advisory in the production tree, naming it', () => {
    const result = evaluate(load('full-2026-10-04.json'));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(
      new RegExp(`^production dependency: ${BRACES} \\(high, braces\\)`)
    );
  });

  it('fails, rather than passes, when the advisory endpoint cannot be reached', () => {
    const result = evaluate(load('unreachable.json'));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^production audit returned no report: .*ECONNREFUSED/);
  });

  // The gate keeps `--audit-level=high`. The braces advisory, re-graded,
  // stands in for an advisory of each severity.
  const regraded = severity => {
    const report = load('full-2026-10-04.json');
    report.vulnerabilities.braces.via[0].severity = severity;
    return report;
  };

  it('does not gate a moderate advisory, and does gate a critical one', () => {
    expect(evaluate(regraded('moderate')).errors).toEqual([]);
    const critical = evaluate(regraded('critical'));
    expect(critical.errors).toHaveLength(1);
    expect(critical.errors[0]).toMatch(
      /^production dependency: GHSA-vfj7-8cjw-p6xm \(critical, braces\)/
    );
  });
});

describe('check-audit.js: what the gate actually runs', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'check-audit.js'), 'utf8');
  const audits = [...source.matchAll(/runAudit\((\[[^\]]*\])\)/g)].map(m => m[1]);

  // Scoped to what ships (fleet ruling, 2026-11-17). An unscoped audit here
  // would gate the development tree again, where an advisory with no fix
  // (picomatch GHSA-fc5q-39xc-vjpf) leaves the gate red with nothing to do.
  it('audits the production tree, and only the production tree', () => {
    expect(audits).toEqual(["['--omit=dev']"]);
  });
});

describe('audit-allowlist: the live ACCEPTED list', () => {
  // GHSA-vfj7-8cjw-p6xm was withdrawn by GitHub on 2026-10-23: npm audit no
  // longer reports it, so an entry for it is stale and fails the gate (#140).
  it('does not accept the withdrawn braces advisory', () => {
    expect(Object.keys(ACCEPTED)).not.toContain(BRACES);
  });
});

describe('audit-allowlist: parseAudit', () => {
  it('parses the JSON npm printed', () => {
    expect(parseAudit({ status: 1, stdout: '{"vulnerabilities":{}}', stderr: '' })).toEqual({
      vulnerabilities: {},
    });
  });

  it('names the cause when npm printed no JSON, so the gate fails with a reason', () => {
    const report = parseAudit({
      status: null,
      stdout: '',
      stderr: '\nnpm error code ENOBUFS\n',
      error: { code: 'ENOBUFS' },
    });
    expect(report).toEqual({ message: 'npm exited null (ENOBUFS): npm error code ENOBUFS' });
    expect(evaluate(report).errors[0]).toMatch(
      /^production audit returned no report: npm exited null \(ENOBUFS\)/
    );
  });
});

/**
 * OWASP Dependency-Check still scans the whole tree, development dependencies
 * included, so its suppressions (`.dependency-check-suppressions.xml`) must
 * agree with the ACCEPTED register: same advisory, same expiry, same tracking
 * reference, and nothing past the fleet's acceptance window
 * (AFixt/fleet-security#4).
 */
describe('accepted advisories agree across the npm audit and Dependency-Check gates', () => {
  /** The latest `until` the fleet's no-fix acceptances may carry. */
  const LATEST_UNTIL = '2026-12-02';

  // Comments are stripped first, so an example inside one is not read as live.
  const suppressions = [
    ...fs
      .readFileSync(path.join(ROOT, '.dependency-check-suppressions.xml'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .matchAll(/<suppress\b([^>]*)>([\s\S]*?)<\/suppress>/g),
  ].map(([, attrs, body]) => ({
    until: (/until="(\d{4}-\d{2}-\d{2})Z?"/.exec(attrs) || [])[1] || null,
    notes: (/<notes>([\s\S]*?)<\/notes>/.exec(body) || [])[1] || '',
    purl: (/<packageUrl[^>]*>([^<]+)<\/packageUrl>/.exec(body) || [])[1] || null,
    names: [...body.matchAll(/<vulnerabilityName>([^<]+)<\/vulnerabilityName>/g)].map(m => m[1]),
  }));
  const lockPackages = require('../package-lock.json').packages;

  it('reads at least one live suppression, so the checks below watch something', () => {
    expect(suppressions.length).toBeGreaterThan(0);
  });

  it('gives every suppression a reason and an expiry inside the acceptance window', () => {
    for (const entry of suppressions) {
      expect(entry.notes.trim().length).toBeGreaterThan(40);
      expect(entry.until).not.toBeNull();
      expect(entry.until <= LATEST_UNTIL).toBe(true);
    }
  });

  // A loop rather than it.each: the list is legitimately empty when nothing
  // is accepted, and it.each refuses an empty table.
  it('suppresses every ACCEPTED advisory in Dependency-Check with the same expiry and issue', () => {
    for (const [id, entry] of Object.entries(ACCEPTED)) {
      const match = suppressions.filter(s => s.names.includes(id));
      expect(match).toHaveLength(1);
      expect(match[0].until).toBe(entry.expires);
      expect(match[0].notes).toContain(`AFixt/cookie-banner#${entry.issue}`);
      expect(entry.expires <= LATEST_UNTIL).toBe(true);
    }
  });

  it('suppresses no advisory in Dependency-Check that the npm audit gate does not accept', () => {
    const named = suppressions.flatMap(s => s.names);
    expect(named.filter(id => !(id in ACCEPTED))).toEqual([]);
  });

  it('pins each package-scoped suppression to a version still in the lockfile', () => {
    for (const entry of suppressions.filter(s => s.names.length > 0)) {
      // e.g. ^pkg:npm/braces@3\.0\.3$ -> braces, 3.0.3. A scope is allowed.
      const [, name, version] = /^\^pkg:npm\/((?:@[^/]+\/)?[^@/]+)@([^$]+)\$$/.exec(entry.purl);
      const wanted = version.replace(/\\\./g, '.');
      const installed = Object.entries(lockPackages)
        .filter(([key]) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`))
        .map(([, pkg]) => pkg.version);
      expect(installed).toContain(wanted);
    }
  });
});
