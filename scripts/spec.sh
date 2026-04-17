#!/usr/bin/env bash
# scripts/spec.sh — Scoped spec reader for AI agents
# Greps a section from a doc file. Avoids loading entire spec into context.
# Usage:
#   bash scripts/spec.sh <doc> [section]
#
# Examples:
#   bash scripts/spec.sh PRD                      # prints TOC only (h2 headers)
#   bash scripts/spec.sh PRD "F-001"              # prints lines around F-001
#   bash scripts/spec.sh specs/AUTH "AC-009"      # prints AC-009 acceptance criteria
#   bash scripts/spec.sh API "/auth"              # prints /auth endpoint block
#   bash scripts/spec.sh ERD "Source"             # prints Source model block
#
# Output is capped at 60 lines to protect context window.

set -euo pipefail

DOC="${1:?Usage: spec.sh <doc> [section]}"
SECTION="${2:-}"
MAX_LINES=60

# Resolve path
FILE="docs/${DOC}.md"
[[ -f "$FILE" ]] || FILE="docs/specs/${DOC}.md"
[[ -f "$FILE" ]] || { echo "❌ Not found: $FILE" >&2; exit 1; }

if [[ -z "$SECTION" ]]; then
  # Print TOC: only h2/h3 headers (## / ###)
  grep -n '^##' "$FILE" | head -30
  echo "(use: bash scripts/spec.sh $DOC \"<section>\" to read a section)"
else
  # Find the line number of the section keyword
  START=$(grep -n "$SECTION" "$FILE" | head -1 | cut -d: -f1)
  if [[ -z "$START" ]]; then
    echo "❌ '$SECTION' not found in $FILE" >&2
    exit 1
  fi
  # Print from that line, capped at MAX_LINES
  sed -n "${START},$((START + MAX_LINES))p" "$FILE"
fi
