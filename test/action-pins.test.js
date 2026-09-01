/**
 * Unit tests for scripts/action-pins.js — the pure half of the Action Pin
 * Freshness check.
 *
 * The module was split out from the CLI specifically so this file could
 * exist: parsing `uses:` lines and deciding what a pin's state means are
 * where the check can be silently wrong, and both are testable without a
 * network. Two failure modes are asserted here in particular:
 *
 * - A pin that could not be resolved must not be reported as a clean result.
 *   Before this, an invalid or rate-limited token turned all 29 references in
 *   this repository into `unknown` and the process still exited 0, so a check
 *   that checked nothing looked exactly like a check that passed.
 * - A quoted `uses:` value must parse. `uses: "actions/checkout@<sha>"` is
 *   valid YAML; mis-parsing the owner as `"actions` degrades to that same
 *   silent pass.
 *
 * The parser is also run against this repository's real workflow files, so
 * every reference form actually in use here is covered by construction rather
 * than by a fixture that can drift away from them.
 */

const fs = require('fs');
const path = require('path');

const {
  classifyPin,
  parseActionPins,
  repoSlug,
  summarize,
  tagRefTarget,
} = require('../scripts/action-pins.js');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');

const SHA_A = 'd23441a48e516b6c34aea4fa41551a30e30af803';
const SHA_B = '5595ccaf912efad79be6eef63a5619ff05969be3';

/**
 * Parse a single line as though it were a whole workflow file.
 *
 * @param {string} line The `uses:` line under test.
 * @returns {object[]} Parsed pins.
 */
const parseLine = line => parseActionPins(line, 'test.yml');

/**
 * Parse a single line and return its one pin.
 *
 * @param {string} line The `uses:` line under test.
 * @returns {object} The single parsed pin.
 */
const parseOne = line => {
  const pins = parseLine(line);
  expect(pins).toHaveLength(1);
  return pins[0];
};

