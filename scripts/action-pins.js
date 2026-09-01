/**
 * Parses and classifies the pinned GitHub Actions references in
 * .github/workflows. Pure logic only — no I/O — so it is unit-testable
 * (test/action-pins.test.js). The CLI wrapper that resolves tags against the
 * GitHub API is scripts/check-action-pins.js.
 *
 * Why this exists: every action reference here is pinned to a commit SHA so a
 * tag cannot be silently repointed under us. That closed a real supply-chain
 * hole and created an unowned maintenance job in exchange — a pinned SHA is
 * immune to a hijacked tag, and equally immune to the security fixes that tag
 * would have carried. Dependabot used to own refreshing the pins; it is banned
 * here along with every other scheduled automation (#103), so this check is
 * the mechanism instead of it.
 *
 * The comparison is between the pinned SHA and the tag recorded in the
 * trailing comment (`@<sha> # v4.4.0`). Actions publish fixes by moving their
 * floating tag, so "the tag now points somewhere else" is exactly the signal
 * worth having.
 *
 * Known limitation: this cannot see a new major. A repository pinned to v4
 * keeps resolving v4 even after upstream ships v5. Dependabot would have
 * caught that; a human reading release notes still has to.
 *
 * Ported from lexic-a11y's scripts/action-pins.mjs (itself from a11y-mcp's
 * mcp-server/scripts/actionPins.ts). This copy is plain ESM in a `.js` file,
 * because package.json sets `"type": "module"` and the repository's tooling
 * (lint-staged's `*.js` glob, Jest's default transform) is keyed to `.js`.
 * The parsing and classification logic is shared with the other ports, so a
 * fix in any of the three applies to the others.
 */

/**
 * @typedef {object} ActionPin
 * @property {string} file Workflow file the reference was found in.
 * @property {number} line 1-based line number, so output pastes into an editor.
 * @property {string} owner GitHub owner of the action.
 * @property {string} repo Repository name of the action.
 * @property {string} [sha] The 40-char commit SHA the workflow pins, if pinned.
 * @property {string} [tag] The version recorded in the trailing comment.
 * @property {string} ref The raw ref after `@`, whether or not it is a SHA.
 */

/**
 * @typedef {(
 *   | {kind: 'current'}
 *   | {kind: 'stale', expected: string}
 *   | {kind: 'unresolved', reason: string}
 *   | {kind: 'unknown', reason: string}
 * )} PinStatus
 * current: pinned SHA matches what the tag resolves to today.
 * stale: the tag has moved since this was pinned.
 * unresolved: the pin has both a SHA and a `# <tag>` comment, so it *could*
 * have been checked, but the lookup failed — a deleted tag, a network error,
 * or a rate-limited or unauthorised API call. The check did not happen, which
 * is a failure of the check rather than a clean result.
 * unknown: there was nothing to compare against in the first place — no SHA,
 * or no tag comment. Nothing is wrong and nothing was missed.
 */

/**
 * @typedef {object} PinSummary
 * @property {number} total Every reference classified.
 * @property {number} current Pins whose SHA matches the tag today.
 * @property {number} stale Pins whose tag has moved.
 * @property {number} resolved Pins actually compared (current + stale).
 * @property {number} unresolved Pins that should have been compared but could not be.
 * @property {number} unknown Pins with nothing to compare against.
 * @property {boolean} ok True only when every checkable pin was checked and none is stale.
 */

const SHA_PATTERN = /^[0-9a-f]{40}$/;

const QUOTES = new Set(['"', "'"]);

/**
 * Peel a possibly-quoted scalar off the front of a `uses:` value.
 *
 * `uses: "actions/checkout@<sha>" # v6` is valid YAML and appears in the wild.
 * Without this, the quote is swallowed into the owner (`"actions`), the
 * lookup fails, and the reference degrades to a silently unchecked pin.
 *
 * @param {string} rest Everything after `uses:`, already trimmed.
 * @returns {{value: string, remainder: string}} The scalar and whatever follows it.
 */
function splitScalar(rest) {
  const quote = rest[0];
  if (QUOTES.has(quote)) {
    const close = rest.indexOf(quote, 1);
    if (close !== -1) {
      return { value: rest.slice(1, close), remainder: rest.slice(close + 1) };
    }
  }

  const hash = rest.indexOf('#');
  const value = (hash === -1 ? rest : rest.slice(0, hash)).trim();
  return { value, remainder: hash === -1 ? '' : rest.slice(hash) };
}

/**
 * Split a `uses:` line into its reference and any trailing `# tag` comment.
 *
 * String operations rather than a regex, for the same reason as
 * `splitActionRef` below: scanning for the delimiters directly is linear by
 * construction, so there is nothing for a regex-complexity or unsafe-regex
 * rule to object to in any of the repositories this code lives in.
 *
 * @param {string} rawLine One line of a workflow file.
 * @returns {{value: string, tag?: string} | undefined} The reference and its tag comment, when the line is a `uses:`.
 */
function splitUsesLine(rawLine) {
  let rest = rawLine.trim();
  if (rest.startsWith('- ')) {
    rest = rest.slice(2).trim();
  }
  if (!rest.startsWith('uses:')) {
    return undefined;
  }

  rest = rest.slice('uses:'.length).trim();
  if (rest === '') {
    return undefined;
  }

  const { value, remainder } = splitScalar(rest);
  if (value === '') {
    return undefined;
  }

  const hash = remainder.indexOf('#');
  const comment = hash === -1 ? '' : remainder.slice(hash + 1).trim();

  // Only the first word of the comment is the tag; anything after it is prose.
  const [tag] = comment.split(/\s/, 1);
  return tag ? { value, tag } : { value };
}

