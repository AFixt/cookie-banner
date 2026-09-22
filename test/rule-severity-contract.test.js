/**
 * Pins the claim that justifies allowlisting TIMEOUTS-01 (#131).
 *
 * `test/accessibility-e2e.test.js` drops TIMEOUTS-01 from its scans on the
 * grounds that the rule is `auto_assisted` — it flags candidates for a human
 * to judge and cannot establish a failure by itself. That is a claim about a
 * dependency, and a claim about a dependency rots silently.
 *
 * It reports as a blocking error today because a11y-assert's
 * `severityForRule()` maps severity from a hardcoded allowlist rather than
 * from the rule's own `type`:
 *
 *     const REVIEW_ONLY_RULES = new Set(['KEYBOARD-01']);
 *     severityForRule = id => REVIEW_ONLY_RULES.has(id) ? 'warning' : 'error';
 *
 * So every auto_assisted rule except KEYBOARD-01 blocks a build it has no
 * standing to block. AFixt/acr-archive#158 asks upstream to derive severity
 * from `type`; when that lands, this allowlist entry should be removed and the
 * rule allowed to report as the advisory it is.
 *
 * Two things are asserted, and the second is the one that matters:
 *
 * 1. TIMEOUTS-01 is still `auto_assisted`. If upstream reclassifies it to
 *    `automatic` — meaning automation CAN decide it — the allowlist entry
 *    becomes a suppressed real failure, and this test says so.
 * 2. KEYBOARD-01 is still the only entry in REVIEW_ONLY_RULES. When that set
 *    grows to include TIMEOUTS-01, or the mapping starts reading `type`, the
 *    reason for the allowlist entry is gone and it should go with it.
 *
 * Without (2) the entry would outlive its cause, which is how an allowlist
 * turns from a documented exception into a place where failures go to hide.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

describe('TIMEOUTS-01 allowlist rationale', () => {
  it('is still an auto_assisted rule, so automation cannot decide it', () => {
    const rule = require(path.join(ROOT, 'node_modules/@afixt/afixt-tests/dist/TIMEOUTS-01.js'));
    const definition = rule.test || rule;

    expect(definition.id).toBe('TIMEOUTS-01');
    expect(definition.type).toBe('auto_assisted');
  });

  it('still maps severity from a hardcoded set rather than from the rule type', () => {
    // Read as source rather than imported: the module is ESM and this suite is
    // CJS, and what is being asserted is the shape of the decision, not its
    // return value for one input.
    const severitySource = fs.readFileSync(
      path.join(ROOT, 'node_modules/@afixt/a11y-assert/dist/core/ruleSeverity.js'),
      'utf8'
    );

    // The moment this stops matching, severity is being derived some other way
    // — most likely from `type`, which is the fix acr-archive#158 asks for —
    // and the allowlist entry in accessibility-e2e.test.js should be removed.
    expect(severitySource).toMatch(/REVIEW_ONLY_RULES\s*=\s*new Set\(\[\s*'KEYBOARD-01'\s*\]\)/);
    expect(severitySource).not.toMatch(/auto_assisted/);
  });
});
