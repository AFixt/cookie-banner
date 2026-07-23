#!/usr/bin/env bash
# Bootstrap optional external binaries used by local quality gates and
# scheduled scans (see docs/adr/0001-tooling-stack-decisions.md and #62).
# Everything installed here is optional: hooks skip tools that are absent.
set -euo pipefail

have() { command -v "$1" >/dev/null 2>&1; }

install_with_brew() {
  local pkg=$1
  if have brew; then
    echo "Installing $pkg via Homebrew..."
    brew install "$pkg"
  else
    echo "SKIP: $pkg — install manually (no Homebrew found)." >&2
  fi
}

echo "== cookie-banner tooling bootstrap =="

# Node version per .nvmrc
if have nvm || [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  echo "Run 'nvm use' to match the pinned Node version ($(cat .nvmrc))."
elif ! node --version | grep -q "^v$(cat .nvmrc)\."; then
  echo "WARN: node $(node --version) does not match .nvmrc ($(cat .nvmrc))." >&2
fi

# Secret scanning (pre-commit uses it when present)
have gitleaks || install_with_brew gitleaks

# Static analysis with OWASP rulesets (scheduled/manual)
have semgrep || install_with_brew semgrep

# Dependency vulnerability scanning against the OSV database
have osv-scanner || install_with_brew osv-scanner

# Markdown link rot checking (weekly Action; optional locally)
have lychee || install_with_brew lychee

echo "Done. Optional extras not installed by this script:"
echo "  - CodeQL CLI (heavy; CI runs it on schedule)"
echo "  - OWASP Dependency-Check (Java; CI runs it on schedule)"
