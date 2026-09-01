#!/usr/bin/env node
/**
 * Reports GitHub Actions SHA pins that have drifted from the tag they claim.
 *
 * Dependabot used to own refreshing these pins; scheduled automation
 * (Dependabot included) is banned here (#103), so this check is the mechanism
 * instead. Run it via the `Action Pin Freshness` workflow_dispatch job in
 * security.yml, or locally:
 *
 *   node scripts/check-action-pins.js [workflows-dir]
 *
 * Exit code 1 when either:
 *
 *   - a pin is stale — the tag has moved since it was pinned, which usually
 *     means upstream shipped a fix this repository is frozen against; or
 *   - a pin that carries both a SHA and a `# <tag>` comment could not be
 *     resolved. The comparison was owed and did not happen. Without this, a
 *     rate-limited or unauthorised run resolves nothing, reports 29 unknowns
 *     and exits 0 — indistinguishable from a clean run.
 *
 * References with nothing to compare against — no SHA, or a SHA with no
 * `# <tag>` comment — are reported as unknown and do not fail the run.
 * Nothing was missed in those cases; there was never anything to check.
 *
 * Env vars:
 *   GITHUB_TOKEN — raises the API rate limit from 60/hr to 5000/hr. Optional
 *                  locally; supplied automatically in Actions.
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyPin, parseActionPins, repoSlug, summarize, tagRefTarget } from './action-pins.js';

const DEFAULT_WORKFLOW_DIR = join(dirname(fileURLToPath(import.meta.url)), '../.github/workflows');

const API = 'https://api.github.com';

/**
 * Request headers for the GitHub REST API.
 *
 * @returns {Record<string, string>} Headers, with auth when available.
 */
function headers() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Resolve `owner/repo` + tag to the commit SHA it points at today.
 *
 * Annotated tags resolve to a tag object rather than a commit, so those need
 * a second hop to get the commit a workflow would actually check out. Returns
 * undefined for anything unresolvable; the caller reports that as a failed
 * check rather than as drift.
 *
 * @param {string} slug `owner/repo`.
 * @param {string} tag The tag name from the pin's trailing comment.
 * @returns {Promise<string | undefined>} The commit SHA, if resolvable.
 */
async function resolveTag(slug, tag) {
  const res = await fetch(`${API}/repos/${slug}/git/ref/tags/${encodeURIComponent(tag)}`, {
    headers: headers(),
  });
  if (!res.ok) {
    return undefined;
  }

  const target = tagRefTarget(await res.json());
  if (!target) {
    return undefined;
  }
  if (!target.annotated) {
    return target.sha;
  }

  const deref = await fetch(`${API}/repos/${slug}/git/tags/${target.sha}`, {
    headers: headers(),
  });
  if (!deref.ok) {
    return undefined;
  }

  const annotated = await deref.json();
  return annotated.object?.sha;
}

/**
 * Parse every workflow file in a directory into action pins.
 *
 * The directory comes from the command line, which is the entire job of a CLI
 * that reads a workflows directory: from the workflow step that invokes this
 * script, not from anything the analysed code can influence, and the script
 * only ever reads. (`eslint-plugin-security` is registered for `src/**` only
 * in this repository, so there is no rule here to annotate.)
 *
 * @param {string} dir The workflows directory.
 * @returns {Promise<import('./action-pins.js').ActionPin[]>} All references.
 */
async function collectPins(dir) {
  const entries = await fs.readdir(dir);
  const pins = [];

  for (const name of entries.filter(n => n.endsWith('.yml') || n.endsWith('.yaml')).sort()) {
    pins.push(...parseActionPins(await fs.readFile(join(dir, name), 'utf8'), name));
  }

  return pins;
}

