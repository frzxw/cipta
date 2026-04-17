#!/usr/bin/env bash
# scripts/branch.sh — Create issue-linked branch + print Closes keyword
# Usage: bash scripts/branch.sh <issue-number> [type] [description]

set -euo pipefail

ISSUE="${1:?Usage: branch.sh <issue-number> [type] [description]}"
TYPE="${2:-feat}"
DESC="${3:-}"

if [[ -z "$DESC" ]]; then
  if command -v gh &>/dev/null; then
    # Fetch only the title field — minimal API call
    RAW=$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || echo "")
    # Slugify: lowercase, non-alnum → hyphen, collapse, trim, max 40 chars
    DESC=$(printf '%s' "$RAW" | tr '[:upper:]' '[:lower:]' \
      | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' \
      | cut -c1-40)
  fi
  DESC="${DESC:-issue-${ISSUE}}"
fi

BRANCH="${TYPE}/issue-${ISSUE}-${DESC}"

# Prefer branching from develop; fall back to current HEAD
git checkout -b "$BRANCH" develop -q 2>/dev/null \
  || git checkout -b "$BRANCH" -q

echo "branch: $BRANCH"
echo "keyword: Closes #${ISSUE}"
