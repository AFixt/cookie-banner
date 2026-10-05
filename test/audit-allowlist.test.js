/**
 * Unit tests for scripts/audit-allowlist.js — the pure half of
 * `npm run security:check`.
 *
 * Ported with the module from AFixt/apg-mocha `test/check-audit.test.js`
 * (itself from AFixt/afixt-tests). The fixtures are real `npm audit --json`
 * output captured on 2026-10-04, not hand-written: the full tree (14 highs,
 * every one from braces GHSA-vfj7-8cjw-p6xm, which has no patched release,
 * #140), the production tree (empty: this package has no runtime
 * dependencies), and what npm prints when the advisory endpoint cannot be
 * reached.
 */

const path = require('path');

const { evaluate, parseAudit, ACCEPTED } = require('../scripts/audit-allowlist.js');

const FIXTURES = path.join(__dirname, 'fixtures', 'audit');
const load = name => JSON.parse(JSON.stringify(require(path.join(FIXTURES, name))));
const BRACES = 'GHSA-vfj7-8cjw-p6xm';
const TODAY = new Date('2026-10-04T12:00:00Z');

describe('audit-allowlist: npm audit with accepted, expiring advisories', () => {
  it('passes the real tree, whose only high advisory is the accepted braces one', () => {
    const result = evaluate(
      load('full-2026-10-04.json'),
      load('prod-2026-10-04.json'),
      ACCEPTED,
      TODAY
    );
    expect(result.errors).toEqual([]);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatch(/accepted until 2026-12-02, #140: GHSA-vfj7-8cjw-p6xm/);
  });

  it('fails an unexcused high advisory, naming it', () => {
    const result = evaluate(load('full-2026-10-04.json'), load('prod-2026-10-04.json'), {}, TODAY);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(new RegExp(`^${BRACES} \\(high, braces\\)`));
  });

  it('fails an acceptance past its expiry date', () => {
    const result = evaluate(
      load('full-2026-10-04.json'),
      load('prod-2026-10-04.json'),
      ACCEPTED,
      new Date('2026-12-03T00:00:00Z')
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/acceptance expired on 2026-12-02 \(#140\)/);
    expect(result.errors[0]).toMatch(new RegExp(BRACES));
  });

  it('still accepts on the expiry date itself, which is inclusive', () => {
    const result = evaluate(
      load('full-2026-10-04.json'),
      load('prod-2026-10-04.json'),
      ACCEPTED,
      new Date('2026-12-02T23:59:59Z')
    );
    expect(result.errors).toEqual([]);
  });

  it('reports a stale entry, one the audit no longer finds', () => {
    // The clean production capture stands in for a full tree braces has left.
    const result = evaluate(
      load('prod-2026-10-04.json'),
      load('prod-2026-10-04.json'),
      ACCEPTED,
      TODAY
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/GHSA-vfj7-8cjw-p6xm is accepted but no longer reported/);
  });

  // An exception is for the development tree. The full capture stands in for
  // a production tree that has gained braces.
  it('accepts nothing in the production tree, even an advisory it accepts in dev', () => {
    const result = evaluate(
      load('full-2026-10-04.json'),
      load('full-2026-10-04.json'),
      ACCEPTED,
      TODAY
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^production dependency: GHSA-vfj7-8cjw-p6xm/);
  });
  it('fails, rather than passes, when the advisory endpoint cannot be reached', () => {
    const result = evaluate(
      load('unreachable.json'),
      load('prod-2026-10-04.json'),
      ACCEPTED,
      TODAY
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^full audit returned no report: .*ECONNREFUSED/);
  });

  it.each(['2026-12-2', '2026-13-45'])('treats an unreadable expiry (%s) as expired', expires => {
    const accepted = { [BRACES]: { ...ACCEPTED[BRACES], expires } };
    const result = evaluate(
      load('full-2026-10-04.json'),
      load('prod-2026-10-04.json'),
      accepted,
      TODAY
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/acceptance expired/);
  });

  // The gate keeps `--audit-level=high`. The braces advisory, re-graded,
  // stands in for an advisory of each severity.
  const regraded = severity => {
    const report = load('full-2026-10-04.json');
    report.vulnerabilities.braces.via[0].severity = severity;
    return report;
  };

  it('does not gate a moderate advisory, and does gate a critical one', () => {
    const prod = load('prod-2026-10-04.json');
    expect(evaluate(regraded('moderate'), prod, {}, TODAY).errors).toEqual([]);
    const critical = evaluate(regraded('critical'), prod, {}, TODAY);
    expect(critical.errors).toHaveLength(1);
    expect(critical.errors[0]).toMatch(/^GHSA-vfj7-8cjw-p6xm \(critical, braces\)/);
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
    expect(evaluate(report, report, ACCEPTED, TODAY).errors[0]).toMatch(
      /^full audit returned no report: npm exited null \(ENOBUFS\)/
    );
  });
});

/**
 * Both gates that judge the whole dependency tree accept the same advisories:
 * `npm run security:check` (ACCEPTED above) and OWASP Dependency-Check
 * (`.dependency-check-suppressions.xml`). An acceptance is one decision, so the
 * two must not drift: same advisory, same expiry, same tracking issue, and
 * nothing past the fleet's acceptance window (AFixt/fleet-security#4).
 */
describe('accepted advisories agree across the npm audit and Dependency-Check gates', () => {
  const fs = require('fs');
  const ROOT = path.join(__dirname, '..');

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

  it.each(Object.entries(ACCEPTED))(
    '%s is suppressed in Dependency-Check with the same expiry and issue',
    (id, entry) => {
      const match = suppressions.filter(s => s.names.includes(id));
      expect(match).toHaveLength(1);
      expect(match[0].until).toBe(entry.expires);
      expect(match[0].notes).toContain(`AFixt/cookie-banner#${entry.issue}`);
      expect(entry.expires <= LATEST_UNTIL).toBe(true);
    }
  );

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
