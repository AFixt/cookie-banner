# ADR 0001: Tooling stack decisions for issue #62

Date: 2026-07-22

## Status

Accepted

## Context

Issue #62 proposes a standardized quality, security, accessibility, and
performance tooling stack. Its ground rule: **do not replace anything that
already exists unless the new proposal leads to a demonstrably higher quality
outcome.** Much of the stack landed earlier via #68 (Husky hooks, commitlint,
lint-staged, Prettier, Stylelint, markdownlint, jscpd, size-limit, gitleaks,
`.editorconfig`). This ADR records the keep/replace/skip decisions for the
remainder.

## Decisions

### Kept as-is (existing tool serves the purpose)

- **Jest + Testing Library** over Vitest. The suite (16 files, 239 tests,
  jsdom, coverage thresholds) is healthy; migration is churn without a
  quality win for a browser library with no Vite build.
- **Plain JavaScript with JSDoc** over TypeScript + `ts-reset`. The library
  is a small, framework-free browser bundle whose public API is documented
  with JSDoc (now lint-enforced via `eslint-plugin-jsdoc`). A TS migration
  is a rewrite of every module and test for type coverage that
  `checkJs`-style tooling can approximate later if wanted. Revisit if the
  API surface grows.
- **ESLint (flat config)** — extended rather than replaced (no Biome; issue
  itself excludes it).
- **markdownlint-cli** over `markdownlint-cli2` — same engine, config
  already in place; no quality difference for this repo's needs.
- **Playwright visual/a11y tests** and the manual-assertion accessibility
  suite remain the a11y layers. `@afixt/a11y-assert` adoption was deferred
  here while the package was unpublished; that changed — see the update
  below.

  **Update (2026-07-22, #56):** `@afixt/a11y-assert` 2.x and
  `@afixt/a11y-assert-reporter` are published again and are now integrated:
  automated scans of the rendered banner and modal run in the Jest suite
  (`test/accessibility.test.js` via `test/helpers/a11y.js`), and the
  reporter writes HTML/JSON/Markdown results to `reports/a11y/` on every
  test run. Rules jsdom cannot evaluate (computed-style focus indication,
  KEYBOARD-01) are excluded with justification at the call site and remain
  covered by the stylesheet plus the Playwright browser runs.

  **Update (2026-08-02):** the browser-level layers now exist too.
  `test/accessibility-e2e.test.js` scans the built bundle as a real browser
  renders it, over HTTP from `dist/examples/`, across all five Playwright
  projects — first visit, modal open, post-consent, and each of the four
  banner-bearing example pages. `npm run test:a11y` runs it and `ci.yml`
  gates on it, which completes the defense-in-depth ladder: ESLint, jsdom
  component scans, browser scans, and a CI run against the built preview.

  Landing that gate surfaced real WCAG failures in the shipped example
  pages — an unlabelled language `<select>` (FORMS-08/09) and content
  outside any landmark (STRUCTURE-22) — which are fixed rather than
  suppressed. Two rules are excluded, each justified at the call site:
  NAVIGATION-08 (WCAG 2.4.5 Multiple Ways) is a page-set criterion a
  standalone demo cannot satisfy, and STRUCTURE-22 is dropped for the
  modal-open state only, because the dialog's `<h2>` title sits inside
  `role="dialog"` by design and wrapping it in a landmark would be wrong.

### Added (gaps closed by this change)

- **ESLint plugins** applicable to vanilla JS: `sonarjs` (code smells,
  cognitive complexity), `security`, `promise`, `import-x`, `jsdoc`
  (documentation enforcement on `src/**`), `no-secrets` (second layer
  behind gitleaks), and a targeted subset of `unicorn`. React-specific
  plugins are omitted (no React).
- **`license-checker-rseidelsohn`** allowlist scan at pre-push
  (`npm run lint:licenses`).
- **`npm run check:all`** aggregate gate; pre-push now runs it.
- **`scripts/bootstrap.sh`** installs the optional external binaries
  (semgrep, osv-scanner, gitleaks, lychee).
- **lychee** link checking as a weekly scheduled workflow (external-link
  rot) — local runs are optional because the binary is not npm-installable.
- **GitHub Actions reduced to four workflows** (2026-08-02): blocking
  `ci.yml`, `release.yml`, and the scheduled `security.yml` and
  `link-check.yml`. `pr-check.yml` was deleted — it re-ran lint and tests
  that `ci.yml` already covers, every step was `continue-on-error`, and it
  installed with `npm ci --ignore-scripts`, which the root `CLAUDE.md`
  forbids. `bundle-size.yml` was folded into `ci.yml` as a job, dropping a
  duplicate checkout and build. Release was split out of `ci.yml`, where it
  had depended on an accessibility job marked `continue-on-error`.

  Two latent defects were fixed in the process. Every lint step in `ci.yml`
  carried `continue-on-error: true`, so the safety net reported failures as
  passes; those are now blocking, with the visual regression suite the one
  documented exception (macOS baselines do not reproduce on Linux runners).
  And `security.yml` gated its OWASP Dependency Check and licence jobs on
  `github.event_name == 'schedule'` while declaring no schedule trigger, so
  neither had ever run; it now has a weekly cron.
  `test/workflows.test.js` asserts all of this so it cannot silently
  regress.

- **`typescript` (devDependency, 5.9 line)** — present only because
  `eslint-plugin-sonarjs` requires the TS API at lint time. Pinned to ~5.9:
  TypeScript 7 changes the compiler API and breaks `ts-api-utils`.

### Skipped, with reasons

- **Dependabot config** (issue asks to commit one): the repository owner
  removed Dependabot deliberately on 2026-07-22 (PR #85) in favor of manual
  dependency maintenance. Owner decision supersedes the issue item.
- **Lighthouse CI budgets**: no deployed preview or page to audit — this is
  a library, not a site. `size-limit` covers the bundle budget. Revisit if
  a docs site ships.
- **OWASP ZAP baseline**: same reason — nothing deployed to scan.
- **Express hardening items** (helmet, rate-limit, zod, etc.): there is no
  server in this repo.
- **Semgrep/OSV/CodeQL as blocking local hooks**: they need external
  binaries contributors may not have. They are installable via
  `scripts/bootstrap.sh`; CI keeps CodeQL and OWASP Dependency-Check on
  schedule in `security.yml`.
- **TypeDoc**: JSDoc-to-markdown (`npm run docs`) already generates API
  docs from the same comments.

- **Committing `.npmrc`** (the issue asks for `save-exact=true` and
  `engine-strict=true`): `.npmrc` is gitignored here precisely because the
  local one holds an npm auth token. Un-ignoring it to add two non-secret
  settings is how that token would get published, and the settings are not
  worth that risk — `engines` is already declared in `package.json` and
  exact-pinning is handled by the lockfile. Issue #62 was amended on
  2026-07-22 to say the same. Keep authentication in `~/.npmrc`.

## Consequences

Local gates catch quality, security-smell, documentation, duplication, and
license issues before push. CI remains the safety net for scheduled/heavy
scans. The lint warning budget (jsdoc descriptions, security hints) is
advisory: errors gate, warnings guide.
