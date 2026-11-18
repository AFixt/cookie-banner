/**
 * The pure half of `npm run security:check`: `npm audit` of the PRODUCTION
 * tree (`--omit=dev`) at high severity. The CLI that runs npm is
 * `scripts/check-audit.js`; this module only judges the report, so it can be
 * tested without a network.
 *
 * Ported from AFixt/apg-mocha `scripts/check-audit.js` (AFixt/fleet-security#4),
 * itself from AFixt/afixt-tests, split the way `scripts/action-pins.js` is.
 *
 * Scope: production dependencies only, under the 2026-11-17 fleet ruling that
 * dependency-audit gates scan what ships. It used to
 * audit the full tree as well, with named, expiring exceptions, and an
 * advisory with no patched release reached only through devDependencies
 * (picomatch GHSA-fc5q-39xc-vjpf, via the build and test tooling; since
 * withdrawn, 2026-11-18) turned every run red with nothing anyone here could
 * do about it. The development
 * tree is still scanned, by OWASP Dependency-Check in security.yml, and
 * `npm audit` without `--omit=dev` still prints it.
 *
 * The gate fails on:
 *
 * - any high or critical advisory in the production tree. Nothing is
 *   accepted there: shipped code gets no exceptions;
 * - an audit that did not return a report. When the advisory endpoint cannot
 *   be reached, npm prints a message and no `vulnerabilities`, and that is a
 *   failure, not a pass.
 *
 * Moderate and low advisories are not gated, matching `--audit-level=high`.
 */

/**
 * @typedef {object} Acceptance
 * @property {string} package The vulnerable package.
 * @property {number} issue The tracking issue or PR that argues why it is unreachable here.
 * @property {string} expires The last day it holds, `YYYY-MM-DD`, UTC, inclusive.
 * @property {string} reason Why it is accepted.
 */

/**
 * Advisories accepted in the development tree, which only OWASP
 * Dependency-Check gates now. This is the register its suppressions in
 * .dependency-check-suppressions.xml must agree with (same advisory, same
 * `until`, same tracking reference): `test/audit-allowlist.test.js` holds the
 * two together. Each needs no fixed release, a tracking issue or PR that argues
 * why it is unreachable here, and an expiry. Remove an entry in the commit
 * that clears it.
 *
 * The npm audit gate does not read this list: it audits production
 * dependencies only, and accepts nothing there.
 *
 * @type {Record<string, Acceptance>}
 */
export const ACCEPTED = {
  // Empty. braces GHSA-vfj7-8cjw-p6xm (#140) was accepted here until GitHub
  // withdrew the advisory on 2026-10-23, and picomatch GHSA-fc5q-39xc-vjpf
  // (#154) until GitHub withdrew it on 2026-11-18.
};

const GATED = new Set(['high', 'critical']);

/**
 * The advisory ID: the GHSA from its URL, or npm's numeric source.
 *
 * @param {{url: (string|undefined), source: (number|undefined)}} via - An
 *     advisory from a `via` list.
 * @returns {string} Its ID.
 */
function advisoryId(via) {
  const match = /GHSA(-[0-9a-z]{4}){3}/i.exec(via.url || '');
  return match ? match[0] : String(via.source);
}

/**
 * The gated advisories in one report, by ID. A package flagged only because it
 * depends on a vulnerable one lists that package's name in `via`, not an
 * advisory object, so each advisory is counted once, at its source.
 *
 * @param {object} report - Parsed `npm audit --json` output.
 * @returns {Map<string, {name: string, title: string, severity: string}>} The advisories.
 */
function gatedAdvisories(report) {
  const found = new Map();
  for (const pkg of Object.values(report.vulnerabilities)) {
    for (const via of pkg.via || []) {
      if (typeof via === 'object' && via !== null && GATED.has(via.severity)) {
        found.set(advisoryId(via), { name: via.name, title: via.title, severity: via.severity });
      }
    }
  }
  return found;
}

/**
 * Why a parsed report cannot be used, or null if it can.
 *
 * @param {string} label - Which audit this was.
 * @param {*} report - Parsed `npm audit --json` output.
 * @returns {string|null} The problem.
 */
function unusable(label, report) {
  if (report && typeof report.vulnerabilities === 'object' && report.vulnerabilities !== null) {
    return null;
  }
  const why = report && report.message ? ': ' + report.message : '';
  return label + ' audit returned no report' + why;
}

/**
 * Judge the production audit.
 *
 * @param {object} prod - `npm audit --omit=dev --json`.
 * @returns {{errors: string[], notes: string[]}} What failed, and what was audited.
 */
export function evaluate(prod) {
  const broken = unusable('production', prod);
  if (broken) {
    return { errors: [broken], notes: [] };
  }
  const errors = [];
  for (const [id, a] of gatedAdvisories(prod)) {
    errors.push(
      'production dependency: ' + id + ' (' + a.severity + ', ' + a.name + '): ' + a.title
    );
  }
  // npm counts the root package as one production dependency.
  const deps = prod.metadata && prod.metadata.dependencies;
  const notes =
    deps && typeof deps.prod === 'number'
      ? ['audited ' + Math.max(deps.prod - 1, 0) + ' production dependencies (--omit=dev)']
      : [];
  return { errors, notes };
}

/**
 * Read one `npm audit --json` run. When npm printed no JSON, return a stand-in
 * report carrying why, so the failure names its cause: a registry outage, a
 * full output buffer and an npm crash otherwise all read the same.
 *
 * @param {{status: (number|null), stdout: string, stderr: string, error: (object|undefined)}} res -
 *     A `spawnSync` result.
 * @returns {object} The parsed report, or `{message}` saying why there is none.
 */
export function parseAudit(res) {
  try {
    return JSON.parse(res.stdout);
  } catch {
    const code = res.error && res.error.code ? ' (' + res.error.code + ')' : '';
    const firstLine = (res.stderr || '').split('\n').find(l => l.trim()) || '';
    return { message: 'npm exited ' + res.status + code + (firstLine ? ': ' + firstLine : '') };
  }
}