describe('parseActionPins', () => {
  it('parses the list-item form used throughout this repository', () => {
    expect(parseOne(`      - uses: actions/checkout@${SHA_A} # v6`)).toEqual({
      file: 'test.yml',
      line: 1,
      owner: 'actions',
      repo: 'checkout',
      ref: SHA_A,
      sha: SHA_A,
      tag: 'v6',
    });
  });

  it('parses the mapping-key form without the leading dash', () => {
    expect(parseOne(`        uses: actions/setup-node@${SHA_A} # v6`)).toMatchObject({
      owner: 'actions',
      repo: 'setup-node',
      sha: SHA_A,
      tag: 'v6',
    });
  });

  it('keeps owner/repo when the reference carries a subpath', () => {
    const pin = parseOne(`      - uses: github/codeql-action/upload-sarif@${SHA_B} # v4`);
    expect(repoSlug(pin)).toBe('github/codeql-action');
    expect(pin.sha).toBe(SHA_B);
    expect(pin.tag).toBe('v4');
  });

  it('accepts a bare semver tag comment as well as a v-prefixed one', () => {
    const pin = parseOne(`      - uses: dependency-check/Dependency-Check_Action@${SHA_A} # 1.1.0`);
    expect(pin.tag).toBe('1.1.0');
  });

  it('reads a double-quoted uses: value and its trailing tag comment', () => {
    expect(parseOne(`      - uses: "actions/checkout@${SHA_A}" # v6`)).toMatchObject({
      owner: 'actions',
      repo: 'checkout',
      sha: SHA_A,
      tag: 'v6',
    });
  });

  it('reads a single-quoted uses: value', () => {
    expect(parseOne(`      - uses: 'actions/checkout@${SHA_A}'`)).toMatchObject({
      owner: 'actions',
      repo: 'checkout',
      sha: SHA_A,
    });
  });

  it('takes only the first word of the comment as the tag', () => {
    expect(parseOne(`      - uses: actions/checkout@${SHA_A} # v6 pinned deliberately`).tag).toBe(
      'v6'
    );
  });

  it('records no sha when the reference is a floating ref', () => {
    const pin = parseOne('      - uses: actions/checkout@v6');
    expect(pin.ref).toBe('v6');
    expect(pin.sha).toBeUndefined();
  });

  it('records no tag when a pinned reference has no comment', () => {
    const pin = parseOne(`      - uses: actions/checkout@${SHA_A}`);
    expect(pin.sha).toBe(SHA_A);
    expect(pin.tag).toBeUndefined();
  });

  it('skips local and docker references, which have no upstream tag', () => {
    expect(parseLine('      - uses: ./.github/actions/setup')).toEqual([]);
    expect(parseLine('      - uses: docker://alpine:3.20')).toEqual([]);
  });

  it('skips lines that are not a uses: reference', () => {
    expect(parseLine('      - name: uses: is mentioned in this name')).toEqual([]);
    expect(parseLine('      - uses:')).toEqual([]);
    expect(parseLine(`        image: actions/checkout@${SHA_A}`)).toEqual([]);
  });

  it('reports 1-based line numbers so output pastes into an editor', () => {
    const text = [
      'jobs:',
      '  build:',
      '    steps:',
      `      - uses: actions/checkout@${SHA_A} # v6`,
    ].join('\n');
    expect(parseActionPins(text, 'ci.yml')[0].line).toBe(4);
  });

  it("parses every reference in this repository's own workflows", () => {
    const files = fs
      .readdirSync(WORKFLOW_DIR)
      .filter(name => name.endsWith('.yml') || name.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);

    const rawUses = files.flatMap(name =>
      fs
        .readFileSync(path.join(WORKFLOW_DIR, name), 'utf8')
        .split('\n')
        .filter(line => /^\s*(- )?uses:/.test(line))
    );

    const pins = files.flatMap(name =>
      parseActionPins(fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8'), name)
    );

    // Nothing in this repository is a local or docker reference, so every
    // `uses:` line must survive parsing. A silently dropped line is the exact
    // failure this whole check is meant not to have.
    expect(pins).toHaveLength(rawUses.length);

    for (const pin of pins) {
      expect(pin.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(typeof pin.tag).toBe('string');
      expect(pin.tag).not.toBe('');
      expect(pin.owner).not.toMatch(/["']/);
    }
  });
});

describe('classifyPin', () => {
  const pinned = { file: 'ci.yml', line: 1, owner: 'actions', repo: 'checkout' };

  it('reports a pin whose tag still points at it as current', () => {
    expect(classifyPin({ ...pinned, ref: SHA_A, sha: SHA_A, tag: 'v6' }, SHA_A)).toEqual({
      kind: 'current',
    });
  });

  it('reports a moved tag as stale, carrying the SHA to move to', () => {
    expect(classifyPin({ ...pinned, ref: SHA_A, sha: SHA_A, tag: 'v6' }, SHA_B)).toEqual({
      kind: 'stale',
      expected: SHA_B,
    });
  });

  it('reports a checkable pin that could not be looked up as unresolved', () => {
    const status = classifyPin({ ...pinned, ref: SHA_A, sha: SHA_A, tag: 'v6' }, undefined);
    expect(status.kind).toBe('unresolved');
    expect(status.reason).toContain('v6');
  });

  it('reports an unpinned reference as unknown, not as a failure', () => {
    expect(classifyPin({ ...pinned, ref: 'v6', tag: 'v6' }, undefined).kind).toBe('unknown');
  });

  it('reports a pinned reference with no tag comment as unknown', () => {
    expect(classifyPin({ ...pinned, ref: SHA_A, sha: SHA_A }, undefined).kind).toBe('unknown');
  });
});

describe('summarize', () => {
  it('counts each kind and treats stale plus current as actually resolved', () => {
    expect(
      summarize([
        { kind: 'current' },
        { kind: 'current' },
        { kind: 'stale', expected: SHA_B },
        { kind: 'unknown', reason: 'no tag' },
      ])
    ).toEqual({
      total: 4,
      current: 2,
      stale: 1,
      unresolved: 0,
      unknown: 1,
      resolved: 3,
      ok: false,
    });
  });

  it('passes when everything checkable was checked and nothing is stale', () => {
    const summary = summarize([
      { kind: 'current' },
      { kind: 'unknown', reason: 'not pinned to a SHA' },
    ]);
    expect(summary).toMatchObject({ resolved: 1, unresolved: 0, ok: true });
  });

  it('fails when a pin that should have been checked was not', () => {
    // The regression this exists for: an invalid or rate-limited token made
    // every reference here unresolvable, and the run still exited 0.
    const summary = summarize(
      Array.from({ length: 29 }, () => ({ kind: 'unresolved', reason: 'rate limited' }))
    );
    expect(summary).toMatchObject({ total: 29, resolved: 0, unresolved: 29, ok: false });
  });

  it('does not fail a run whose only uncheckable pins had nothing to compare', () => {
    expect(summarize([{ kind: 'unknown', reason: 'no "# <tag>" comment' }]).ok).toBe(true);
  });

  it('passes an empty run rather than throwing', () => {
    expect(summarize([])).toMatchObject({ total: 0, resolved: 0, ok: true });
  });
});

describe('tagRefTarget', () => {
  it('returns the commit directly for a lightweight tag', () => {
    expect(tagRefTarget({ object: { sha: SHA_A, type: 'commit' } })).toEqual({
      sha: SHA_A,
      annotated: false,
    });
  });

  it('flags an annotated tag as needing a second hop', () => {
    // github/codeql-action publishes annotated tags; treating the tag
    // object's SHA as the commit reports a false stale on every one of them.
    expect(tagRefTarget({ object: { sha: SHA_B, type: 'tag' } })).toEqual({
      sha: SHA_B,
      annotated: true,
    });
  });

  it('returns undefined for a response with nothing to dereference', () => {
    expect(tagRefTarget({})).toBeUndefined();
    expect(tagRefTarget({ object: {} })).toBeUndefined();
    expect(tagRefTarget(undefined)).toBeUndefined();
  });
});