/**
 * Classify every pin, printing one line each, and bucket the ones that need
 * attention. Split out of main() to keep that function within this
 * repository's complexity limits.
 *
 * @param {import('./action-pins.js').ActionPin[]} pins Parsed references.
 * @param {Map<string, string | undefined>} resolved Tag lookups, keyed `slug@tag`.
 * @returns {{statuses: import('./action-pins.js').PinStatus[], stale: string[], unresolved: string[], unknown: string[]}} Statuses and reportable lines per bucket.
 */
function report(pins, resolved) {
  const statuses = [];
  const buckets = { stale: [], unresolved: [], unknown: [] };

  for (const pin of pins) {
    const status = classifyPin(pin, resolved.get(`${repoSlug(pin)}@${pin.tag}`));
    statuses.push(status);

    const where = `${pin.file}:${pin.line}`;
    if (status.kind === 'current') {
      console.log(`  ok          ${where}  ${repoSlug(pin)}@${pin.tag}`);
    } else if (status.kind === 'stale') {
      buckets.stale.push(
        `${where}  ${repoSlug(pin)}  ${pin.tag}: ${pin.sha} -> ${status.expected}`
      );
      console.log(`  STALE       ${where}  ${repoSlug(pin)}@${pin.tag}`);
    } else {
      const label = status.kind === 'unresolved' ? 'UNRESOLVED  ' : 'unknown     ';
      buckets[status.kind].push(`${where}  ${repoSlug(pin)}  ${status.reason}`);
      console.log(`  ${label}${where}  ${repoSlug(pin)}  ${status.reason}`);
    }
  }

  return { statuses, ...buckets };
}

/**
 * Print a titled block of detail lines, if there are any.
 *
 * @param {string} title Heading for the block.
 * @param {string[]} lines Detail lines, one per reference.
 * @param {string} [advice] Optional trailing paragraph explaining what to do.
 * @returns {void}
 */
function printSection(title, lines, advice) {
  if (lines.length === 0) {
    return;
  }

  console.log(`\n${title}`);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  if (advice) {
    console.log(`\n${advice}`);
  }
}

/**
 * Check every pin and report; exit 1 if any is stale or could not be checked.
 *
 * @returns {Promise<void>} Resolves when the report is printed.
 */
async function main() {
  const dir = process.argv[2] || DEFAULT_WORKFLOW_DIR;
  const pins = await collectPins(dir);

  if (pins.length === 0) {
    console.error(`No action references found in ${dir}`);
    process.exit(1);
  }

  // One lookup per distinct repo+tag: the references collapse to a handful,
  // which matters against an unauthenticated 60/hr rate limit.
  const wanted = new Map();
  for (const pin of pins) {
    if (pin.sha && pin.tag) {
      wanted.set(`${repoSlug(pin)}@${pin.tag}`, { slug: repoSlug(pin), tag: pin.tag });
    }
  }

  const resolved = new Map();
  await Promise.all(
    [...wanted].map(async ([key, { slug, tag }]) => resolved.set(key, await resolveTag(slug, tag)))
  );

  const { statuses, stale, unresolved, unknown } = report(pins, resolved);
  const totals = summarize(statuses);

  console.log(
    `\n${totals.total} references checked: ${totals.resolved} resolved ` +
      `(${totals.current} current, ${totals.stale} stale), ` +
      `${totals.unresolved} could not be resolved, ` +
      `${totals.unknown} with nothing to compare against.`
  );

  printSection('Nothing to compare against (not a failure):', unknown);

  printSection(
    'Could not be resolved — these pins were NOT checked:',
    unresolved,
    'A tag that will not resolve is usually a rate-limited or unauthorised API\n' +
      'call, not drift. Set GITHUB_TOKEN and run it again; the run fails because\n' +
      'the check did not happen, not because these pins are known to be wrong.'
  );

  printSection(
    'Stale pins — the tag has moved since these were pinned:',
    stale,
    'Update the SHA in the workflow, keeping the "# <tag>" comment accurate.\n' +
      'Read the upstream release notes first — that is the review step a pinned\n' +
      'SHA buys you, and the reason this repository pins rather than floating.'
  );

  if (!totals.ok) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
