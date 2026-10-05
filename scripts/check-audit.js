#!/usr/bin/env node
/**
 * `npm audit` at high severity, with named, tracked, expiring exceptions.
 *
 * Runs `npm audit --json` on the full tree and on the production tree
 * (`--omit=dev`) and judges both with `scripts/audit-allowlist.js`, which
 * documents what fails and holds the accepted list. Exit code 1 on any
 * failure, including an audit that returned no report.
 *
 * Usage: npm run security:check
 *
 * It runs npm through `npm_execpath`, the npm that `npm run` itself is, rather
 * than whatever `npm` comes first on PATH, so run it through `npm run`.
 */
import { spawnSync } from 'node:child_process';

import { ACCEPTED, evaluate, parseAudit } from './audit-allowlist.js';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('[security:check] FAIL run this through `npm run security:check`');
  process.exit(1);
}

/**
 * Run one `npm audit --json`.
 *
 * @param {string[]} extra - Extra arguments.
 * @returns {object} The parsed report, or `{message}` saying why there is none.
 */
function runAudit(extra) {
  // The default 1 MiB buffer would truncate the JSON of a large report.
  return parseAudit(
    spawnSync(process.execPath, [npmCli, 'audit', '--json', ...extra], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  );
}

const { errors, notes } = evaluate(runAudit([]), runAudit(['--omit=dev']), ACCEPTED, new Date());
for (const note of notes) {
  console.log('[security:check] ' + note);
}
if (errors.length) {
  for (const error of errors) {
    console.error('[security:check] FAIL ' + error);
  }
  process.exit(1);
}
console.log('[security:check] OK: no unaccepted high or critical advisories.');