/**
 * Split `owner/repo[/subpath]@ref` into its parts.
 *
 * Done with string operations rather than one regex on purpose. The upstream
 * ports match the whole thing in a single pattern whose optional `/subpath`
 * group overlaps the preceding `owner/repo`; splitting on the last `@` and
 * then on `/` is unambiguous, linear, and easier to read than the pattern it
 * replaces.
 *
 * Local (`./.github/actions/x`) and Docker (`docker://…`) references have no
 * upstream tag to compare against, so they are skipped here.
 *
 * @param {string} value The raw value following `uses:`.
 * @returns {{owner: string, repo: string, ref: string} | undefined} The parts, when it is an upstream action reference.
 */
function splitActionRef(value) {
  if (value.startsWith('./') || value.startsWith('docker://')) {
    return undefined;
  }

  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) {
    return undefined;
  }

  const [owner, repo] = value.slice(0, at).split('/');
  if (!owner || !repo) {
    return undefined;
  }

  return { owner, repo, ref: value.slice(at + 1) };
}

/**
 * Pull every action reference out of one workflow file's text.
 *
 * @param {string} text The workflow file contents.
 * @param {string} file The file name, recorded on each pin for reporting.
 * @returns {ActionPin[]} Every `uses:` reference found.
 */
export function parseActionPins(text, file) {
  const pins = [];

  text.split('\n').forEach((rawLine, index) => {
    const line = splitUsesLine(rawLine);
    if (!line) {
      return;
    }

    const parts = splitActionRef(line.value);
    if (!parts) {
      return;
    }

    const { owner, repo, ref } = parts;
    const { tag } = line;

    pins.push({
      file,
      line: index + 1,
      owner,
      repo,
      ref,
      // A tag comment on an unpinned ref is noise; only record it with a SHA.
      ...(SHA_PATTERN.test(ref) ? { sha: ref } : {}),
      ...(tag ? { tag } : {}),
    });
  });

  return pins;
}

/**
 * Compare one pin against the SHA its tag resolves to upstream.
 *
 * `resolvedSha` is undefined when the tag could not be resolved. For a pin
 * carrying both a SHA and a tag that is `unresolved`, not `unknown`: the
 * comparison was owed and did not happen, so the run must not report success.
 * A pin with nothing to compare against is `unknown` and harmless.
 *
 * @param {ActionPin} pin The parsed reference.
 * @param {string | undefined} resolvedSha What the tag points at today.
 * @returns {PinStatus} How the pin compares.
 */
export function classifyPin(pin, resolvedSha) {
  if (!pin.sha) {
    return {
      kind: 'unknown',
      reason: `not pinned to a SHA (points at "${pin.ref}")`,
    };
  }

  if (!pin.tag) {
    return {
      kind: 'unknown',
      reason: 'pinned to a SHA but has no "# <tag>" comment to check it against',
    };
  }

  if (!resolvedSha) {
    return {
      kind: 'unresolved',
      reason: `tag "${pin.tag}" could not be resolved upstream, so this pin was not checked`,
    };
  }

  return resolvedSha === pin.sha ? { kind: 'current' } : { kind: 'stale', expected: resolvedSha };
}

/**
 * Interpret a GitHub `git/ref/tags/<tag>` response body.
 *
 * A lightweight tag points straight at the commit, so its SHA is the answer.
 * An annotated tag points at a tag object instead, and the workflow would
 * check out the commit *that* dereferences to — one more hop. Getting this
 * backwards reports a false stale on every annotated tag, so the decision is
 * kept here as pure logic rather than buried in the fetch code.
 *
 * @param {{object?: {sha?: string, type?: string}}} refBody Parsed response body.
 * @returns {{sha: string, annotated: boolean} | undefined} What the tag points at, if anything.
 */
export function tagRefTarget(refBody) {
  const sha = refBody?.object?.sha;
  if (!sha) {
    return undefined;
  }

  return { sha, annotated: refBody.object.type === 'tag' };
}

/**
 * Tally classified pins and decide whether the run succeeded.
 *
 * A run is only `ok` when nothing is stale *and* every pin that was supposed
 * to be checked actually was. Exiting 0 after resolving nothing — which is
 * what a rate-limited or unauthorised token produces — makes a broken check
 * indistinguishable from a clean one.
 *
 * @param {PinStatus[]} statuses One status per reference, in any order.
 * @returns {PinSummary} The counts and the pass/fail decision.
 */
export function summarize(statuses) {
  const counts = { current: 0, stale: 0, unresolved: 0, unknown: 0 };

  for (const status of statuses) {
    counts[status.kind] += 1;
  }

  return {
    total: statuses.length,
    ...counts,
    resolved: counts.current + counts.stale,
    ok: counts.stale === 0 && counts.unresolved === 0,
  };
}

/**
 * `owner/repo` — the key a tag is resolved against.
 *
 * @param {ActionPin} pin The parsed reference.
 * @returns {string} The repository slug.
 */
export function repoSlug(pin) {
  return `${pin.owner}/${pin.repo}`;
}
