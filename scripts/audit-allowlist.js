/**
 * The pure half of `npm run security:check`: `npm audit` at high severity,
 * with named, tracked, expiring exceptions. The CLI that runs npm is
 * `scripts/check-audit.js`; this module only judges the reports, so it can be
 * tested without a network.
 *
 * Ported from AFixt/apg-mocha `scripts/check-audit.js` (AFixt/fleet-security#4),
 * itself from AFixt/afixt-tests, split the way `scripts/action-pins.js` is.
 * `npm audit --audit-level=high` is all or nothing, so one advisory with no
 * patched release (braces GHSA-vfj7-8cjw-p6xm, #140) turns every run red, and
 * the only way through would be to stop running the check. The gate runs the
 * audit twice and fails on:
 *
 * - any high or critical advisory in the PRODUCTION tree (`--omit=dev`).
 *   Nothing is accepted there: shipped code gets no exceptions;
 * - any high or critical advisory in the full tree that is not in ACCEPTED,
 *   or whose acceptance has expired. Past its `expires` date an entry stops
 *   excusing anything, so an exception cannot quietly become permanent;
 * - an ACCEPTED advisory the full tree no longer reports, so the list cannot
 *   go stale and quietly accept the same ID again later;
 * - an audit that did not return a report. When the advisory endpoint cannot
 *   be reached, npm prints a message and no `vulnerabilities`, and that is a
 *   failure, not a pass.
 *
 * Moderate and low advisories are not gated, matching `--audit-level=high`.
 */

/**
 * @typedef {object} Acceptance
 * @property {string} package The vulnerable package.
 * @property {number} issue The tracking issue that argues why it is unreachable here.
 * @property {string} expires The last day it holds, `YYYY-MM-DD`, UTC, inclusive.
 * @property {string} reason Why it is accepted.
 */

/**
 * Advisories accepted in the development tree only. Each needs no fixed
 * release, an issue that argues why it is unreachable here, and an expiry.
 * Keep the date in step with the matching `until` in
 * .dependency-check-suppressions.xml. Remove an entry in the commit that
 * clears it.
 *
 * @type {Record<string, Acceptance>}
 */
export const ACCEPTED = {
  'GHSA-vfj7-8cjw-p6xm': {
    package: 'braces',
    issue: 140,
    expires: '2026-12-02',
    reason:
      'no patched release (<=3.0.3, latest 3.0.3); dev-only, reached through stylelint, ' +
      'rollup-plugin-copy, postcss-cli and jsdoc-to-markdown, which expand only ' +
      'repo-controlled globs',
  },
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
 * Whether an acceptance has run out. `expires` is the last day it holds, in
 * UTC, so an entry dated 2026-12-02 still accepts all of that day. An entry
 * with a missing or malformed date counts as expired: an unreadable expiry
 * must not become no expiry.
 *
 * @param {string} expires - An ISO date, `YYYY-MM-DD`.
 * @param {Date} now - The current time.
 * @returns {boolean} True once the date has passed.
 */
function isExpired(expires, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires || '')) {
    return true;
  }
  // NaN for an impossible date such as 2026-13-45, which also counts as expired.
  const end = Date.parse(expires + 'T00:00:00Z') + 24 * 60 * 60 * 1000;
  return Number.isNaN(end) || now.getTime() >= end;
}

/**
 * Judge the two audits against the accepted list.
 *
 * @param {object} full - `npm audit --json`.
 * @param {object} prod - `npm audit --omit=dev --json`.
 * @param {Record<string, Acceptance>} accepted - Accepted advisories.
 * @param {Date} now - The current time, for the expiry check.
 * @returns {{errors: string[], notes: string[]}} What failed, and what was accepted.
 */
export function evaluate(full, prod, accepted, now) {
  const errors = [];
  const notes = [];
  const broken = [unusable('full', full), unusable('production', prod)].filter(Boolean);
  if (broken.length) {
    return { errors: broken, notes };
  }

  const describe = (id, a) => id + ' (' + a.severity + ', ' + a.name + '): ' + a.title;

  for (const [id, a] of gatedAdvisories(prod)) {
    errors.push('production dependency: ' + describe(id, a));
  }
  const inFull = gatedAdvisories(full);
  for (const [id, a] of inFull) {
    const entry = Object.prototype.hasOwnProperty.call(accepted, id) ? accepted[id] : null;
    if (!entry) {
      errors.push(describe(id, a));
    } else if (isExpired(entry.expires, now)) {
      errors.push(
        describe(id, a) +
          ' — acceptance expired on ' +
          entry.expires +
          ' (#' +
          entry.issue +
          '). Fix it, or re-assess in the issue and extend the date.'
      );
    } else {
      notes.push('accepted until ' + entry.expires + ', #' + entry.issue + ': ' + describe(id, a));
    }
  }
  for (const id of Object.keys(accepted)) {
    if (!inFull.has(id)) {
      errors.push(
        id +
          ' is accepted but no longer reported at high or critical: ' +
          'remove it from ACCEPTED in scripts/audit-allowlist.js'
      );
    }
  }
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
