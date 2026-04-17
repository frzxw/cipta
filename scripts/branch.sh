#!/usr/bin/env bash
# scripts/branch.sh — Create issue-linked branch matching project naming convention
# Format: {issue-number}-{slugified-title}
#
# Examples:
#   bash scripts/branch.sh 65
#   → branch: 65-add-swagger-openapi-docs-for-api
#
#   bash scripts/branch.sh 14 "Bootstrap Next.js 15 App Router + Tailwind v4 + ShadcnUI"
#   → branch: 14-bootstrap-nextjs-15-app-router-tailwind-v4-shadcnui

set -euo pipefail

ISSUE="${1:?Usage: branch.sh <issue-number> [title]}"
TITLE="${2:-}"

if [[ -z "$TITLE" ]]; then
  if command -v gh &>/dev/null; then
    TITLE=$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || echo "")
  fi
fi

slugify() {
  local input="$1"
  # 1. Strip trailing " #N" (GitHub sometimes appends issue number to title)
  input=$(echo "$input" | sed 's/ #[0-9]*$//')
  # 2. Lowercase
  input=$(echo "$input" | tr '[:upper:]' '[:lower:]')
  # 3. Spaces → hyphens
  input=$(echo "$input" | tr ' ' '-')
  # 4. Remove all chars that are NOT alphanumeric or hyphen (slash, dot, plus, etc.)
  input=$(echo "$input" | sed 's/[^a-z0-9-]//g')
  # 5. Collapse consecutive hyphens
  input=$(echo "$input" | sed 's/--*/-/g')
  # 6. Trim leading/trailing hyphens
  input=$(echo "$input" | sed 's/^-//;s/-$//')
  echo "$input"
}

SLUG=$(slugify "$TITLE")
SLUG="${SLUG:-issue-${ISSUE}}"
BRANCH="${ISSUE}-${SLUG}"

# Prefer branching from develop; fall back to current HEAD
git checkout -b "$BRANCH" develop -q 2>/dev/null \
  || git checkout -b "$BRANCH" -q

echo "branch: $BRANCH"
echo "keyword: Closes #${ISSUE}"
