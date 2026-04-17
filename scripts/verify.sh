#!/usr/bin/env bash
# scripts/verify.sh — Centralized verification gate
# Usage: bash scripts/verify.sh [prisma|lint|types|test|build|format|format:check|ci|all]
# Output contract: suppress tool noise; print ✅/❌ + last 20 lines on failure only
# Exit: 0 = all pass, 1 = first failure

set -euo pipefail
STEP="${1:-all}"

# ── Output helpers ─────────────────────────────────────────────────────────
ok()   { echo "✅  $*"; }
abort() {
  local label="$1" log="$2"
  echo "❌  $label failed:"
  echo "$log" | tail -20
  exit 1
}

# run <label> <cmd...>
# Captures all output. On success: one ✅ line. On failure: last 20 lines + exit 1.
run() {
  local label="$1"; shift
  local log
  log=$("$@" 2>&1) && ok "$label" || abort "$label" "$log"
}

# ── Tasks ──────────────────────────────────────────────────────────────────
task_prisma()  { run "prisma:generate"  pnpm --filter @cipta/database exec prisma generate; }
task_lint()    { run "lint"             pnpm lint; }
task_types()   { run "check-types"      pnpm check-types; }
task_test()    { run "test"             pnpm test --reporter=dot; }
task_build()   { run "build"            pnpm build; }
task_fmt_fix() { run "format"           pnpm format; }
task_fmt_chk() { run "format:check"     pnpm format:check; }

# ── Dispatch ───────────────────────────────────────────────────────────────
case "$STEP" in
  prisma)        task_prisma ;;
  lint)          task_lint ;;
  types)         task_types ;;
  test)          task_test ;;
  build)         task_build ;;
  format)        task_fmt_fix ;;
  format:check)  task_fmt_chk ;;
  ci)
    # Fast path: no build (for agent verify loops)
    task_prisma
    task_lint
    task_types
    task_test
    ;;
  all | *)
    task_prisma
    task_lint
    task_types
    task_test
    task_build
    ;;
esac

echo "──────────────────────────"
echo "✅  verify($STEP) done"
